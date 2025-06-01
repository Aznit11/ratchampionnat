// Simplified script to fix Round of 16 UI display issues
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Starting simplified Round of 16 fix...");

// First, check the database schema for the teams table
db.all("PRAGMA table_info(teams)", [], (err, columns) => {
  if (err) {
    console.error("Error checking teams table schema:", err.message);
    db.close();
    return;
  }

  console.log("Teams table columns:");
  columns.forEach(col => {
    console.log(`- ${col.name}: ${col.type}`);
  });
  
  // Get all current teams to work with
  db.all("SELECT * FROM teams", [], (err, teams) => {
    if (err) {
      console.error("Error fetching teams:", err.message);
      db.close();
      return;
    }
    
    console.log(`\nFound ${teams.length} teams in the database`);
    
    // Get all Round of 16 matches
    db.all(`
      SELECT * FROM matches
      WHERE stage = 'Round of 16'
      ORDER BY match_date, match_time
    `, [], (err, matches) => {
      if (err) {
        console.error("Error fetching Round of 16 matches:", err.message);
        db.close();
        return;
      }
      
      console.log(`\nFound ${matches.length} Round of 16 matches`);
      
      // Sort matches by date and time
      matches.sort((a, b) => {
        if (a.match_date === b.match_date) {
          return a.match_time.localeCompare(b.match_time);
        }
        return a.match_date.localeCompare(b.match_date);
      });
      
      // Now update each match with the proper team IDs
      // We'll just use existing team IDs from the teams table
      // This ensures all matches show up correctly even if the team names are placeholders
      
      // We need to use team IDs that exist in the database
      const teamIds = teams.map(t => t.id);
      
      if (teamIds.length < 16) {
        console.log("Not enough teams in database. Using existing teams as placeholders.");
      }
      
      // Create our matchups for days 1 and 2
      // We'll use the first 16 team IDs for our placeholders
      const safeTeamIds = teamIds.slice(0, Math.min(16, teamIds.length));
      
      // If we don't have 16 teams, we'll reuse some
      while (safeTeamIds.length < 16) {
        safeTeamIds.push(safeTeamIds[safeTeamIds.length % teamIds.length]);
      }
      
      // Define our matchup pattern using indexes into the safeTeamIds array
      const day1Matchups = [
        { home: 0, away: 9 },   // A1 vs B2
        { home: 8, away: 1 },   // B1 vs A2
        { home: 2, away: 11 },  // C1 vs D2
        { home: 10, away: 3 }   // D1 vs C2
      ];
      
      const day2Matchups = [
        { home: 4, away: 13 },  // E1 vs F2
        { home: 12, away: 5 },  // F1 vs E2
        { home: 6, away: 15 },  // G1 vs H2
        { home: 14, away: 7 }   // H1 vs G2
      ];
      
      const dates = [...new Set(matches.map(m => m.match_date))].sort();
      
      if (dates.length < 2) {
        console.error("Not enough unique dates for Round of 16. Need exactly 2 days.");
        db.close();
        return;
      }
      
      // Get day 1 and day 2 matches
      const day1Matches = matches.filter(m => m.match_date === dates[0]);
      const day2Matches = matches.filter(m => m.match_date === dates[1]);
      
      console.log(`\nDay 1 (${dates[0]}): ${day1Matches.length} matches`);
      console.log(`Day 2 (${dates[1]}): ${day2Matches.length} matches`);
      
      // Update day 1 matches
      let updateCount = 0;
      
      const updateDay1 = () => {
        let completed = 0;
        
        day1Matches.forEach((match, index) => {
          if (index >= day1Matchups.length) return;
          
          const matchup = day1Matchups[index];
          const homeTeamId = safeTeamIds[matchup.home];
          const awayTeamId = safeTeamIds[matchup.away];
          
          db.run(`
            UPDATE matches 
            SET home_team_id = ?, away_team_id = ? 
            WHERE id = ?
          `, [homeTeamId, awayTeamId, match.id], function(err) {
            if (err) {
              console.error(`Error updating match ${match.id}:`, err.message);
            } else {
              console.log(`Updated match ${match.id} (Day 1, ${match.match_time})`);
              updateCount++;
            }
            
            completed++;
            if (completed === Math.min(day1Matches.length, day1Matchups.length)) {
              updateDay2();
            }
          });
        });
        
        // If no day 1 matches, move on to day 2
        if (day1Matches.length === 0) {
          updateDay2();
        }
      };
      
      const updateDay2 = () => {
        let completed = 0;
        
        day2Matches.forEach((match, index) => {
          if (index >= day2Matchups.length) return;
          
          const matchup = day2Matchups[index];
          const homeTeamId = safeTeamIds[matchup.home];
          const awayTeamId = safeTeamIds[matchup.away];
          
          db.run(`
            UPDATE matches 
            SET home_team_id = ?, away_team_id = ? 
            WHERE id = ?
          `, [homeTeamId, awayTeamId, match.id], function(err) {
            if (err) {
              console.error(`Error updating match ${match.id}:`, err.message);
            } else {
              console.log(`Updated match ${match.id} (Day 2, ${match.match_time})`);
              updateCount++;
            }
            
            completed++;
            if (completed === Math.min(day2Matches.length, day2Matchups.length)) {
              finishUpdates();
            }
          });
        });
        
        // If no day 2 matches, finish up
        if (day2Matches.length === 0) {
          finishUpdates();
        }
      };
      
      const finishUpdates = () => {
        console.log(`\nCompleted ${updateCount} match updates`);
        
        // Verify the changes
        db.all(`
          SELECT 
            m.id, m.match_date, m.match_time, 
            ht.name as home_team_name, at.name as away_team_name
          FROM matches m
          LEFT JOIN teams ht ON m.home_team_id = ht.id
          LEFT JOIN teams at ON m.away_team_id = at.id
          WHERE m.stage = 'Round of 16'
          ORDER BY m.match_date, m.match_time
        `, [], (err, updatedMatches) => {
          if (err) {
            console.error("Error verifying updates:", err.message);
          } else {
            console.log("\nUpdated Round of 16 matches:");
            
            // Group by date
            const matchesByDate = {};
            updatedMatches.forEach(match => {
              if (!matchesByDate[match.match_date]) {
                matchesByDate[match.match_date] = [];
              }
              matchesByDate[match.match_date].push(match);
            });
            
            Object.keys(matchesByDate).sort().forEach(date => {
              console.log(`\n${date}:`);
              matchesByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
                console.log(`  - Match ${match.id}: ${match.match_time}, ${match.home_team_name || 'TBD'} vs ${match.away_team_name || 'TBD'}`);
              });
            });
          }
          
          console.log("\nDone! The Round of 16 matches should now display correctly in the UI with teams assigned to each match.");
          db.close();
        });
      };
      
      // Start the update process
      updateDay1();
    });
  });
});
