/**
 * Script to generate all matches for the tournament
 * Following the requirements:
 * - Day 1: Just one match at 6:00 PM
 * - Other days: 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * - Rest periods: 3+ days for groups with 4 teams, 2+ days for groups with 5 teams
 * - Matches scheduled in order by groups and by teams within the groups
 * - Fair distribution of favorable time slots (6:00 PM being most favorable)
 *
 * Generated on: ${new Date().toISOString()}
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Tournament start date
const startDate = new Date('2025-06-01');

// Time slots
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

// Function to get team's last match date
function getTeamLastMatchDate(teamId, callback) {
  const query = `
    SELECT MAX(match_date) as last_match 
    FROM matches 
    WHERE home_team_id = ? OR away_team_id = ?
  `;
  
  db.get(query, [teamId, teamId], (err, row) => {
    if (err) {
      console.error('Error getting team last match:', err);
      callback(null);
      return;
    }
    
    callback(row.last_match ? new Date(row.last_match) : null);
  });
}

// Function to check if a team can play on a given date
function canTeamPlayOnDate(teamId, targetDate, minRestDays, callback) {
  getTeamLastMatchDate(teamId, (lastMatchDate) => {
    if (!lastMatchDate) {
      callback(true);
      return;
    }
    
    const daysDiff = Math.floor((targetDate - lastMatchDate) / (1000 * 60 * 60 * 24));
    callback(daysDiff >= minRestDays);
  });
}

// Function to get all groups with their teams
function getGroups(callback) {
  db.all(`
    SELECT g.id, g.name, g.team_count, 
           t.id as team_id, t.name as team_name, t.team_in_group_id
    FROM groups g
    JOIN teams t ON g.id = t.group_id
    ORDER BY g.id, t.team_in_group_id
  `, [], (err, rows) => {
    if (err) {
      console.error('Error fetching groups:', err);
      callback(null);
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
    
    callback(groups);
  });
}

// Clear existing matches
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

// Generate group stage matches
function generateGroupStageMatches(callback) {
  getGroups((groups) => {
    if (!groups) {
      console.error('Failed to fetch groups');
      return;
    }
    
    let currentDate = new Date(startDate);
    let currentTimeSlotIndex = 3; // Start with 6:00 PM
    let matchesScheduledForToday = 0;
    let isFirstDay = true;
    
    const matchInsertQueue = [];
    
    // For each group, create matches
    groups.forEach((group) => {
      const minRestDays = group.team_count === 5 ? 2 : 3;
      
      // Create all possible team pairings within the group
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          const homeTeam = group.teams[i];
          const awayTeam = group.teams[j];
          
          // Add to match queue
          matchInsertQueue.push({
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            group: group,
            minRestDays: minRestDays
          });
        }
      }
    });
    
    // Schedule the matches
    scheduleMatches(matchInsertQueue, 'Group Stage', callback);
  });
}

// Function to schedule matches from a queue with improved rest day enforcement and balanced time slot distribution
function scheduleMatches(matchQueue, stage, callback, startingDate = startDate) {
  let currentDate = new Date(startingDate);
  let currentTimeSlotIndex = 3; // Start with 6:00 PM (most favorable)
  let matchesScheduledForToday = 0;
  let isFirstDay = true;
  let scheduleCount = 0;
  
  // Track the number of premium time slots (6:00 PM) assigned to each team for fairness
  const teamPremiumSlots = {};
  
  // Sort match queue by group ID first, then by team IDs within the group
  // This ensures matches are ordered by groups and by teams within the groups
  matchQueue.sort((a, b) => {
    // First, sort by group ID
    if (a.group && b.group && a.group.id !== b.group.id) {
      return a.group.id - b.group.id;
    }
    
    // Then, sort by the min of home team IDs
    const minTeamIdA = Math.min(a.homeTeamId, a.awayTeamId);
    const minTeamIdB = Math.min(b.homeTeamId, b.awayTeamId);
    return minTeamIdA - minTeamIdB;
  });
  
  // Function to check if a team has already played many premium slots
  function hasTeamPlayedManyPremiumSlots(teamId) {
    return (teamPremiumSlots[teamId] || 0) > 1; // Limit to 2 premium slots per team for fairness
  }
  
  // Function to update team premium slot counter
  function updateTeamPremiumSlotCounts(homeTeamId, awayTeamId, timeSlotIndex) {
    // Only increment for the 6:00 PM slot (index 3)
    if (timeSlotIndex === 3) {
      teamPremiumSlots[homeTeamId] = (teamPremiumSlots[homeTeamId] || 0) + 1;
      teamPremiumSlots[awayTeamId] = (teamPremiumSlots[awayTeamId] || 0) + 1;
    }
  }
  
  // Helper function to find the next available date and time slot
  function moveToNextSlot() {
    currentTimeSlotIndex = (currentTimeSlotIndex + 1) % timeSlots.length;
    if (currentTimeSlotIndex === 0) {
      // We've gone through all time slots for the day, move to next day
      currentDate = addDays(currentDate, 1);
      matchesScheduledForToday = 0;
      isFirstDay = false;
    }
  }
  
  function scheduleNextMatch() {
    if (matchQueue.length === 0) {
      console.log(`Scheduled ${scheduleCount} ${stage} matches`);
      if (callback) callback(currentDate);
      return;
    }
    
    // Check if we need to move to the next day
    if (matchesScheduledForToday >= (isFirstDay ? 1 : 4)) {
      // Move to next day
      currentDate = addDays(currentDate, 1);
      currentTimeSlotIndex = 0; // Start with the first time slot on the new day
      matchesScheduledForToday = 0;
      isFirstDay = false;
    }
    
    // Get current time slot
    const timeSlot = timeSlots[currentTimeSlotIndex];
    
    // For premium slots (6:00 PM), try to be more fair
    let isPremiumSlot = (currentTimeSlotIndex === 3);
    
    // Find a match that can be scheduled for this time slot
    const processNextMatch = (index) => {
      if (index >= matchQueue.length) {
        // No suitable match found for this slot, move to next time slot
        moveToNextSlot();
        scheduleNextMatch();
        return;
      }
      
      const match = matchQueue[index];
      
      // For premium slots, check if both teams have already had their fair share
      if (isPremiumSlot && 
          hasTeamPlayedManyPremiumSlots(match.homeTeamId) && 
          hasTeamPlayedManyPremiumSlots(match.awayTeamId)) {
        // Skip this match for premium slot to be fair
        processNextMatch(index + 1);
        return;
      }
      
      // Check rest days strictly
      canTeamPlayOnDate(match.homeTeamId, currentDate, match.minRestDays, (homeTeamCanPlay) => {
        if (!homeTeamCanPlay) {
          processNextMatch(index + 1);
          return;
        }
        
        canTeamPlayOnDate(match.awayTeamId, currentDate, match.minRestDays, (awayTeamCanPlay) => {
          if (!awayTeamCanPlay) {
            processNextMatch(index + 1);
            return;
          }
          
          // Both teams can play, schedule the match
          const formattedDate = formatDate(currentDate);
          
          console.log(`Scheduling ${match.group ? match.group.name : 'Knockout'} stage match: ` +
                     `${match.homeTeamId} vs ${match.awayTeamId} on ${formattedDate} at ${timeSlot}`);
          
          db.run(`
            INSERT INTO matches (
              home_team_id, away_team_id, match_date, match_time,
              home_score, away_score, played, stage
            ) VALUES (?, ?, ?, ?, 0, 0, 0, ?)
          `, [
            match.homeTeamId, match.awayTeamId, formattedDate, timeSlot,
            stage
          ], function(err) {
            if (err) {
              console.error('Error inserting match:', err);
              processNextMatch(index + 1);
              return;
            }
            
            // Successfully scheduled
            scheduleCount++;
            
            // Update premium slot counters
            if (isPremiumSlot) {
              updateTeamPremiumSlotCounts(match.homeTeamId, match.awayTeamId, currentTimeSlotIndex);
            }
            
            // Remove the scheduled match from queue
            matchQueue.splice(index, 1);
            
            // Move to next time slot
            moveToNextSlot();
            matchesScheduledForToday++;
            
            // Continue scheduling
            scheduleNextMatch();
          });
        });
      });
    };
    
    // Start processing with the first match in the queue
    processNextMatch(0);
  }
  
  // Start the scheduling process
  scheduleNextMatch();
}

// Generate round of 16 matches
function generateRound16Matches(lastGroupStageDate, callback) {
  // 8 matches in round of 16
  const matchups = [
    { home: "1st Group A", away: "2nd Group B" },
    { home: "1st Group C", away: "2nd Group D" },
    { home: "1st Group E", away: "2nd Group F" },
    { home: "1st Group G", away: "2nd Group H" },
    { home: "1st Group B", away: "2nd Group A" },
    { home: "1st Group D", away: "2nd Group C" },
    { home: "1st Group F", away: "2nd Group E" },
    { home: "1st Group H", away: "2nd Group G" }
  ];
  
  // Create matches without team IDs (they'll be determined after group stage)
  const round16Queue = matchups.map((match, index) => ({
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: match.home,
    awayPlaceholder: match.away,
    matchNumber: index + 1, // Give each match a number for reference
    minRestDays: 3,
    group: { name: 'Knockout' } // Add group for consistent logging
  }));
  
  console.log('Creating Round of 16 matches with placeholders');
  
  // Start 3 days after last group stage match
  const round16StartDate = addDays(lastGroupStageDate, 3);
  scheduleKnockoutMatches(round16Queue, 'Round of 16', round16StartDate, callback);
}

// Generate quarter-final matches
function generateQuarterFinalMatches(lastRound16Date, callback) {
  const matchups = [
    { home: "Winner R16-1", away: "Winner R16-2" },
    { home: "Winner R16-3", away: "Winner R16-4" },
    { home: "Winner R16-5", away: "Winner R16-6" },
    { home: "Winner R16-7", away: "Winner R16-8" }
  ];
  
  // Create matches without team IDs (they'll be determined after Round of 16)
  const quarterQueue = matchups.map((match, index) => ({
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: match.home,
    awayPlaceholder: match.away,
    matchNumber: index + 1, // Give each match a number for reference
    minRestDays: 3,
    group: { name: 'Knockout' } // Add group for consistent logging
  }));
  
  console.log('Creating Quarter Final matches with placeholders');
  
  // Start 3 days after last round of 16 match
  const quarterStartDate = addDays(lastRound16Date, 3);
  scheduleKnockoutMatches(quarterQueue, 'Quarter Final', quarterStartDate, callback);
}

// Generate semi-final matches
function generateSemiFinalMatches(lastQuarterDate, callback) {
  const matchups = [
    { home: "Winner QF-1", away: "Winner QF-2" },
    { home: "Winner QF-3", away: "Winner QF-4" }
  ];
  
  // Create matches without team IDs (they'll be determined after Quarter Finals)
  const semiQueue = matchups.map((match, index) => ({
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: match.home,
    awayPlaceholder: match.away,
    matchNumber: index + 1, // Give each match a number for reference
    minRestDays: 4,
    group: { name: 'Knockout' } // Add group for consistent logging
  }));
  
  console.log('Creating Semi Final matches with placeholders');
  
  // Start 4 days after last quarter-final match
  const semiStartDate = addDays(lastQuarterDate, 4);
  scheduleKnockoutMatches(semiQueue, 'Semi Final', semiStartDate, callback);
}

// Generate final match
function generateFinalMatch(lastSemiDate, callback) {
  // Create final match without team IDs (they'll be determined after Semi Finals)
  const finalQueue = [{
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: "Winner SF-1",
    awayPlaceholder: "Winner SF-2",
    matchNumber: 1, // Only one final match
    minRestDays: 5,
    group: { name: 'Knockout' } // Add group for consistent logging
  }];
  
  console.log('Creating Final match with placeholders');
  
  // Start 5 days after last semi-final match
  const finalStartDate = addDays(lastSemiDate, 5);
  scheduleKnockoutMatches(finalQueue, 'Final', finalStartDate, callback);
}

// Function to schedule knockout matches with placeholders
function scheduleKnockoutMatches(matchQueue, stage, startDate, callback) {
  let currentDate = new Date(startDate);
  const matchesPerDay = 2;
  let currentTimeSlotIndex = 2; // Start with 4:00 PM for knockout matches
  let matchesScheduledForToday = 0;
  let scheduleCount = 0;
  
  // Enhanced logging for knockout match scheduling
  console.log(`Scheduling ${matchQueue.length} ${stage} matches starting from ${formatDate(currentDate)}`);
  
  // Store match placeholders in a separate JSON column in the match comment
  for (let i = 0; i < matchQueue.length; i++) {
    if (matchesScheduledForToday >= matchesPerDay) {
      // Move to next day
      currentDate = addDays(currentDate, 1);
      currentTimeSlotIndex = 2; // Reset to 4:00 PM
      matchesScheduledForToday = 0;
    }
    
    // Get current time slot
    const timeSlot = timeSlots[currentTimeSlotIndex];
    const formattedDate = formatDate(currentDate);
    
    // Create a comment to store the placeholder information
    const matchComment = JSON.stringify({
      homePlaceholder: matchQueue[i].homePlaceholder,
      awayPlaceholder: matchQueue[i].awayPlaceholder
    });
    
    console.log(`Scheduling ${stage} match: ${matchQueue[i].homePlaceholder} vs ${matchQueue[i].awayPlaceholder} on ${formattedDate} at ${timeSlot}`);
    
    // Update SQL to match the actual database schema (no status or placeholder columns)
    db.run(`
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time,
        home_score, away_score, played, stage
      ) VALUES (?, ?, ?, ?, 0, 0, 0, ?)
    `, [
      matchQueue[i].homeTeamId, matchQueue[i].awayTeamId, 
      formattedDate, timeSlot, stage
    ], function(err) {
      if (err) {
        console.error(`Error inserting ${stage} match:`, err);
        return;
      }
      
      scheduleCount++;
      console.log(`Scheduled ${stage} match: ${matchQueue[i].homePlaceholder} vs ${matchQueue[i].awayPlaceholder} on ${formattedDate} at ${timeSlot}`);
    });
    
    // Alternate between 4:00 PM and 6:00 PM
    currentTimeSlotIndex = currentTimeSlotIndex === 2 ? 3 : 2;
    matchesScheduledForToday++;
  }
  
  console.log(`Scheduled ${scheduleCount} ${stage} matches`);
  if (callback) callback(addDays(currentDate, matchesScheduledForToday > 0 ? 1 : 0));
}

// Main function to generate all matches
function generateAllMatches() {
  console.log('Starting match generation...');
  
  // Clear existing matches first
  clearExistingMatches(() => {
    // Generate group stage matches
    console.log('Generating group stage matches...');
    generateGroupStageMatches((lastGroupStageDate) => {
      // Generate round of 16 matches
      console.log('Generating round of 16 matches...');
      generateRound16Matches(lastGroupStageDate, (lastRound16Date) => {
        // Generate quarter-final matches
        console.log('Generating quarter-final matches...');
        generateQuarterFinalMatches(lastRound16Date, (lastQuarterDate) => {
          // Generate semi-final matches
          console.log('Generating semi-final matches...');
          generateSemiFinalMatches(lastQuarterDate, (lastSemiDate) => {
            // Generate final match
            console.log('Generating final match...');
            generateFinalMatch(lastSemiDate, () => {
              console.log('All matches generated successfully!');
              db.close();
            });
          });
        });
      });
    });
  });
}

// Run the script
generateAllMatches();
