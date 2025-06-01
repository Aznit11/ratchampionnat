// Script to update Round of 16 structure as specified
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Delete existing Round of 16 matches
db.run("DELETE FROM matches WHERE stage = 'Round of 16'", function(err) {
  if (err) {
    console.error('Error deleting existing Round of 16 matches:', err.message);
    return;
  }
  
  console.log(`Deleted existing Round of 16 matches`);
  
  // Define match structure as requested
  const matchStructure = [
    // Day 1 - First 4 matches
    {
      match_date: '2025-06-25',
      matches: [
        { time: '16:00', home_team: 'A1', away_team: 'B2' },
        { time: '18:00', home_team: 'A2', away_team: 'B1' },
        { time: '20:00', home_team: 'C1', away_team: 'D2' },
        { time: '22:00', home_team: 'C2', away_team: 'D1' }
      ]
    },
    // Day 2 - Last 4 matches
    {
      match_date: '2025-06-27',
      matches: [
        { time: '16:00', home_team: 'E1', away_team: 'F2' },
        { time: '18:00', home_team: 'E2', away_team: 'F1' },
        { time: '20:00', home_team: 'G1', away_team: 'H2' },
        { time: '22:00', home_team: 'G2', away_team: 'H1' }
      ]
    }
  ];
  
  // Function to map team code to proper SQL placeholder
  function mapTeamCode(code) {
    const group = code.charAt(0);
    const position = code.charAt(1);
    
    if (position === '1') {
      return `Winner Group ${group}`;
    } else {
      return `Runner-up Group ${group}`;
    }
  }
  
  // Insert the matches with the specified structure
  let insertedCount = 0;
  const totalMatches = matchStructure.reduce((total, day) => total + day.matches.length, 0);
  
  matchStructure.forEach(day => {
    day.matches.forEach(match => {
      const homePlaceholder = mapTeamCode(match.home_team);
      const awayPlaceholder = mapTeamCode(match.away_team);
      
      // Insert the match
      db.run(
        'INSERT INTO matches (match_date, match_time, stage, notes) VALUES (?, ?, ?, ?)',
        [day.match_date, match.time, 'Round of 16', `${match.home_team} vs ${match.away_team}`],
        function(err) {
          if (err) {
            console.error(`Error creating match: ${err.message}`);
          } else {
            const matchId = this.lastID;
            console.log(`Created match ${matchId}: ${match.home_team} vs ${match.away_team} on ${day.match_date} at ${match.time}`);
            
            // Create a SQL function to update team IDs when group stage is complete
            db.run(
              `UPDATE matches SET notes = ? WHERE id = ?`,
              [`${homePlaceholder} vs ${awayPlaceholder}`, matchId],
              function(err) {
                if (err) {
                  console.error(`Error updating match notes: ${err.message}`);
                } else {
                  insertedCount++;
                  
                  if (insertedCount === totalMatches) {
                    console.log(`\nAll ${totalMatches} Round of 16 matches inserted successfully`);
                    createUpdateFunction();
                  }
                }
              }
            );
          }
        }
      );
    });
  });
  
  // Create an update function to be executed when group stage is complete
  function createUpdateFunction() {
    const updateFunction = `
      // Function to update Round of 16 with correct team assignments based on group standings
      function updateRoundOf16TeamAssignments() {
        // Get all groups and team standings
        const groupPromises = [];
        
        // Process each group A through H
        for (let groupChar = 65; groupChar <= 72; groupChar++) {
          const groupLetter = String.fromCharCode(groupChar);
          
          // Get winners and runners-up for each group
          const promise = new Promise((resolve, reject) => {
            db.all(
              \`SELECT t.id as team_id, t.name as team_name, 
                     (COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                                   (m.away_team_id = t.id AND m.away_score > m.home_score) 
                              THEN 1 END) * 3) + 
                     COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score = m.away_score) OR 
                                   (m.away_team_id = t.id AND m.away_score = m.home_score) 
                              THEN 1 END) as points,
                     SUM(CASE WHEN m.home_team_id = t.id THEN COALESCE(m.home_score, 0) - COALESCE(m.away_score, 0) 
                              WHEN m.away_team_id = t.id THEN COALESCE(m.away_score, 0) - COALESCE(m.home_score, 0) 
                              ELSE 0 END) as goal_difference,
                     SUM(CASE WHEN m.home_team_id = t.id THEN COALESCE(m.home_score, 0) 
                              WHEN m.away_team_id = t.id THEN COALESCE(m.away_score, 0) 
                              ELSE 0 END) as goals_for
               FROM teams t
               JOIN groups g ON t.group_id = g.id AND g.name = 'Group ' || ?
               LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.stage = 'Group Stage' AND m.played = 1
               GROUP BY t.id
               ORDER BY points DESC, goal_difference DESC, goals_for DESC, t.name\`,
              [groupLetter],
              (err, teams) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                resolve({
                  group: groupLetter,
                  winner: teams.length > 0 ? teams[0] : null,
                  runnerUp: teams.length > 1 ? teams[1] : null
                });
              }
            );
          });
          
          groupPromises.push(promise);
        }
        
        // When all group data is collected, update the Round of 16 matches
        Promise.all(groupPromises)
          .then(groupResults => {
            const placeholders = {};
            
            // Map team IDs to their placeholders
            groupResults.forEach(result => {
              if (result.winner) {
                placeholders[\`Winner Group \${result.group}\`] = result.winner.team_id;
              }
              if (result.runnerUp) {
                placeholders[\`Runner-up Group \${result.group}\`] = result.runnerUp.team_id;
              }
            });
            
            // Get Round of 16 matches to update
            db.all(
              "SELECT id, match_date, match_time, notes FROM matches WHERE stage = 'Round of 16' ORDER BY match_date, match_time",
              (err, matches) => {
                if (err) {
                  console.error('Error getting Round of 16 matches:', err.message);
                  return;
                }
                
                // Update each match
                matches.forEach(match => {
                  // Extract team placeholders from notes
                  const notesPattern = /(Winner Group [A-H]|Runner-up Group [A-H]) vs (Winner Group [A-H]|Runner-up Group [A-H])/;
                  const noteMatch = match.notes ? match.notes.match(notesPattern) : null;
                  
                  if (noteMatch) {
                    const homePlaceholder = noteMatch[1];
                    const awayPlaceholder = noteMatch[2];
                    const homeTeamId = placeholders[homePlaceholder];
                    const awayTeamId = placeholders[awayPlaceholder];
                    
                    if (homeTeamId && awayTeamId) {
                      db.run(
                        'UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?',
                        [homeTeamId, awayTeamId, match.id],
                        function(err) {
                          if (err) {
                            console.error(\`Error updating Round of 16 match \${match.id}:\`, err.message);
                          } else {
                            console.log(\`Updated Round of 16 match \${match.id}: \${homePlaceholder} (\${homeTeamId}) vs \${awayPlaceholder} (\${awayTeamId})\`);
                          }
                        }
                      );
                    }
                  }
                });
              }
            );
          })
          .catch(err => {
            console.error('Error processing group results:', err);
          });
      }
    `;
    
    // Write the update function to a file
    const fs = require('fs');
    fs.writeFile(path.join(__dirname, 'update-r16-teams.js'), updateFunction, err => {
      if (err) {
        console.error('Error writing update function:', err.message);
      } else {
        console.log('Created update function file: update-r16-teams.js');
      }
      
      // Close the database connection
      db.close();
    });
  }
});
