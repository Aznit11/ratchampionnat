// Script to check the database schema
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Query the schema of the matches table
db.all("PRAGMA table_info(matches)", (err, rows) => {
  if (err) {
    console.error("Error getting schema:", err.message);
    return;
  }
  
  console.log("Matches table schema:");
  console.table(rows);
  
  // Also check existing Round of 16 matches
  db.all("SELECT * FROM matches WHERE stage = 'Round of 16'", (err, matches) => {
    if (err) {
      console.error("Error getting Round of 16 matches:", err.message);
      return;
    }
    
    console.log("\nExisting Round of 16 matches:");
    console.log(JSON.stringify(matches, null, 2));
    
    // Close the database connection
    db.close();
  });
});
