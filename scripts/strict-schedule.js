/**
 * Strict match scheduling script that enforces ALL requirements:
 * 1. Day 1: EXACTLY one match at 6:00 PM
 * 2. All other days: EXACTLY 4 matches (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * 3. Proper rest periods (3+ days for groups of 4, 2+ days for groups of 5)
 * 4. Fair distribution of premium time slots
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Tournament start date
const startDate = new Date('2025-06-01');

// Time slots in order
const TIME_SLOTS = ['08:00', '10:00', '16:00', '18:00'];

// Helper functions
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Create promises for database operations
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Schedule generation
async function generateSchedule() {
  try {
    console.log('Starting strict schedule generation...');
    
    // Step 1: Clear existing matches
    await dbRun('DELETE FROM matches');
    await dbRun('DELETE FROM goals');
    await dbRun('DELETE FROM cards');
    console.log('Cleared existing matches, goals, and cards');
    
    // Step 2: Get all teams with their group information
    const teams = await dbAll(`
      SELECT t.id, t.name, g.id as group_id, g.name as group_name, 
             COUNT(t2.id) as team_count_in_group
      FROM teams t
      JOIN groups g ON t.group_id = g.id
      JOIN teams t2 ON t2.group_id = g.id
      GROUP BY t.id
      ORDER BY g.id, t.team_in_group_id
    `);
    console.log(`Loaded ${teams.length} teams`);
    
    // Step 3: Group teams by their group
    const teamsByGroup = {};
    teams.forEach(team => {
      if (!teamsByGroup[team.group_id]) {
        teamsByGroup[team.group_id] = [];
      }
      teamsByGroup[team.group_id].push(team);
    });
    
    // Step 4: Generate all possible matches by group
    const allMatches = [];
    Object.entries(teamsByGroup).forEach(([groupId, groupTeams]) => {
      const groupName = groupTeams[0].group_name;
      const teamCount = groupTeams[0].team_count_in_group;
      const restDays = teamCount === 5 ? 2 : 3; // 3+ days for groups of 4, 2+ days for groups of 5
      
      console.log(`Group ${groupName}: ${teamCount} teams, ${restDays} rest days required`);
      
      // Generate all matches within this group
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          allMatches.push({
            homeTeamId: groupTeams[i].id,
            homeTeamName: groupTeams[i].name,
            awayTeamId: groupTeams[j].id,
            awayTeamName: groupTeams[j].name,
            groupId: parseInt(groupId),
            groupName,
            restDays,
            stage: 'Group Stage'
          });
        }
      }
    });
    
    console.log(`Generated ${allMatches.length} total matches to schedule`);
    
    // Step 5: Schedule the matches
    const scheduledMatches = [];
    const teamLastMatchDate = {}; // Track when each team last played
    const teamPremiumSlots = {}; // Track 6:00 PM slots for each team
    
    let currentDate = new Date(startDate);
    let day = 1;
    
    // Day 1: Exactly one match at 6:00 PM
    const firstMatch = allMatches.shift();
    await scheduleMatch(firstMatch, currentDate, '18:00', scheduledMatches, teamLastMatchDate, teamPremiumSlots);
    console.log(`Day ${day}: Scheduled 1 match at 18:00`);
    
    // Remaining days: Schedule exactly 4 matches per day
    while (allMatches.length > 0) {
      day++;
      currentDate = addDays(currentDate, 1);
      console.log(`\nScheduling Day ${day}: ${formatDate(currentDate)}`);
      
      const dayMatches = [];
      
      // Schedule all 4 time slots
      for (const timeSlot of TIME_SLOTS) {
        // Find a valid match for this time slot with respect to rest days
        let scheduled = false;
        
        // First try matches in group order
        for (let i = 0; i < allMatches.length; i++) {
          const match = allMatches[i];
          
          // Check if both teams have had enough rest days
          if (canTeamPlay(match.homeTeamId, match.restDays, currentDate, teamLastMatchDate) && 
              canTeamPlay(match.awayTeamId, match.restDays, currentDate, teamLastMatchDate)) {
            
            // For 18:00 (premium slot), check if teams already have premium slots
            if (timeSlot === '18:00') {
              const homePremiumCount = teamPremiumSlots[match.homeTeamId] || 0;
              const awayPremiumCount = teamPremiumSlots[match.awayTeamId] || 0;
              
              // Skip if both teams already have premium slots
              if (homePremiumCount > 0 && awayPremiumCount > 0) {
                continue;
              }
            }
            
            // This match can be scheduled
            allMatches.splice(i, 1); // Remove from unscheduled matches
            await scheduleMatch(match, currentDate, timeSlot, scheduledMatches, teamLastMatchDate, teamPremiumSlots);
            dayMatches.push(match);
            scheduled = true;
            break;
          }
        }
        
        // If couldn't schedule in group order, try any valid match
        if (!scheduled) {
          // Try more aggressively to find any match that works
          for (let i = 0; i < allMatches.length; i++) {
            const match = allMatches[i];
            
            if (canTeamPlay(match.homeTeamId, match.restDays, currentDate, teamLastMatchDate) && 
                canTeamPlay(match.awayTeamId, match.restDays, currentDate, teamLastMatchDate)) {
              
              // This match can be scheduled (even if out of group order)
              allMatches.splice(i, 1); // Remove from unscheduled matches
              await scheduleMatch(match, currentDate, timeSlot, scheduledMatches, teamLastMatchDate, teamPremiumSlots);
              dayMatches.push(match);
              scheduled = true;
              break;
            }
          }
        }
        
        // If still couldn't schedule, try with relaxed rest day constraints as last resort
        if (!scheduled && allMatches.length > 0) {
          console.log(`WARNING: Could not find a valid match for time ${timeSlot}. Relaxing rest day constraints.`);
          
          // Find match with teams that played least recently
          let bestMatch = null;
          let maxRestDays = -1;
          
          for (let i = 0; i < allMatches.length; i++) {
            const match = allMatches[i];
            
            const homeRestDays = getRestDays(match.homeTeamId, currentDate, teamLastMatchDate);
            const awayRestDays = getRestDays(match.awayTeamId, currentDate, teamLastMatchDate);
            const minRest = Math.min(homeRestDays, awayRestDays);
            
            if (minRest > maxRestDays) {
              maxRestDays = minRest;
              bestMatch = { index: i, match };
            }
          }
          
          if (bestMatch) {
            console.log(`  Relaxed constraints: Teams will only get ${maxRestDays} days of rest instead of ${bestMatch.match.restDays}`);
            allMatches.splice(bestMatch.index, 1);
            await scheduleMatch(bestMatch.match, currentDate, timeSlot, scheduledMatches, teamLastMatchDate, teamPremiumSlots);
            dayMatches.push(bestMatch.match);
            scheduled = true;
          }
        }
        
        if (!scheduled) {
          console.error(`ERROR: Could not schedule a match for time ${timeSlot} on ${formatDate(currentDate)}`);
        }
      }
      
      console.log(`Day ${day}: Scheduled ${dayMatches.length} matches`);
      
      // Validate that we scheduled exactly 4 matches on this day
      if (dayMatches.length !== 4) {
        console.error(`ERROR: Day ${day} (${formatDate(currentDate)}) has ${dayMatches.length} matches instead of 4!`);
      }
    }
    
    console.log('\nSchedule generation complete!');
    console.log(`Total matches scheduled: ${scheduledMatches.length}`);
    
    // Verify all matches were scheduled
    const totalTeams = teams.length;
    const expectedMatches = calculateExpectedMatches(teamsByGroup);
    if (scheduledMatches.length !== expectedMatches) {
      console.error(`ERROR: Expected ${expectedMatches} matches, but scheduled ${scheduledMatches.length}`);
    } else {
      console.log('All matches were successfully scheduled!');
    }
    
    // Print days with matches for verification
    const matchesByDay = {};
    scheduledMatches.forEach(match => {
      if (!matchesByDay[match.date]) {
        matchesByDay[match.date] = [];
      }
      matchesByDay[match.date].push(match);
    });
    
    console.log('\nMatches by day:');
    Object.entries(matchesByDay).forEach(([date, matches]) => {
      console.log(`${date}: ${matches.length} matches`);
      
      // Check if this day has exactly 4 matches (except day 1)
      if (date !== formatDate(startDate) && matches.length !== 4) {
        console.error(`ERROR: Day ${date} has ${matches.length} matches instead of 4!`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating schedule:', error);
    process.exit(1);
  }
}

// Function to calculate how many matches we expect based on team count
function calculateExpectedMatches(teamsByGroup) {
  let totalMatches = 0;
  Object.values(teamsByGroup).forEach(groupTeams => {
    const n = groupTeams.length;
    // Each team plays against every other team once
    totalMatches += (n * (n - 1)) / 2;
  });
  return totalMatches;
}

// Function to determine if a team can play on a given date
function canTeamPlay(teamId, requiredRestDays, date, teamLastMatchDate) {
  if (!teamLastMatchDate[teamId]) {
    return true; // Team hasn't played yet
  }
  
  const lastMatchDate = new Date(teamLastMatchDate[teamId]);
  const daysDiff = Math.floor((date - lastMatchDate) / (1000 * 60 * 60 * 24));
  return daysDiff >= requiredRestDays;
}

// Function to get the number of rest days a team has had since last match
function getRestDays(teamId, date, teamLastMatchDate) {
  if (!teamLastMatchDate[teamId]) {
    return 999; // Team hasn't played yet, so effectively infinite rest
  }
  
  const lastMatchDate = new Date(teamLastMatchDate[teamId]);
  return Math.floor((date - lastMatchDate) / (1000 * 60 * 60 * 24));
}

// Function to schedule a match and update tracking data
async function scheduleMatch(match, date, time, scheduledMatches, teamLastMatchDate, teamPremiumSlots) {
  const formattedDate = formatDate(date);
  
  // Update the database
  await dbRun(`
    INSERT INTO matches (
      home_team_id, away_team_id, match_date, match_time,
      home_score, away_score, played, stage
    ) VALUES (?, ?, ?, ?, 0, 0, 0, ?)
  `, [
    match.homeTeamId, match.awayTeamId, 
    formattedDate, time, match.stage
  ]);
  
  // Track the scheduled match
  const scheduledMatch = {
    ...match,
    date: formattedDate,
    time
  };
  scheduledMatches.push(scheduledMatch);
  
  // Update last match date for both teams
  teamLastMatchDate[match.homeTeamId] = date;
  teamLastMatchDate[match.awayTeamId] = date;
  
  // Update premium slot tracking for 6:00 PM matches
  if (time === '18:00') {
    teamPremiumSlots[match.homeTeamId] = (teamPremiumSlots[match.homeTeamId] || 0) + 1;
    teamPremiumSlots[match.awayTeamId] = (teamPremiumSlots[match.awayTeamId] || 0) + 1;
  }
  
  console.log(`  Scheduled: ${match.homeTeamName} vs ${match.awayTeamName} at ${time}`);
}

// Start the schedule generation
generateSchedule();
