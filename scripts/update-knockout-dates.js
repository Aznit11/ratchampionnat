/**
 * Script to update Quarter Final, Semi Final, and Final dates
 * and fix any missing Semi Final matches
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/football-league.sqlite'));

// Function to get matches by stage
async function getMatchesByStage(stage) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM matches WHERE stage = ? ORDER BY id',
      [stage],
      (err, matches) => {
        if (err) {
          console.error(`Error getting ${stage} matches:`, err);
          reject(err);
          return;
        }
        console.log(`Found ${matches.length} ${stage} matches`);
        resolve(matches);
      }
    );
  });
}

// Function to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Fix missing Semi Final match if needed
async function fixSemiFinalMatches() {
  const semiFinals = await getMatchesByStage('Semi Final');
  
  if (semiFinals.length < 2) {
    console.log(`Only ${semiFinals.length} Semi Final matches found, adding missing match`);
    
    // Create a new Semi Final match
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO matches (
          home_team_id, away_team_id, match_date, match_time, 
          stage, played, home_score, away_score
        ) VALUES (NULL, NULL, ?, ?, ?, 0, NULL, NULL)`,
        ['2025-06-29', '19:00', 'Semi Final'],
        function(err) {
          if (err) {
            console.error('Error adding missing Semi Final match:', err);
            reject(err);
            return;
          }
          console.log(`Added missing Semi Final match with ID: ${this.lastID}`);
          resolve();
        }
      );
    });
  } else {
    console.log('Both Semi Final matches exist, no fix needed');
    return Promise.resolve();
  }
}

// Update the knockout stage dates
async function updateKnockoutDates() {
  try {
    // Fix missing Semi Final match if needed
    await fixSemiFinalMatches();
    
    // Get the last Round of 16 match date
    const r16Matches = await getMatchesByStage('Round of 16');
    if (r16Matches.length === 0) {
      throw new Error('No Round of 16 matches found');
    }
    
    // Find the last Round of 16 date
    const lastR16Date = new Date(r16Matches[r16Matches.length - 1].match_date);
    console.log(`Last Round of 16 date: ${formatDate(lastR16Date)}`);
    
    // Calculate dates for subsequent rounds (3 days between rounds)
    const qfDate = new Date(lastR16Date);
    qfDate.setDate(lastR16Date.getDate() + 3);
    
    const sfDate = new Date(qfDate);
    sfDate.setDate(qfDate.getDate() + 3);
    
    const finalDate = new Date(sfDate);
    finalDate.setDate(sfDate.getDate() + 3);
    
    // Format dates as strings
    const qfDateStr = formatDate(qfDate);
    const sfDateStr = formatDate(sfDate);
    const finalDateStr = formatDate(finalDate);
    
    console.log(`Quarter Final date: ${qfDateStr}`);
    console.log(`Semi Final date: ${sfDateStr}`);
    console.log(`Final date: ${finalDateStr}`);
    
    // Time slots for matches
    const qfTimeSlots = ['13:00', '16:00', '19:00', '22:00'];
    const sfTimeSlots = ['19:00', '22:00'];
    const finalTimeSlot = '20:00';
    
    // Update Quarter Final matches
    const qfMatches = await getMatchesByStage('Quarter Final');
    for (let i = 0; i < qfMatches.length; i++) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE matches SET match_date = ?, match_time = ? WHERE id = ?',
          [qfDateStr, qfTimeSlots[i], qfMatches[i].id],
          function(err) {
            if (err) {
              console.error(`Error updating Quarter Final match ${qfMatches[i].id}:`, err);
              reject(err);
              return;
            }
            console.log(`Updated Quarter Final match ${qfMatches[i].id} to ${qfDateStr} at ${qfTimeSlots[i]}`);
            resolve();
          }
        );
      });
    }
    
    // Update Semi Final matches
    const sfMatches = await getMatchesByStage('Semi Final');
    for (let i = 0; i < sfMatches.length; i++) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE matches SET match_date = ?, match_time = ? WHERE id = ?',
          [sfDateStr, sfTimeSlots[i], sfMatches[i].id],
          function(err) {
            if (err) {
              console.error(`Error updating Semi Final match ${sfMatches[i].id}:`, err);
              reject(err);
              return;
            }
            console.log(`Updated Semi Final match ${sfMatches[i].id} to ${sfDateStr} at ${sfTimeSlots[i]}`);
            resolve();
          }
        );
      });
    }
    
    // Update Final match
    const finalMatches = await getMatchesByStage('Final');
    for (let i = 0; i < finalMatches.length; i++) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE matches SET match_date = ?, match_time = ? WHERE id = ?',
          [finalDateStr, finalTimeSlot, finalMatches[i].id],
          function(err) {
            if (err) {
              console.error(`Error updating Final match ${finalMatches[i].id}:`, err);
              reject(err);
              return;
            }
            console.log(`Updated Final match ${finalMatches[i].id} to ${finalDateStr} at ${finalTimeSlot}`);
            resolve();
          }
        );
      });
    }
    
    console.log('All knockout stage dates updated successfully!');
  } catch (error) {
    console.error('Error updating knockout stage dates:', error);
    throw error;
  }
}

// Main function
async function updateSchedule() {
  try {
    await updateKnockoutDates();
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
