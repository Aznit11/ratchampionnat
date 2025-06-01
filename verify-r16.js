// Script to verify the Round of 16 match structure
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Get all Round of 16 matches in order
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
  
  // Group matches by date
  const matchesByDate = {};
  matches.forEach(match => {
    if (!matchesByDate[match.match_date]) {
      matchesByDate[match.match_date] = [];
    }
    matchesByDate[match.match_date].push(match);
  });
  
  // Display matches by day
  console.log("\nRound of 16 matches by day:");
  Object.keys(matchesByDate).sort().forEach(date => {
    console.log(`\n${date} (Day ${Object.keys(matchesByDate).sort().indexOf(date) + 1}):`);
    matchesByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
      console.log(`  - Match ${match.id}: ${match.match_time}`);
    });
  });
  
  // Define the expected structure
  const expectedStructure = [
    // Day 1
    { date: '2025-06-25', matchups: ['A1 vs B2', 'A2 vs B1', 'C1 vs D2', 'C2 vs D1'] },
    // Day 2
    { date: '2025-06-27', matchups: ['E1 vs F2', 'E2 vs F1', 'G1 vs H2', 'G2 vs H1'] }
  ];
  
  // Verify structure matches expected
  console.log("\nVerifying Round of 16 structure:");
  
  // Check number of days
  const dates = Object.keys(matchesByDate).sort();
  if (dates.length === 2) {
    console.log("✓ Round of 16 scheduled across 2 days as required");
  } else {
    console.log(`✗ Round of 16 scheduled across ${dates.length} days (should be 2)`);
  }
  
  // Check matches per day
  let matchesPerDayCorrect = true;
  dates.forEach(date => {
    const count = matchesByDate[date].length;
    if (count !== 4) {
      matchesPerDayCorrect = false;
      console.log(`✗ Day ${date} has ${count} matches (should be 4)`);
    }
  });
  
  if (matchesPerDayCorrect) {
    console.log("✓ Each day has exactly 4 matches as required");
  }
  
  // Check total match count
  const totalMatches = matches.length;
  if (totalMatches === 8) {
    console.log("✓ Total of 8 Round of 16 matches as required");
  } else {
    console.log(`✗ Total of ${totalMatches} Round of 16 matches (should be 8)`);
  }
  
  console.log("\nRound of 16 structure verification complete!");
  
  db.close();
});
