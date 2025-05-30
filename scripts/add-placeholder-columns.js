/**
 * Script to add placeholder columns to the matches table
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Function to check if the columns already exist
function checkColumnsExist() {
  return new Promise((resolve, reject) => {
    db.get(`PRAGMA table_info(matches)`, [], (err, rows) => {
      if (err) {
        console.error('Error checking table schema:', err);
        return reject(err);
      }
      
      db.all(`PRAGMA table_info(matches)`, [], (err, rows) => {
        if (err) {
          console.error('Error checking table schema:', err);
          return reject(err);
        }
        
        const columns = rows.map(row => row.name);
        const hasHomePlaceholder = columns.includes('home_placeholder');
        const hasAwayPlaceholder = columns.includes('away_placeholder');
        
        resolve({ hasHomePlaceholder, hasAwayPlaceholder });
      });
    });
  });
}

// Function to add the placeholder columns
async function addPlaceholderColumns() {
  try {
    // Check if columns already exist
    const { hasHomePlaceholder, hasAwayPlaceholder } = await checkColumnsExist();
    
    // Add home_placeholder column if it doesn't exist
    if (!hasHomePlaceholder) {
      await new Promise((resolve, reject) => {
        db.run(`ALTER TABLE matches ADD COLUMN home_placeholder TEXT`, [], (err) => {
          if (err) {
            console.error('Error adding home_placeholder column:', err);
            return reject(err);
          }
          console.log('Added home_placeholder column');
          resolve();
        });
      });
    } else {
      console.log('home_placeholder column already exists');
    }
    
    // Add away_placeholder column if it doesn't exist
    if (!hasAwayPlaceholder) {
      await new Promise((resolve, reject) => {
        db.run(`ALTER TABLE matches ADD COLUMN away_placeholder TEXT`, [], (err) => {
          if (err) {
            console.error('Error adding away_placeholder column:', err);
            return reject(err);
          }
          console.log('Added away_placeholder column');
          resolve();
        });
      });
    } else {
      console.log('away_placeholder column already exists');
    }
    
    console.log('Migration completed successfully');
    db.close();
    
  } catch (error) {
    console.error('Error during migration:', error);
    db.close();
    process.exit(1);
  }
}

// Run the migration
addPlaceholderColumns();
