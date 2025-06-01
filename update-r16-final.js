// Script to update Round of 16 matches to the specified format
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Delete existing Round of 16 matches
db.run("DELETE FROM matches WHERE stage = 'Round of 16'", function(err) {
  if (err) {
    console.error('Error deleting existing Round of 16 matches:', err.message);
    db.close();
    return;
  }
  
  console.log(`Deleted existing Round of 16 matches`);
  
  // Create 8 Round of 16 matches in 2 days according to the specified structure
  const matchStructure = [
    // Day 1 - 4 matches
    {
      date: '2025-06-25',
      matches: [
        { time: '16:00', home: 'A1', away: 'B2' },
        { time: '18:00', home: 'A2', away: 'B1' },
        { time: '20:00', home: 'C1', away: 'D2' },
        { time: '22:00', home: 'C2', away: 'D1' }
      ]
    },
    // Day 2 - 4 matches
    {
      date: '2025-06-27',
      matches: [
        { time: '16:00', home: 'E1', away: 'F2' },
        { time: '18:00', home: 'E2', away: 'F1' },
        { time: '20:00', home: 'G1', away: 'H2' },
        { time: '22:00', home: 'G2', away: 'H1' }
      ]
    }
  ];
  
  // Insert all matches
  let inserted = 0;
  const totalMatches = matchStructure.reduce((sum, day) => sum + day.matches.length, 0);
  
  // Insert all matches with the stage "Round of 16"
  matchStructure.forEach(day => {
    day.matches.forEach(match => {
      db.run(
        'INSERT INTO matches (match_date, match_time, stage, played) VALUES (?, ?, ?, ?)',
        [day.date, match.time, 'Round of 16', 0],
        function(err) {
          if (err) {
            console.error(`Error creating match: ${err.message}`);
          } else {
            inserted++;
            console.log(`Created match ${inserted}: ${match.home} vs ${match.away} on ${day.date} at ${match.time}`);
            
            // If all matches are inserted, update the placeholders in server.js
            if (inserted === totalMatches) {
              console.log('\nAll Round of 16 matches created successfully');
              console.log('Now updating server.js with the proper match placeholders...');
              updateServerFile();
            }
          }
        }
      );
    });
  });
  
  // Function to update the server.js file with the proper updateRoundOf16Matches function
  function updateServerFile() {
    const fs = require('fs');
    const serverFilePath = path.join(__dirname, 'server.js');
    
    fs.readFile(serverFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading server.js: ${err.message}`);
        db.close();
        return;
      }
      
      // Create the new updateRoundOf16Matches function
      const newUpdateFunction = `// Function to update Round of 16 matches based on group stage results
function updateRoundOf16Matches() {
  console.log('Updating Round of 16 matches based on group results...');
  
  // First, get all the groups
  db.all(\`SELECT id, name FROM groups ORDER BY id\`, [], (err, groups) => {
    if (err) {
      console.error('Error getting groups:', err.message);
      return;
    }
    
    // Process each group to get standings
    const groupPromises = groups.map(group => {
      return new Promise((resolve, reject) => {
        // Get teams in this group with standings
        db.all(\`
          SELECT t.id as team_id, t.name as team_name, g.name as group_name,
          COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                       (m.away_team_id = t.id AND m.away_score > m.home_score) 
                 THEN 1 END) as wins,
          COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score = m.away_score) OR 
                       (m.away_team_id = t.id AND m.away_score = m.home_score) 
                 THEN 1 END) as draws,
          COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score < m.away_score) OR 
                       (m.away_team_id = t.id AND m.away_score < m.home_score) 
                 THEN 1 END) as losses,
          SUM(CASE WHEN m.home_team_id = t.id THEN COALESCE(m.home_score, 0) ELSE 0 END) + 
          SUM(CASE WHEN m.away_team_id = t.id THEN COALESCE(m.away_score, 0) ELSE 0 END) as goals_for,
          SUM(CASE WHEN m.home_team_id = t.id THEN COALESCE(m.away_score, 0) ELSE 0 END) + 
          SUM(CASE WHEN m.away_team_id = t.id THEN COALESCE(m.home_score, 0) ELSE 0 END) as goals_against,
          SUM(CASE WHEN m.home_team_id = t.id THEN COALESCE(m.home_score, 0) - COALESCE(m.away_score, 0) ELSE 0 END) + 
          SUM(CASE WHEN m.away_team_id = t.id THEN COALESCE(m.away_score, 0) - COALESCE(m.home_score, 0) ELSE 0 END) as goal_difference,
          (COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                         (m.away_team_id = t.id AND m.away_score > m.home_score) 
                   THEN 1 END) * 3) + 
          COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score = m.away_score) OR 
                        (m.away_team_id = t.id AND m.away_score = m.home_score) 
                  THEN 1 END) as points
          FROM teams t
          JOIN groups g ON t.group_id = g.id
          LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.stage = 'Group Stage' AND m.played = 1
          WHERE t.group_id = ?
          GROUP BY t.id
          ORDER BY points DESC, goal_difference DESC, goals_for DESC, t.name
        \`, [group.id], (err, teamStandings) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Get the winner and runner-up
          const winner = teamStandings.length > 0 ? teamStandings[0] : null;
          const runnerUp = teamStandings.length > 1 ? teamStandings[1] : null;
          
          resolve({
            group: group,
            winner: winner,
            runnerUp: runnerUp
          });
        });
      });
    });
    
    // After all group data is collected, update Round of 16 matches
    Promise.all(groupPromises)
      .then(groupResults => {
        // Map group results to team IDs
        const teamMap = {};
        
        groupResults.forEach(result => {
          const groupLetter = result.group.name.charAt(result.group.name.length - 1);
          
          if (result.winner) {
            teamMap[\`\${groupLetter}1\`] = result.winner.team_id; // Group winner (e.g., A1, B1)
          }
          
          if (result.runnerUp) {
            teamMap[\`\${groupLetter}2\`] = result.runnerUp.team_id; // Group runner-up (e.g., A2, B2)
          }
        });
        
        console.log('Team mapping from group results:', teamMap);
        
        // Get all Round of 16 matches to update
        db.all(\`SELECT id, match_date, match_time FROM matches WHERE stage = 'Round of 16' ORDER BY match_date, match_time\`, [], (err, r16Matches) => {
          if (err) {
            console.error('Error getting Round of 16 matches:', err.message);
            return;
          }
          
          console.log(\`Found \${r16Matches.length} Round of 16 matches to update\`);
          
          // Define the structure as specified by requirements
          const matchupStructure = [
            // Day 1
            { home: 'A1', away: 'B2' },
            { home: 'A2', away: 'B1' },
            { home: 'C1', away: 'D2' },
            { home: 'C2', away: 'D1' },
            // Day 2
            { home: 'E1', away: 'F2' },
            { home: 'E2', away: 'F1' },
            { home: 'G1', away: 'H2' },
            { home: 'G2', away: 'H1' }
          ];
          
          // Update each match with the corresponding teams
          for (let i = 0; i < Math.min(r16Matches.length, matchupStructure.length); i++) {
            const match = r16Matches[i];
            const matchup = matchupStructure[i];
            const homeTeamId = teamMap[matchup.home];
            const awayTeamId = teamMap[matchup.away];
            
            if (homeTeamId && awayTeamId) {
              db.run(
                'UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?',
                [homeTeamId, awayTeamId, match.id],
                function(err) {
                  if (err) {
                    console.error(\`Error updating Round of 16 match \${match.id}:\`, err.message);
                  } else {
                    console.log(\`Updated Round of 16 match \${match.id}: \${matchup.home} vs \${matchup.away} (Team IDs: \${homeTeamId} vs \${awayTeamId})\`);
                  }
                }
              );
            } else {
              console.warn(\`Missing team ID for match \${match.id}: \${matchup.home}=\${homeTeamId}, \${matchup.away}=\${awayTeamId}\`);
            }
          }
        });
      })
      .catch(err => {
        console.error('Error processing group results:', err);
      });
  });
}`;
      
      // Replace the old function with the new one
      const functionStartRegex = /\/\/ Function to update Round of 16 matches based on group stage results\s*function updateRoundOf16Matches\(\) {/;
      const functionEndRegex = /^}/m;
      
      // Find the start of the function
      const functionStartMatch = data.match(functionStartRegex);
      if (!functionStartMatch) {
        console.error('Could not find the updateRoundOf16Matches function in server.js');
        db.close();
        return;
      }
      
      const functionStartIndex = functionStartMatch.index;
      
      // Find the end of the function by searching for the closing brace
      let braceCount = 1;
      let functionEndIndex = -1;
      
      for (let i = functionStartIndex + functionStartMatch[0].length; i < data.length; i++) {
        if (data[i] === '{') braceCount++;
        else if (data[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          functionEndIndex = i + 1;
          break;
        }
      }
      
      if (functionEndIndex === -1) {
        console.error('Could not find the end of the updateRoundOf16Matches function');
        db.close();
        return;
      }
      
      // Replace the function
      const newData = data.substring(0, functionStartIndex) + newUpdateFunction + data.substring(functionEndIndex);
      
      // Write the updated server.js file
      fs.writeFile(serverFilePath, newData, 'utf8', (err) => {
        if (err) {
          console.error(`Error writing to server.js: ${err.message}`);
        } else {
          console.log('Successfully updated the updateRoundOf16Matches function in server.js');
        }
        
        db.close();
      });
    });
  }
});
