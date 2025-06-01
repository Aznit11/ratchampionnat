// Script to check the matches table and update the Round of 16 structure
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Get the schema of the matches table
db.all("PRAGMA table_info(matches)", (err, columns) => {
  if (err) {
    console.error("Error getting table schema:", err.message);
    db.close();
    return;
  }
  
  // Display all columns in the matches table
  console.log("Matches table columns:");
  columns.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
  // Check current Round of 16 matches
  db.all("SELECT * FROM matches WHERE stage = 'Round of 16'", (err, r16Matches) => {
    if (err) {
      console.error("Error getting Round of 16 matches:", err.message);
      db.close();
      return;
    }
    
    console.log(`\nFound ${r16Matches.length} Round of 16 matches`);
    
    // Display the first match details if available
    if (r16Matches.length > 0) {
      console.log("First match details:");
      console.log(r16Matches[0]);
    }
    
    db.close();
  });
});
