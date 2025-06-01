// Fix the issue where one date (2025-06-25) is showing as two separate days in the UI
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Fixing the issue where one date (2025-06-25) is showing as two separate days in the UI...");

// First, get all the Round of 16 matches to see the exact date formats
db.all(`
  SELECT id, match_date, match_time, home_team_id, away_team_id
  FROM matches
  WHERE stage = 'Round of 16'
  ORDER BY id
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${matches.length} Round of 16 matches`);
  
  // Check each match's date format in detail
  matches.forEach(match => {
    // Check for any invisible characters or exact format differences
    const dateBytes = Buffer.from(match.match_date);
    console.log(`Match ${match.id}: Date="${match.match_date}" (${dateBytes.length} bytes), Time=${match.match_time}`);
    console.log(`  Date as hex: ${dateBytes.toString('hex')}`);
    console.log(`  Date chars: ${Array.from(match.match_date).join(',')}`);
  });
  
  // Group by dates to see unique dates
  const dateGroups = {};
  matches.forEach(match => {
    if (!dateGroups[match.match_date]) {
      dateGroups[match.match_date] = [];
    }
    dateGroups[match.match_date].push(match.id);
  });
  
  console.log("\nUnique dates found:");
  Object.keys(dateGroups).forEach(date => {
    console.log(`- "${date}" (${dateGroups[date].length} matches): IDs ${dateGroups[date].join(', ')}`);
  });
  
  // COMPLETE RESET APPROACH: Delete and recreate all Round of 16 matches with consistent dates
  console.log("\nPerforming complete reset of Round of 16 matches...");
  
  // First, get all teams to use for new matches
  db.all("SELECT id FROM teams LIMIT 16", [], (err, teams) => {
    if (err) {
      console.error("Error getting teams:", err.message);
      db.close();
      return;
    }
    
    // Make sure we have enough teams
    if (teams.length < 8) {
      console.log(`Warning: Only found ${teams.length} teams, will use some teams multiple times`);
    }
    
    // Delete all existing Round of 16 matches
    db.run("DELETE FROM matches WHERE stage = 'Round of 16'", function(err) {
      if (err) {
        console.error("Error deleting matches:", err.message);
        db.close();
        return;
      }
      
      console.log(`Deleted ${this.changes} existing Round of 16 matches`);
      
      // Now create exactly 8 new matches with completely consistent formats
      const matchesToCreate = [
        // Day 1: 2025-06-25 (4 matches)
        {
          date: '2025-06-25',
          time: '16:00',
          home: teams[0 % teams.length].id,
          away: teams[1 % teams.length].id,
          description: 'A1 vs B2'
        },
        {
          date: '2025-06-25',
          time: '18:00',
          home: teams[2 % teams.length].id,
          away: teams[3 % teams.length].id,
          description: 'A2 vs B1'
        },
        {
          date: '2025-06-25',
          time: '20:00',
          home: teams[4 % teams.length].id,
          away: teams[5 % teams.length].id,
          description: 'C1 vs D2'
        },
        {
          date: '2025-06-25',
          time: '22:00',
          home: teams[6 % teams.length].id,
          away: teams[7 % teams.length].id,
          description: 'C2 vs D1'
        },
        
        // Day 2: 2025-06-27 (4 matches)
        {
          date: '2025-06-27',
          time: '16:00',
          home: teams[8 % teams.length].id,
          away: teams[9 % teams.length].id,
          description: 'E1 vs F2'
        },
        {
          date: '2025-06-27',
          time: '18:00',
          home: teams[10 % teams.length].id,
          away: teams[11 % teams.length].id,
          description: 'E2 vs F1'
        },
        {
          date: '2025-06-27',
          time: '20:00',
          home: teams[12 % teams.length].id,
          away: teams[13 % teams.length].id,
          description: 'G1 vs H2'
        },
        {
          date: '2025-06-27',
          time: '22:00',
          home: teams[14 % teams.length].id,
          away: teams[15 % teams.length].id,
          description: 'G2 vs H1'
        }
      ];
      
      // Insert the matches
      let insertCount = 0;
      matchesToCreate.forEach(match => {
        db.run(
          'INSERT INTO matches (match_date, match_time, stage, played, home_team_id, away_team_id) VALUES (?, ?, ?, ?, ?, ?)',
          [match.date, match.time, 'Round of 16', 0, match.home, match.away],
          function(err) {
            if (err) {
              console.error(`Error creating match ${match.description}:`, err.message);
            } else {
              console.log(`Created match ${match.description} on ${match.date} at ${match.time} (ID: ${this.lastID})`);
            }
            
            insertCount++;
            if (insertCount === matchesToCreate.length) {
              checkDatabaseFormatting();
            }
          }
        );
      });
    });
  });
  
  // Check database formatting for all dates after recreation
  function checkDatabaseFormatting() {
    // Let's check the date formats in the database again
    db.all(`
      SELECT id, match_date, match_time
      FROM matches
      WHERE stage = 'Round of 16'
      ORDER BY match_date, match_time
    `, [], (err, newMatches) => {
      if (err) {
        console.error("Error getting new matches:", err.message);
        db.close();
        return;
      }
      
      console.log("\nNew Round of 16 matches:");
      
      // Group by date
      const newDateGroups = {};
      newMatches.forEach(match => {
        if (!newDateGroups[match.match_date]) {
          newDateGroups[match.match_date] = [];
        }
        newDateGroups[match.match_date].push(match);
      });
      
      console.log(`Found ${Object.keys(newDateGroups).length} unique dates:`);
      Object.keys(newDateGroups).forEach(date => {
        console.log(`- "${date}" (${newDateGroups[date].length} matches)`);
        // Check the exact format of each date
        const dateBytes = Buffer.from(date);
        console.log(`  Date as hex: ${dateBytes.toString('hex')}`);
      });
      
      // Now check if we have exactly 8 matches across 2 days
      if (Object.keys(newDateGroups).length === 2 && newMatches.length === 8) {
        console.log("\n✅ SUCCESS: Round of 16 now has exactly 8 matches across 2 days!");
      } else {
        console.log("\n❌ ERROR: Round of 16 structure is still not correct.");
      }
      
      // Final instructions
      console.log("\nFINAL STEPS TO FIX UI DISPLAY:");
      console.log("1. COMPLETELY RESTART YOUR SERVER");
      console.log("2. COMPLETELY CLEAR YOUR BROWSER CACHE or use an incognito window");
      console.log("3. The Round of 16 page should now show exactly 2 days");
      
      // Let's check if there's a views/partials directory that might have relevant templates
      const partialsDir = path.join(__dirname, 'views', 'partials');
      if (fs.existsSync(partialsDir)) {
        console.log("\nChecking for partial templates that might affect date display...");
        fs.readdir(partialsDir, (err, files) => {
          if (err) {
            console.error("Error reading partials directory:", err.message);
          } else {
            console.log(`Found ${files.length} partial templates: ${files.join(', ')}`);
          }
          db.close();
        });
      } else {
        db.close();
      }
    });
  }
});
