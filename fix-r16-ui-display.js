// Script to fix Round of 16 UI display issues
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

// First, check the existing Round of 16 matches
console.log("Examining Round of 16 matches to fix UI display issues...");

db.all(`
    SELECT 
        m.id, m.match_date, m.match_time, m.stage, m.played,
        m.home_team_id, m.away_team_id, m.home_score, m.away_score
    FROM matches m
    WHERE m.stage = 'Round of 16'
    ORDER BY m.match_date, m.match_time
`, [], (err, matches) => {
    if (err) {
        console.error("Error getting Round of 16 matches:", err.message);
        db.close();
        return;
    }
    
    console.log(`Found ${matches.length} Round of 16 matches`);
    
    // Group matches by date
    const dateMatches = {};
    matches.forEach(match => {
        if (!dateMatches[match.match_date]) {
            dateMatches[match.match_date] = [];
        }
        dateMatches[match.match_date].push(match);
    });
    
    const dates = Object.keys(dateMatches).sort();
    console.log(`Round of 16 spans ${dates.length} days in the database:`);
    dates.forEach(date => {
        console.log(`- ${date}: ${dateMatches[date].length} matches`);
    });
    
    // First step: Make sure all matches have the same consistent structure
    // Fix any inconsistent match information, particularly placeholder teams
    console.log("\nStep 1: Making sure all Round of 16 matches have consistent team placeholder naming...");
    
    // Create temporary teams for placeholder purposes
    const createTemporaryTeams = () => {
        return new Promise((resolve, reject) => {
            // Check if we already have placeholder teams
            db.all(`SELECT * FROM teams WHERE name LIKE 'Winner Group%' OR name LIKE 'Runner-up Group%'`, [], (err, teams) => {
                if (err) {
                    return reject(err);
                }
                
                if (teams.length >= 16) {
                    console.log("Placeholder teams already exist, using those");
                    return resolve(teams);
                }
                
                console.log("Creating placeholder teams for group winners and runners-up");
                
                // Create teams for group winners and runners-up
                const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const placeholderTeams = [];
                
                // Insert group winners
                const insertWinners = () => {
                    let completed = 0;
                    groups.forEach(group => {
                        db.run(
                            'INSERT INTO teams (name, flag) VALUES (?, ?)',
                            [`Winner Group ${group}`, 'placeholder.png'],
                            function(err) {
                                if (err) {
                                    console.error(`Error creating winner team for Group ${group}:`, err.message);
                                } else {
                                    placeholderTeams.push({
                                        id: this.lastID,
                                        name: `Winner Group ${group}`,
                                        type: 'winner',
                                        group
                                    });
                                }
                                
                                completed++;
                                if (completed === groups.length) {
                                    insertRunnerUps();
                                }
                            }
                        );
                    });
                };
                
                // Insert group runners-up
                const insertRunnerUps = () => {
                    let completed = 0;
                    groups.forEach(group => {
                        db.run(
                            'INSERT INTO teams (name, flag) VALUES (?, ?)',
                            [`Runner-up Group ${group}`, 'placeholder.png'],
                            function(err) {
                                if (err) {
                                    console.error(`Error creating runner-up team for Group ${group}:`, err.message);
                                } else {
                                    placeholderTeams.push({
                                        id: this.lastID,
                                        name: `Runner-up Group ${group}`,
                                        type: 'runner-up',
                                        group
                                    });
                                }
                                
                                completed++;
                                if (completed === groups.length) {
                                    resolve(placeholderTeams);
                                }
                            }
                        );
                    });
                };
                
                insertWinners();
            });
        });
    };
    
    // Assign the placeholder teams to matches
    const assignPlaceholderTeams = (placeholderTeams) => {
        // The Round of 16 matchups we want
        const matchups = [
            { day: 1, time: '16:00', home: 'Winner Group A', away: 'Runner-up Group B' },
            { day: 1, time: '18:00', home: 'Winner Group C', away: 'Runner-up Group D' },
            { day: 1, time: '20:00', home: 'Winner Group E', away: 'Runner-up Group F' },
            { day: 1, time: '22:00', home: 'Winner Group G', away: 'Runner-up Group H' },
            { day: 2, time: '16:00', home: 'Winner Group B', away: 'Runner-up Group A' },
            { day: 2, time: '18:00', home: 'Winner Group D', away: 'Runner-up Group C' },
            { day: 2, time: '20:00', home: 'Winner Group F', away: 'Runner-up Group E' },
            { day: 2, time: '22:00', home: 'Winner Group H', away: 'Runner-up Group G' }
        ];
        
        const updatePromises = [];
        
        // Sort matches by date and time
        const sortedMatches = [...matches].sort((a, b) => {
            if (a.match_date === b.match_date) {
                return a.match_time.localeCompare(b.match_time);
            }
            return a.match_date.localeCompare(b.match_date);
        });
        
        // Assign teams in order
        sortedMatches.forEach((match, index) => {
            if (index >= matchups.length) return;
            
            const matchup = matchups[index];
            const homeTeam = placeholderTeams.find(t => t.name === matchup.home);
            const awayTeam = placeholderTeams.find(t => t.name === matchup.away);
            
            if (!homeTeam || !awayTeam) {
                console.error(`Could not find placeholder teams for matchup ${index + 1}`);
                return;
            }
            
            updatePromises.push(
                new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?',
                        [homeTeam.id, awayTeam.id, match.id],
                        function(err) {
                            if (err) {
                                console.error(`Error updating match ${match.id}:`, err.message);
                                reject(err);
                            } else {
                                console.log(`Updated match ${match.id} with ${homeTeam.name} vs ${awayTeam.name}`);
                                resolve();
                            }
                        }
                    );
                })
            );
        });
        
        return Promise.all(updatePromises);
    };
    
    // Execute the updates
    createTemporaryTeams()
        .then(placeholderTeams => {
            console.log(`Created/found ${placeholderTeams.length} placeholder teams`);
            return assignPlaceholderTeams(placeholderTeams);
        })
        .then(() => {
            console.log("\nAll Round of 16 matches updated with proper team placeholders!");
            console.log("\nVerifying the changes:");
            
            db.all(`
                SELECT 
                    m.id, m.match_date, m.match_time, 
                    ht.name as home_team_name, at.name as away_team_name
                FROM matches m
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE m.stage = 'Round of 16'
                ORDER BY m.match_date, m.match_time
            `, [], (err, updatedMatches) => {
                if (err) {
                    console.error("Error verifying updates:", err.message);
                } else {
                    console.log("\nUpdated Round of 16 matches:");
                    
                    // Group by date again
                    const updatedByDate = {};
                    updatedMatches.forEach(match => {
                        if (!updatedByDate[match.match_date]) {
                            updatedByDate[match.match_date] = [];
                        }
                        updatedByDate[match.match_date].push(match);
                    });
                    
                    Object.keys(updatedByDate).sort().forEach(date => {
                        console.log(`\n${date}:`);
                        updatedByDate[date].sort((a, b) => a.match_time.localeCompare(b.match_time)).forEach(match => {
                            console.log(`  - Match ${match.id}: ${match.match_time}, ${match.home_team_name} vs ${match.away_team_name}`);
                        });
                    });
                }
                
                console.log("\nDone! The Round of 16 matches should now display correctly in the UI.");
                db.close();
            });
        })
        .catch(err => {
            console.error("Error updating matches:", err);
            db.close();
        });
});
