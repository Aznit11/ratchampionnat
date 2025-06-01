// Script to update Round of 16 matches to the specified format
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// First, clear existing Round of 16 matches
db.run('DELETE FROM matches WHERE stage = "Round of 16"', function(err) {
    if (err) {
        console.error('Error deleting existing Round of 16 matches:', err.message);
        return;
    }
    
    console.log('Deleted existing Round of 16 matches');
    
    // Define new Round of 16 structure - Day 1
    const day1Date = '2025-06-25'; // First day of knockout stage
    const day1Matches = [
        { home: 'Winner Group A', away: 'Runner-up Group B', time: '16:00' },
        { home: 'Winner Group B', away: 'Runner-up Group A', time: '18:00' },
        { home: 'Winner Group C', away: 'Runner-up Group D', time: '20:00' },
        { home: 'Winner Group D', away: 'Runner-up Group C', time: '22:00' }
    ];
    
    // Define new Round of 16 structure - Day 2
    const day2Date = '2025-06-27'; // Second day, 2 days later
    const day2Matches = [
        { home: 'Winner Group E', away: 'Runner-up Group F', time: '16:00' },
        { home: 'Winner Group F', away: 'Runner-up Group E', time: '18:00' },
        { home: 'Winner Group G', away: 'Runner-up Group H', time: '20:00' },
        { home: 'Winner Group H', away: 'Runner-up Group G', time: '22:00' }
    ];
    
    // Insert Day 1 matches
    day1Matches.forEach(match => {
        db.run(
            'INSERT INTO matches (match_date, match_time, stage, home_placeholder, away_placeholder) VALUES (?, ?, ?, ?, ?)',
            [day1Date, match.time, 'Round of 16', match.home, match.away],
            function(err) {
                if (err) {
                    console.error('Error creating Day 1 Round of 16 match:', err.message);
                } else {
                    console.log(`Created Day 1 match: ${match.home} vs ${match.away}`);
                }
            }
        );
    });
    
    // Insert Day 2 matches
    day2Matches.forEach(match => {
        db.run(
            'INSERT INTO matches (match_date, match_time, stage, home_placeholder, away_placeholder) VALUES (?, ?, ?, ?, ?)',
            [day2Date, match.time, 'Round of 16', match.home, match.away],
            function(err) {
                if (err) {
                    console.error('Error creating Day 2 Round of 16 match:', err.message);
                } else {
                    console.log(`Created Day 2 match: ${match.home} vs ${match.away}`);
                }
            }
        );
    });
    
    console.log('Round of 16 matches updated successfully');
});

// Close the database when finished
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
    });
}, 2000); // Give time for async operations to complete
