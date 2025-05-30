/**
 * Correct match scheduling script that strictly follows all requirements:
 * 1. Day 1: Just one match at 6:00 PM
 * 2. All other days: Exactly 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * 3. NO team plays more than ONE match per day
 * 4. Rest periods: 3+ days for groups with 4 teams, 2+ days for groups with 5 teams
 * 5. Fair distribution of favorable time slots (6:00 PM is most favorable)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Time slots in order of preference (most favorable last)
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
      
      db.run('DELETE FROM goals', [], (err) => {
        if (err) {
          console.error('Error clearing goals:', err);
          return reject(err);
        }
        
        db.run('DELETE FROM cards', [], (err) => {
          if (err) {
            console.error('Error clearing cards:', err);
            return reject(err);
          }
          
          console.log('Cleared all matches, goals, and cards');
          resolve();
        });
      });
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

// Track favorable time slots per team
const teamTimeSlots = {};

// Function to get most favorable available time slot for a team pair
function getFavorableTimeSlot(homeTeamId, awayTeamId, usedTimeSlotsForDay) {
  // Initialize if not exists
  if (!teamTimeSlots[homeTeamId]) {
    teamTimeSlots[homeTeamId] = { '18:00': 0, '16:00': 0, '10:00': 0, '08:00': 0 };
  }
  if (!teamTimeSlots[awayTeamId]) {
    teamTimeSlots[awayTeamId] = { '18:00': 0, '16:00': 0, '10:00': 0, '08:00': 0 };
  }
  
  // Calculate combined usage of time slots for both teams
  const combinedUsage = {};
  for (const slot of TIME_SLOTS) {
    combinedUsage[slot] = teamTimeSlots[homeTeamId][slot] + teamTimeSlots[awayTeamId][slot];
  }
  
  // Find available time slot with lowest combined usage (favoring most favorable slots in case of ties)
  let bestSlot = null;
  let lowestUsage = Infinity;
  
  // Try 6:00 PM first (most favorable), then 4:00 PM, then 10:00 AM, then 8:00 AM
  const slotPreference = ['18:00', '16:00', '10:00', '08:00'];
  
  for (const slot of slotPreference) {
    if (!usedTimeSlotsForDay.includes(slot) && combinedUsage[slot] <= lowestUsage) {
      bestSlot = slot;
      lowestUsage = combinedUsage[slot];
    }
  }
  
  // If no slot is available based on preference, take any available slot
  if (!bestSlot) {
    for (const slot of TIME_SLOTS) {
      if (!usedTimeSlotsForDay.includes(slot)) {
        bestSlot = slot;
        break;
      }
    }
  }
  
  // Update usage counters for the selected slot
  if (bestSlot) {
    teamTimeSlots[homeTeamId][bestSlot]++;
    teamTimeSlots[awayTeamId][bestSlot]++;
  }
  
  return bestSlot;
}

// Generate all group stage matches
async function generateGroupStageMatches() {
  try {
    const groups = await getTeamsInGroups();
    console.log(`Found ${groups.length} groups with teams`);
    
    // Generate all potential matches
    const allPossibleMatches = [];
    
    groups.forEach(group => {
      const teams = group.teams;
      // For each pair of teams in the group
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          allPossibleMatches.push({
            homeTeam: teams[i],
            awayTeam: teams[j],
            group: group,
            minRestDays: group.team_count === 5 ? 2 : 3,
            // Order by group and then by teams within group
            priority: (group.id * 100) + (teams[i].team_in_group_id * 10) + teams[j].team_in_group_id
          });
        }
      }
    });
    
    // Sort matches by priority to ensure ordering by group and team
    allPossibleMatches.sort((a, b) => a.priority - b.priority);
    
    console.log(`Created ${allPossibleMatches.length} potential matches`);
    
    // Day 1: Just one match at 6:00 PM (first match of Group A)
    let currentDate = new Date(START_DATE);
    let currentDay = 1;
    
    // Track when each team last played
    const teamLastMatchDate = {};
    
    // Track teams playing on the current day
    let teamsPlayingToday = new Set();
    
    // First day, just one match (Group A, first vs second team)
    const firstMatch = allPossibleMatches.find(m => 
      m.group.name === 'A' && 
      m.homeTeam.team_in_group_id === 1 && 
      m.awayTeam.team_in_group_id === 2
    );
    
    if (firstMatch) {
      await insertMatch(
        firstMatch.homeTeam.id,
        firstMatch.awayTeam.id,
        formatDate(currentDate),
        '18:00',
        'Group Stage'
      );
      
      console.log(`Day ${currentDay} (${formatDate(currentDate)}): Scheduled Group ${firstMatch.group.name} match: ${firstMatch.homeTeam.name} vs ${firstMatch.awayTeam.name} at 18:00`);
      
      // Update trackers
      teamLastMatchDate[firstMatch.homeTeam.id] = currentDate;
      teamLastMatchDate[firstMatch.awayTeam.id] = currentDate;
      teamTimeSlots[firstMatch.homeTeam.id] = { '18:00': 1, '16:00': 0, '10:00': 0, '08:00': 0 };
      teamTimeSlots[firstMatch.awayTeam.id] = { '18:00': 1, '16:00': 0, '10:00': 0, '08:00': 0 };
      
      // Remove this match from the pool
      const firstMatchIndex = allPossibleMatches.findIndex(m => 
        m.homeTeam.id === firstMatch.homeTeam.id && 
        m.awayTeam.id === firstMatch.awayTeam.id
      );
      
      if (firstMatchIndex !== -1) {
        allPossibleMatches.splice(firstMatchIndex, 1);
      }
    }
    
    // Move to day 2
    currentDate = addDays(currentDate, 1);
    currentDay++;
    teamsPlayingToday = new Set();
    
    // Process the remaining matches
    while (allPossibleMatches.length > 0) {
      // Prepare for scheduling this day
      const usedTimeSlotsForDay = [];
      const matchesScheduledToday = [];
      
      // Try to schedule 4 matches for today
      for (let i = 0; i < allPossibleMatches.length && matchesScheduledToday.length < 4; i++) {
        const match = allPossibleMatches[i];
        
        // Check if teams already playing today
        if (teamsPlayingToday.has(match.homeTeam.id) || teamsPlayingToday.has(match.awayTeam.id)) {
          continue;
        }
        
        // Check rest periods
        const homeTeamLastMatch = teamLastMatchDate[match.homeTeam.id];
        const awayTeamLastMatch = teamLastMatchDate[match.awayTeam.id];
        
        let homeTeamRested = true;
        if (homeTeamLastMatch) {
          const daysRest = Math.floor((currentDate - homeTeamLastMatch) / (1000 * 60 * 60 * 24));
          homeTeamRested = daysRest >= match.minRestDays;
        }
        
        let awayTeamRested = true;
        if (awayTeamLastMatch) {
          const daysRest = Math.floor((currentDate - awayTeamLastMatch) / (1000 * 60 * 60 * 24));
          awayTeamRested = daysRest >= match.minRestDays;
        }
        
        // If both teams have had enough rest, schedule this match
        if (homeTeamRested && awayTeamRested) {
          // Get the most favorable available time slot for these teams
          const timeSlot = getFavorableTimeSlot(match.homeTeam.id, match.awayTeam.id, usedTimeSlotsForDay);
          
          matchesScheduledToday.push({
            match: match,
            timeSlot: timeSlot,
            index: i
          });
          
          // Mark the time slot as used for today
          usedTimeSlotsForDay.push(timeSlot);
          
          // Mark these teams as playing today
          teamsPlayingToday.add(match.homeTeam.id);
          teamsPlayingToday.add(match.awayTeam.id);
        }
      }
      
      // If we couldn't schedule 4 matches today, try the next day
      if (matchesScheduledToday.length < 4) {
        currentDate = addDays(currentDate, 1);
        currentDay++;
        teamsPlayingToday = new Set();
        continue;
      }
      
      // Insert the scheduled matches
      for (const scheduledMatch of matchesScheduledToday) {
        await insertMatch(
          scheduledMatch.match.homeTeam.id,
          scheduledMatch.match.awayTeam.id,
          formatDate(currentDate),
          scheduledMatch.timeSlot,
          'Group Stage'
        );
        
        console.log(`Day ${currentDay} (${formatDate(currentDate)}): Scheduled Group ${scheduledMatch.match.group.name} match: ${scheduledMatch.match.homeTeam.name} vs ${scheduledMatch.match.awayTeam.name} at ${scheduledMatch.timeSlot}`);
        
        // Update team's last match date
        teamLastMatchDate[scheduledMatch.match.homeTeam.id] = new Date(currentDate);
        teamLastMatchDate[scheduledMatch.match.awayTeam.id] = new Date(currentDate);
        
        // Remove the match from possible matches
        allPossibleMatches.splice(scheduledMatch.index - matchesScheduledToday.indexOf(scheduledMatch), 1);
      }
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
      currentDay++;
      teamsPlayingToday = new Set();
    }
    
    console.log(`Group stage scheduling complete - ${currentDay-1} days total`);
    console.log(`Time slot distribution per team:`);
    
    // Print time slot distribution for verification
    for (const teamId in teamTimeSlots) {
      console.log(`Team ID ${teamId}: 18:00 (${teamTimeSlots[teamId]['18:00']}), 16:00 (${teamTimeSlots[teamId]['16:00']}), 10:00 (${teamTimeSlots[teamId]['10:00']}), 08:00 (${teamTimeSlots[teamId]['08:00']})`);
    }
    
    return { lastDate: addDays(currentDate, -1) };
  } catch (error) {
    console.error('Error generating group stage matches:', error);
    throw error;
  }
}

// Generate knockout stage matches
async function generateKnockoutMatches(lastGroupDate) {
  try {
    // Round of 16 starts 3 days after group stage
    let currentDate = addDays(new Date(lastGroupDate), 3);
    
    console.log('Generating Round of 16 matches...');
    
    // Round of 16: 8 matches over 2 days (4 per day)
    for (let day = 0; day < 2; day++) {
      for (let timeSlotIndex = 0; timeSlotIndex < 4; timeSlotIndex++) {
        await insertMatch(
          null, // TBD
          null, // TBD
          formatDate(currentDate),
          TIME_SLOTS[timeSlotIndex],
          'Round of 16'
        );
        
        console.log(`Round of 16: ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
      }
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
    }
    
    // Quarter Finals start 3 days after Round of 16
    currentDate = addDays(currentDate, 2);
    
    console.log('Generating Quarter Final matches...');
    
    // Quarter Finals: 4 matches in one day
    for (let timeSlotIndex = 0; timeSlotIndex < 4; timeSlotIndex++) {
      await insertMatch(
        null, // TBD
        null, // TBD
        formatDate(currentDate),
        TIME_SLOTS[timeSlotIndex],
        'Quarter Final'
      );
      
      console.log(`Quarter Final: ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
    }
    
    // Semi Finals start 4 days after Quarter Finals
    currentDate = addDays(currentDate, 4);
    
    console.log('Generating Semi Final matches...');
    
    // Semi Finals: 2 matches (4:00 PM and 6:00 PM)
    for (let i = 0; i < 2; i++) {
      const timeSlotIndex = i + 2; // 4:00 PM and 6:00 PM
      
      await insertMatch(
        null, // TBD
        null, // TBD
        formatDate(currentDate),
        TIME_SLOTS[timeSlotIndex],
        'Semi Final'
      );
      
      console.log(`Semi Final: ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
    }
    
    // Final starts 5 days after Semi Finals
    currentDate = addDays(currentDate, 5);
    
    console.log('Generating Final match...');
    
    // Final: 1 match at 6:00 PM
    await insertMatch(
      null, // TBD
      null, // TBD
      formatDate(currentDate),
      TIME_SLOTS[3], // 6:00 PM
      'Final'
    );
    
    console.log(`Final: ${formatDate(currentDate)} at ${TIME_SLOTS[3]}`);
    
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
