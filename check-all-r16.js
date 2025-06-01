// Script to check ALL Round of 16 matches in the database, including those that might have been missed
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Get ALL matches that have "Round of 16" in the stage name (using LIKE to catch variations)
db.all(`
  SELECT id, match_date, match_time, stage 
  FROM matches 
  WHERE stage LIKE '%Round of 16%' OR stage LIKE '%round of 16%'
  ORDER BY match_date, match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${matches.length} total Round of 16 matches`);
  
  // Group matches by date
  const matchesByDate = {};
  matches.forEach(match => {
    if (!matchesByDate[match.match_date]) {
      matchesByDate[match.match_date] = [];
    }
    matchesByDate[match.match_date].push(match);
  });
  
  // Display all matches by day
  console.log("\nALL Round of 16 matches by day:");
  Object.keys(matchesByDate).sort().forEach(date => {
    console.log(`\n${date}:`);
    matchesByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
      console.log(`  - Match ${match.id}: ${match.stage} at ${match.match_time}`);
    });
  });
  
  console.log("\nNow looking for any other matches that might be Round of 16 but not properly labeled:");
  
  // Check for any other matches with similar dates
  const r16Dates = Object.keys(matchesByDate);
  const twoWeeksBeforeFirst = new Date(r16Dates[0]);
  twoWeeksBeforeFirst.setDate(twoWeeksBeforeFirst.getDate() - 14);
  
  const twoWeeksAfterLast = new Date(r16Dates[r16Dates.length - 1]);
  twoWeeksAfterLast.setDate(twoWeeksAfterLast.getDate() + 14);
  
  db.all(`
    SELECT id, match_date, match_time, stage 
    FROM matches 
    WHERE match_date >= ? AND match_date <= ? AND stage != 'Round of 16'
    ORDER BY match_date, match_time
  `, [
    twoWeeksBeforeFirst.toISOString().split('T')[0], 
    twoWeeksAfterLast.toISOString().split('T')[0]
  ], (err, nearbyMatches) => {
    if (err) {
      console.error("Error getting nearby matches:", err.message);
      db.close();
      return;
    }
    
    console.log(`Found ${nearbyMatches.length} matches within 2 weeks of Round of 16 dates`);
    
    if (nearbyMatches.length > 0) {
      // Group by date
      const nearbyByDate = {};
      nearbyMatches.forEach(match => {
        if (!nearbyByDate[match.match_date]) {
          nearbyByDate[match.match_date] = [];
        }
        nearbyByDate[match.match_date].push(match);
      });
      
      // Display nearby matches
      console.log("\nNearby matches that might be mislabeled:");
      Object.keys(nearbyByDate).sort().forEach(date => {
        console.log(`\n${date}:`);
        nearbyByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
          console.log(`  - Match ${match.id}: ${match.stage} at ${match.match_time}`);
        });
      });
    } else {
      console.log("No nearby matches found that might be mislabeled");
    }
    
    // Now let's just get ALL matches in the system to check
    db.all(`
      SELECT id, match_date, match_time, stage 
      FROM matches 
      ORDER BY match_date, match_time
    `, [], (err, allMatches) => {
      if (err) {
        console.error("Error getting all matches:", err.message);
        db.close();
        return;
      }
      
      console.log(`\nTotal number of matches in the system: ${allMatches.length}`);
      
      // Group all matches by stage
      const matchesByStage = {};
      allMatches.forEach(match => {
        if (!matchesByStage[match.stage]) {
          matchesByStage[match.stage] = [];
        }
        matchesByStage[match.stage].push(match);
      });
      
      console.log("\nMatches by stage:");
      Object.keys(matchesByStage).forEach(stage => {
        console.log(`- ${stage}: ${matchesByStage[stage].length} matches`);
      });
      
      db.close();
    });
  });
});
