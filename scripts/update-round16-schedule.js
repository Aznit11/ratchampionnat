/**
 * Script to update Round of 16 schedule to have just 2 days with 4 matches per day
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/football-league.sqlite'));

// New Round of 16 schedule: 2 days with 4 matches each
// Start date: 2 days after last group match
async function updateRoundOf16Schedule() {
  try {
    // Get the last group stage match date
    const lastGroupDate = await new Promise((resolve, reject) => {
      db.get(
        'SELECT MAX(match_date) as last_date FROM matches WHERE stage = "Group Stage"',
        [],
        (err, result) => {
          if (err) {
            console.error('Error getting last group match date:', err);
            reject(err);
            return;
          }
          resolve(result.last_date);
        }
      );
    });
    
    // Calculate Round of 16 dates (2 days after last group match and the day after)
    const lastDate = new Date(lastGroupDate);
    const r16Day1 = new Date(lastDate);
    r16Day1.setDate(lastDate.getDate() + 2);
    const r16Day2 = new Date(r16Day1);
    r16Day2.setDate(r16Day1.getDate() + 1);
    
    // Format dates as YYYY-MM-DD
    const r16Day1Str = r16Day1.toISOString().split('T')[0];
    const r16Day2Str = r16Day2.toISOString().split('T')[0];
    
    console.log(`Last group stage match: ${lastGroupDate}`);
    console.log(`Round of 16 day 1: ${r16Day1Str}`);
    console.log(`Round of 16 day 2: ${r16Day2Str}`);
    
    // Get all Round of 16 matches
    const r16Matches = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM matches WHERE stage = "Round of 16" ORDER BY id',
        [],
        (err, matches) => {
          if (err) {
            console.error('Error getting Round of 16 matches:', err);
            reject(err);
            return;
          }
          resolve(matches);
        }
      );
    });
    
    console.log(`Found ${r16Matches.length} Round of 16 matches`);
    
    // Time slots for matches: 10:00, 13:00, 16:00, 19:00
    const timeSlots = ['10:00', '13:00', '16:00', '19:00'];
    
    // Update each match
    for (let i = 0; i < r16Matches.length; i++) {
      const match = r16Matches[i];
      const dayStr = i < 4 ? r16Day1Str : r16Day2Str;
      const timeSlot = timeSlots[i % 4];
      
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE matches SET match_date = ?, match_time = ? WHERE id = ?',
          [dayStr, timeSlot, match.id],
          function(err) {
            if (err) {
              console.error(`Error updating match ${match.id}:`, err);
              reject(err);
              return;
            }
            console.log(`Updated match ${match.id} to ${dayStr} at ${timeSlot}`);
            resolve();
          }
        );
      });
    }
    
    console.log('Round of 16 schedule updated successfully!');
  } catch (error) {
    console.error('Error updating Round of 16 schedule:', error);
    throw error;
  }
}

// Main function
async function updateSchedule() {
  try {
    await updateRoundOf16Schedule();
    console.log('Schedule update completed successfully!');
    db.close();
  } catch (error) {
    console.error('Error updating schedule:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
updateSchedule();
