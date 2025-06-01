// Fix Round of 16 days based on exact database state from screenshot
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Fixing Round of 16 days based on screenshot data...");

// First, verify the current state
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
  
  console.log(`Found ${matches.length} Round of 16 matches`);
  
  // Group by date
  const dateMatches = {};
  matches.forEach(match => {
    if (!dateMatches[match.match_date]) {
      dateMatches[match.match_date] = [];
    }
    dateMatches[match.match_date].push(match);
  });
  
  const dates = Object.keys(dateMatches).sort();
  console.log(`Round of 16 currently spans ${dates.length} days:`);
  
  dates.forEach(date => {
    console.log(`- ${date}: ${dateMatches[date].length} matches`);
  });
  
  // We want to keep exactly 2 days: June 25 and June 27
  // Remap any matches on June 26 to June 27
  if (dates.includes('2025-06-26')) {
    console.log("\nFound matches on June 26. Moving them to June 27...");
    
    const matchesToUpdate = dateMatches['2025-06-26'] || [];
    if (matchesToUpdate.length > 0) {
      const matchIds = matchesToUpdate.map(match => match.id);
      const placeholders = matchIds.map(() => '?').join(',');
      
      db.run(
        `UPDATE matches SET match_date = '2025-06-27' WHERE id IN (${placeholders})`,
        matchIds,
        function(err) {
          if (err) {
            console.error("Error updating match dates:", err.message);
            db.close();
          } else {
            console.log(`Updated ${this.changes} matches from June 26 to June 27`);
            verifyChanges();
          }
        }
      );
    } else {
      verifyChanges();
    }
  } else {
    console.log("\nNo matches found on June 26. Checking if we have exactly 2 days...");
    verifyChanges();
  }
  
  // Final verification
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
      
      if (results.length === 2) {
        console.log("\n✅ SUCCESS: Round of 16 now has exactly 2 days!");
      } else {
        console.log("\n❌ ERROR: Round of 16 still doesn't have exactly 2 days.");
      }
      
      // Output instructions
      console.log("\nFINAL STEPS TO FIX UI DISPLAY:");
      console.log("1. RESTART YOUR SERVER");
      console.log("2. CLEAR YOUR BROWSER CACHE or use incognito mode");
      console.log("3. The Round of 16 page should now show exactly 2 days");
      
      db.close();
    });
  }
});
