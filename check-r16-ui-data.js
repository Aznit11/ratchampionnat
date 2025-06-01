// Script to check how Round of 16 matches appear in the UI data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database(path.join(__dirname, 'football.db'));

console.log("Checking how the UI would display Round of 16 matches...");

// This simulates the query that would happen in the fixtures route
db.all(`
    SELECT 
        m.id, m.match_date, m.match_time, m.stage, m.played,
        m.home_team_id, m.away_team_id, m.home_score, m.away_score,
        ht.name as home_team_name, at.name as away_team_name
    FROM matches m
    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    WHERE m.stage = 'Round of 16'
    ORDER BY m.match_date, m.match_time
`, [], (err, matches) => {
    if (err) {
        console.error("Error getting Round of 16 matches:", err.message);
        db.close();
        return;
    }
    
    console.log(`Found ${matches.length} Round of 16 matches`);
    
    // Group matches by date to see how they would be displayed in the UI
    const dateMatches = {};
    matches.forEach(match => {
        if (!dateMatches[match.match_date]) {
            dateMatches[match.match_date] = [];
        }
        dateMatches[match.match_date].push(match);
    });
    
    // Display matches as they would appear in the UI
    console.log("\nRound of 16 matches by day (as would appear in UI):");
    Object.keys(dateMatches).sort().forEach(date => {
        console.log(`\n${date}:`);
        dateMatches[date].forEach(match => {
            console.log(`  - Match ${match.id}: ${match.match_time}, ${match.home_team_name || 'TBD'} vs ${match.away_team_name || 'TBD'}`);
        });
    });
    
    // Check if team names are null, which might be causing problems
    const nullTeamMatches = matches.filter(m => !m.home_team_name || !m.away_team_name);
    if (nullTeamMatches.length > 0) {
        console.log("\nMatches with missing team names (could cause UI issues):");
        nullTeamMatches.forEach(match => {
            console.log(`  - Match ${match.id}: Home=${match.home_team_id}(${match.home_team_name}), Away=${match.away_team_id}(${match.away_team_name})`);
        });
    }
    
    // Now let's check if there are any placeholder values for these matches
    const matchIds = matches.map(m => m.id);
    if (matchIds.length > 0) {
        const placeholders = matchIds.map(() => '?').join(',');
        
        db.all(`
            SELECT * 
            FROM match_placeholders 
            WHERE match_id IN (${placeholders})
        `, matchIds, (err, placeholders) => {
            if (err) {
                console.error("Error checking for placeholders:", err.message);
                checkDuplicateTeams();
                return;
            }
            
            if (placeholders && placeholders.length > 0) {
                console.log("\nPlaceholder information for Round of 16 matches:");
                placeholders.forEach(p => {
                    console.log(`  - Match ${p.match_id}: Home=${p.home_placeholder}, Away=${p.away_placeholder}`);
                });
            } else {
                console.log("\nNo placeholder information found for Round of 16 matches");
            }
            
            checkDuplicateTeams();
        });
    } else {
        checkDuplicateTeams();
    }
    
    // Check if some team IDs are appearing in multiple matches
    function checkDuplicateTeams() {
        // Get all team IDs
        const homeTeamIds = matches.map(m => m.home_team_id).filter(id => id);
        const awayTeamIds = matches.map(m => m.away_team_id).filter(id => id);
        const allTeamIds = [...homeTeamIds, ...awayTeamIds];
        
        // Count occurrences of each team ID
        const teamCounts = {};
        allTeamIds.forEach(id => {
            teamCounts[id] = (teamCounts[id] || 0) + 1;
        });
        
        // Check for teams appearing multiple times
        const duplicateTeams = Object.entries(teamCounts)
            .filter(([id, count]) => count > 1)
            .map(([id]) => parseInt(id));
        
        if (duplicateTeams.length > 0) {
            console.log("\nTeams appearing in multiple Round of 16 matches (could cause UI confusion):");
            duplicateTeams.forEach(teamId => {
                const teamMatches = matches.filter(m => m.home_team_id === teamId || m.away_team_id === teamId);
                const teamName = teamMatches[0].home_team_id === teamId ? 
                    teamMatches[0].home_team_name : teamMatches[0].away_team_name;
                
                console.log(`  - Team ID ${teamId} (${teamName || 'Unknown'}) appears in ${teamCounts[teamId]} matches:`);
                teamMatches.forEach(match => {
                    const position = match.home_team_id === teamId ? 'Home' : 'Away';
                    console.log(`    * Match ${match.id} (${match.match_date}): ${position} team`);
                });
            });
        } else {
            console.log("\nNo teams appear in multiple Round of 16 matches");
        }
        
        // Now let's check if there might be phantom UI issues due to empty teams
        console.log("\nChecking for empty placeholder teams that could cause UI issues...");
        
        // Close the database when done
        db.close();
    }
});
