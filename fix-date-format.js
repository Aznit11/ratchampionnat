// Fix date format inconsistencies causing same dates to appear as different days
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Fixing date format inconsistencies in Round of 16 matches...");

// First, get all Round of 16 matches with complete details
db.all(`
  SELECT 
    id, match_date, match_time, home_team_id, away_team_id,
    datetime(match_date) as normalized_date
  FROM matches 
  WHERE stage = 'Round of 16'
  ORDER BY match_date, match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`\nFound ${matches.length} Round of 16 matches`);
  
  // Examine each match date in detail to find inconsistencies
  matches.forEach(match => {
    console.log(`Match ${match.id}: Date="${match.match_date}" (${typeof match.match_date}), Time=${match.match_time}`);
    // Look for any weird characters or whitespace
    const hexView = Buffer.from(match.match_date).toString('hex');
    console.log(`  Hex view: ${hexView}`);
  });
  
  // Group matches by date to see if there are any inconsistencies
  const dateGroups = {};
  matches.forEach(match => {
    if (!dateGroups[match.match_date]) {
      dateGroups[match.match_date] = [];
    }
    dateGroups[match.match_date].push(match);
  });
  
  console.log(`\nFound ${Object.keys(dateGroups).length} unique date strings:`);
  Object.keys(dateGroups).forEach(date => {
    console.log(`- "${date}" (${dateGroups[date].length} matches)`);
  });
  
  // Standardize all dates to YYYY-MM-DD format
  console.log("\nStandardizing all dates to consistent YYYY-MM-DD format...");
  
  // First, create a standardized date format for 2025-06-25
  const date1 = new Date('2025-06-25T12:00:00');
  const standardDate1 = date1.toISOString().split('T')[0]; // "2025-06-25"
  
  // Then for 2025-06-27
  const date2 = new Date('2025-06-27T12:00:00');
  const standardDate2 = date2.toISOString().split('T')[0]; // "2025-06-27"
  
  console.log(`Standardized dates: "${standardDate1}" and "${standardDate2}"`);
  
  // Update all matches to use these standardized date strings
  let updatePromises = [];
  
  // First, update all matches on the first day (June 25)
  const june25Matches = matches.filter(m => 
    m.match_date.includes('25') || 
    m.match_date.includes('2025-06-25')
  );
  
  if (june25Matches.length > 0) {
    const june25Ids = june25Matches.map(m => m.id);
    const placeholders = june25Ids.map(() => '?').join(',');
    
    updatePromises.push(new Promise((resolve, reject) => {
      db.run(
        `UPDATE matches SET match_date = ? WHERE id IN (${placeholders})`,
        [standardDate1, ...june25Ids],
        function(err) {
          if (err) {
            console.error(`Error updating June 25 matches:`, err.message);
            reject(err);
          } else {
            console.log(`Updated ${this.changes} matches to standard date "${standardDate1}"`);
            resolve();
          }
        }
      );
    }));
  }
  
  // Then, update all matches on the second day (June 27)
  const june27Matches = matches.filter(m => 
    m.match_date.includes('27') || 
    m.match_date.includes('2025-06-27')
  );
  
  if (june27Matches.length > 0) {
    const june27Ids = june27Matches.map(m => m.id);
    const placeholders = june27Ids.map(() => '?').join(',');
    
    updatePromises.push(new Promise((resolve, reject) => {
      db.run(
        `UPDATE matches SET match_date = ? WHERE id IN (${placeholders})`,
        [standardDate2, ...june27Ids],
        function(err) {
          if (err) {
            console.error(`Error updating June 27 matches:`, err.message);
            reject(err);
          } else {
            console.log(`Updated ${this.changes} matches to standard date "${standardDate2}"`);
            resolve();
          }
        }
      );
    }));
  }
  
  // Wait for all updates to complete
  Promise.all(updatePromises)
    .then(() => {
      console.log("\nAll dates standardized. Verifying...");
      verifyChanges();
    })
    .catch(err => {
      console.error("Error updating dates:", err);
      db.close();
    });
  
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
      
      console.log("\nFinal Round of 16 date distribution:");
      let totalMatches = 0;
      
      results.forEach(row => {
        console.log(`- "${row.match_date}": ${row.match_count} matches`);
        totalMatches += row.match_count;
      });
      
      console.log(`\nTotal Round of 16 matches: ${totalMatches}`);
      
      if (results.length === 2) {
        console.log("\n✅ SUCCESS: Round of 16 now has exactly 2 standard date formats!");
      } else {
        console.log("\n❌ ERROR: Round of 16 still has date inconsistencies.");
      }
      
      // Final check: get all the matches again with their exact date format
      db.all(`
        SELECT id, match_date, match_time
        FROM matches
        WHERE stage = 'Round of 16'
        ORDER BY match_date, match_time
      `, [], (err, finalMatches) => {
        if (err) {
          console.error("Error getting final matches:", err.message);
          db.close();
          return;
        }
        
        console.log("\nFinal match dates:");
        finalMatches.forEach(match => {
          console.log(`Match ${match.id}: Date="${match.match_date}", Time=${match.match_time}`);
        });
        
        // Let's also check if there are any hidden spaces or characters
        console.log("\nChecking for hidden characters in date strings:");
        const uniqueDates = [...new Set(finalMatches.map(m => m.match_date))];
        uniqueDates.forEach(date => {
          const hexView = Buffer.from(date).toString('hex');
          console.log(`- "${date}": Hex=${hexView}`);
        });
        
        console.log("\nFINAL STEPS TO FIX UI DISPLAY:");
        console.log("1. COMPLETELY RESTART YOUR SERVER");
        console.log("2. CLEAR YOUR BROWSER CACHE COMPLETELY or use a fresh incognito window");
        console.log("3. The Round of 16 page should now show exactly 2 days");
        
        db.close();
      });
    });
  }
});
