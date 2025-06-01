// Script to fix Round of 16 to be exactly 8 matches in 2 days
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// First, get ALL Round of 16 matches to see what we're dealing with
db.all(`
  SELECT id, match_date, match_time, stage 
  FROM matches 
  WHERE stage = 'Round of 16'
  ORDER BY match_date, match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${matches.length} Round of 16 matches total`);
  
  // Group matches by date to identify all unique days
  const matchesByDate = {};
  matches.forEach(match => {
    if (!matchesByDate[match.match_date]) {
      matchesByDate[match.match_date] = [];
    }
    matchesByDate[match.match_date].push(match);
  });
  
  const dates = Object.keys(matchesByDate).sort();
  console.log(`\nRound of 16 currently spans ${dates.length} days:`);
  dates.forEach(date => {
    console.log(`- ${date}: ${matchesByDate[date].length} matches`);
  });
  
  // If we have more than 2 days, we need to fix it
  if (dates.length > 2) {
    console.log("\nNeed to fix Round of 16 to be exactly 2 days");
    
    // We'll keep the first two days and delete matches from any additional days
    const daysToKeep = dates.slice(0, 2);
    const daysToRemove = dates.slice(2);
    
    console.log(`Days to keep: ${daysToKeep.join(', ')}`);
    console.log(`Days to remove: ${daysToRemove.join(', ')}`);
    
    // Delete matches from extra days
    const matchesToDelete = [];
    daysToRemove.forEach(date => {
      matchesByDate[date].forEach(match => {
        matchesToDelete.push(match.id);
      });
    });
    
    if (matchesToDelete.length > 0) {
      console.log(`\nDeleting ${matchesToDelete.length} matches from extra days: ${matchesToDelete.join(', ')}`);
      
      // Delete these matches
      const placeholders = matchesToDelete.map(() => '?').join(',');
      db.run(`DELETE FROM matches WHERE id IN (${placeholders})`, matchesToDelete, function(err) {
        if (err) {
          console.error(`Error deleting matches: ${err.message}`);
        } else {
          console.log(`Successfully deleted ${this.changes} matches from extra days`);
        }
        
        // Make sure we have exactly 8 matches across 2 days
        ensureCorrectMatchCount(daysToKeep);
      });
    } else {
      ensureCorrectMatchCount(daysToKeep);
    }
  } else if (dates.length < 2) {
    console.log("\nNeed to add another day for Round of 16");
    addSecondDay(dates[0]);
  } else {
    console.log("\nAlready have exactly 2 days for Round of 16");
    ensureCorrectMatchCount(dates);
  }
  
  // Function to ensure each day has exactly 4 matches (total 8)
  function ensureCorrectMatchCount(days) {
    // Check how many matches we have on each day
    let totalMatches = 0;
    days.forEach(day => {
      totalMatches += matchesByDate[day].length;
    });
    
    console.log(`\nAfter cleanup: ${totalMatches} matches across ${days.length} days`);
    
    // If we don't have exactly 8 matches, need to add or remove some
    if (totalMatches !== 8) {
      if (totalMatches < 8) {
        // Need to add matches
        const matchesToAdd = 8 - totalMatches;
        console.log(`Need to add ${matchesToAdd} matches`);
        
        // Add matches to days that have fewer than 4
        let matchesAdded = 0;
        days.forEach(day => {
          const dayMatches = matchesByDate[day].length;
          if (dayMatches < 4) {
            const toAdd = Math.min(4 - dayMatches, matchesToAdd - matchesAdded);
            addMatchesToDay(day, toAdd);
            matchesAdded += toAdd;
          }
        });
      } else {
        // Need to remove matches
        const matchesToRemove = totalMatches - 8;
        console.log(`Need to remove ${matchesToRemove} matches`);
        
        // Remove matches from days that have more than 4
        let matchesRemoved = 0;
        days.forEach(day => {
          const dayMatches = matchesByDate[day];
          if (dayMatches.length > 4) {
            const toRemove = Math.min(dayMatches.length - 4, matchesToRemove - matchesRemoved);
            const matchIdsToRemove = dayMatches.slice(-toRemove).map(m => m.id);
            
            if (matchIdsToRemove.length > 0) {
              const placeholders = matchIdsToRemove.map(() => '?').join(',');
              db.run(`DELETE FROM matches WHERE id IN (${placeholders})`, matchIdsToRemove, function(err) {
                if (err) {
                  console.error(`Error removing extra matches: ${err.message}`);
                } else {
                  console.log(`Removed ${this.changes} extra matches from ${day}`);
                }
              });
              
              matchesRemoved += toRemove;
            }
          }
        });
      }
    }
    
    // Final verification
    verifyRoundOf16Structure();
  }
  
  // Function to add a second day of matches if we only have one
  function addSecondDay(firstDay) {
    // Create a second day 2 days after the first
    const firstDate = new Date(firstDay);
    const secondDate = new Date(firstDate);
    secondDate.setDate(secondDate.getDate() + 2);
    
    const secondDay = secondDate.toISOString().split('T')[0];
    console.log(`Adding a second day of matches on ${secondDay}`);
    
    // Add 4 matches on this day
    addMatchesToDay(secondDay, 4);
  }
  
  // Function to add matches to a specific day
  function addMatchesToDay(day, count) {
    console.log(`Adding ${count} matches to ${day}`);
    
    // Use these times for the matches
    const times = ['16:00', '18:00', '20:00', '22:00'];
    
    // Add the matches
    for (let i = 0; i < count; i++) {
      db.run(
        'INSERT INTO matches (match_date, match_time, stage, played) VALUES (?, ?, ?, ?)',
        [day, times[i], 'Round of 16', 0],
        function(err) {
          if (err) {
            console.error(`Error adding match: ${err.message}`);
          } else {
            console.log(`Added match to ${day} at ${times[i]}`);
          }
        }
      );
    }
  }
  
  // Final verification function
  function verifyRoundOf16Structure() {
    setTimeout(() => {
      db.all(`
        SELECT match_date, COUNT(*) as match_count
        FROM matches
        WHERE stage = 'Round of 16'
        GROUP BY match_date
        ORDER BY match_date
      `, [], (err, results) => {
        if (err) {
          console.error(`Error verifying structure: ${err.message}`);
          db.close();
          return;
        }
        
        console.log("\nFINAL VERIFICATION:");
        console.log("====================");
        
        console.log(`Round of 16 matches are scheduled on ${results.length} days:`);
        let totalMatches = 0;
        
        results.forEach(result => {
          console.log(`- ${result.match_date}: ${result.match_count} matches`);
          totalMatches += result.match_count;
        });
        
        console.log(`\nTotal Round of 16 matches: ${totalMatches}`);
        
        if (results.length === 2 && totalMatches === 8) {
          console.log("\n✓ SUCCESS: Round of 16 is now exactly 8 matches across 2 days!");
        } else {
          console.log("\n✗ ERROR: Round of 16 structure is still not correct!");
        }
        
        // Now list the actual matches by day for verification
        db.all(`
          SELECT id, match_date, match_time
          FROM matches
          WHERE stage = 'Round of 16'
          ORDER BY match_date, match_time
        `, [], (err, matches) => {
          if (err) {
            console.error(`Error getting final match list: ${err.message}`);
          } else {
            console.log("\nDetailed Round of 16 schedule:");
            
            // Group by date
            const finalByDate = {};
            matches.forEach(match => {
              if (!finalByDate[match.match_date]) {
                finalByDate[match.match_date] = [];
              }
              finalByDate[match.match_date].push(match);
            });
            
            // Show the matches by day
            Object.keys(finalByDate).sort().forEach(date => {
              console.log(`\n${date}:`);
              finalByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
                console.log(`  - Match ${match.id}: ${match.match_time}`);
              });
            });
          }
          
          db.close();
        });
      });
    }, 1000); // Wait a second for all other operations to complete
  }
});
