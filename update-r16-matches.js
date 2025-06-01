// Script to update Round of 16 matches to the specified format
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// Check the schema first
db.all("PRAGMA table_info(matches)", (err, schema) => {
  if (err) {
    console.error("Error getting schema:", err.message);
    db.close();
    return;
  }
  
  console.log("Matches table schema:");
  schema.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
  // Get existing Round of 16 matches
  db.all("SELECT * FROM matches WHERE stage = 'Round of 16'", (err, existingMatches) => {
    if (err) {
      console.error("Error getting existing matches:", err.message);
      db.close();
      return;
    }
    
    console.log(`\nFound ${existingMatches.length} existing Round of 16 matches`);
    
    // Delete existing Round of 16 matches
    db.run("DELETE FROM matches WHERE stage = 'Round of 16'", function(err) {
      if (err) {
        console.error("Error deleting matches:", err.message);
        db.close();
        return;
      }
      
      console.log(`Deleted ${existingMatches.length} existing Round of 16 matches`);
      
      // Define the two days for Round of 16
      const day1 = '2025-06-25';
      const day2 = '2025-06-27';
      
      // Create the new Round of 16 matches with the specified structure
      const newMatches = [
        // Day 1
        { date: day1, time: '16:00', stage: 'Round of 16', placeholder: 'A1 vs B2' },
        { date: day1, time: '18:00', stage: 'Round of 16', placeholder: 'C1 vs D2' },
        { date: day1, time: '20:00', stage: 'Round of 16', placeholder: 'B1 vs A2' },
        { date: day1, time: '22:00', stage: 'Round of 16', placeholder: 'D1 vs C2' },
        
        // Day 2
        { date: day2, time: '16:00', stage: 'Round of 16', placeholder: 'E1 vs F2' },
        { date: day2, time: '18:00', stage: 'Round of 16', placeholder: 'G1 vs H2' },
        { date: day2, time: '20:00', stage: 'Round of 16', placeholder: 'F1 vs E2' },
        { date: day2, time: '22:00', stage: 'Round of 16', placeholder: 'H1 vs G2' }
      ];
      
      // Add all the new matches
      let insertedCount = 0;
      
      for (const match of newMatches) {
        // Check if we need to use a description field instead of placeholder
        if (schema.some(col => col.name === 'description')) {
          // Use description field
          db.run(
            'INSERT INTO matches (match_date, match_time, stage, description) VALUES (?, ?, ?, ?)',
            [match.date, match.time, match.stage, match.placeholder],
            function(err) {
              if (err) {
                console.error(`Error inserting match: ${err.message}`);
              } else {
                insertedCount++;
                console.log(`Inserted match ${this.lastID}: ${match.placeholder} on ${match.date} at ${match.time}`);
              }
              
              if (insertedCount === newMatches.length) {
                console.log(`\nSuccessfully inserted ${insertedCount} Round of 16 matches`);
                updateTeamPlaceholders();
              }
            }
          );
        } else {
          // Try the standard structure
          db.run(
            'INSERT INTO matches (match_date, match_time, stage) VALUES (?, ?, ?)',
            [match.date, match.time, match.stage],
            function(err) {
              if (err) {
                console.error(`Error inserting match: ${err.message}`);
              } else {
                insertedCount++;
                console.log(`Inserted match ${this.lastID}: ${match.placeholder} on ${match.date} at ${match.time}`);
                
                // Also update the description or notes if available
                if (schema.some(col => col.name === 'notes')) {
                  db.run('UPDATE matches SET notes = ? WHERE id = ?', [match.placeholder, this.lastID]);
                }
              }
              
              if (insertedCount === newMatches.length) {
                console.log(`\nSuccessfully inserted ${insertedCount} Round of 16 matches`);
                updateTeamPlaceholders();
              }
            }
          );
        }
      }
      
      // Function to update team placeholders for the Round of 16
      function updateTeamPlaceholders() {
        // Get all newly created Round of 16 matches
        db.all("SELECT * FROM matches WHERE stage = 'Round of 16' ORDER BY match_date, match_time", (err, newRoundOf16) => {
          if (err) {
            console.error("Error getting new Round of 16 matches:", err.message);
            db.close();
            return;
          }
          
          // Check if we have all the columns needed
          const hasHomePlaceholder = schema.some(col => col.name === 'home_placeholder');
          const hasAwayPlaceholder = schema.some(col => col.name === 'away_placeholder');
          
          if (hasHomePlaceholder && hasAwayPlaceholder) {
            // Update each match with the right placeholders
            const placeholders = [
              // Day 1
              { home: 'Winner Group A', away: 'Runner-up Group B' },
              { home: 'Winner Group C', away: 'Runner-up Group D' },
              { home: 'Winner Group B', away: 'Runner-up Group A' },
              { home: 'Winner Group D', away: 'Runner-up Group C' },
              
              // Day 2
              { home: 'Winner Group E', away: 'Runner-up Group F' },
              { home: 'Winner Group G', away: 'Runner-up Group H' },
              { home: 'Winner Group F', away: 'Runner-up Group E' },
              { home: 'Winner Group H', away: 'Runner-up Group G' }
            ];
            
            // Update each match
            for (let i = 0; i < Math.min(newRoundOf16.length, placeholders.length); i++) {
              const match = newRoundOf16[i];
              const placeholder = placeholders[i];
              
              db.run(
                'UPDATE matches SET home_placeholder = ?, away_placeholder = ? WHERE id = ?',
                [placeholder.home, placeholder.away, match.id],
                function(err) {
                  if (err) {
                    console.error(`Error updating placeholders for match ${match.id}: ${err.message}`);
                  } else {
                    console.log(`Updated match ${match.id} placeholders: ${placeholder.home} vs ${placeholder.away}`);
                  }
                }
              );
            }
          } else {
            console.log("Database schema does not have home_placeholder and away_placeholder columns");
            console.log("Created matches with descriptions only");
          }
          
          // Close the database after 2 seconds (allow time for async operations)
          setTimeout(() => {
            db.close();
            console.log("Database connection closed");
          }, 2000);
        });
      }
    });
  });
});
