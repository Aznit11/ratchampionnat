/**
 * Match scheduling script that STRICTLY enforces rest day requirements
 * - Teams in groups of 5: AT LEAST 2 days rest between matches
 * - Teams in groups of 4: AT LEAST 3 days rest between matches
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

// Check if a match violates rest day requirements
function violatesRestDays(match, day, teamMatches, teamRestDays) {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;
  
  // Check past matches for both teams
  const homeTeamPastMatches = teamMatches[homeTeamId] || [];
  const awayTeamPastMatches = teamMatches[awayTeamId] || [];
  
  // Check if either team played recently
  for (const pastMatch of homeTeamPastMatches) {
    const pastDay = new Date(pastMatch.match_date);
    const daysDiff = Math.floor((day - pastDay) / (1000 * 60 * 60 * 24));
    if (daysDiff < teamRestDays[homeTeamId]) {
      return true; // Rest day violation for home team
    }
  }
  
  for (const pastMatch of awayTeamPastMatches) {
    const pastDay = new Date(pastMatch.match_date);
    const daysDiff = Math.floor((day - pastDay) / (1000 * 60 * 60 * 24));
    if (daysDiff < teamRestDays[awayTeamId]) {
      return true; // Rest day violation for away team
    }
  }
  
  return false; // No rest day violations
}

// Main schedule generation function
async function generateSchedule() {
  try {
    console.log('Starting rest-enforcing schedule generation...');
    
    // Step 1: Clear existing matches
    await dbRun('DELETE FROM matches');
    await dbRun('DELETE FROM goals');
    await dbRun('DELETE FROM cards');
    console.log('Cleared existing matches, goals, and cards');
    
    // Step 2: Get all teams with their group information
    const teams = await dbAll(`
      SELECT t.id, t.name, t.team_in_group_id, g.id as group_id, g.name as group_name, 
             COUNT(t2.id) as team_count_in_group
      FROM teams t
      JOIN groups g ON t.group_id = g.id
      JOIN teams t2 ON t2.group_id = g.id
      GROUP BY t.id
      ORDER BY g.id, t.team_in_group_id
    `);
    console.log(`Loaded ${teams.length} teams`);
    
    // Map teams to their required rest days
    const teamRestDays = {};
    const teamNames = {};
    teams.forEach(team => {
      teamRestDays[team.id] = team.team_count_in_group === 5 ? 2 : 3;
      teamNames[team.id] = team.name;
    });
    
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
      
      console.log(`Group ${groupName}: ${teamCount} teams, rest days required: ${teamCount === 5 ? 2 : 3}`);
      
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
            stage: 'Group Stage'
          });
        }
      }
    });
    
    console.log(`Generated ${allMatches.length} total matches to schedule`);
    
    // Track matches scheduled for each team by date
    const teamMatches = {};
    // Track premium (18:00) slots for each team
    const teamPremiumSlots = {};
    
    // Schedule day 1 - only one match at 18:00
    let currentDate = new Date(startDate);
    const day1Match = allMatches.shift(); // Take first match
    await scheduleSpecificMatch(day1Match, currentDate, '18:00');
    console.log(`Day 1: Scheduled ${day1Match.homeTeamName} vs ${day1Match.awayTeamName} at 18:00`);
    
    // Add to team matches
    addToTeamMatches(teamMatches, day1Match.homeTeamId, day1Match.awayTeamId, formatDate(currentDate), '18:00');
    // Add premium slot
    teamPremiumSlots[day1Match.homeTeamId] = 1;
    teamPremiumSlots[day1Match.awayTeamId] = 1;
    
    // Move to day 2
    currentDate = addDays(currentDate, 1);
    
    // Schedule remaining days
    let day = 1;
    
    while (allMatches.length > 0) {
      day++;
      console.log(`\nScheduling Day ${day} (${formatDate(currentDate)})`);
      
      // For each time slot on this day
      const matchesForToday = [];
      
      for (const timeSlot of TIME_SLOTS) {
        // Try to find a valid match that doesn't violate rest days
        let found = false;
        
        // Try each match until we find one that works
        for (let i = 0; i < allMatches.length; i++) {
          const match = allMatches[i];
          
          // Check if this match violates rest days
          if (!violatesRestDays(match, currentDate, teamMatches, teamRestDays)) {
            // For 18:00 slot, prioritize teams with fewer premium slots
            if (timeSlot === '18:00') {
              const homePremiumCount = teamPremiumSlots[match.homeTeamId] || 0;
              const awayPremiumCount = teamPremiumSlots[match.awayTeamId] || 0;
              
              // Skip if both teams already have premium slots
              if (homePremiumCount > 0 && awayPremiumCount > 0) {
                // Find better candidates first
                continue;
              }
            }
            
            // This match works - schedule it
            const scheduledMatch = allMatches.splice(i, 1)[0];
            await scheduleSpecificMatch(scheduledMatch, currentDate, timeSlot);
            
            // Update team matches record
            addToTeamMatches(teamMatches, scheduledMatch.homeTeamId, scheduledMatch.awayTeamId, 
                           formatDate(currentDate), timeSlot);
            
            if (timeSlot === '18:00') {
              teamPremiumSlots[scheduledMatch.homeTeamId] = (teamPremiumSlots[scheduledMatch.homeTeamId] || 0) + 1;
              teamPremiumSlots[scheduledMatch.awayTeamId] = (teamPremiumSlots[scheduledMatch.awayTeamId] || 0) + 1;
            }
            
            matchesForToday.push(scheduledMatch);
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Could not find a match that respects rest days for this slot
          console.log(`  Could not find a valid match for ${timeSlot} that respects rest days.`);
          
          // If we absolutely must schedule something, find the match with teams that had the most rest
          // But only do this if we need to keep exactly 4 matches per day and not on the last day
          const remainingMatchCount = allMatches.length;
          if (remainingMatchCount > 4 || (remainingMatchCount === 4 && matchesForToday.length === 0)) {
            // Find match with maximum rest days (even if not enough)
            const bestMatch = findBestRestDayMatch(allMatches, currentDate, teamMatches, teamRestDays);
            
            if (bestMatch) {
              const { matchIndex, homeRest, awayRest } = bestMatch;
              const scheduledMatch = allMatches.splice(matchIndex, 1)[0];
              
              console.log(`  WARNING: Scheduling match with insufficient rest: ${scheduledMatch.homeTeamName} (${homeRest} days rest) vs ${scheduledMatch.awayTeamName} (${awayRest} days rest)`);
              
              await scheduleSpecificMatch(scheduledMatch, currentDate, timeSlot);
              
              // Update team matches record
              addToTeamMatches(teamMatches, scheduledMatch.homeTeamId, scheduledMatch.awayTeamId, 
                             formatDate(currentDate), timeSlot);
              
              if (timeSlot === '18:00') {
                teamPremiumSlots[scheduledMatch.homeTeamId] = (teamPremiumSlots[scheduledMatch.homeTeamId] || 0) + 1;
                teamPremiumSlots[scheduledMatch.awayTeamId] = (teamPremiumSlots[scheduledMatch.awayTeamId] || 0) + 1;
              }
              
              matchesForToday.push(scheduledMatch);
            }
          }
        }
      }
      
      console.log(`Day ${day}: Scheduled ${matchesForToday.length} matches`);
      
      // Advance to next day
      currentDate = addDays(currentDate, 1);
      
      // If we're close to the end and can't fill days with 4 matches, that's fine
      if (allMatches.length < 4) {
        console.log(`Only ${allMatches.length} matches remaining - can schedule fewer than 4 on last day`);
      }
    }
    
    console.log('\nSchedule generation complete!');
    
    // Verify all teams had proper rest days
    console.log('\nVerifying rest days for all teams...');
    const restViolations = await checkRestDayViolations(teamRestDays, teamNames);
    
    if (restViolations.length === 0) {
      console.log('✓ All teams have proper rest days between matches!');
    } else {
      console.log(`✗ Found ${restViolations.length} rest day violations:`);
      restViolations.forEach(v => {
        console.log(`  Team ${v.teamName}: Played on ${v.date1} and ${v.date2} with only ${v.daysBetween} days rest (needs ${v.requiredRest})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating schedule:', error);
    process.exit(1);
  }
}

// Find the match with teams that have had the most rest days, even if not enough
function findBestRestDayMatch(matches, currentDate, teamMatches, teamRestDays) {
  let bestMatchIndex = -1;
  let maxMinRest = -1;
  let bestHomeRest = 0;
  let bestAwayRest = 0;
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    
    // Calculate rest days for each team
    const homeRest = calculateRestDays(homeTeamId, currentDate, teamMatches);
    const awayRest = calculateRestDays(awayTeamId, currentDate, teamMatches);
    const minRest = Math.min(homeRest, awayRest);
    
    if (minRest > maxMinRest) {
      maxMinRest = minRest;
      bestMatchIndex = i;
      bestHomeRest = homeRest;
      bestAwayRest = awayRest;
    }
  }
  
  if (bestMatchIndex >= 0) {
    return { 
      matchIndex: bestMatchIndex, 
      homeRest: bestHomeRest, 
      awayRest: bestAwayRest 
    };
  }
  
  return null;
}

// Calculate how many days of rest a team has had
function calculateRestDays(teamId, currentDate, teamMatches) {
  const teamPastMatches = teamMatches[teamId] || [];
  if (teamPastMatches.length === 0) {
    return 999; // Team hasn't played yet
  }
  
  // Find the most recent match date
  let latestMatchDate = new Date(0);
  for (const match of teamPastMatches) {
    const matchDate = new Date(match.match_date);
    if (matchDate > latestMatchDate) {
      latestMatchDate = matchDate;
    }
  }
  
  // Calculate days since last match
  const daysDiff = Math.floor((currentDate - latestMatchDate) / (1000 * 60 * 60 * 24));
  return daysDiff;
}

// Schedule a specific match
async function scheduleSpecificMatch(match, date, time) {
  const formattedDate = formatDate(date);
  
  await dbRun(`
    INSERT INTO matches (
      home_team_id, away_team_id, match_date, match_time,
      home_score, away_score, played, stage
    ) VALUES (?, ?, ?, ?, 0, 0, 0, ?)
  `, [
    match.homeTeamId, match.awayTeamId, 
    formattedDate, time, match.stage
  ]);
  
  console.log(`  Scheduled: ${match.homeTeamName} vs ${match.awayTeamName} at ${time}`);
}

// Add a match to the team matches tracking
function addToTeamMatches(teamMatches, homeTeamId, awayTeamId, matchDate, matchTime) {
  if (!teamMatches[homeTeamId]) teamMatches[homeTeamId] = [];
  if (!teamMatches[awayTeamId]) teamMatches[awayTeamId] = [];
  
  const matchInfo = { match_date: matchDate, match_time: matchTime };
  teamMatches[homeTeamId].push(matchInfo);
  teamMatches[awayTeamId].push(matchInfo);
}

// Check for any rest day violations
async function checkRestDayViolations(teamRestDays, teamNames) {
  const violations = [];
  
  // Get all teams
  const teamIds = Object.keys(teamRestDays);
  
  // For each team, check their match schedule
  for (const teamId of teamIds) {
    const requiredRest = teamRestDays[teamId];
    const teamName = teamNames[teamId];
    
    // Get all matches for this team
    const matches = await dbAll(`
      SELECT match_date, match_time 
      FROM matches 
      WHERE home_team_id = ? OR away_team_id = ?
      ORDER BY match_date, match_time
    `, [teamId, teamId]);
    
    // Check for violations - matches too close together
    for (let i = 0; i < matches.length - 1; i++) {
      const date1 = new Date(matches[i].match_date);
      const date2 = new Date(matches[i+1].match_date);
      
      const daysBetween = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
      
      if (daysBetween < requiredRest) {
        violations.push({
          teamId,
          teamName,
          date1: matches[i].match_date,
          date2: matches[i+1].match_date,
          daysBetween,
          requiredRest
        });
      }
    }
  }
  
  return violations;
}

// Start the schedule generation
generateSchedule();
