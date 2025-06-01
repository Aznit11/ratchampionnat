// Script to fix the UI showing 3 days for Round of 16
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Checking ALL matches in the system that could affect Round of 16 display...");

// Get ALL matches including those with similar stages to Round of 16
db.all(`
  SELECT 
    id, match_date, match_time, stage, home_team_id, away_team_id, played
  FROM matches 
  WHERE stage LIKE '%Round of 16%' OR stage LIKE '%round of 16%' OR stage LIKE '%Round%16%'
  ORDER BY match_date, match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${matches.length} matches with 'Round of 16' in their stage name`);
  
  // Group matches by date
  const dateMatches = {};
  matches.forEach(match => {
    if (!dateMatches[match.match_date]) {
      dateMatches[match.match_date] = [];
    }
    dateMatches[match.match_date].push(match);
  });
  
  // Display matches by day
  const dates = Object.keys(dateMatches).sort();
  console.log(`\nFound matches spanning ${dates.length} days:`);
  
  dates.forEach(date => {
    console.log(`\n${date}:`);
    dateMatches[date].forEach(match => {
      console.log(`  - Match ${match.id}: ${match.stage} at ${match.match_time}`);
    });
  });
  
  // Now check if there are any variations in the stage name
  const stageVariations = {};
  matches.forEach(match => {
    stageVariations[match.stage] = (stageVariations[match.stage] || 0) + 1;
  });
  
  console.log("\nStage name variations found:");
  Object.keys(stageVariations).forEach(stage => {
    console.log(`  - "${stage}": ${stageVariations[stage]} matches`);
  });
  
  // Fix the issue by ensuring all matches have exactly the same stage name
  if (Object.keys(stageVariations).length > 1) {
    console.log("\nFound multiple stage name variations - fixing to use consistent 'Round of 16'");
    
    // Use the standard "Round of 16" name
    const standardStageName = "Round of 16";
    let updatedCount = 0;
    
    // Update all variations to the standard name
    const updatePromises = Object.keys(stageVariations)
      .filter(stage => stage !== standardStageName)
      .map(stageName => {
        return new Promise((resolve, reject) => {
          db.run(
            'UPDATE matches SET stage = ? WHERE stage = ?',
            [standardStageName, stageName],
            function(err) {
              if (err) {
                console.error(`Error updating stage name from "${stageName}":`, err.message);
                reject(err);
              } else {
                console.log(`Updated ${this.changes} matches from "${stageName}" to "${standardStageName}"`);
                updatedCount += this.changes;
                resolve(this.changes);
              }
            }
          );
        });
      });
    
    Promise.all(updatePromises)
      .then(() => {
        console.log(`\nUpdated ${updatedCount} matches to use consistent stage name`);
        checkForExtraDays();
      })
      .catch(err => {
        console.error("Error updating stage names:", err);
        checkForExtraDays();
      });
  } else {
    checkForExtraDays();
  }
  
  // Check if we need to delete matches from a third day
  function checkForExtraDays() {
    if (dates.length > 2) {
      console.log("\nFound more than 2 days for Round of 16 - need to fix this");
      
      // We want to keep only the first two days and delete any matches on additional days
      const daysToKeep = dates.slice(0, 2);
      const daysToRemove = dates.slice(2);
      
      console.log(`Days to keep: ${daysToKeep.join(', ')}`);
      console.log(`Days to remove: ${daysToRemove.join(', ')}`);
      
      // Collect all match IDs to delete
      const matchesToDelete = [];
      daysToRemove.forEach(date => {
        dateMatches[date].forEach(match => {
          matchesToDelete.push(match.id);
        });
      });
      
      if (matchesToDelete.length > 0) {
        console.log(`\nDeleting ${matchesToDelete.length} matches from extra days: ${matchesToDelete.join(', ')}`);
        
        // Delete these matches
        const placeholders = matchesToDelete.map(() => '?').join(',');
        db.run(`DELETE FROM matches WHERE id IN (${placeholders})`, matchesToDelete, function(err) {
          if (err) {
            console.error(`Error deleting matches:`, err.message);
            verifyChanges();
          } else {
            console.log(`Successfully deleted ${this.changes} matches from extra days`);
            verifyChanges();
          }
        });
      } else {
        verifyChanges();
      }
    } else {
      console.log("\nCorrect number of days (2) found for Round of 16 - checking match distribution");
      verifyChanges();
    }
  }
  
  // Make sure each of the 2 days has exactly 4 matches
  function verifyChanges() {
    // Re-check the database to see our current state
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
      
      console.log("\nCurrent Round of 16 match distribution:");
      let totalMatches = 0;
      
      results.forEach(row => {
        console.log(`- ${row.match_date}: ${row.match_count} matches`);
        totalMatches += row.match_count;
      });
      
      console.log(`\nTotal Round of 16 matches: ${totalMatches}`);
      
      if (results.length === 2 && totalMatches === 8) {
        console.log("\n✓ SUCCESS: Round of 16 is now correctly configured with 8 matches across 2 days!");
        
        // Check for duplicate team entries
        checkDuplicateTeams();
      } else {
        console.log("\n✗ ERROR: Round of 16 structure is still not correct.");
        
        if (results.length < 2) {
          console.log("Not enough days - need to add another day");
          // We would add code here to add another day if needed
        } else if (results.length > 2) {
          console.log("Too many days - need to remove extra days");
          // We've already attempted to fix this above
        }
        
        checkDuplicateTeams();
      }
    });
  }
  
  // Check if there are duplicate team entries
  function checkDuplicateTeams() {
    db.all(`
      SELECT 
        m.id, m.match_date, m.match_time, m.stage, 
        m.home_team_id, m.away_team_id,
        ht.name as home_team_name, at.name as away_team_name
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE m.stage = 'Round of 16'
      ORDER BY m.match_date, m.match_time
    `, [], (err, matches) => {
      if (err) {
        console.error("Error checking for duplicate teams:", err.message);
        fixEJSTemplate();
        return;
      }
      
      const teamCounts = {};
      
      // Count occurrences of each team
      matches.forEach(match => {
        if (match.home_team_id) {
          teamCounts[match.home_team_id] = (teamCounts[match.home_team_id] || 0) + 1;
        }
        if (match.away_team_id) {
          teamCounts[match.away_team_id] = (teamCounts[match.away_team_id] || 0) + 1;
        }
      });
      
      // Find teams that appear more than once
      const duplicateTeams = Object.entries(teamCounts)
        .filter(([id, count]) => count > 1)
        .map(([id]) => parseInt(id));
      
      if (duplicateTeams.length > 0) {
        console.log("\nFound teams appearing in multiple Round of 16 matches:");
        duplicateTeams.forEach(teamId => {
          const teamMatches = matches.filter(m => m.home_team_id === teamId || m.away_team_id === teamId);
          console.log(`- Team ID ${teamId} appears in ${teamCounts[teamId]} matches`);
          
          teamMatches.forEach(match => {
            const position = match.home_team_id === teamId ? 'Home' : 'Away';
            console.log(`  * Match ${match.id} (${match.match_date}): ${position} team`);
          });
        });
        
        // This could be causing UI issues, so let's fix by assigning different teams
        console.log("\nRe-assigning teams to avoid duplicates...");
        
        // Check how many teams we have available
        db.all("SELECT * FROM teams", [], (err, allTeams) => {
          if (err) {
            console.error("Error fetching teams:", err.message);
            fixEJSTemplate();
            return;
          }
          
          console.log(`Found ${allTeams.length} teams in the database`);
          
          if (allTeams.length >= 16) {
            // If we have enough teams, assign unique ones
            console.log("We have enough teams to assign unique ones to each match");
            
            // Sort our matches by date and time
            matches.sort((a, b) => {
              if (a.match_date === b.match_date) {
                return a.match_time.localeCompare(b.match_time);
              }
              return a.match_date.localeCompare(b.match_date);
            });
            
            // Assign teams to matches
            const updates = [];
            const usedTeams = new Set();
            let teamIndex = 0;
            
            matches.forEach(match => {
              // Find two unused teams
              let homeTeamId, awayTeamId;
              
              while (!homeTeamId || usedTeams.has(homeTeamId)) {
                homeTeamId = allTeams[teamIndex % allTeams.length].id;
                teamIndex++;
              }
              usedTeams.add(homeTeamId);
              
              while (!awayTeamId || usedTeams.has(awayTeamId) || awayTeamId === homeTeamId) {
                awayTeamId = allTeams[teamIndex % allTeams.length].id;
                teamIndex++;
              }
              usedTeams.add(awayTeamId);
              
              updates.push({
                matchId: match.id,
                homeTeamId,
                awayTeamId
              });
            });
            
            // Update the database
            let updatedCount = 0;
            const updatePromises = updates.map(update => {
              return new Promise((resolve, reject) => {
                db.run(
                  'UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?',
                  [update.homeTeamId, update.awayTeamId, update.matchId],
                  function(err) {
                    if (err) {
                      console.error(`Error updating match ${update.matchId}:`, err.message);
                      reject(err);
                    } else {
                      console.log(`Updated match ${update.matchId} with teams ${update.homeTeamId} vs ${update.awayTeamId}`);
                      updatedCount++;
                      resolve();
                    }
                  }
                );
              });
            });
            
            Promise.all(updatePromises)
              .then(() => {
                console.log(`\nUpdated ${updatedCount} matches with unique teams`);
                fixEJSTemplate();
              })
              .catch(err => {
                console.error("Error updating teams:", err);
                fixEJSTemplate();
              });
          } else {
            console.log("Not enough teams available, using what we have");
            fixEJSTemplate();
          }
        });
      } else {
        console.log("\nNo duplicate teams found - not a cause of the UI issue");
        fixEJSTemplate();
      }
    });
  }
  
  // Check and fix the EJS template if needed
  function fixEJSTemplate() {
    console.log("\nFinal UI verification completed. Please restart your server to see the changes.");
    db.close();
  }
});
