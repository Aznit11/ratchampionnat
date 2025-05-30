/**
 * Script to update matches for the tournament based on the new fixed schedule
 * Following the screenshot schedule:
 * - Day 1: Just one match at 6:00 PM (A1 vs A2)
 * - Other days: Specific matches at 8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM
 * 
 * Generated on: ${new Date().toISOString()}
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Tournament start date
const startDate = new Date('2025-06-01');

// Time slots in 24-hour format
const timeSlots = ['08:00', '10:00', '16:00', '18:00'];

// Function to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Function to add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Clear existing matches
function clearExistingMatches(callback) {
  console.log('Clearing existing matches, goals, and cards...');
  db.run('DELETE FROM matches', [], (err) => {
    if (err) {
      console.error('Error clearing matches:', err);
      return;
    }
    
    db.run('DELETE FROM goals', [], (err) => {
      if (err) {
        console.error('Error clearing goals:', err);
        return;
      }
      
      db.run('DELETE FROM cards', [], (err) => {
        if (err) {
          console.error('Error clearing cards:', err);
          return;
        }
        
        console.log('Cleared existing matches, goals, and cards');
        callback();
      });
    });
  });
}

// Get team ID by group name and team number within group
function getTeamId(groupName, teamNumber, callback) {
  const query = `
    SELECT t.id
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    WHERE g.name = ? AND t.team_in_group_id = ?
  `;
  
  db.get(query, [groupName, teamNumber], (err, row) => {
    if (err) {
      console.error('Error getting team ID:', err);
      callback(null);
      return;
    }
    
    if (!row) {
      console.error(`Team not found: Group ${groupName}, Team ${teamNumber}`);
      callback(null);
      return;
    }
    
    callback(row.id);
  });
}

// Parse match text (e.g., "A1 vs A2") and get team IDs
function parseMatchText(matchText, callback) {
  if (matchText === '-') {
    callback(null, null); // No match for this slot
    return;
  }
  
  // Parse "X# vs Y#" format
  const parts = matchText.split(' vs ');
  if (parts.length !== 2) {
    console.error(`Invalid match format: ${matchText}`);
    callback(null, null);
    return;
  }
  
  const homeTeamCode = parts[0];
  const awayTeamCode = parts[1];
  
  // Extract group letter and team number (e.g., A1 -> group A, team 1)
  const homeGroup = homeTeamCode.substring(0, 1);
  const homeNumber = parseInt(homeTeamCode.substring(1), 10);
  
  const awayGroup = awayTeamCode.substring(0, 1);
  const awayNumber = parseInt(awayTeamCode.substring(1), 10);
  
  // Get home team ID
  getTeamId(homeGroup, homeNumber, (homeTeamId) => {
    if (!homeTeamId) {
      callback(null, null);
      return;
    }
    
    // Get away team ID
    getTeamId(awayGroup, awayNumber, (awayTeamId) => {
      if (!awayTeamId) {
        callback(null, null);
        return;
      }
      
      callback(homeTeamId, awayTeamId);
    });
  });
}

// Schedule based on the screenshot
const schedule = [
  // Day 1
  ['-', '-', '-', 'A1 vs A2'],
  // Day 2
  ['A3 vs A4', 'B1 vs B2', 'B3 vs B4', 'C1 vs C2'],
  // Day 3
  ['C3 vs C4', 'D1 vs D2', 'D3 vs D4', 'E1 vs E2'],
  // Day 4
  ['E3 vs E4', 'F1 vs F2', 'F3 vs F4', 'G1 vs G2'],
  // Day 5
  ['G3 vs G4', 'H1 vs H2', 'H3 vs H4', 'B1 vs B3'],
  // Day 6
  ['F1 vs F5', 'G1 vs G5', 'A1 vs A3', 'C1 vs C3'],
  // Day 7
  ['F2 vs F3', 'H3 vs H5', 'E2 vs E4', 'E1 vs E3'],
  // Day 8
  ['H1 vs H4', 'G2 vs G3', 'D1 vs D3', 'A2 vs A4'],
  // Day 9
  ['B2 vs B3', 'B1 vs B4', 'G1 vs G4', 'F4 vs F5'],
  // Day 10
  ['D2 vs D4', 'C2 vs C4', 'H2 vs H3', 'F1 vs F3'],
  // Day 11
  ['E2 vs E3', 'F2 vs F4', 'G3 vs G5', 'H4 vs H5'],
  // Day 12
  ['G2 vs G4', 'A1 vs A4', 'F3 vs F5', 'H1 vs H3'],
  // Day 13
  ['A2 vs A3', 'G1 vs G3', 'C1 vs C4', 'D1 vs D4'],
  // Day 14
  ['H2 vs H5', 'F1 vs F4', 'G2 vs G5', 'B2 vs B4'],
  // Day 15
  ['C2 vs C3', 'E1 vs E4', 'F2 vs F5', 'D2 vs D3'],
  // Day 16
  ['H1 vs H5', '-', 'H2 vs H4', 'G4 vs G5']
];

// Generate matches based on the fixed schedule
function generateFixedScheduleMatches() {
  console.log('Generating matches based on fixed schedule...');
  let insertCount = 0;
  let matchCount = 0;
  
  // Process each day in the schedule
  for (let day = 0; day < schedule.length; day++) {
    const currentDate = addDays(startDate, day);
    const formattedDate = formatDate(currentDate);
    
    // Process each time slot for the day
    for (let timeSlotIndex = 0; timeSlotIndex < timeSlots.length; timeSlotIndex++) {
      const matchText = schedule[day][timeSlotIndex];
      const timeSlot = timeSlots[timeSlotIndex];
      
      if (matchText !== '-') {
        matchCount++;
        
        // Parse match text to get team IDs
        parseMatchText(matchText, (homeTeamId, awayTeamId) => {
          if (homeTeamId && awayTeamId) {
            // Determine the stage (all are group stage)
            const stage = 'Group Stage';
            
            // Insert match into database
            const insertQuery = `
              INSERT INTO matches (
                home_team_id, away_team_id, match_date, match_time, 
                stage, played, home_score, away_score
              ) VALUES (?, ?, ?, ?, ?, 0, NULL, NULL)
            `;
            
            db.run(insertQuery, [homeTeamId, awayTeamId, formattedDate, timeSlot, stage], function(err) {
              if (err) {
                console.error('Error inserting match:', err);
              } else {
                insertCount++;
                console.log(`Inserted match: ${matchText} on Day ${day + 1} at ${timeSlot} (${formattedDate})`);
                
                // Check if all matches have been processed
                if (insertCount === matchCount) {
                  console.log(`All ${insertCount} matches scheduled successfully.`);
                  db.close();
                }
              }
            });
          }
        });
      }
    }
  }
}

// Main function
function updateMatchSchedule() {
  clearExistingMatches(() => {
    generateFixedScheduleMatches();
  });
}

// Run the script
updateMatchSchedule();
