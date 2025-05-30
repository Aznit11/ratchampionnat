/**
 * Script to add knockout stage matches (Round of 16, Quarter Finals, Semi Finals, Final)
 * to the tournament after the group stage matches.
 * 
 * Generated on: ${new Date().toISOString()}
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Get the last date of group stage matches
function getLastGroupStageDate(callback) {
  const query = `
    SELECT MAX(match_date) as last_date 
    FROM matches 
    WHERE stage = 'Group Stage'
  `;
  
  db.get(query, [], (err, row) => {
    if (err) {
      console.error('Error getting last group stage date:', err);
      callback(null);
      return;
    }
    
    if (!row || !row.last_date) {
      console.error('No group stage matches found');
      callback(null);
      return;
    }
    
    callback(new Date(row.last_date));
  });
}

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

// Remove existing knockout stage matches
function clearExistingKnockoutMatches(callback) {
  console.log('Clearing existing knockout stage matches...');
  
  const stages = ['Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  const placeholders = stages.map(() => '?').join(',');
  
  db.run(`DELETE FROM matches WHERE stage IN (${placeholders})`, stages, (err) => {
    if (err) {
      console.error('Error clearing knockout matches:', err);
      return;
    }
    
    console.log('Cleared existing knockout stage matches');
    callback();
  });
}

// Add Round of 16 matches
function addRoundOf16Matches(lastGroupDate, callback) {
  console.log('Adding Round of 16 matches...');
  
  // Round of 16 starts 2 days after the last group stage match
  const roundOf16StartDate = addDays(lastGroupDate, 2);
  
  // Schedule 8 matches over 2 days (4 matches per day)
  const matches = [
    { day: 0, time: '10:00', name: 'R16-1: 1A vs 2B' },
    { day: 0, time: '12:00', name: 'R16-2: 1C vs 2D' },
    { day: 0, time: '16:00', name: 'R16-3: 1E vs 2F' },
    { day: 0, time: '18:00', name: 'R16-4: 1G vs 2H' },
    { day: 1, time: '10:00', name: 'R16-5: 1B vs 2A' },
    { day: 1, time: '12:00', name: 'R16-6: 1D vs 2C' },
    { day: 1, time: '16:00', name: 'R16-7: 1F vs 2E' },
    { day: 1, time: '18:00', name: 'R16-8: 1H vs 2G' }
  ];
  
  let insertCount = 0;
  const totalMatches = matches.length;
  
  matches.forEach(match => {
    const matchDate = addDays(roundOf16StartDate, match.day);
    const formattedDate = formatDate(matchDate);
    
    const insertQuery = `
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time, 
        stage, played, home_score, away_score
      ) VALUES (NULL, NULL, ?, ?, ?, 0, NULL, NULL)
    `;
    
    db.run(insertQuery, [formattedDate, match.time, 'Round of 16'], function(err) {
      if (err) {
        console.error('Error inserting Round of 16 match:', err);
      } else {
        console.log(`Inserted ${match.name} on ${formattedDate} at ${match.time}`);
        insertCount++;
        
        if (insertCount === totalMatches) {
          // Get the last date of Round of 16
          const lastRoundOf16Date = addDays(roundOf16StartDate, 1);
          callback(lastRoundOf16Date);
        }
      }
    });
  });
}

// Add Quarter Final matches
function addQuarterFinalMatches(lastRoundOf16Date, callback) {
  console.log('Adding Quarter Final matches...');
  
  // Quarter Finals start 2 days after the last Round of 16 match
  const quarterFinalStartDate = addDays(lastRoundOf16Date, 2);
  
  // Schedule 4 matches over 2 days (2 matches per day)
  const matches = [
    { day: 0, time: '16:00', name: 'QF-1: Winner R16-1 vs Winner R16-3' },
    { day: 0, time: '18:00', name: 'QF-2: Winner R16-2 vs Winner R16-4' },
    { day: 1, time: '16:00', name: 'QF-3: Winner R16-5 vs Winner R16-7' },
    { day: 1, time: '18:00', name: 'QF-4: Winner R16-6 vs Winner R16-8' }
  ];
  
  let insertCount = 0;
  const totalMatches = matches.length;
  
  matches.forEach(match => {
    const matchDate = addDays(quarterFinalStartDate, match.day);
    const formattedDate = formatDate(matchDate);
    
    const insertQuery = `
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time, 
        stage, played, home_score, away_score
      ) VALUES (NULL, NULL, ?, ?, ?, 0, NULL, NULL)
    `;
    
    db.run(insertQuery, [formattedDate, match.time, 'Quarter Final'], function(err) {
      if (err) {
        console.error('Error inserting Quarter Final match:', err);
      } else {
        console.log(`Inserted ${match.name} on ${formattedDate} at ${match.time}`);
        insertCount++;
        
        if (insertCount === totalMatches) {
          // Get the last date of Quarter Finals
          const lastQuarterFinalDate = addDays(quarterFinalStartDate, 1);
          callback(lastQuarterFinalDate);
        }
      }
    });
  });
}

// Add Semi Final matches
function addSemiFinalMatches(lastQuarterFinalDate, callback) {
  console.log('Adding Semi Final matches...');
  
  // Semi Finals start 3 days after the last Quarter Final match
  const semiFinalStartDate = addDays(lastQuarterFinalDate, 3);
  
  // Schedule 2 semi-final matches on one day
  const matches = [
    { day: 0, time: '16:00', name: 'SF-1: Winner QF-1 vs Winner QF-2' },
    { day: 0, time: '18:00', name: 'SF-2: Winner QF-3 vs Winner QF-4' }
  ];
  
  let insertCount = 0;
  const totalMatches = matches.length;
  
  matches.forEach(match => {
    const matchDate = addDays(semiFinalStartDate, match.day);
    const formattedDate = formatDate(matchDate);
    
    const insertQuery = `
      INSERT INTO matches (
        home_team_id, away_team_id, match_date, match_time, 
        stage, played, home_score, away_score
      ) VALUES (NULL, NULL, ?, ?, ?, 0, NULL, NULL)
    `;
    
    db.run(insertQuery, [formattedDate, match.time, 'Semi Final'], function(err) {
      if (err) {
        console.error('Error inserting Semi Final match:', err);
      } else {
        console.log(`Inserted ${match.name} on ${formattedDate} at ${match.time}`);
        insertCount++;
        
        if (insertCount === totalMatches) {
          // Get the last date of Semi Finals
          const lastSemiFinalDate = addDays(semiFinalStartDate, 0);
          callback(lastSemiFinalDate);
        }
      }
    });
  });
}

// Add Final match
function addFinalMatch(lastSemiFinalDate, callback) {
  console.log('Adding Final match...');
  
  // Final is 6 days after the semi-finals
  const finalDate = addDays(lastSemiFinalDate, 6);
  const formattedDate = formatDate(finalDate);
  
  const insertQuery = `
    INSERT INTO matches (
      home_team_id, away_team_id, match_date, match_time, 
      stage, played, home_score, away_score
    ) VALUES (NULL, NULL, ?, ?, ?, 0, NULL, NULL)
  `;
  
  db.run(insertQuery, [formattedDate, '18:00', 'Final'], function(err) {
    if (err) {
      console.error('Error inserting Final match:', err);
    } else {
      console.log(`Inserted Final match on ${formattedDate} at 18:00`);
      callback();
    }
  });
}

// Main function
function addKnockoutStages() {
  clearExistingKnockoutMatches(() => {
    getLastGroupStageDate((lastGroupDate) => {
      if (!lastGroupDate) {
        console.error('Failed to get last group stage date');
        db.close();
        return;
      }
      
      console.log(`Last group stage date: ${formatDate(lastGroupDate)}`);
      
      // Add knockout matches in sequence
      addRoundOf16Matches(lastGroupDate, (lastR16Date) => {
        addQuarterFinalMatches(lastR16Date, (lastQFDate) => {
          addSemiFinalMatches(lastQFDate, (lastSFDate) => {
            addFinalMatch(lastSFDate, () => {
              console.log('All knockout stage matches added successfully');
              db.close();
            });
          });
        });
      });
    });
  });
}

// Run the script
addKnockoutStages();
