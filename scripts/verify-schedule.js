/**
 * Script to verify the match schedule in the database
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Query to get match counts by date
db.all(`
  SELECT match_date, COUNT(*) as match_count, GROUP_CONCAT(match_time) as times
  FROM matches 
  GROUP BY match_date 
  ORDER BY match_date
`, [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  }
  
  console.log('Match distribution by date:');
  console.log('==========================');
  
  let totalMatches = 0;
  let daysWithExactly4 = 0;
  let daysWithFewerThan4 = 0;
  
  rows.forEach(row => {
    console.log(`${row.match_date}: ${row.match_count} matches (Times: ${row.times})`);
    totalMatches += row.match_count;
    
    if (row.match_count === 4) {
      daysWithExactly4++;
    } else if (row.match_count < 4) {
      daysWithFewerThan4++;
    }
  });
  
  console.log('==========================');
  console.log(`Total matches: ${totalMatches}`);
  console.log(`Days with exactly 4 matches: ${daysWithExactly4}`);
  console.log(`Days with fewer than 4 matches: ${daysWithFewerThan4}`);
  
  // Verify if there's a day with just one match (Day 1)
  const day1 = rows.find(r => r.match_count === 1);
  if (day1) {
    console.log(`Day 1 (${day1.match_date}) correctly has just 1 match at ${day1.times}`);
  } else {
    console.log('ERROR: Could not find Day 1 with exactly 1 match');
  }
  
  // Check last day
  const lastDay = rows[rows.length - 1];
  console.log(`Last day (${lastDay.match_date}) has ${lastDay.match_count} matches`);
  
  process.exit(0);
});
