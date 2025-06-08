/**
 * Script to remove the extra match on day 15 at 18:00
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/football-league.sqlite'));

async function removeExtraMatch() {
  return new Promise((resolve, reject) => {
    // Find and delete the match on day 15 (June 22, 2025) at 18:00
    db.run(
      `DELETE FROM matches 
       WHERE match_date = '2025-06-22' 
       AND match_time = '18:00'`,
      function(err) {
        if (err) {
          console.error('Error removing extra match:', err);
          reject(err);
          return;
        }
        
        console.log(`Removed extra match on June 22, 2025 at 18:00 (${this.changes} match deleted)`);
        resolve();
      }
    );
  });
}

// Main function
async function fixSchedule() {
  try {
    await removeExtraMatch();
    console.log('Schedule fix completed successfully!');
    db.close();
  } catch (error) {
    console.error('Error fixing schedule:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
fixSchedule();
