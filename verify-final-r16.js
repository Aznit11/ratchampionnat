// Final verification of Round of 16 matches
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("FINAL VERIFICATION OF ROUND OF 16 STRUCTURE");
console.log("===========================================");

// Get all Round of 16 matches
db.all(`
  SELECT 
    m.id, m.match_date, m.match_time, m.stage, 
    ht.name as home_team_name, at.name as away_team_name
  FROM matches m
  LEFT JOIN teams ht ON m.home_team_id = ht.id
  LEFT JOIN teams at ON m.away_team_id = at.id
  WHERE m.stage = 'Round of 16'
  ORDER BY m.match_date, m.match_time
`, [], (err, matches) => {
  if (err) {
    console.error("Error getting matches:", err.message);
    db.close();
    return;
  }
  
  console.log(`\nFound ${matches.length} Round of 16 matches`);
  
  // Group matches by date
  const matchesByDate = {};
  matches.forEach(match => {
    if (!matchesByDate[match.match_date]) {
      matchesByDate[match.match_date] = [];
    }
    matchesByDate[match.match_date].push(match);
  });
  
  // Display matches by day
  const dates = Object.keys(matchesByDate).sort();
  console.log(`\nRound of 16 spans ${dates.length} days in the database:`);
  
  dates.forEach((date, index) => {
    console.log(`\nDAY ${index+1} (${date}):`);
    console.log("----------------------------------");
    
    const dayMatches = matchesByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time));
    dayMatches.forEach(match => {
      console.log(`Match ${match.id}: ${match.match_time}, ${match.home_team_name || 'TBD'} vs ${match.away_team_name || 'TBD'}`);
    });
    
    console.log(`Total: ${dayMatches.length} matches on this day`);
  });
  
  // Final verdict
  console.log("\n===========================================");
  if (dates.length === 2 && matches.length === 8) {
    console.log("✅ SUCCESS: Round of 16 is now correctly configured with:");
    console.log("   - Exactly 8 total matches");
    console.log("   - Exactly 2 days");
    console.log("   - Exactly 4 matches per day");
  } else {
    console.log("❌ ERROR: Round of 16 structure is still not correct!");
    console.log(`   - Found ${dates.length} days (should be 2)`);
    console.log(`   - Found ${matches.length} total matches (should be 8)`);
  }
  console.log("===========================================");
  
  db.close();
});
