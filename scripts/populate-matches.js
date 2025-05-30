/**
 * Simplified script to populate all matches for the tournament
 * Following the requirements:
 * - Day 1: Just one match at 6:00 PM
 * - Other days: 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * - Rest periods: 3+ days for groups with 4 teams, 2+ days for groups with 5 teams
 * - Order by groups and teams within groups
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Tournament start date - June 1, 2025
const startDate = new Date('2025-06-01');

// Time slots with preference (6:00 PM most favorable)
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
function clearExistingMatches() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM matches', [], (err) => {
      if (err) {
        console.error('Error clearing matches:', err);
        reject(err);
        return;
      }
      
      db.run('DELETE FROM goals', [], (err) => {
        if (err) {
          console.error('Error clearing goals:', err);
          reject(err);
          return;
        }
        
        db.run('DELETE FROM cards', [], (err) => {
          if (err) {
            console.error('Error clearing cards:', err);
            reject(err);
            return;
          }
          
          console.log('Cleared existing matches, goals, and cards');
          resolve();
        });
      });
    });
  });
}

// Get all groups with their teams
function getGroups() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT g.id, g.name, g.team_count, 
             t.id as team_id, t.name as team_name, t.team_in_group_id
      FROM groups g
      JOIN teams t ON g.id = t.group_id
      ORDER BY g.id, t.team_in_group_id
    `, [], (err, rows) => {
      if (err) {
        console.error('Error fetching groups:', err);
        reject(err);
        return;
      }
      
      // Organize data by groups
      const groups = [];
      let currentGroup = null;
      
      rows.forEach(row => {
        if (!currentGroup || currentGroup.id !== row.id) {
          currentGroup = {
            id: row.id,
            name: row.name,
            team_count: row.team_count,
            teams: []
          };
          groups.push(currentGroup);
        }
        
        currentGroup.teams.push({
          id: row.team_id,
          name: row.team_name,
          team_in_group_id: row.team_in_group_id
        });
      });
      
      resolve(groups);
    });
  });
}

// Generate group stage matches
async function generateGroupStageMatches() {
  try {
    const groups = await getGroups();
    
    let currentDate = new Date(startDate);
    let currentDayMatches = 0;
    let timeSlotIndex = 3; // Start with 6:00 PM
    let isFirstDay = true;
    
    // Team's last match date tracking
    const teamLastMatchDate = {};
    
    // Insert matches for all groups
    for (const group of groups) {
      console.log(`Generating matches for Group ${group.name}`);
      
      const minRestDays = group.team_count === 5 ? 2 : 3;
      
      // Create all possible pairings within the group
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          const homeTeam = group.teams[i];
          const awayTeam = group.teams[j];
          
          // Find a suitable date for this match
          let validDateFound = false;
          while (!validDateFound) {
            // Check if we need to move to the next day
            if ((isFirstDay && currentDayMatches >= 1) || (!isFirstDay && currentDayMatches >= 4)) {
              currentDate = addDays(currentDate, 1);
              currentDayMatches = 0;
              timeSlotIndex = 0;
              isFirstDay = false;
            }
            
            // Check if both teams have had enough rest
            const homeTeamLastMatch = teamLastMatchDate[homeTeam.id];
            const awayTeamLastMatch = teamLastMatchDate[awayTeam.id];
            
            let homeTeamRestOk = true;
            let awayTeamRestOk = true;
            
            if (homeTeamLastMatch) {
              const daysDiff = Math.floor((currentDate - homeTeamLastMatch) / (1000 * 60 * 60 * 24));
              homeTeamRestOk = daysDiff >= minRestDays;
            }
            
            if (awayTeamLastMatch) {
              const daysDiff = Math.floor((currentDate - awayTeamLastMatch) / (1000 * 60 * 60 * 24));
              awayTeamRestOk = daysDiff >= minRestDays;
            }
            
            if (homeTeamRestOk && awayTeamRestOk) {
              validDateFound = true;
            } else {
              // Try next day
              currentDate = addDays(currentDate, 1);
              currentDayMatches = 0;
              timeSlotIndex = 0;
              isFirstDay = false;
            }
          }
          
          // Get time slot
          const timeSlot = timeSlots[timeSlotIndex];
          const formattedDate = formatDate(currentDate);
          
          // Insert the match
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO matches (
                home_team_id, away_team_id, match_date, match_time,
                home_score, away_score, played, stage
              ) VALUES (?, ?, ?, ?, 0, 0, 0, 'Group Stage')
            `, [
              homeTeam.id, awayTeam.id, formattedDate, timeSlot
            ], function(err) {
              if (err) {
                console.error('Error inserting match:', err);
                reject(err);
                return;
              }
              
              console.log(`Scheduled Group ${group.name} match: ${homeTeam.name} vs ${awayTeam.name} on ${formattedDate} at ${timeSlot}`);
              resolve(this.lastID);
            });
          });
          
          // Update team's last match date
          teamLastMatchDate[homeTeam.id] = new Date(currentDate);
          teamLastMatchDate[awayTeam.id] = new Date(currentDate);
          
          // Move to next time slot
          timeSlotIndex = (timeSlotIndex + 1) % 4;
          currentDayMatches++;
        }
      }
    }
    
    console.log('Group stage matches generated successfully!');
    return currentDate; // Return the last date for group stage matches
  } catch (error) {
    console.error('Error generating group stage matches:', error);
    throw error;
  }
}

// Generate knockout stage matches (Round of 16, QF, SF, Final)
async function generateKnockoutMatches(lastGroupDate) {
  try {
    // Start knockout stages 3 days after group stage
    let currentDate = addDays(lastGroupDate, 3);
    
    // Round of 16 (8 matches)
    console.log('Generating Round of 16 matches...');
    currentDate = await generateKnockoutStage('Round of 16', 8, currentDate);
    
    // Quarter Finals (4 matches)
    console.log('Generating Quarter Final matches...');
    currentDate = await generateKnockoutStage('Quarter Final', 4, addDays(currentDate, 3));
    
    // Semi Finals (2 matches)
    console.log('Generating Semi Final matches...');
    currentDate = await generateKnockoutStage('Semi Final', 2, addDays(currentDate, 4));
    
    // Final (1 match)
    console.log('Generating Final match...');
    await generateKnockoutStage('Final', 1, addDays(currentDate, 5));
    
    console.log('All knockout matches generated successfully!');
  } catch (error) {
    console.error('Error generating knockout matches:', error);
    throw error;
  }
}

// Generate a specific knockout stage
async function generateKnockoutStage(stageName, matchCount, startDate) {
  let currentDate = new Date(startDate);
  let currentDayMatches = 0;
  let timeSlotIndex = 2; // Start with 4:00 PM for knockout matches
  
  for (let i = 0; i < matchCount; i++) {
    // Only 2 matches per day for knockout stages
    if (currentDayMatches >= 2) {
      currentDate = addDays(currentDate, 1);
      currentDayMatches = 0;
      timeSlotIndex = 2; // Reset to 4:00 PM
    }
    
    // Get time slot (alternate between 4:00 PM and 6:00 PM)
    const timeSlot = timeSlots[timeSlotIndex];
    const formattedDate = formatDate(currentDate);
    
    // Insert the match
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO matches (
          home_team_id, away_team_id, match_date, match_time,
          home_score, away_score, played, stage
        ) VALUES (NULL, NULL, ?, ?, 0, 0, 0, ?)
      `, [
        formattedDate, timeSlot, stageName
      ], function(err) {
        if (err) {
          console.error(`Error inserting ${stageName} match:`, err);
          reject(err);
          return;
        }
        
        console.log(`Scheduled ${stageName} match on ${formattedDate} at ${timeSlot}`);
        resolve(this.lastID);
      });
    });
    
    // Alternate between 4:00 PM and 6:00 PM
    timeSlotIndex = timeSlotIndex === 2 ? 3 : 2;
    currentDayMatches++;
  }
  
  // Return the last date of this stage
  return currentDayMatches > 0 ? addDays(currentDate, 1) : currentDate;
}

// Main function to generate all matches
async function generateAllMatches() {
  try {
    console.log('Starting match generation...');
    
    await clearExistingMatches();
    const lastGroupDate = await generateGroupStageMatches();
    await generateKnockoutMatches(lastGroupDate);
    
    console.log('All matches generated successfully!');
    db.close();
  } catch (error) {
    console.error('Error generating matches:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
generateAllMatches();
