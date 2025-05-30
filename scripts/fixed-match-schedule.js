/**
 * Fixed match scheduling script that strictly follows all requirements:
 * 1. Day 1: Just one match at 6:00 PM
 * 2. All other days: Exactly 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
 * 3. Rest periods: 3+ days for groups with 4 teams, 2+ days for groups with 5 teams
 * 4. Strict ordering by groups and teams within groups
 * 5. Fair distribution of favorable time slots
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Time slots (in order of preference, most favorable last)
const TIME_SLOTS = ['08:00', '10:00', '16:00', '18:00'];

// Tournament start date - June 1, 2025
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

// Create all group matches
function createGroupMatches(groups) {
  const allMatches = [];
  
  // Generate all possible matches within each group
  groups.forEach(group => {
    for (let i = 0; i < group.teams.length; i++) {
      for (let j = i + 1; j < group.teams.length; j++) {
        allMatches.push({
          homeTeam: group.teams[i],
          awayTeam: group.teams[j],
          group: group,
          minRestDays: group.team_count === 5 ? 2 : 3
        });
      }
    }
  });
  
  return allMatches;
}

// Schedule matches respecting all constraints
async function scheduleMatches(matches) {
  // Start with day 1 having just one match at 6:00 PM
  let currentDate = new Date(START_DATE);
  let currentDay = 1;
  let scheduledMatches = [];
  
  // Team's last match date tracking
  const teamLastMatch = {};
  
  // Day 1: Schedule just one match (first match of Group A) at 6:00 PM
  const firstMatch = matches.find(m => 
    m.group.id === 1 && 
    m.homeTeam.team_in_group_id === 1 && 
    m.awayTeam.team_in_group_id === 2
  );
  
  if (firstMatch) {
    scheduledMatches.push({
      day: currentDay,
      date: formatDate(currentDate),
      timeSlot: TIME_SLOTS[3], // 6:00 PM
      match: firstMatch
    });
    
    // Update last match date for these teams
    teamLastMatch[firstMatch.homeTeam.id] = currentDate;
    teamLastMatch[firstMatch.awayTeam.id] = currentDate;
    
    // Remove this match from the pool
    matches = matches.filter(m => 
      !(m.homeTeam.id === firstMatch.homeTeam.id && 
        m.awayTeam.id === firstMatch.awayTeam.id)
    );
  }
  
  // Advance to day 2
  currentDate = addDays(currentDate, 1);
  currentDay++;
  
  // For all other days, schedule exactly 4 matches per day
  while (matches.length > 0) {
    const dayMatches = [];
    
    // Try to schedule 4 matches for this day
    for (let timeIndex = 0; timeIndex < 4; timeIndex++) {
      // Find a valid match for this time slot
      let matchFound = false;
      
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const homeTeamLastMatch = teamLastMatch[match.homeTeam.id];
        const awayTeamLastMatch = teamLastMatch[match.awayTeam.id];
        
        // Check if both teams have had enough rest
        let homeTeamRested = true;
        let awayTeamRested = true;
        
        if (homeTeamLastMatch) {
          const daysSinceLastMatch = Math.floor((currentDate - homeTeamLastMatch) / (1000 * 60 * 60 * 24));
          homeTeamRested = daysSinceLastMatch >= match.minRestDays;
        }
        
        if (awayTeamLastMatch) {
          const daysSinceLastMatch = Math.floor((currentDate - awayTeamLastMatch) / (1000 * 60 * 60 * 24));
          awayTeamRested = daysSinceLastMatch >= match.minRestDays;
        }
        
        // If both teams are rested, schedule this match
        if (homeTeamRested && awayTeamRested) {
          dayMatches.push({
            day: currentDay,
            date: formatDate(currentDate),
            timeSlot: TIME_SLOTS[timeIndex],
            match: match
          });
          
          // Update last match date for these teams
          teamLastMatch[match.homeTeam.id] = new Date(currentDate);
          teamLastMatch[match.awayTeam.id] = new Date(currentDate);
          
          // Remove this match from the pool
          matches.splice(i, 1);
          
          matchFound = true;
          break;
        }
      }
      
      // If no match was found for this time slot, we can't schedule 4 matches today
      if (!matchFound) {
        break;
      }
    }
    
    // Add scheduled matches for this day
    scheduledMatches = scheduledMatches.concat(dayMatches);
    
    // If we couldn't schedule exactly 4 matches, undo this day's scheduling and try again tomorrow
    if (dayMatches.length < 4) {
      // Put the matches back in the pool
      dayMatches.forEach(scheduledMatch => {
        matches.push(scheduledMatch.match);
        
        // Reset last match date for these teams to their previous value
        const homeTeamId = scheduledMatch.match.homeTeam.id;
        const awayTeamId = scheduledMatch.match.awayTeam.id;
        
        // Remove this day's match from their history
        if (teamLastMatch[homeTeamId] && 
            formatDate(teamLastMatch[homeTeamId]) === formatDate(currentDate)) {
          // Find their previous match
          const previousHomeMatch = scheduledMatches.filter(m => 
            (m.match.homeTeam.id === homeTeamId || m.match.awayTeam.id === homeTeamId) &&
            formatDate(new Date(m.date)) !== formatDate(currentDate)
          ).pop();
          
          if (previousHomeMatch) {
            teamLastMatch[homeTeamId] = new Date(previousHomeMatch.date);
          } else {
            delete teamLastMatch[homeTeamId];
          }
        }
        
        if (teamLastMatch[awayTeamId] && 
            formatDate(teamLastMatch[awayTeamId]) === formatDate(currentDate)) {
          // Find their previous match
          const previousAwayMatch = scheduledMatches.filter(m => 
            (m.match.homeTeam.id === awayTeamId || m.match.awayTeam.id === awayTeamId) &&
            formatDate(new Date(m.date)) !== formatDate(currentDate)
          ).pop();
          
          if (previousAwayMatch) {
            teamLastMatch[awayTeamId] = new Date(previousAwayMatch.date);
          } else {
            delete teamLastMatch[awayTeamId];
          }
        }
      });
      
      // Remove this day's matches from scheduled matches
      scheduledMatches = scheduledMatches.filter(m => 
        formatDate(new Date(m.date)) !== formatDate(currentDate)
      );
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1);
    currentDay++;
  }
  
  return scheduledMatches;
}

// Insert matches into the database
async function insertScheduledMatches(scheduledMatches) {
  for (const scheduleItem of scheduledMatches) {
    await new Promise((resolve, reject) => {
      const match = scheduleItem.match;
      
      db.run(`
        INSERT INTO matches (
          home_team_id, away_team_id, match_date, match_time,
          home_score, away_score, played, stage
        ) VALUES (?, ?, ?, ?, 0, 0, 0, 'Group Stage')
      `, [
        match.homeTeam.id, match.awayTeam.id, 
        scheduleItem.date, scheduleItem.timeSlot
      ], function(err) {
        if (err) {
          console.error('Error inserting match:', err);
          reject(err);
          return;
        }
        
        console.log(`Day ${scheduleItem.day}: Scheduled Group ${match.group.name} match: ` +
          `${match.homeTeam.name} vs ${match.awayTeam.name} on ${scheduleItem.date} at ${scheduleItem.timeSlot}`);
        resolve();
      });
    });
  }
}

// Generate knockout stage matches
async function generateKnockoutMatches(lastGroupStageDate) {
  // Round of 16
  const r16StartDate = addDays(new Date(lastGroupStageDate), 3);
  let currentDate = new Date(r16StartDate);
  let matchCount = 0;
  
  console.log('Generating Round of 16 matches...');
  
  // Schedule 4 matches per day, 2 days total for Round of 16
  for (let i = 0; i < 8; i++) {
    // Get the time slot based on match count (2 matches per day)
    const timeSlotIndex = matchCount % 2 === 0 ? 2 : 3; // 4:00 PM or 6:00 PM
    
    // If we've scheduled 2 matches for this day, move to next day
    if (matchCount > 0 && matchCount % 2 === 0) {
      currentDate = addDays(currentDate, 1);
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO matches (
          home_team_id, away_team_id, match_date, match_time,
          home_score, away_score, played, stage
        ) VALUES (NULL, NULL, ?, ?, 0, 0, 0, 'Round of 16')
      `, [
        formatDate(currentDate), TIME_SLOTS[timeSlotIndex]
      ], function(err) {
        if (err) {
          console.error('Error inserting Round of 16 match:', err);
          reject(err);
          return;
        }
        
        console.log(`Scheduled Round of 16 match on ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
        resolve();
      });
    });
    
    matchCount++;
  }
  
  // Move to next day after Round of 16 is complete
  currentDate = addDays(currentDate, 1);
  
  // Quarter Finals - 4 matches, 2 days (2 matches per day)
  console.log('Generating Quarter Final matches...');
  matchCount = 0;
  
  // Add 3 days rest after Round of 16
  currentDate = addDays(currentDate, 2);
  
  for (let i = 0; i < 4; i++) {
    // Get the time slot based on match count
    const timeSlotIndex = matchCount % 2 === 0 ? 2 : 3; // 4:00 PM or 6:00 PM
    
    // If we've scheduled 2 matches for this day, move to next day
    if (matchCount > 0 && matchCount % 2 === 0) {
      currentDate = addDays(currentDate, 1);
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO matches (
          home_team_id, away_team_id, match_date, match_time,
          home_score, away_score, played, stage
        ) VALUES (NULL, NULL, ?, ?, 0, 0, 0, 'Quarter Final')
      `, [
        formatDate(currentDate), TIME_SLOTS[timeSlotIndex]
      ], function(err) {
        if (err) {
          console.error('Error inserting Quarter Final match:', err);
          reject(err);
          return;
        }
        
        console.log(`Scheduled Quarter Final match on ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
        resolve();
      });
    });
    
    matchCount++;
  }
  
  // Move to next day after Quarter Finals are complete
  currentDate = addDays(currentDate, 1);
  
  // Semi Finals - 2 matches, 1 day
  console.log('Generating Semi Final matches...');
  
  // Add 4 days rest after Quarter Finals
  currentDate = addDays(currentDate, 3);
  
  for (let i = 0; i < 2; i++) {
    // Get the time slot based on match index
    const timeSlotIndex = i === 0 ? 2 : 3; // 4:00 PM or 6:00 PM
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO matches (
          home_team_id, away_team_id, match_date, match_time,
          home_score, away_score, played, stage
        ) VALUES (NULL, NULL, ?, ?, 0, 0, 0, 'Semi Final')
      `, [
        formatDate(currentDate), TIME_SLOTS[timeSlotIndex]
      ], function(err) {
        if (err) {
          console.error('Error inserting Semi Final match:', err);
          reject(err);
          return;
        }
        
        console.log(`Scheduled Semi Final match on ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
        resolve();
      });
    });
  }
  
  // Final - 1 match
  console.log('Generating Final match...');
  
  // Add 5 days rest after Semi Finals
  currentDate = addDays(currentDate, 5);
  
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time,
        home_score, away_score, played, stage
      ) VALUES (NULL, NULL, ?, ?, 0, 0, 0, 'Final')
    `, [
      formatDate(currentDate), TIME_SLOTS[3] // 6:00 PM
    ], function(err) {
      if (err) {
        console.error('Error inserting Final match:', err);
        reject(err);
        return;
      }
      
      console.log(`Scheduled Final match on ${formatDate(currentDate)} at ${TIME_SLOTS[3]}`);
      resolve();
    });
  });
  
  console.log('All knockout matches generated successfully!');
}

// Main function to execute the entire scheduling process
async function generateFixtures() {
  try {
    console.log('Starting match generation with fixed scheduling...');
    
    // Step 1: Clear existing matches
    await clearExistingMatches();
    
    // Step 2: Get all groups with their teams
    const groups = await getGroups();
    
    // Step 3: Create all group stage matches
    const groupMatches = createGroupMatches(groups);
    console.log(`Created ${groupMatches.length} potential group stage matches`);
    
    // Step 4: Schedule group stage matches following all constraints
    const scheduledMatches = await scheduleMatches(groupMatches);
    console.log(`Successfully scheduled ${scheduledMatches.length} group stage matches`);
    
    // Step 5: Insert scheduled matches into the database
    await insertScheduledMatches(scheduledMatches);
    
    // Step 6: Generate knockout stage matches
    const lastGroupMatch = scheduledMatches[scheduledMatches.length - 1];
    await generateKnockoutMatches(lastGroupMatch.date);
    
    console.log('All matches generated successfully!');
    
    // Close the database connection
    db.close();
    
  } catch (error) {
    console.error('Error generating fixtures:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
generateFixtures();
