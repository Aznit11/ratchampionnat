/**
 * Script to update teams: Remove F5 and change Group F team count
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/football-league.sqlite'));

// Update Group F team count from 5 to 4
async function updateGroupF() {
  return new Promise((resolve, reject) => {
    db.run('UPDATE groups SET team_count = 4 WHERE name = "F"', [], (err) => {
      if (err) {
        console.error('Error updating Group F:', err);
        reject(err);
        return;
      }
      console.log('Updated Group F team count to 4');
      resolve();
    });
  });
}

// Remove team F5
async function removeTeamF5() {
  // First find the team to confirm it exists
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM teams WHERE name = "Team F5" OR (group_id = 6 AND team_in_group_id = 5)', 
      [], 
      (err, team) => {
        if (err) {
          console.error('Error finding Team F5:', err);
          reject(err);
          return;
        }
        
        if (!team) {
          console.log('Team F5 not found, nothing to remove');
          resolve();
          return;
        }
        
        // Delete the team
        db.run('DELETE FROM teams WHERE id = ?', [team.id], (err) => {
          if (err) {
            console.error('Error deleting Team F5:', err);
            reject(err);
            return;
          }
          console.log('Team F5 removed successfully');
          resolve();
        });
      }
    );
  });
}

// Main function
async function updateTeams() {
  try {
    await removeTeamF5();
    await updateGroupF();
    console.log('Team update completed successfully!');
    db.close();
  } catch (error) {
    console.error('Error updating teams:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
updateTeams();
