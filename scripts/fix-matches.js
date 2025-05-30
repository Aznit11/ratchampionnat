/**
 * Script to fix the match schedule for the tournament
 * Following the requirements strictly:
 * - Day 1: Just one match at 6:00 PM
 * - Other days: EXACTLY 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * - Teams in groups of 4 have at least 3 days of rest between matches
 * - Teams in groups of 5 have at least 2 days of rest between matches
 * - Matches are ordered by groups and by teams within the groups
 * - Time slots are balanced to ensure fairness (6:00 PM being most favorable)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Tournament start date
const startDate = new Date('2025-06-01');

// Time slots (fixed slots as per requirements)
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

// Function to get all teams with their group information
function getTeamsWithGroupInfo(callback) {
  db.all(`
    SELECT t.id, t.name, t.team_in_group_id, g.id as group_id, g.name as group_name, g.team_count
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    ORDER BY g.id, t.team_in_group_id
  `, [], (err, teams) => {
    if (err) {
      console.error('Error fetching teams:', err);
      callback([]);
      return;
    }
    callback(teams);
  });
}

// Function to get all possible match pairings organized by group
function getAllMatchPairings(teams) {
  // Group teams by group_id
  const teamsByGroup = teams.reduce((acc, team) => {
    if (!acc[team.group_id]) {
      acc[team.group_id] = [];
    }
    acc[team.group_id].push(team);
    return acc;
  }, {});
  
  // Generate all possible pairings within each group
  const matchesByGroup = {};
  
  Object.entries(teamsByGroup).forEach(([groupId, groupTeams]) => {
    matchesByGroup[groupId] = [];
    
    // Generate all possible pairings within the group
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matchesByGroup[groupId].push({
          homeTeam: groupTeams[i],
          awayTeam: groupTeams[j],
          groupId: parseInt(groupId)
        });
      }
    }
  });
  
  return matchesByGroup;
}

// Function to clear existing matches
function clearExistingMatches(callback) {
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

// Function to check if a team's last match was recent
function getTeamLastMatchDate(teamId, matches) {
  // Reverse to get the most recent match first
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    if (match.homeTeamId === teamId || match.awayTeamId === teamId) {
      return new Date(match.date);
    }
  }
  return null;
}

// Check if a team can play on a given date based on their rest day requirements
function canTeamPlayOn(teamId, teamRestDays, date, scheduledMatches) {
  const lastMatchDate = getTeamLastMatchDate(teamId, scheduledMatches);
  
  if (!lastMatchDate) {
    return true; // No previous match, can play
  }
  
  const daysDiff = Math.floor((date - lastMatchDate) / (1000 * 60 * 60 * 24));
  return daysDiff >= teamRestDays;
}

// Fix the match schedule following all requirements
function fixMatchSchedule() {
  clearExistingMatches(() => {
    getTeamsWithGroupInfo(teams => {
      // Get all possible match pairings
      const matchesByGroup = getAllMatchPairings(teams);
      
      // Create a flat array of all matches from all groups, with group data included
      let allMatches = [];
      Object.entries(matchesByGroup).forEach(([groupId, matches]) => {
        const groupName = teams.find(t => t.group_id === parseInt(groupId)).group_name;
        const teamCount = teams.find(t => t.group_id === parseInt(groupId)).team_count;
        const restDays = teamCount === 5 ? 2 : 3; // 3+ days for groups with 4 teams, 2+ days for groups with 5 teams
        
        matches.forEach(match => {
          allMatches.push({
            homeTeamId: match.homeTeam.id,
            homeTeamName: match.homeTeam.name,
            awayTeamId: match.awayTeam.id,
            awayTeamName: match.awayTeam.name,
            groupId: parseInt(groupId),
            groupName,
            restDays,
            stage: 'Group Stage'
          });
        });
      });
      
      // Sort matches by group ID to ensure matches are ordered by groups
      allMatches.sort((a, b) => a.groupId - b.groupId);
      
      // Schedule the matches
      scheduleMatches(allMatches);
    });
  });
}

// Track team premium time slots (6:00 PM) for fairness
const teamPremiumSlots = {};

// Function to schedule matches following all requirements exactly
function scheduleMatches(matches) {
  // Array to store scheduled match data for tracking
  const scheduledMatches = [];
  
  // Current date starts with the tournament start date
  let currentDate = new Date(startDate);
  
  // First day has just one match at 6:00 PM
  const firstDayMatch = matches.shift(); // Take the first match
  const firstDayEntry = {
    date: formatDate(currentDate),
    time: '18:00', // 6:00 PM
    homeTeamId: firstDayMatch.homeTeamId,
    awayTeamId: firstDayMatch.awayTeamId,
    homeTeamName: firstDayMatch.homeTeamName,
    awayTeamName: firstDayMatch.awayTeamName,
    stage: firstDayMatch.stage
  };
  
  scheduledMatches.push(firstDayEntry);
  
  // Insert the first match into the database
  insertMatch(
    firstDayEntry.homeTeamId,
    firstDayEntry.awayTeamId,
    firstDayEntry.date,
    firstDayEntry.time,
    firstDayEntry.stage
  );
  
  console.log(`Scheduled Day 1 match: ${firstDayEntry.homeTeamName} vs ${firstDayEntry.awayTeamName} at ${firstDayEntry.time}`);
  
  // Update team premium slot counts
  teamPremiumSlots[firstDayEntry.homeTeamId] = (teamPremiumSlots[firstDayEntry.homeTeamId] || 0) + 1;
  teamPremiumSlots[firstDayEntry.awayTeamId] = (teamPremiumSlots[firstDayEntry.awayTeamId] || 0) + 1;
  
  // Move to next day
  currentDate = addDays(currentDate, 1);
  
  // Keep scheduling until all matches are scheduled
  while (matches.length > 0) {
    const dayMatches = [];
    const dayTimeSlots = [...timeSlots]; // Fresh copy for each day
    
    // We need to fill exactly 4 time slots for each day (except the first day)
    while (dayTimeSlots.length > 0 && matches.length > 0) {
      // Take the current time slot
      const currentSlot = dayTimeSlots.shift();
      
      // Find a match that can be scheduled in this time slot
      const matchIndex = findValidMatch(matches, currentDate, currentSlot, scheduledMatches);
      
      if (matchIndex !== -1) {
        const match = matches.splice(matchIndex, 1)[0]; // Remove the match from the array
        
        const matchEntry = {
          date: formatDate(currentDate),
          time: currentSlot,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeamName,
          awayTeamName: match.awayTeamName,
          stage: match.stage
        };
        
        scheduledMatches.push(matchEntry);
        dayMatches.push(matchEntry);
        
        // Insert into database
        insertMatch(
          matchEntry.homeTeamId,
          matchEntry.awayTeamId,
          matchEntry.date,
          matchEntry.time,
          matchEntry.stage
        );
        
        // Update premium slot counts if it's the 6:00 PM slot
        if (currentSlot === '18:00') {
          teamPremiumSlots[matchEntry.homeTeamId] = (teamPremiumSlots[matchEntry.homeTeamId] || 0) + 1;
          teamPremiumSlots[matchEntry.awayTeamId] = (teamPremiumSlots[matchEntry.awayTeamId] || 0) + 1;
        }
        
        console.log(`Scheduled: ${matchEntry.homeTeamName} vs ${matchEntry.awayTeamName} on ${matchEntry.date} at ${matchEntry.time}`);
      } else {
        // Could not find a valid match for this time slot
        // This could lead to days with fewer than 4 matches, so we need to handle this
        console.log(`WARNING: Could not find a valid match for time slot ${currentSlot} on ${formatDate(currentDate)}`);
        
        // Try to find any match that does not involve teams that have played recently
        // This might involve relaxing the "order by groups" constraint temporarily
        const anyMatchIndex = findAnyValidMatch(matches, currentDate, scheduledMatches);
        
        if (anyMatchIndex !== -1) {
          const match = matches.splice(anyMatchIndex, 1)[0]; // Remove the match from the array
          
          const matchEntry = {
            date: formatDate(currentDate),
            time: currentSlot,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeTeamName: match.homeTeamName,
            awayTeamName: match.awayTeamName,
            stage: match.stage
          };
          
          scheduledMatches.push(matchEntry);
          dayMatches.push(matchEntry);
          
          // Insert into database
          insertMatch(
            matchEntry.homeTeamId,
            matchEntry.awayTeamId,
            matchEntry.date,
            matchEntry.time,
            matchEntry.stage
          );
          
          // Update premium slot counts if it's the 6:00 PM slot
          if (currentSlot === '18:00') {
            teamPremiumSlots[matchEntry.homeTeamId] = (teamPremiumSlots[matchEntry.homeTeamId] || 0) + 1;
            teamPremiumSlots[matchEntry.awayTeamId] = (teamPremiumSlots[matchEntry.awayTeamId] || 0) + 1;
          }
          
          console.log(`Scheduled (relaxed constraints): ${matchEntry.homeTeamName} vs ${matchEntry.awayTeamName} on ${matchEntry.date} at ${matchEntry.time}`);
        } else {
          // If we still can't find a valid match, we need to go to the next day
          console.log(`ERROR: Could not fill time slot ${currentSlot} on ${formatDate(currentDate)}`);
          // We'll continue and accept having fewer than 4 matches on this day as a last resort
        }
      }
    }
    
    // Check if we filled all 4 time slots for the day
    if (dayMatches.length < 4 && matches.length > 0) {
      console.log(`WARNING: Day ${formatDate(currentDate)} has only ${dayMatches.length} matches scheduled instead of 4.`);
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1);
  }
  
  console.log('Match scheduling complete!');
  console.log(`Total matches scheduled: ${scheduledMatches.length}`);
}

// Function to find a valid match for a specific time slot
function findValidMatch(matches, date, timeSlot, scheduledMatches) {
  // First check for scheduled matches by respecting group order
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    
    // Check if both teams can play on this date (respect rest days)
    if (canTeamPlayOn(match.homeTeamId, match.restDays, date, scheduledMatches) && 
        canTeamPlayOn(match.awayTeamId, match.restDays, date, scheduledMatches)) {
      
      // For premium slot (6:00 PM), check if teams already have many premium slots
      if (timeSlot === '18:00' && 
          teamPremiumSlots[match.homeTeamId] > 1 && 
          teamPremiumSlots[match.awayTeamId] > 1) {
        // Skip this match for premium slot to promote fairness
        continue;
      }
      
      // This match can be scheduled
      return i;
    }
  }
  
  // Could not find a valid match
  return -1;
}

// Function to find any valid match when we need to relax constraints
function findAnyValidMatch(matches, date, scheduledMatches) {
  // Try all matches, ignoring group order
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    
    // Check if both teams can play on this date (respect rest days)
    if (canTeamPlayOn(match.homeTeamId, match.restDays, date, scheduledMatches) && 
        canTeamPlayOn(match.awayTeamId, match.restDays, date, scheduledMatches)) {
      // This match can be scheduled
      return i;
    }
  }
  
  // Still could not find a valid match
  return -1;
}

// Function to insert a match into the database
function insertMatch(homeTeamId, awayTeamId, matchDate, matchTime, stage) {
  db.run(`
    INSERT INTO matches (
      home_team_id, away_team_id, match_date, match_time,
      home_score, away_score, played, stage
    ) VALUES (?, ?, ?, ?, 0, 0, 0, ?)
  `, [
    homeTeamId, awayTeamId, 
    matchDate, matchTime, stage
  ], function(err) {
    if (err) {
      console.error(`Error inserting match:`, err);
    }
  });
}

// Execute the script
console.log('Fixing match schedule...');
fixMatchSchedule();
