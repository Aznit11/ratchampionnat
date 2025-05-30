/**
 * Script to generate knockout stage matches (Round of 16, Quarter Finals, Semi Finals, Final)
 * with proper scheduling and placeholders
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Time slots
const TIME_SLOTS = ['08:00', '10:00', '16:00', '18:00'];

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

// Get last group stage match date
async function getLastGroupStageMatchDate() {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT MAX(match_date) as last_date 
      FROM matches 
      WHERE stage = 'Group Stage'
    `, [], (err, row) => {
      if (err) {
        console.error('Error getting last group stage match date:', err);
        return reject(err);
      }
      
      if (!row || !row.last_date) {
        console.error('No group stage matches found');
        return reject(new Error('No group stage matches found'));
      }
      
      resolve(new Date(row.last_date));
    });
  });
}

// Delete existing knockout matches
async function deleteExistingKnockoutMatches() {
  return new Promise((resolve, reject) => {
    db.run(`
      DELETE FROM matches 
      WHERE stage IN ('Round of 16', 'Quarter Final', 'Semi Final', 'Final')
    `, [], (err) => {
      if (err) {
        console.error('Error deleting existing knockout matches:', err);
        return reject(err);
      }
      console.log('Deleted existing knockout matches');
      resolve();
    });
  });
}

// Insert a match into the database
function insertMatch(homeTeamId, awayTeamId, matchDate, matchTime, stage, homePlaceholder, awayPlaceholder) {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time,
        home_score, away_score, played, stage, home_placeholder, away_placeholder
      ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?)
    `, [
      homeTeamId, awayTeamId, matchDate, matchTime, stage, homePlaceholder, awayPlaceholder
    ], function(err) {
      if (err) {
        console.error(`Error inserting ${stage} match:`, err);
        return reject(err);
      }
      resolve(this.lastID);
    });
  });
}

// Generate Round of 16 matches
async function generateRoundOf16(startDate) {
  console.log('Generating Round of 16 matches...');
  
  // Add 3 days rest after group stage
  let currentDate = addDays(startDate, 3);
  
  // Round of 16 matches over 2 days (4 matches per day)
  const matchups = [
    { home: "Winner Group A", away: "Runner-up Group B" },
    { home: "Winner Group C", away: "Runner-up Group D" },
    { home: "Winner Group E", away: "Runner-up Group F" },
    { home: "Winner Group G", away: "Runner-up Group H" },
    { home: "Winner Group B", away: "Runner-up Group A" },
    { home: "Winner Group D", away: "Runner-up Group C" },
    { home: "Winner Group F", away: "Runner-up Group E" },
    { home: "Winner Group H", away: "Runner-up Group G" }
  ];
  
  const matchIds = [];
  
  // Day 1: First 4 matches
  for (let i = 0; i < 4; i++) {
    const matchId = await insertMatch(
      null, // home_team_id
      null, // away_team_id
      formatDate(currentDate),
      TIME_SLOTS[i],
      'Round of 16',
      matchups[i].home,
      matchups[i].away
    );
    
    matchIds.push(matchId);
    console.log(`Round of 16 Match ${i+1}: ${matchups[i].home} vs ${matchups[i].away} on ${formatDate(currentDate)} at ${TIME_SLOTS[i]}`);
  }
  
  // Day 2: Remaining 4 matches
  currentDate = addDays(currentDate, 1);
  
  for (let i = 4; i < 8; i++) {
    const matchId = await insertMatch(
      null, // home_team_id
      null, // away_team_id
      formatDate(currentDate),
      TIME_SLOTS[i-4],
      'Round of 16',
      matchups[i].home,
      matchups[i].away
    );
    
    matchIds.push(matchId);
    console.log(`Round of 16 Match ${i+1}: ${matchups[i].home} vs ${matchups[i].away} on ${formatDate(currentDate)} at ${TIME_SLOTS[i-4]}`);
  }
  
  return { lastDate: currentDate, matchIds };
}

// Generate Quarter Final matches
async function generateQuarterFinals(startDate, r16MatchIds) {
  console.log('Generating Quarter Final matches...');
  
  // Add 3 days rest after Round of 16
  let currentDate = addDays(startDate, 3);
  
  // Quarter Finals: 4 matches in one day
  const matchIds = [];
  
  for (let i = 0; i < 4; i++) {
    const matchId = await insertMatch(
      null, // home_team_id
      null, // away_team_id
      formatDate(currentDate),
      TIME_SLOTS[i],
      'Quarter Final',
      `Winner Match ${r16MatchIds[i*2]}`,
      `Winner Match ${r16MatchIds[i*2+1]}`
    );
    
    matchIds.push(matchId);
    console.log(`Quarter Final Match ${i+1}: Winner Match ${r16MatchIds[i*2]} vs Winner Match ${r16MatchIds[i*2+1]} on ${formatDate(currentDate)} at ${TIME_SLOTS[i]}`);
  }
  
  return { lastDate: currentDate, matchIds };
}

// Generate Semi Final matches
async function generateSemiFinals(startDate, qfMatchIds) {
  console.log('Generating Semi Final matches...');
  
  // Add 4 days rest after Quarter Finals
  let currentDate = addDays(startDate, 4);
  
  // Semi Finals: 2 matches (4:00 PM and 6:00 PM)
  const matchIds = [];
  
  for (let i = 0; i < 2; i++) {
    const timeSlotIndex = i + 2; // 4:00 PM and 6:00 PM
    
    const matchId = await insertMatch(
      null, // home_team_id
      null, // away_team_id
      formatDate(currentDate),
      TIME_SLOTS[timeSlotIndex],
      'Semi Final',
      `Winner Match ${qfMatchIds[i*2]}`,
      `Winner Match ${qfMatchIds[i*2+1]}`
    );
    
    matchIds.push(matchId);
    console.log(`Semi Final Match ${i+1}: Winner Match ${qfMatchIds[i*2]} vs Winner Match ${qfMatchIds[i*2+1]} on ${formatDate(currentDate)} at ${TIME_SLOTS[timeSlotIndex]}`);
  }
  
  return { lastDate: currentDate, matchIds };
}

// Generate Final match
async function generateFinal(startDate, sfMatchIds) {
  console.log('Generating Final match...');
  
  // Add 5 days rest after Semi Finals
  let currentDate = addDays(startDate, 5);
  
  // Final: 1 match at 6:00 PM
  const matchId = await insertMatch(
    null, // home_team_id
    null, // away_team_id
    formatDate(currentDate),
    TIME_SLOTS[3], // 6:00 PM
    'Final',
    `Winner Match ${sfMatchIds[0]}`,
    `Winner Match ${sfMatchIds[1]}`
  );
  
  console.log(`Final Match: Winner Match ${sfMatchIds[0]} vs Winner Match ${sfMatchIds[1]} on ${formatDate(currentDate)} at ${TIME_SLOTS[3]}`);
  
  return { lastDate: currentDate, matchId };
}

// Main function
async function generateKnockoutStages() {
  try {
    // Step 1: Get last group stage match date
    const lastGroupStageDate = await getLastGroupStageMatchDate();
    console.log(`Last group stage match date: ${formatDate(lastGroupStageDate)}`);
    
    // Step 2: Delete any existing knockout matches
    await deleteExistingKnockoutMatches();
    
    // Step 3: Generate Round of 16 matches
    const r16 = await generateRoundOf16(lastGroupStageDate);
    
    // Step 4: Generate Quarter Final matches
    const qf = await generateQuarterFinals(r16.lastDate, r16.matchIds);
    
    // Step 5: Generate Semi Final matches
    const sf = await generateSemiFinals(qf.lastDate, qf.matchIds);
    
    // Step 6: Generate Final match
    const final = await generateFinal(sf.lastDate, sf.matchIds);
    
    console.log('All knockout matches generated successfully!');
    
    // Close the database connection
    db.close();
    
  } catch (error) {
    console.error('Error generating knockout matches:', error);
    db.close();
    process.exit(1);
  }
}

// Execute the script
generateKnockoutStages();
