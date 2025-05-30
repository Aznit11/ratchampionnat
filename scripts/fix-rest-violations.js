/**
 * Script to find and fix rest day violations in the schedule
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// Helper functions for database operations
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

// Find all rest day violations
async function findViolations() {
  try {
    // Get all teams with their group info
    const teams = await dbAll(`
      SELECT t.id, t.name, g.id as group_id, g.name as group_name, 
             COUNT(t2.id) as team_count_in_group
      FROM teams t
      JOIN groups g ON t.group_id = g.id
      JOIN teams t2 ON t2.group_id = g.id
      GROUP BY t.id
      ORDER BY g.id, t.team_in_group_id
    `);
    
    // Map teams to their required rest days
    const teamRestDays = {};
    const teamData = {};
    teams.forEach(team => {
      teamRestDays[team.id] = team.team_count_in_group === 5 ? 2 : 3;
      teamData[team.id] = team;
    });
    
    console.log(`\n=== CHECKING REST DAY VIOLATIONS ===`);
    
    const violations = [];
    // Check each team's schedule
    for (const team of teams) {
      const requiredRest = teamRestDays[team.id];
      
      // Get all matches for this team
      const matches = await dbAll(`
        SELECT m.id, m.match_date, m.match_time,
               home.name as home_team_name,
               away.name as away_team_name
        FROM matches m
        JOIN teams home ON m.home_team_id = home.id
        JOIN teams away ON m.away_team_id = away.id
        WHERE m.home_team_id = ? OR m.away_team_id = ?
        ORDER BY m.match_date, m.match_time
      `, [team.id, team.id]);
      
      // Check for violations
      for (let i = 0; i < matches.length - 1; i++) {
        const date1 = new Date(matches[i].match_date);
        const date2 = new Date(matches[i+1].match_date);
        
        const daysBetween = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
        
        if (daysBetween < requiredRest) {
          violations.push({
            teamId: team.id,
            teamName: team.name,
            groupName: team.group_name,
            requiredRest,
            actualRest: daysBetween,
            match1: matches[i],
            match2: matches[i+1]
          });
        }
      }
    }
    
    // Report violations
    if (violations.length === 0) {
      console.log('✓ All teams have proper rest days between matches!');
    } else {
      console.log(`✗ Found ${violations.length} rest day violations:`);
      violations.forEach((v, i) => {
        console.log(`\nViolation ${i+1}:`);
        console.log(`  Team ${v.teamName} (Group ${v.groupName}) needs ${v.requiredRest} days rest, but only got ${v.actualRest} days`);
        console.log(`  Match 1: ${v.match1.match_date} - ${v.match1.home_team_name} vs ${v.match1.away_team_name} (ID: ${v.match1.id})`);
        console.log(`  Match 2: ${v.match2.match_date} - ${v.match2.home_team_name} vs ${v.match2.away_team_name} (ID: ${v.match2.id})`);
      });
    }
    
    return { violations, teams, teamData, teamRestDays };
  } catch (error) {
    console.error('Error finding violations:', error);
    throw error;
  }
}

// Find the best candidate match to swap with
async function findSwapCandidate(violation, allMatches, teamMatches) {
  const teamId = violation.teamId;
  const match2Id = violation.match2.id;
  
  // Find dates this team plays
  const teamPlayDates = teamMatches[teamId].map(m => m.match_date);
  
  // Find match candidates that:
  // 1. Don't involve this team
  // 2. Are on a date the team doesn't play
  // 3. Would give enough rest if swapped
  
  // First find the earliest date that would give enough rest
  const match1Date = new Date(violation.match1.match_date);
  const minValidDate = new Date(match1Date);
  minValidDate.setDate(minValidDate.getDate() + violation.requiredRest);
  
  // Format date to YYYY-MM-DD for comparison
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Find matches that could be valid swap candidates
  const candidates = [];
  for (const match of allMatches) {
    // Skip the violation match itself
    if (match.id === match2Id) continue;
    
    // Skip matches involving the team with the violation
    if (match.home_team_id === teamId || match.away_team_id === teamId) continue;
    
    const matchDate = new Date(match.match_date);
    
    // Check if this match date is valid (gives enough rest)
    if (matchDate >= minValidDate && !teamPlayDates.includes(match.match_date)) {
      candidates.push(match);
    }
  }
  
  // Sort candidates by date (we prefer earlier dates)
  candidates.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  
  return candidates.length > 0 ? candidates[0] : null;
}

// Fix violations by swapping matches
async function fixViolations() {
  try {
    // First find all violations
    const { violations, teams, teamData, teamRestDays } = await findViolations();
    
    if (violations.length === 0) {
      console.log('No violations to fix!');
      return;
    }
    
    console.log(`\n=== FIXING ${violations.length} REST DAY VIOLATIONS ===`);
    
    // Get all matches
    const allMatches = await dbAll(`
      SELECT * FROM matches ORDER BY match_date, match_time
    `);
    
    // Build a map of team matches
    const teamMatches = {};
    for (const team of teams) {
      teamMatches[team.id] = [];
    }
    
    // Fill team matches map
    for (const match of allMatches) {
      if (teamMatches[match.home_team_id]) {
        teamMatches[match.home_team_id].push(match);
      }
      if (teamMatches[match.away_team_id]) {
        teamMatches[match.away_team_id].push(match);
      }
    }
    
    // Now fix each violation
    for (const violation of violations) {
      console.log(`\nFixing violation for team ${violation.teamName}:`);
      
      // Find a suitable match to swap with
      const swapCandidate = await findSwapCandidate(violation, allMatches, teamMatches);
      
      if (!swapCandidate) {
        console.log(`  ⚠️ Could not find a suitable match to swap with!`);
        continue;
      }
      
      // Perform the swap
      console.log(`  Found swap candidate: Match ID ${swapCandidate.id} on ${swapCandidate.match_date}`);
      
      // Get team names for logging
      const match2 = await dbAll(`
        SELECT home.name as home_name, away.name as away_name
        FROM matches m
        JOIN teams home ON m.home_team_id = home.id
        JOIN teams away ON m.away_team_id = away.id
        WHERE m.id = ?
      `, [violation.match2.id]);
      
      const candidateMatch = await dbAll(`
        SELECT home.name as home_name, away.name as away_name
        FROM matches m
        JOIN teams home ON m.home_team_id = home.id
        JOIN teams away ON m.away_team_id = away.id
        WHERE m.id = ?
      `, [swapCandidate.id]);
      
      console.log(`  Swapping:`);
      console.log(`    - ${match2[0].home_name} vs ${match2[0].away_name} from ${violation.match2.match_date} to ${swapCandidate.match_date}`);
      console.log(`    - ${candidateMatch[0].home_name} vs ${candidateMatch[0].away_name} from ${swapCandidate.match_date} to ${violation.match2.match_date}`);
      
      // Swap the matches
      const tempDate = violation.match2.match_date;
      const tempTime = violation.match2.match_time;
      
      // Update match2
      await dbRun(`
        UPDATE matches SET match_date = ?, match_time = ?
        WHERE id = ?
      `, [swapCandidate.match_date, swapCandidate.match_time, violation.match2.id]);
      
      // Update swap candidate
      await dbRun(`
        UPDATE matches SET match_date = ?, match_time = ?
        WHERE id = ?
      `, [tempDate, tempTime, swapCandidate.id]);
      
      console.log(`  ✓ Successfully swapped matches to fix rest day violation!`);
    }
    
    // Check if we fixed all violations
    console.log(`\n=== VERIFYING FIXES ===`);
    const { violations: remainingViolations } = await findViolations();
    
    if (remainingViolations.length === 0) {
      console.log(`\n🎉 All rest day violations have been fixed successfully!`);
    } else {
      console.log(`\n⚠️ There are still ${remainingViolations.length} rest day violations.`);
      console.log('Further manual adjustments may be needed.');
      
      // Try more aggressive fixing if needed
      if (remainingViolations.length < violations.length) {
        console.log('Some progress was made. Attempting another round of fixes with relaxed constraints...');
        await fixRemainingViolations(remainingViolations);
      }
    }
  } catch (error) {
    console.error('Error fixing violations:', error);
    throw error;
  }
}

// More aggressive fixing for stubborn violations
async function fixRemainingViolations(violations) {
  try {
    // Get all matches again (some may have been moved in first round)
    const allMatches = await dbAll(`
      SELECT * FROM matches ORDER BY match_date
    `);
    
    // For each remaining violation, take more drastic measures
    for (const violation of violations) {
      console.log(`\nAttempting aggressive fix for team ${violation.teamName}:`);
      
      // Find the earliest date that would be valid
      const match1Date = new Date(violation.match1.match_date);
      const minValidDate = new Date(match1Date);
      minValidDate.setDate(minValidDate.getDate() + violation.requiredRest);
      
      // Find a match on a later date that doesn't involve either team from match2
      const match2 = violation.match2;
      const match2Teams = [violation.teamId];
      
      // Get the other team in match 2
      if (match2.home_team_name === violation.teamName) {
        // Find away team ID
        const awayTeam = await dbAll(`SELECT id FROM teams WHERE name = ?`, [match2.away_team_name]);
        if (awayTeam.length > 0) {
          match2Teams.push(awayTeam[0].id);
        }
      } else {
        // Find home team ID
        const homeTeam = await dbAll(`SELECT id FROM teams WHERE name = ?`, [match2.home_team_name]);
        if (homeTeam.length > 0) {
          match2Teams.push(homeTeam[0].id);
        }
      }
      
      // Find any match after minValidDate that doesn't involve match2Teams
      const laterMatches = allMatches.filter(m => {
        const matchDate = new Date(m.match_date);
        return matchDate >= minValidDate && 
               !match2Teams.includes(m.home_team_id) && 
               !match2Teams.includes(m.away_team_id) &&
               m.id !== match2.id;
      });
      
      // Sort by date (earlier first)
      laterMatches.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
      
      if (laterMatches.length === 0) {
        console.log(`  ⚠️ Could not find any suitable match to swap with!`);
        continue;
      }
      
      const swapMatch = laterMatches[0];
      
      // Get team names for the swap match
      const swapTeams = await dbAll(`
        SELECT home.name as home_name, away.name as away_name
        FROM matches m
        JOIN teams home ON m.home_team_id = home.id
        JOIN teams away ON m.away_team_id = away.id
        WHERE m.id = ?
      `, [swapMatch.id]);
      
      console.log(`  Found aggressive swap candidate: Match ID ${swapMatch.id} on ${swapMatch.match_date}`);
      console.log(`  ${swapTeams[0].home_name} vs ${swapTeams[0].away_name}`);
      
      // Swap the matches
      const tempDate = match2.match_date;
      const tempTime = match2.match_time;
      
      // Update match2
      await dbRun(`
        UPDATE matches SET match_date = ?, match_time = ?
        WHERE id = ?
      `, [swapMatch.match_date, swapMatch.match_time, match2.id]);
      
      // Update swap match
      await dbRun(`
        UPDATE matches SET match_date = ?, match_time = ?
        WHERE id = ?
      `, [tempDate, tempTime, swapMatch.id]);
      
      console.log(`  ✓ Aggressively swapped matches!`);
    }
    
    // Final verification
    console.log(`\n=== FINAL VERIFICATION ===`);
    const { violations: finalViolations } = await findViolations();
    
    if (finalViolations.length === 0) {
      console.log(`\n🎉 All rest day violations have been fixed successfully!`);
    } else {
      console.log(`\n⚠️ There are still ${finalViolations.length} rest day violations after aggressive fixing.`);
    }
  } catch (error) {
    console.error('Error in aggressive fixing:', error);
    throw error;
  }
}

// Run the fix
fixViolations().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
