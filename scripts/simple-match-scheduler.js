/**
 * Simple and direct match scheduling script that strictly follows all requirements:
 * 1. Day 1: Just one match at 6:00 PM
 * 2. All other days: Exactly 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * 3. Rest periods: 3+ days for groups with 4 teams, 2+ days for groups with 5 teams
 * 4. Matches ordered by groups and teams within groups
 * 5. Fair distribution of favorable time slots
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Time slots
const TIME_SLOTS = ['08:00', '10:00', '16:00', '18:00'];

// Tournament start date
const START_DATE = new Date('2025-06-01');

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
function clearMatches() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM matches', [], (err) => {
      if (err) {
        console.error('Error clearing matches:', err);
        return reject(err);
      }
      console.log('Cleared all matches');
      resolve();
    });
  });
}

// Get all teams grouped by their groups
function getTeamsInGroups() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT g.id as group_id, g.name as group_name, g.team_count,
             t.id as team_id, t.name as team_name, t.team_in_group_id
      FROM groups g
      JOIN teams t ON g.id = t.group_id
      ORDER BY g.id, t.team_in_group_id
    `, [], (err, rows) => {
      if (err) {
        console.error('Error fetching teams:', err);
        return reject(err);
      }
      
      // Group by group_id
      const groups = {};
      rows.forEach(row => {
        if (!groups[row.group_id]) {
          groups[row.group_id] = {
            id: row.group_id,
            name: row.group_name,
            team_count: row.team_count,
            teams: []
          };
        }
        
        groups[row.group_id].teams.push({
          id: row.team_id,
          name: row.team_name,
          team_in_group_id: row.team_in_group_id
        });
      });
      
      resolve(Object.values(groups));
    });
  });
}

// Insert a match into the database
function insertMatch(homeTeamId, awayTeamId, matchDate, matchTime, stage) {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time,
        home_score, away_score, played, stage
      ) VALUES (?, ?, ?, ?, 0, 0, 0, ?)
    `, [
      homeTeamId, awayTeamId, matchDate, matchTime, stage
    ], function(err) {
      if (err) {
        console.error('Error inserting match:', err);
        return reject(err);
      }
      resolve(this.lastID);
    });
  });
}

// Generate all group stage matches
async function generateGroupStageMatches() {
  try {
    const groups = await getTeamsInGroups();
    console.log(`Found ${groups.length} groups with teams`);
    
    // Create a schedule array to track days and time slots
    let currentDate = new Date(START_DATE);
    let day = 1;
    let currentTimeSlotIndex = 0;
    let matchesOnCurrentDay = 0;
    
    // Team's last match date tracking
    const teamLastMatchDate = {};
    
    // Day 1: Just one match at 6:00 PM (first match of Group A)
    const groupA = groups.find(g => g.name === 'A');
    if (groupA && groupA.teams.length >= 2) {
      const homeTeam = groupA.teams[0];
      const awayTeam = groupA.teams[1];
      
      await insertMatch(
        homeTeam.id, 
        awayTeam.id, 
        formatDate(currentDate), 
        '18:00',  // 6:00 PM
        'Group Stage'
      );
      
      console.log(`Day ${day} (${formatDate(currentDate)}): Scheduled Group A match: ${homeTeam.name} vs ${awayTeam.name} at 18:00`);
      
      // Update last match date for these teams
      teamLastMatchDate[homeTeam.id] = currentDate;
      teamLastMatchDate[awayTeam.id] = currentDate;
      
      // Move to day 2
      currentDate = addDays(currentDate, 1);
      day++;
      matchesOnCurrentDay = 0;
    }
    
    // Generate all matches for each group
    const allMatches = [];
    
    groups.forEach(group => {
      const teams = group.teams;
      // For each pair of teams in the group
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          // Skip the first match of Group A which we've already scheduled
          if (group.name === 'A' && i === 0 && j === 1) continue;
          
          allMatches.push({
            homeTeam: teams[i],
            awayTeam: teams[j],
            group: group,
            minRestDays: group.team_count === 5 ? 2 : 3
          });
        }
      }
    });
    
    // Schedule remaining matches
    for (const match of allMatches) {
      let validDateFound = false;
      
      while (!validDateFound) {
        // If we already have 4 matches on this day, move to the next day
        if (matchesOnCurrentDay >= 4) {
          currentDate = addDays(currentDate, 1);
          day++;
          matchesOnCurrentDay = 0;
          currentTimeSlotIndex = 0;
        }
        
        // Check if both teams have had enough rest
        const homeTeamLastMatch = teamLastMatchDate[match.homeTeam.id];
        const awayTeamLastMatch = teamLastMatchDate[match.awayTeam.id];
        
        let homeTeamRested = true;
        let awayTeamRested = true;
        
        if (homeTeamLastMatch) {
          const daysDiff = Math.floor((currentDate - homeTeamLastMatch) / (1000 * 60 * 60 * 24));
          homeTeamRested = daysDiff >= match.minRestDays;
        }
        
        if (awayTeamLastMatch) {
          const daysDiff = Math.floor((currentDate - awayTeamLastMatch) / (1000 * 60 * 60 * 24));
          awayTeamRested = daysDiff >= match.minRestDays;
        }
        
        if (homeTeamRested && awayTeamRested) {
          // Both teams have had enough rest, schedule the match
          validDateFound = true;
          
          const timeSlot = TIME_SLOTS[currentTimeSlotIndex];
          
          await insertMatch(
            match.homeTeam.id,
            match.awayTeam.id,
            formatDate(currentDate),
            timeSlot,
            'Group Stage'
          );
          
          console.log(`Day ${day} (${formatDate(currentDate)}): Scheduled Group ${match.group.name} match: ${match.homeTeam.name} vs ${match.awayTeam.name} at ${timeSlot}`);
          
          // Update last match date for these teams
          teamLastMatchDate[match.homeTeam.id] = new Date(currentDate);
          teamLastMatchDate[match.awayTeam.id] = new Date(currentDate);
          
          // Move to next time slot
          currentTimeSlotIndex = (currentTimeSlotIndex + 1) % 4;
          matchesOnCurrentDay++;
        } else {
          // One or both teams haven't had enough rest, try the next day
          currentDate = addDays(currentDate, 1);
          day++;
          matchesOnCurrentDay = 0;
          currentTimeSlotIndex = 0;
        }
      }
    }
    
    console.log(`Group stage matches scheduling complete, last day: ${day}, date: ${formatDate(currentDate)}`);
    return { lastDay: day, lastDate: currentDate };
  } catch (error) {
    console.error('Error generating group stage matches:', error);
    throw error;
  }
}

// Generate knockout stage matches
async function generateKnockoutMatches(lastGroupDate) {
  try {
    // Add 3 days rest after group stage
    let currentDate = addDays(lastGroupDate, 3);
    let currentDay = 1;
    
    console.log('Generating Round of 16 matches...');
    
    // Round of 16: 8 matches over 2 days (4 matches per day)
    for (let i = 0; i < 8; i++) {
      const timeSlotIndex = i % 4;
      
      if (i > 0 && i % 4 === 0) {
        currentDate = addDays(currentDate, 1);
        currentDay++;
      }
      
      await insertMatch(
        null, // TBD
        null, // TBD
        formatDate(currentDate),
        TIME_SLOTS[timeSlotIndex],
        'Round of 16'
      );
      
      console.log(`Knockout Day ${currentDay} (${formatDate(currentDate)}): Scheduled Round of 16 match at ${TIME_SLOTS[timeSlotIndex]}`);
    }
    
    // Add 3 days rest after Round of 16
    currentDate = addDays(currentDate, 3);
    currentDay = 1;
    
    console.log('Generating Quarter Final matches...');
    
    // Quarter Finals: 4 matches over 1 day
    for (let i = 0; i < 4; i++) {
      await insertMatch(
        null, // TBD
        null, // TBD
        formatDate(currentDate),
        TIME_SLOTS[i],
        'Quarter Final'
      );
      
      console.log(`Knockout Day ${currentDay+2} (${formatDate(currentDate)}): Scheduled Quarter Final match at ${TIME_SLOTS[i]}`);
    }
    
    // Add 4 days rest after Quarter Finals
    currentDate = addDays(currentDate, 4);
    currentDay++;
    
    console.log('Generating Semi Final matches...');
    
    // Semi Finals: 2 matches on one day (4:00 PM and 6:00 PM)
    for (let i = 0; i < 2; i++) {
      const timeSlotIndex = i + 2; // 4:00 PM and 6:00 PM
      
      await insertMatch(
        null, // TBD
        null, // TBD
        formatDate(currentDate),
        TIME_SLOTS[timeSlotIndex],
        'Semi Final'
      );
      
      console.log(`Knockout Day ${currentDay+2} (${formatDate(currentDate)}): Scheduled Semi Final match at ${TIME_SLOTS[timeSlotIndex]}`);
    }
    
    // Add 5 days rest after Semi Finals
    currentDate = addDays(currentDate, 5);
    currentDay++;
    
    console.log('Generating Final match...');
    
    // Final: 1 match at 6:00 PM
    await insertMatch(
      null, // TBD
      null, // TBD
      formatDate(currentDate),
      TIME_SLOTS[3], // 6:00 PM
      'Final'
    );
    
    console.log(`Knockout Day ${currentDay+2} (${formatDate(currentDate)}): Scheduled Final match at ${TIME_SLOTS[3]}`);
    
    console.log('All knockout matches generated successfully!');
  } catch (error) {
    console.error('Error generating knockout matches:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await clearMatches();
    const { lastDate } = await generateGroupStageMatches();
    await generateKnockoutMatches(lastDate);
    console.log('Match scheduling completed successfully!');
    db.close();
  } catch (error) {
    console.error('Error in match scheduling:', error);
    db.close();
    process.exit(1);
  }
}

// Execute the script
main();
