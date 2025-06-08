/**
 * Script to fix the duplicate match in the schedule
 * Corrects the G1 vs G5 duplicate on day 15
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/football-league.sqlite'));

async function fixDuplicateMatch() {
  return new Promise((resolve, reject) => {
    // Find the duplicate match on day 15 (June 22, 2025)
    db.get(
      `SELECT id FROM matches 
       WHERE match_date = '2025-06-22' 
       AND match_time = '18:00'`,
      [],
      (err, match) => {
        if (err) {
          console.error('Error finding duplicate match:', err);
          reject(err);
          return;
        }
        
        if (!match) {
          console.log('No match found on June 22, 2025 at 18:00');
          resolve();
          return;
        }
        
        // Based on the image, this should actually be a different match
        // Let's update it with a likely match from the Group H
        db.run(
          `UPDATE matches SET 
           home_team_id = (SELECT id FROM teams WHERE group_id = (SELECT id FROM groups WHERE name = 'H') AND team_in_group_id = 1),
           away_team_id = (SELECT id FROM teams WHERE group_id = (SELECT id FROM groups WHERE name = 'H') AND team_in_group_id = 5)
           WHERE id = ?`,
          [match.id],
          function(err) {
            if (err) {
              console.error('Error updating duplicate match:', err);
              reject(err);
              return;
            }
            
            console.log(`Updated match on June 22, 2025 at 18:00 to H1 vs H5`);
            resolve();
          }
        );
      }
    );
  });
}

// Main function
async function fixSchedule() {
  try {
    await fixDuplicateMatch();
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
