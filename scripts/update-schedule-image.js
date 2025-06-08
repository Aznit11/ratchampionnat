/**
 * Script to update the match schedule according to the provided image
 * With start date of 08/06/2025
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../data/football-league.sqlite'));

// Schedule from the image data
const scheduleData = [
  {
    day: 1,
    matches: [
      { time: '18:00', teams: 'A1 vs A2' }
    ]
  },
  {
    day: 2,
    matches: [
      { time: '08:00', teams: 'A3 vs A4' },
      { time: '10:00', teams: 'B1 vs B2' },
      { time: '16:00', teams: 'B3 vs B4' },
      { time: '18:00', teams: 'C1 vs C2' }
    ]
  },
  {
    day: 3,
    matches: [
      { time: '08:00', teams: 'C3 vs C4' },
      { time: '10:00', teams: 'H1 vs H2' },
      { time: '16:00', teams: 'G3 vs G4' },
      { time: '18:00', teams: 'G1 vs G2' }
    ]
  },
  {
    day: 4,
    matches: [
      { time: '08:00', teams: 'H3 vs H4' },
      { time: '10:00', teams: 'D1 vs D2' },
      { time: '16:00', teams: 'E1 vs E2' },
      { time: '18:00', teams: 'D3 vs D4' }
    ]
  },
  {
    day: 5,
    matches: [
      { time: '08:00', teams: 'E3 vs E4' },
      { time: '10:00', teams: 'G1 vs G5' },
      { time: '16:00', teams: 'F3 vs F4' },
      { time: '18:00', teams: 'F1 vs F2' }
    ]
  },
  {
    day: 6,
    matches: [
      { time: '08:00', teams: 'G2 vs G4' },
      { time: '10:00', teams: 'H2 vs H4' },
      { time: '16:00', teams: 'A1 vs A3' },
      { time: '18:00', teams: 'H1 vs H5' }
    ]
  },
  {
    day: 7,
    matches: [
      { time: '08:00', teams: 'A2 vs A4' },
      { time: '10:00', teams: 'C2 vs C4' },
      { time: '16:00', teams: 'B1 vs B3' },
      { time: '18:00', teams: 'B2 vs B4' }
    ]
  },
  {
    day: 8,
    matches: [
      { time: '08:00', teams: 'C1 vs C3' },
      { time: '10:00', teams: 'G1 vs G3' },
      { time: '16:00', teams: 'H4 vs H5' },
      { time: '18:00', teams: 'G4 vs G5' }
    ]
  },
  {
    day: 9,
    matches: [
      { time: '08:00', teams: 'H1 vs H3' },
      { time: '10:00', teams: 'E1 vs E3' },
      { time: '16:00', teams: 'D2 vs D4' },
      { time: '18:00', teams: 'D1 vs D3' }
    ]
  },
  {
    day: 10,
    matches: [
      { time: '08:00', teams: 'E2 vs E4' },
      { time: '10:00', teams: 'F2 vs F4' },
      { time: '16:00', teams: 'F1 vs F3' },
      { time: '18:00', teams: 'G2 vs G3' }
    ]
  },
  {
    day: 11,
    matches: [
      { time: '08:00', teams: 'G1 vs G4' },
      { time: '10:00', teams: 'H1 vs H4' },
      { time: '16:00', teams: 'H2 vs H3' },
      { time: '18:00', teams: 'A1 vs A4' }
    ]
  },
  {
    day: 12,
    matches: [
      { time: '08:00', teams: 'B1 vs B4' },
      { time: '10:00', teams: 'A2 vs A3' },
      { time: '16:00', teams: 'G3 vs G5' },
      { time: '18:00', teams: 'B2 vs B3' }
    ]
  },
  {
    day: 13,
    matches: [
      { time: '08:00', teams: 'D1 vs D4' },
      { time: '10:00', teams: 'H3 vs H5' },
      { time: '16:00', teams: 'C1 vs C4' },
      { time: '18:00', teams: 'C2 vs C3' }
    ]
  },
  {
    day: 14,
    matches: [
      { time: '08:00', teams: 'D2 vs D3' },
      { time: '10:00', teams: 'F2 vs F3' },
      { time: '16:00', teams: 'E2 vs E3' },
      { time: '18:00', teams: 'E1 vs E4' }
    ]
  },
  {
    day: 15,
    matches: [
      { time: '08:00', teams: 'F1 vs F4' },
      { time: '10:00', teams: 'G2 vs G5' },
      { time: '16:00', teams: 'H2 vs H5' },
      { time: '18:00', teams: 'G1 vs G5' }
    ]
  }
];

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
    db.run('DELETE FROM matches WHERE stage = "Group Stage"', [], (err) => {
      if (err) {
        console.error('Error clearing matches:', err);
        reject(err);
        return;
      }
      
      db.run('DELETE FROM goals WHERE match_id NOT IN (SELECT id FROM matches)', [], (err) => {
        if (err) {
          console.error('Error clearing orphaned goals:', err);
          reject(err);
          return;
        }
        
        db.run('DELETE FROM cards WHERE match_id NOT IN (SELECT id FROM matches)', [], (err) => {
          if (err) {
            console.error('Error clearing orphaned cards:', err);
            reject(err);
            return;
          }
          
          console.log('Cleared existing group stage matches and related data');
          resolve();
        });
      });
    });
  });
}

// Get team ID from team code (like A1, B3, etc.)
async function getTeamId(teamCode) {
  const groupName = teamCode.charAt(0);
  const teamInGroupId = parseInt(teamCode.substring(1));
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM teams WHERE group_id = (SELECT id FROM groups WHERE name = ?) AND team_in_group_id = ?',
      [groupName, teamInGroupId],
      (err, team) => {
        if (err) {
          console.error(`Error getting team ${teamCode}:`, err);
          reject(err);
          return;
        }
        
        if (!team) {
          const errorMsg = `Team ${teamCode} not found in database`;
          console.error(errorMsg);
          reject(new Error(errorMsg));
          return;
        }
        
        resolve(team.id);
      }
    );
  });
}

// Create matches from schedule data
async function createMatches() {
  try {
    await clearExistingMatches();
    
    const startDate = new Date('2025-06-08'); // As requested: 08/06/2025
    let insertedMatches = 0;
    
    for (const dayData of scheduleData) {
      const matchDate = addDays(startDate, dayData.day - 1);
      const formattedDate = formatDate(matchDate);
      
      for (const matchData of dayData.matches) {
        const [homeTeamCode, awayTeamCode] = matchData.teams.split(' vs ');
        
        try {
          const homeTeamId = await getTeamId(homeTeamCode);
          const awayTeamId = await getTeamId(awayTeamCode);
          
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO matches (
                home_team_id, away_team_id, match_date, match_time, 
                stage, played, home_score, away_score
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                homeTeamId, awayTeamId, formattedDate, matchData.time,
                'Group Stage', 0, null, null
              ],
              function(err) {
                if (err) {
                  console.error(`Error inserting match ${matchData.teams}:`, err);
                  reject(err);
                  return;
                }
                
                console.log(`Created match: ${matchData.teams} on ${formattedDate} at ${matchData.time}`);
                insertedMatches++;
                resolve();
              }
            );
          });
        } catch (error) {
          console.error(`Error processing match ${matchData.teams}:`, error);
          // Continue with other matches even if one fails
        }
      }
    }
    
    console.log(`Total matches inserted: ${insertedMatches}`);
  } catch (error) {
    console.error('Error creating matches:', error);
    throw error;
  }
}

// Main function
async function updateSchedule() {
  try {
    await createMatches();
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
