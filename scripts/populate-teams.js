/**
 * Script to populate all teams for each group
 * - Groups A-E have 4 teams each
 * - Groups F-H have 5 teams each
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Clear existing teams first (except Group A which already has teams)
function clearExistingTeams() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM teams WHERE group_id > 1', [], (err) => {
      if (err) {
        console.error('Error clearing teams:', err);
        reject(err);
        return;
      }
      console.log('Cleared existing teams from groups B-H');
      resolve();
    });
  });
}

// Create teams for all groups
async function createTeams() {
  try {
    await clearExistingTeams();
    
    // Get all groups
    const groups = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM groups ORDER BY id', [], (err, rows) => {
        if (err) {
          console.error('Error fetching groups:', err);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
    
    // Skip Group A (id=1) since it already has teams
    for (let i = 1; i < groups.length; i++) {
      const group = groups[i];
      console.log(`Creating teams for Group ${group.name}`);
      
      // Number of teams to create
      const teamCount = group.team_count;
      
      for (let j = 1; j <= teamCount; j++) {
        const teamName = `Team ${group.name}${j}`;
        
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO teams (name, group_id, team_in_group_id)
            VALUES (?, ?, ?)
          `, [teamName, group.id, j], function(err) {
            if (err) {
              console.error(`Error creating team ${teamName}:`, err);
              reject(err);
              return;
            }
            console.log(`Created team: ${teamName}`);
            resolve();
          });
        });
      }
    }
    
    console.log('All teams created successfully!');
  } catch (error) {
    console.error('Error creating teams:', error);
    throw error;
  }
}

// Main function
async function populateTeams() {
  try {
    await createTeams();
    console.log('Teams population completed!');
    db.close();
  } catch (error) {
    console.error('Error populating teams:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
populateTeams();
