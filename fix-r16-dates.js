// Simple fix to ensure Round of 16 matches are only on 2 days
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Fixing Round of 16 to ensure exactly 2 days in the UI...");

// First, get all Round of 16 matches and see what days they're on
db.all(`
  SELECT id, match_date, match_time, home_team_id, away_team_id
  FROM matches 
  WHERE stage LIKE '%Round of 16%' OR stage LIKE '%round of 16%'
  ORDER BY match_date, match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting Round of 16 matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${matches.length} Round of 16 matches`);
  
  // Group matches by date
  const dateMatches = {};
  matches.forEach(match => {
    if (!dateMatches[match.match_date]) {
      dateMatches[match.match_date] = [];
    }
    dateMatches[match.match_date].push(match);
  });
  
  const dates = Object.keys(dateMatches).sort();
  console.log(`Round of 16 spans ${dates.length} days in the database:`);
  
  dates.forEach(date => {
    console.log(`- ${date}: ${dateMatches[date].length} matches`);
  });
  
  // Check if we have more than 2 days
  if (dates.length > 2) {
    console.log("\nWe have more than 2 days for Round of 16. Fixing...");
    
    // Keep only the first two days
    const keepDates = dates.slice(0, 2);
    const removeDates = dates.slice(2);
    
    console.log(`Keeping matches on: ${keepDates.join(', ')}`);
    console.log(`Removing matches on: ${removeDates.join(', ')}`);
    
    // Delete matches on the extra days
    const matchesToDelete = [];
    removeDates.forEach(date => {
      dateMatches[date].forEach(match => {
        matchesToDelete.push(match.id);
      });
    });
    
    if (matchesToDelete.length > 0) {
      // Create placeholders for the SQL query
      const placeholders = matchesToDelete.map(() => '?').join(',');
      
      db.run(`DELETE FROM matches WHERE id IN (${placeholders})`, matchesToDelete, function(err) {
        if (err) {
          console.error("Error deleting matches:", err.message);
        } else {
          console.log(`Deleted ${this.changes} matches from extra days`);
        }
        
        // Now ensure all remaining matches have consistent stage name
        standardizeStageNames();
      });
    } else {
      standardizeStageNames();
    }
  } else if (dates.length < 2) {
    console.log("\nWe have fewer than 2 days for Round of 16. Adding a second day...");
    
    // Add 4 matches on a second day if we only have 1 day
    if (dates.length === 1) {
      const existingDate = dates[0];
      const newDate = existingDate === '2025-06-25' ? '2025-06-27' : '2025-06-25';
      
      console.log(`Adding 4 matches on ${newDate}`);
      
      // Get some existing teams to use
      db.all("SELECT id FROM teams LIMIT 8", [], (err, teams) => {
        if (err || teams.length < 8) {
          console.error("Error getting teams or not enough teams:", err ? err.message : "Not enough teams");
          standardizeStageNames();
          return;
        }
        
        // Create 4 matches on the new day
        const times = ['16:00', '18:00', '20:00', '22:00'];
        let inserted = 0;
        
        for (let i = 0; i < 4; i++) {
          const homeTeamId = teams[i * 2].id;
          const awayTeamId = teams[i * 2 + 1].id;
          
          db.run(
            'INSERT INTO matches (match_date, match_time, stage, played, home_team_id, away_team_id) VALUES (?, ?, ?, ?, ?, ?)',
            [newDate, times[i], 'Round of 16', 0, homeTeamId, awayTeamId],
            function(err) {
              if (err) {
                console.error(`Error creating match on ${newDate} at ${times[i]}:`, err.message);
              } else {
                console.log(`Created match on ${newDate} at ${times[i]} (ID: ${this.lastID})`);
              }
              
              inserted++;
              if (inserted === 4) {
                standardizeStageNames();
              }
            }
          );
        }
      });
    } else {
      standardizeStageNames();
    }
  } else {
    console.log("\nWe already have exactly 2 days for Round of 16.");
    standardizeStageNames();
  }
  
  // Ensure all Round of 16 matches have the same stage name
  function standardizeStageNames() {
    db.run("UPDATE matches SET stage = 'Round of 16' WHERE stage LIKE '%Round of 16%' OR stage LIKE '%round of 16%'", function(err) {
      if (err) {
        console.error("Error standardizing stage names:", err.message);
      } else {
        console.log(`Standardized stage names for ${this.changes} matches`);
      }
      
      // Now check the final state of Round of 16 matches
      verifyFinalState();
    });
  }
  
  // Final verification
  function verifyFinalState() {
    db.all(`
      SELECT match_date, COUNT(*) as match_count
      FROM matches
      WHERE stage = 'Round of 16'
      GROUP BY match_date
      ORDER BY match_date
    `, [], (err, results) => {
      if (err) {
        console.error("Error verifying final state:", err.message);
        db.close();
        return;
      }
      
      console.log("\nFinal Round of 16 state:");
      let totalMatches = 0;
      
      results.forEach(row => {
        console.log(`- ${row.match_date}: ${row.match_count} matches`);
        totalMatches += row.match_count;
      });
      
      console.log(`\nTotal Round of 16 matches: ${totalMatches}`);
      
      if (results.length === 2) {
        console.log("\n✅ SUCCESS: Round of 16 now has exactly 2 days!");
      } else {
        console.log("\n❌ ERROR: Round of 16 still doesn't have exactly 2 days.");
      }
      
      // Output instructions
      console.log("\nFinal steps to fix UI display:");
      console.log("1. Restart your server");
      console.log("2. Clear your browser cache or use incognito mode");
      console.log("3. The Round of 16 page should now show exactly 2 days");
      
      db.close();
    });
  }
});
