// Complete fix for Round of 16 UI display issues
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Complete Round of 16 fix - starting fresh to ensure exactly 2 days in the UI...");

// First, completely delete ALL existing Round of 16 matches to start fresh
db.run('DELETE FROM matches WHERE stage = "Round of 16"', function(err) {
  if (err) {
    console.error("Error deleting Round of 16 matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Deleted all existing Round of 16 matches`);
  
  // Get all teams for later use
  db.all("SELECT * FROM teams", [], (err, teams) => {
    if (err) {
      console.error("Error getting teams:", err.message);
      db.close();
      return;
    }
    
    console.log(`Found ${teams.length} teams in the database`);
    
    // Make sure we have teams to use
    if (teams.length < 2) {
      console.error("Not enough teams in the database");
      db.close();
      return;
    }
    
    // Create exactly 8 matches across 2 days - using different team IDs for each match
    const day1 = '2025-06-25'; // First day
    const day2 = '2025-06-27'; // Second day
    
    // Define all 8 matches with exact times and teams
    const matches = [
      // Day 1 - 4 matches
      { date: day1, time: '16:00', home: teams[0].id, away: teams[1].id, description: 'A1 vs B2' },
      { date: day1, time: '18:00', home: teams[2].id, away: teams[3].id, description: 'A2 vs B1' },
      { date: day1, time: '20:00', home: teams[4].id, away: teams[5].id, description: 'C1 vs D2' },
      { date: day1, time: '22:00', home: teams[6].id, away: teams[7].id, description: 'C2 vs D1' },
      // Day 2 - 4 matches
      { date: day2, time: '16:00', home: teams[8 % teams.length].id, away: teams[9 % teams.length].id, description: 'E1 vs F2' },
      { date: day2, time: '18:00', home: teams[10 % teams.length].id, away: teams[11 % teams.length].id, description: 'E2 vs F1' },
      { date: day2, time: '20:00', home: teams[12 % teams.length].id, away: teams[13 % teams.length].id, description: 'G1 vs H2' },
      { date: day2, time: '22:00', home: teams[14 % teams.length].id, away: teams[15 % teams.length].id, description: 'G2 vs H1' }
    ];
    
    console.log(`Creating 8 new Round of 16 matches across 2 days with unique teams...`);
    
    // Insert all matches
    let completedInserts = 0;
    
    matches.forEach(match => {
      db.run(
        'INSERT INTO matches (match_date, match_time, stage, played, home_team_id, away_team_id, home_score, away_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [match.date, match.time, 'Round of 16', 0, match.home, match.away, null, null],
        function(err) {
          if (err) {
            console.error(`Error creating match on ${match.date} at ${match.time}:`, err.message);
          } else {
            console.log(`Created match on ${match.date} at ${match.time}: ${match.description} (ID: ${this.lastID})`);
          }
          
          completedInserts++;
          if (completedInserts === matches.length) {
            verifyChanges();
          }
        }
      );
    });
    
    // Verify that we now have exactly 8 matches across 2 days
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
        
        console.log("\nVerification results:");
        let totalCount = 0;
        
        results.forEach(row => {
          console.log(`- ${row.match_date}: ${row.count} matches`);
          totalCount += row.count;
        });
        
        console.log(`\nTotal Round of 16 matches: ${totalCount}`);
        
        if (results.length === 2 && totalCount === 8) {
          console.log("\n✓ SUCCESS: Round of 16 is now exactly 8 matches across 2 days!");
        } else {
          console.log("\n✗ ERROR: Round of 16 structure is still not correct.");
        }
        
        // Show all the matches for a final check
        db.all(`
          SELECT id, match_date, match_time, home_team_id, away_team_id
          FROM matches
          WHERE stage = 'Round of 16'
          ORDER BY match_date, match_time
        `, [], (err, matches) => {
          if (err) {
            console.error("Error getting final match list:", err.message);
            db.close();
            return;
          }
          
          console.log("\nFinal Round of 16 schedule:");
          
          // Group by date
          const matchesByDate = {};
          matches.forEach(match => {
            if (!matchesByDate[match.match_date]) {
              matchesByDate[match.match_date] = [];
            }
            matchesByDate[match.match_date].push(match);
          });
          
          Object.keys(matchesByDate).sort().forEach((date, dayIndex) => {
            console.log(`\nDay ${dayIndex + 1} (${date}):`);
            matchesByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
              console.log(`  - Match ${match.id}: ${match.match_time}, Teams: ${match.home_team_id} vs ${match.away_team_id}`);
            });
          });
          
          console.log("\nCompleted all fixes. Please restart your server to see the changes.");
          updateUpdateFunction();
        });
      });
    }
    
    // Update the updateRoundOf16Matches function in server.js
    function updateUpdateFunction() {
      // First, read the current server.js file
      const serverPath = path.join(__dirname, 'server.js');
      
      fs.readFile(serverPath, 'utf8', (err, data) => {
        if (err) {
          console.error("Error reading server.js:", err.message);
          db.close();
          return;
        }
        
        // Update the updateRoundOf16Matches function
        const updatedFunction = `// Update Round of 16 matches based on group standings
function updateRoundOf16Matches() {
  console.log('Updating Round of 16 matches based on group standings...');
  
  // Get all group winners
  const winnersQuery = \`
    SELECT t.id, t.name, g.name as group_name
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    WHERE t.team_in_group_id = 1
    ORDER BY g.id
  \`;
  
  // Get all group runners-up
  const runnersUpQuery = \`
    SELECT t.id, t.name, g.name as group_name
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    WHERE t.team_in_group_id = 2
    ORDER BY g.id
  \`;
  
  db.all(winnersQuery, [], (err, winners) => {
    if (err) {
      console.error('Error getting group winners:', err.message);
      return;
    }
    
    db.all(runnersUpQuery, [], (err, runnersUp) => {
      if (err) {
        console.error('Error getting group runners-up:', err.message);
        return;
      }
      
      console.log(\`Found \${winners.length} group winners and \${runnersUp.length} runners-up\`);
      
      // Only proceed if we have all 8 group winners and 8 runners-up
      if (winners.length === 8 && runnersUp.length === 8) {
        // Map winners and runners-up to their respective groups (A-H)
        const groupWinners = {};
        const groupRunnersUp = {};
        
        winners.forEach(team => {
          const groupLetter = team.group_name.slice(-1); // Extract the last character (e.g., "A" from "Group A")
          groupWinners[groupLetter] = team.id;
        });
        
        runnersUp.forEach(team => {
          const groupLetter = team.group_name.slice(-1);
          groupRunnersUp[groupLetter] = team.id;
        });
        
        // Get the Round of 16 matches
        db.all('SELECT * FROM matches WHERE stage = "Round of 16" ORDER BY match_date, match_time', [], (err, matches) => {
          if (err) {
            console.error('Error getting Round of 16 matches:', err.message);
            return;
          }
          
          if (matches.length === 8) {
            // Day 1 matches
            const day1Matches = matches.slice(0, 4);
            // Match 1: A1 vs B2
            updateMatch(day1Matches[0], groupWinners['A'], groupRunnersUp['B']);
            // Match 2: A2 vs B1
            updateMatch(day1Matches[1], groupRunnersUp['A'], groupWinners['B']);
            // Match 3: C1 vs D2
            updateMatch(day1Matches[2], groupWinners['C'], groupRunnersUp['D']);
            // Match 4: C2 vs D1
            updateMatch(day1Matches[3], groupRunnersUp['C'], groupWinners['D']);
            
            // Day 2 matches
            const day2Matches = matches.slice(4, 8);
            // Match 5: E1 vs F2
            updateMatch(day2Matches[0], groupWinners['E'], groupRunnersUp['F']);
            // Match 6: E2 vs F1
            updateMatch(day2Matches[1], groupRunnersUp['E'], groupWinners['F']);
            // Match 7: G1 vs H2
            updateMatch(day2Matches[2], groupWinners['G'], groupRunnersUp['H']);
            // Match 8: G2 vs H1
            updateMatch(day2Matches[3], groupRunnersUp['G'], groupWinners['H']);
            
            console.log('Round of 16 matches updated successfully!');
          } else {
            console.error(\`Expected 8 Round of 16 matches, but found \${matches.length}\`);
          }
        });
      } else {
        console.log('Not all group stages are complete yet');
      }
    });
  });
  
  // Helper function to update a match with team IDs
  function updateMatch(match, homeTeamId, awayTeamId) {
    db.run(
      'UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?',
      [homeTeamId, awayTeamId, match.id],
      function(err) {
        if (err) {
          console.error(\`Error updating match \${match.id}:\`, err.message);
        } else {
          console.log(\`Updated match \${match.id} with teams \${homeTeamId} vs \${awayTeamId}\`);
        }
      }
    );
  }
}`;
        
        // Find the existing updateRoundOf16Matches function
        const functionRegex = /function updateRoundOf16Matches\(\)[\s\S]*?^}/m;
        const updatedData = data.replace(functionRegex, updatedFunction);
        
        // Write the updated file
        fs.writeFile(serverPath, updatedData, 'utf8', (err) => {
          if (err) {
            console.error("Error writing to server.js:", err.message);
          } else {
            console.log("Successfully updated the updateRoundOf16Matches function in server.js");
          }
          
          db.close();
        });
      });
    }
  });
});
