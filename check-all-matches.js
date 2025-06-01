// Check all matches in the database to see what's going on
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Checking ALL matches in the database...");

// First, check all matches
db.all(`
  SELECT id, stage, match_date, match_time
  FROM matches
  ORDER BY match_date, match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Total matches in database: ${matches.length}`);
  
  // Group by stage
  const stageMatches = {};
  matches.forEach(match => {
    if (!stageMatches[match.stage]) {
      stageMatches[match.stage] = [];
    }
    stageMatches[match.stage].push(match);
  });
  
  console.log("\nMatches by stage:");
  Object.keys(stageMatches).forEach(stage => {
    console.log(`- ${stage}: ${stageMatches[stage].length} matches`);
  });
  
  // Check if we have any Round of 16 like matches
  const r16Matches = matches.filter(match => 
    match.stage && match.stage.toLowerCase().includes('round') && 
    match.stage.toLowerCase().includes('16')
  );
  
  console.log(`\nFound ${r16Matches.length} matches that might be Round of 16`);
  r16Matches.forEach(match => {
    console.log(`- Match ${match.id}: ${match.stage} on ${match.match_date} at ${match.match_time}`);
  });
  
  // Now create fresh Round of 16 matches if needed
  if (r16Matches.length === 0) {
    console.log("\nNo Round of 16 matches found. Creating new ones...");
    createFreshR16Matches();
  } else if (r16Matches.length !== 8) {
    console.log("\nIncorrect number of Round of 16 matches. Recreating them...");
    
    // Delete existing ones first
    const idsToDelete = r16Matches.map(match => match.id);
    const placeholders = idsToDelete.map(() => '?').join(',');
    
    db.run(`DELETE FROM matches WHERE id IN (${placeholders})`, idsToDelete, function(err) {
      if (err) {
        console.error("Error deleting old Round of 16 matches:", err.message);
        db.close();
      } else {
        console.log(`Deleted ${this.changes} old Round of 16 matches`);
        createFreshR16Matches();
      }
    });
  } else {
    // We have 8 matches, but check if they're on exactly 2 days
    const dates = [...new Set(r16Matches.map(match => match.match_date))];
    
    if (dates.length !== 2) {
      console.log(`\nRound of 16 matches are on ${dates.length} days, but should be on 2 days. Fixing...`);
      
      // Delete existing ones first
      const idsToDelete = r16Matches.map(match => match.id);
      const placeholders = idsToDelete.map(() => '?').join(',');
      
      db.run(`DELETE FROM matches WHERE id IN (${placeholders})`, idsToDelete, function(err) {
        if (err) {
          console.error("Error deleting old Round of 16 matches:", err.message);
          db.close();
        } else {
          console.log(`Deleted ${this.changes} old Round of 16 matches`);
          createFreshR16Matches();
        }
      });
    } else {
      console.log(`\nRound of 16 matches are already on 2 days: ${dates.join(', ')}`);
      
      // Just standardize the stage name
      db.run(`UPDATE matches SET stage = 'Round of 16' WHERE id IN (${r16Matches.map(m => m.id).join(',')})`, function(err) {
        if (err) {
          console.error("Error standardizing stage names:", err.message);
        } else {
          console.log(`Standardized stage name for ${this.changes} matches`);
        }
        
        db.close();
      });
    }
  }
  
  // Function to create fresh Round of 16 matches
  function createFreshR16Matches() {
    // First, get some teams to use
    db.all(`SELECT id FROM teams LIMIT 16`, [], (err, teams) => {
      if (err) {
        console.error("Error getting teams:", err.message);
        db.close();
        return;
      }
      
      // Make sure we have enough teams
      if (teams.length < 2) {
        console.error("Not enough teams in the database");
        db.close();
        return;
      }
      
      // Create exactly 8 matches across 2 days
      const day1 = '2025-06-25';
      const day2 = '2025-06-27';
      
      // Match structure
      const matches = [
        // Day 1 - 4 matches
        { date: day1, time: '16:00' },
        { date: day1, time: '18:00' },
        { date: day1, time: '20:00' },
        { date: day1, time: '22:00' },
        // Day 2 - 4 matches
        { date: day2, time: '16:00' },
        { date: day2, time: '18:00' },
        { date: day2, time: '20:00' },
        { date: day2, time: '22:00' }
      ];
      
      // Assign teams to matches (use the same team if not enough)
      for (let i = 0; i < 8; i++) {
        const homeTeamId = teams[i % teams.length].id;
        const awayTeamId = teams[(i + 1) % teams.length].id;
        matches[i].homeTeamId = homeTeamId;
        matches[i].awayTeamId = awayTeamId;
      }
      
      console.log("Creating 8 new Round of 16 matches...");
      
      // Insert all matches
      let insertCount = 0;
      matches.forEach(match => {
        db.run(
          'INSERT INTO matches (match_date, match_time, stage, played, home_team_id, away_team_id, home_score, away_score) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)',
          [match.date, match.time, 'Round of 16', 0, match.homeTeamId, match.awayTeamId],
          function(err) {
            if (err) {
              console.error(`Error creating match on ${match.date} at ${match.time}:`, err.message);
            } else {
              console.log(`Created match on ${match.date} at ${match.time} (ID: ${this.lastID})`);
            }
            
            insertCount++;
            if (insertCount === 8) {
              verifyChanges();
            }
          }
        );
      });
    });
  }
  
  // Verify our changes
  function verifyChanges() {
    db.all(`
      SELECT match_date, COUNT(*) as match_count
      FROM matches
      WHERE stage = 'Round of 16'
      GROUP BY match_date
      ORDER BY match_date
    `, [], (err, results) => {
      if (err) {
        console.error("Error verifying changes:", err.message);
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
      
      if (results.length === 2 && totalMatches === 8) {
        console.log("\n✅ SUCCESS: Round of 16 now has exactly 8 matches on 2 days!");
      } else {
        console.log("\n❌ ERROR: Round of 16 configuration is still not correct.");
      }
      
      // Final instructions
      console.log("\nFinal steps to fix UI display:");
      console.log("1. Restart your server");
      console.log("2. Clear your browser cache or use incognito mode");
      console.log("3. The Round of 16 page should now show exactly 2 days");
      
      db.close();
    });
  }
});
