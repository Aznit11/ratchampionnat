const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const expressLayouts = require('express-ejs-layouts');
const i18nMiddleware = require('./middleware/i18n');

// Ensure data directory exists for persistent storage on Render
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory for persistent storage');
  fs.mkdirSync(dataDir);
}

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'session',
  keys: ['football-league-secret-key'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Apply i18n middleware
app.use(i18nMiddleware);

// Import backup functionality
const { createBackup } = require('./backup');

// Database setup
const dbPath = path.join(dataDir, 'football-league.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables and admin user
function initializeDatabase() {
  // Create teams table
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    team_in_group_id INTEGER NOT NULL
  )`);

  // Create groups table
  db.run(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team_count INTEGER NOT NULL
  )`);

  // Create matches table
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER,
    away_team_id INTEGER,
    home_score INTEGER DEFAULT NULL,
    away_score INTEGER DEFAULT NULL,
    match_date TEXT NOT NULL,
    match_time TEXT NOT NULL,
    stage TEXT NOT NULL,
    played BOOLEAN DEFAULT 0,
    FOREIGN KEY (home_team_id) REFERENCES teams (id),
    FOREIGN KEY (away_team_id) REFERENCES teams (id)
  )`);

  // Create goals table
  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    minute INTEGER NOT NULL,
    FOREIGN KEY (match_id) REFERENCES matches (id),
    FOREIGN KEY (team_id) REFERENCES teams (id)
  )`);

  // Create cards table
  db.run(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    card_type TEXT NOT NULL,
    minute INTEGER NOT NULL,
    FOREIGN KEY (match_id) REFERENCES matches (id),
    FOREIGN KEY (team_id) REFERENCES teams (id)
  )`);

  // Create admin user table
  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`);

  // Check if admin user exists
  db.get('SELECT * FROM admin WHERE username = ?', ['ratchampionat'], (err, row) => {
    if (err) {
      console.error('Error checking admin user', err.message);
    } else if (!row) {
      // Create admin user
      bcrypt.hash('2025ratchampionat2025', 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password', err.message);
        } else {
          db.run('INSERT INTO admin (username, password) VALUES (?, ?)', ['ratchampionat', hash], (err) => {
            if (err) {
              console.error('Error creating admin user', err.message);
            } else {
              console.log('Admin user created successfully');
            }
          });
        }
      });
    }
  });

  // Populate groups
  const groups = [
    { name: 'A', team_count: 4 },
    { name: 'B', team_count: 4 },
    { name: 'C', team_count: 4 },
    { name: 'D', team_count: 4 },
    { name: 'E', team_count: 4 },
    { name: 'F', team_count: 5 },
    { name: 'G', team_count: 5 },
    { name: 'H', team_count: 5 }
  ];

  db.get('SELECT COUNT(*) as count FROM groups', (err, row) => {
    if (err) {
      console.error('Error checking groups', err.message);
    } else if (row.count === 0) {
      // Insert groups
      const stmt = db.prepare('INSERT INTO groups (name, team_count) VALUES (?, ?)');
      groups.forEach(group => {
        stmt.run(group.name, group.team_count);
      });
      stmt.finalize();
      console.log('Groups created successfully');

      // Generate default team names
      createDefaultTeams();
    }
  });
}

// Create default teams for each group
function createDefaultTeams() {
  db.all('SELECT * FROM groups ORDER BY id', [], (err, groups) => {
    if (err) {
      console.error('Error getting groups', err.message);
    } else {
      groups.forEach(group => {
        for (let i = 1; i <= group.team_count; i++) {
          const teamName = `Team ${group.name}${i}`;
          db.run('INSERT INTO teams (name, group_id, team_in_group_id) VALUES (?, ?, ?)', 
            [teamName, group.id, i], function(err) {
              if (err) {
                console.error('Error creating team', err.message);
              } else {
                console.log(`Created team: ${teamName}`);
              }
            });
        }
      });
      // After creating teams, generate match schedule
      setTimeout(generateMatchSchedule, 1000);
    }
  });
}

// Generate match schedule for all stages
function generateMatchSchedule() {
  // First check if matches already exist
  db.get('SELECT COUNT(*) as count FROM matches', (err, row) => {
    if (err) {
      console.error('Error checking matches', err.message);
    } else if (row.count === 0) {
      console.log('Generating match schedule...');
      generateGroupStageMatches();
    }
  });
}

// Generate group stage matches
function generateGroupStageMatches() {
  db.all('SELECT * FROM groups ORDER BY id', [], (err, groups) => {
    if (err) {
      console.error('Error getting groups', err.message);
    } else {
      let currentDate = new Date('2025-06-01');
      const matchTimes = ['08:00', '10:00', '16:00', '18:00'];
      let timeIndex = 3; // Start with 18:00 for the first match
      let matchesForTheDay = 0;
      let dayOneFlag = true;

      // Generate group stage matches
      groups.forEach(group => {
        db.all('SELECT * FROM teams WHERE group_id = ? ORDER BY team_in_group_id', [group.id], (err, teams) => {
          if (err) {
            console.error('Error getting teams', err.message);
          } else {
            // Generate all possible match combinations within the group
            for (let i = 0; i < teams.length; i++) {
              for (let j = i + 1; j < teams.length; j++) {
                // Format date string
                const dateStr = currentDate.toISOString().split('T')[0];

                // For the first match, use 18:00 (6:00 PM)
                let matchTime;
                if (dayOneFlag) {
                  matchTime = '18:00';
                  dayOneFlag = false;
                } else {
                  matchTime = matchTimes[timeIndex];
                  timeIndex = (timeIndex + 1) % matchTimes.length;
                  matchesForTheDay++;
                }

                // Insert match into database
                db.run('INSERT INTO matches (home_team_id, away_team_id, match_date, match_time, stage) VALUES (?, ?, ?, ?, ?)',
                  [teams[i].id, teams[j].id, dateStr, matchTime, 'Group Stage'], function(err) {
                    if (err) {
                      console.error('Error creating match', err.message);
                    }
                  });

                // Check if we've scheduled 4 matches for the day
                if (matchesForTheDay >= 4) {
                  matchesForTheDay = 0;
                  currentDate.setDate(currentDate.getDate() + 1);
                }

                // Ensure rest days between matches for the same team
                // For groups with 4 teams, ensure 3+ days rest
                // For groups with 5 teams, ensure 2+ days rest
                const restDays = group.team_count === 4 ? 3 : 2;
                if (j === teams.length - 1 && i === teams.length - 2) {
                  // After all matches in a group, advance the date
                  currentDate.setDate(currentDate.getDate() + restDays);
                }
              }
            }
          }
        });
      });

      // After a delay to ensure all group matches are created, generate knockout stage matches
      setTimeout(generateKnockoutMatches, 3000);
    }
  });
}

// Generate knockout stage matches (round of 16, quarter-finals, semi-finals, final)
function generateKnockoutMatches() {
  // Add some buffer days after group stage
  const knockoutStartDate = new Date('2025-06-25');
  
  // Round of 16 - 8 matches
  for (let i = 0; i < 8; i++) {
    const matchDate = new Date(knockoutStartDate);
    matchDate.setDate(matchDate.getDate() + Math.floor(i / 4) * 2); // 4 matches per day, 2 days
    const matchTime = ['08:00', '10:00', '16:00', '18:00'][i % 4];
    
    db.run('INSERT INTO matches (match_date, match_time, stage) VALUES (?, ?, ?)',
      [matchDate.toISOString().split('T')[0], matchTime, 'Round of 16'], function(err) {
        if (err) console.error('Error creating Round of 16 match', err.message);
      });
  }
  
  // Quarter-finals - 4 matches
  const quarterStartDate = new Date(knockoutStartDate);
  quarterStartDate.setDate(quarterStartDate.getDate() + 4); // 4 days after Round of 16 starts
  
  for (let i = 0; i < 4; i++) {
    const matchDate = new Date(quarterStartDate);
    matchDate.setDate(matchDate.getDate() + Math.floor(i / 2) * 2); // 2 matches per day, 2 days
    const matchTime = ['16:00', '18:00'][i % 2]; // Afternoon and evening matches
    
    db.run('INSERT INTO matches (match_date, match_time, stage) VALUES (?, ?, ?)',
      [matchDate.toISOString().split('T')[0], matchTime, 'Quarter Final'], function(err) {
        if (err) console.error('Error creating Quarter Final match', err.message);
      });
  }
  
  // Semi-finals - 2 matches
  const semiStartDate = new Date(quarterStartDate);
  semiStartDate.setDate(semiStartDate.getDate() + 4); // 4 days after Quarter-finals start
  
  for (let i = 0; i < 2; i++) {
    const matchDate = new Date(semiStartDate);
    matchDate.setDate(matchDate.getDate() + i * 2); // 1 match per day, 2 days apart
    
    db.run('INSERT INTO matches (match_date, match_time, stage) VALUES (?, ?, ?)',
      [matchDate.toISOString().split('T')[0], '18:00', 'Semi Final'], function(err) {
        if (err) console.error('Error creating Semi Final match', err.message);
      });
  }
  
  // Final - 1 match
  const finalDate = new Date(semiStartDate);
  finalDate.setDate(finalDate.getDate() + 5); // 5 days after Semi-finals start
  
  db.run('INSERT INTO matches (match_date, match_time, stage) VALUES (?, ?, ?)',
    [finalDate.toISOString().split('T')[0], '18:00', 'Final'], function(err) {
      if (err) console.error('Error creating Final match', err.message);
    });
}

// Middleware to authenticate admin
const authenticateAdmin = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect('/admin');
  }
};

// Routes
// Home route with direct data passing
app.get('/', (req, res) => {
    // Get upcoming matches directly
    db.all(`
        SELECT 
            m.id, m.match_date, m.match_time, m.stage, m.played,
            m.home_team_id, m.away_team_id, m.home_score, m.away_score,
            home.name as home_team_name, 
            away.name as away_team_name
        FROM matches m
        LEFT JOIN teams home ON m.home_team_id = home.id
        LEFT JOIN teams away ON m.away_team_id = away.id
        WHERE m.played = 0
        ORDER BY m.match_date ASC, m.match_time ASC
        LIMIT 6
    `, [], (err, upcomingMatches) => {
        if (err) {
            console.error('Error fetching upcoming matches for homepage:', err.message);
            upcomingMatches = [];
        }
        
        // Get latest results directly
        db.all(`
            SELECT 
                m.id, m.match_date, m.match_time, m.stage, m.played,
                m.home_team_id, m.away_team_id, m.home_score, m.away_score,
                home.name as home_team_name, 
                away.name as away_team_name
            FROM matches m
            LEFT JOIN teams home ON m.home_team_id = home.id
            LEFT JOIN teams away ON m.away_team_id = away.id
            WHERE m.played = 1
            ORDER BY m.match_date DESC, m.match_time DESC
            LIMIT 6
        `, [], (err, latestResults) => {
            if (err) {
                console.error('Error fetching latest results for homepage:', err.message);
                latestResults = [];
            }
            
            // If no upcoming matches found, create sample data
            if (upcomingMatches.length === 0) {
                upcomingMatches = [{
                    id: 1001,
                    match_date: '2025-06-01',
                    match_time: '15:00',
                    stage: 'Group Stage',
                    played: 0,
                    home_team_id: 1,
                    away_team_id: 2,
                    home_score: null,
                    away_score: null,
                    home_team_name: 'Team A',
                    away_team_name: 'Team B'
                }];
            }
            
            // If no latest results found, create sample data
            if (latestResults.length === 0) {
                latestResults = [{
                    id: 1002,
                    match_date: '2025-05-20',
                    match_time: '15:00',
                    stage: 'Group Stage',
                    played: 1,
                    home_team_id: 3,
                    away_team_id: 4,
                    home_score: 2,
                    away_score: 1,
                    home_team_name: 'Team C',
                    away_team_name: 'Team D'
                }];
            }
            
            res.render('index', {
                title: 'Home',
                layout: 'layout',
                upcomingMatches: upcomingMatches,
                latestResults: latestResults
            });
        });
    });
});

// API for upcoming matches
app.get('/api/upcoming-matches', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const query = `
        SELECT m.*, ht.name as home_team_name, at.name as away_team_name
        FROM matches m
        LEFT JOIN teams ht ON m.home_team_id = ht.id
        LEFT JOIN teams at ON m.away_team_id = at.id
        WHERE m.status = 'scheduled'
        ORDER BY m.match_date, m.match_time
        LIMIT ?
    `;
    
    db.all(query, [limit], (err, matches) => {
        if (err) {
            console.error('Error fetching upcoming matches:', err);
            return res.status(500).json({ error: 'Failed to fetch upcoming matches' });
        }
        res.json(matches);
    });
});

// API for latest results
app.get('/api/latest-results', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const query = `
        SELECT m.*, ht.name as home_team_name, at.name as away_team_name
        FROM matches m
        LEFT JOIN teams ht ON m.home_team_id = ht.id
        LEFT JOIN teams at ON m.away_team_id = at.id
        WHERE m.status = 'completed'
        ORDER BY m.match_date DESC, m.match_time DESC
        LIMIT ?
    `;
    
    db.all(query, [limit], (err, matches) => {
        if (err) {
            console.error('Error fetching latest results:', err);
            return res.status(500).json({ error: 'Failed to fetch latest results' });
        }
        res.json(matches);
    });
});

// API for group standings
app.get('/api/group-standings', (req, res) => {
    const query = `
        SELECT g.name as group_name, g.id as group_id,
               t.id as team_id, t.name as team_name,
               COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                           (m.away_team_id = t.id AND m.away_score > m.home_score) THEN 1 END) as wins,
               COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) as draws,
               COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score < m.away_score) OR 
                           (m.away_team_id = t.id AND m.away_score < m.home_score) THEN 1 END) as losses,
               SUM(CASE 
                   WHEN m.home_team_id = t.id THEN m.home_score 
                   WHEN m.away_team_id = t.id THEN m.away_score 
                   ELSE 0 
               END) as goals_for,
               SUM(CASE 
                   WHEN m.home_team_id = t.id THEN m.away_score 
                   WHEN m.away_team_id = t.id THEN m.home_score 
                   ELSE 0 
               END) as goals_against
        FROM teams t
        JOIN groups g ON t.group_id = g.id
        LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.status = 'completed'
        GROUP BY t.id
        ORDER BY g.id, 
                 (COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                              (m.away_team_id = t.id AND m.away_score > m.home_score) THEN 1 END) * 3) +
                 COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) DESC,
                 (SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score WHEN m.away_team_id = t.id THEN m.away_score ELSE 0 END) -
                 SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score WHEN m.away_team_id = t.id THEN m.home_score ELSE 0 END)) DESC
    `;
    
    db.all(query, [], (err, standings) => {
        if (err) {
            console.error('Error fetching group standings:', err);
            return res.status(500).json({ error: 'Failed to fetch group standings' });
        }
        
        // Group the teams by their group
        const groupedStandings = {};
        standings.forEach(team => {
            if (!groupedStandings[team.group_id]) {
                groupedStandings[team.group_id] = {
                    name: team.group_name,
                    teams: []
                };
            }
            
            groupedStandings[team.group_id].teams.push({
                id: team.team_id,
                name: team.team_name,
                wins: team.wins || 0,
                draws: team.draws || 0,
                losses: team.losses || 0,
                goalsFor: team.goals_for || 0,
                goalsAgainst: team.goals_against || 0,
                points: (team.wins || 0) * 3 + (team.draws || 0),
                goalDifference: (team.goals_for || 0) - (team.goals_against || 0)
            });
        });
        
        res.json(Object.values(groupedStandings));
    });
});

// Groups page
app.get('/groups', (req, res) => {
  db.all(`SELECT g.id, g.name, g.team_count, json_group_array(json_object(
    'id', t.id,
    'name', t.name,
    'team_in_group_id', t.team_in_group_id
  )) as teams
  FROM groups g 
  LEFT JOIN teams t ON g.id = t.group_id 
  GROUP BY g.id 
  ORDER BY g.id`, (err, groups) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    // Parse the JSON string in teams property
    groups.forEach(group => {
      group.teams = JSON.parse(group.teams);
    });
    
    res.render('groups', { groups, layout: 'layout' });
  });
});

// Fixtures page
app.get('/fixtures', (req, res) => {
  const stage = req.query.stage || 'Group Stage';
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    home.group_id as home_team_group_id,
    away.name as away_team_name,
    away.group_id as away_team_group_id,
    homeGroup.name as home_team_group_name,
    awayGroup.name as away_team_group_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    LEFT JOIN groups homeGroup ON home.group_id = homeGroup.id
    LEFT JOIN groups awayGroup ON away.group_id = awayGroup.id
    WHERE m.stage = ?
    ORDER BY m.match_date, m.match_time`, [stage], (err, matches) => {
    if (err) {
      console.error('Error fetching fixtures:', err.message);
      return res.status(500).send('Database error');
    }
    
    res.render('fixtures', { matches, stage, layout: 'layout' });
  });
});

// Match details page
app.get('/match/:id', (req, res) => {
  const matchId = req.params.id;
  
  db.get(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.id = ?`, [matchId], (err, match) => {
    if (err || !match) {
      return res.status(404).send('Match not found');
    }
    
    // Get goals
    db.all(`SELECT g.*, t.name as team_name
      FROM goals g
      JOIN teams t ON g.team_id = t.id
      WHERE g.match_id = ?
      ORDER BY g.minute`, [matchId], (err, goals) => {
      if (err) {
        goals = [];
      }
      
      // Get cards
      db.all(`SELECT c.*, t.name as team_name
        FROM cards c
        JOIN teams t ON c.team_id = t.id
        WHERE c.match_id = ?
        ORDER BY c.minute`, [matchId], (err, cards) => {
        if (err) {
          cards = [];
        }
        
        res.render('match', { match, goals, cards, layout: 'layout' });
      });
    });
  });
});

// Admin routes
app.get('/admin', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { layout: false });
  }
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM admin WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.render('admin/login', { error: 'Invalid username or password' });
    }
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        req.session.admin = username;
        res.redirect('/admin/dashboard');
      } else {
        res.render('admin/login', { error: 'Invalid username or password' });
      }
    });
  });
});

app.get('/admin/dashboard', authenticateAdmin, (req, res) => {
  res.render('admin/dashboard', { 
    title: 'Admin Dashboard',
    layout: 'admin/layout',
    path: '/admin/dashboard',
    stage: null
  });
});

app.get('/admin/teams', authenticateAdmin, (req, res) => {
  db.all(`SELECT t.*, g.name as group_name 
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    ORDER BY g.id, t.team_in_group_id`, (err, teams) => {
    if (err) {
      console.error('Error fetching teams:', err.message);
      return res.status(500).send('Database error');
    }
    
    res.render('admin/teams', { 
      teams, 
      layout: 'admin/layout',
      path: '/admin/teams',
      stage: null
    });
  });
});

app.post('/admin/teams/update', authenticateAdmin, (req, res) => {
  const { id, name } = req.body;
  
  if (!id || !name || name.trim() === '') {
    return res.status(400).send('Team ID and name are required');
  }
  
  db.run('UPDATE teams SET name = ? WHERE id = ?', [name.trim(), id], function(err) {
    if (err) {
      console.error('Error updating team:', err.message);
      return res.status(500).send('Database error');
    }
    
    if (this.changes === 0) {
      return res.status(404).send('Team not found');
    }
    
    res.redirect('/admin/teams');
  });
});

// Add a new team
app.post('/admin/teams/add', authenticateAdmin, (req, res) => {
  const { name, group_id } = req.body;
  
  if (!name || name.trim() === '' || !group_id) {
    return res.status(400).send('Team name and group are required');
  }
  
  // Get the next team_in_group_id for the selected group
  db.get('SELECT MAX(team_in_group_id) as max_id FROM teams WHERE group_id = ?', [group_id], function(err, row) {
    if (err) {
      console.error('Error getting max team_in_group_id:', err.message);
      return res.status(500).send('Database error');
    }
    
    const nextTeamInGroupId = row.max_id ? row.max_id + 1 : 1;
    
    // Insert the new team
    db.run(
      'INSERT INTO teams (name, group_id, team_in_group_id) VALUES (?, ?, ?)',
      [name.trim(), group_id, nextTeamInGroupId],
      function(err) {
        if (err) {
          console.error('Error adding team:', err.message);
          return res.status(500).send('Database error');
        }
        
        console.log(`Team added: ${name.trim()} in group ${group_id} with ID ${this.lastID}`);
        res.redirect('/admin/teams');
      }
    );
  });
});

// Delete a goal
app.post('/admin/match/:matchId/goal/delete', authenticateAdmin, (req, res) => {
  const { matchId } = req.params;
  const { goalId } = req.body;
  
  if (!goalId) {
    return res.status(400).send('Goal ID is required');
  }
  
  db.run('DELETE FROM goals WHERE id = ?', [goalId], function(err) {
    if (err) {
      console.error('Error deleting goal:', err.message);
      return res.status(500).send('Database error');
    }
    
    console.log(`Goal deleted: ID ${goalId}`);
    res.redirect(`/admin/match/${matchId}`);
  });
});

// Delete a card
app.post('/admin/match/:matchId/card/delete', authenticateAdmin, (req, res) => {
  const { matchId } = req.params;
  const { cardId } = req.body;
  
  if (!cardId) {
    return res.status(400).send('Card ID is required');
  }
  
  db.run('DELETE FROM cards WHERE id = ?', [cardId], function(err) {
    if (err) {
      console.error('Error deleting card:', err.message);
      return res.status(500).send('Database error');
    }
    
    console.log(`Card deleted: ID ${cardId}`);
    res.redirect(`/admin/match/${matchId}`);
  });
});

// Delete a team
app.post('/admin/teams/delete', authenticateAdmin, (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).send('Team ID is required');
  }
  
  db.serialize(() => {
    // Start a transaction
    db.run('BEGIN TRANSACTION');
    
    // Update matches where this team is involved
    db.run('UPDATE matches SET home_team_id = NULL WHERE home_team_id = ?', [id]);
    db.run('UPDATE matches SET away_team_id = NULL WHERE away_team_id = ?', [id]);
    
    // Delete goals scored by this team
    db.run('DELETE FROM goals WHERE team_id = ?', [id]);
    
    // Delete cards received by this team
    db.run('DELETE FROM cards WHERE team_id = ?', [id]);
    
    // Delete the team
    db.run('DELETE FROM teams WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting team:', err.message);
        db.run('ROLLBACK');
        return res.status(500).send('Database error');
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).send('Team not found');
      }
      
      // Commit the transaction
      db.run('COMMIT');
      console.log(`Team deleted: ID ${id}`);
      res.redirect('/admin/teams');
    });
  });
});

app.get('/admin/matches', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const stage = req.query.stage || 'Group Stage';
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.stage = ?
    ORDER BY m.match_date, m.match_time`, [stage], (err, matches) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    res.render('admin/matches', { 
      matches, 
      stage,
      layout: 'admin/layout',
      path: '/admin/matches' 
    });
  });
});

app.get('/admin/match/:id', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const matchId = req.params.id;
  
  db.get(`SELECT m.*, 
    home.name as home_team_name, home.id as home_team_id,
    away.name as away_team_name, away.id as away_team_id
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.id = ?`, [matchId], (err, match) => {
    if (err || !match) {
      return res.status(404).send('Match not found');
    }
    
    // Get goals
    db.all(`SELECT g.*, t.name as team_name
      FROM goals g
      JOIN teams t ON g.team_id = t.id
      WHERE g.match_id = ?
      ORDER BY g.minute`, [matchId], (err, goals) => {
      if (err) {
        goals = [];
      }
      
      // Get cards
      db.all(`SELECT c.*, t.name as team_name
        FROM cards c
        JOIN teams t ON c.team_id = t.id
        WHERE c.match_id = ?
        ORDER BY c.minute`, [matchId], (err, cards) => {
        if (err) {
          cards = [];
        }
        
        // Always get all teams for selection
        db.all('SELECT id, name FROM teams ORDER BY name', [], (err, teams) => {
          if (err) {
            teams = [];
          }
          res.render('admin/match', { 
            match, 
            goals, 
            cards, 
            teams,
            layout: 'admin/layout',
            path: '/admin/matches',
            stage: match.stage
          });
        });
      });
    });
  });
});

// Route for the dedicated match image generator
app.get('/admin/match/:id/image', authenticateAdmin, (req, res) => {
  const matchId = req.params.id;
  
  db.get(`SELECT * FROM matches WHERE id = ?`, [matchId], (err, match) => {
    if (err || !match) {
      return res.redirect('/admin/matches');
    }
    
    db.all('SELECT * FROM teams ORDER BY name', [], (err, teams) => {
      if (err) {
        return res.redirect('/admin/matches');
      }
      
      res.render('admin/match-image', { 
        layout: false, // No layout for this page
        match, 
        teams,
        path: req.path
      });
    });
  });
});

app.post('/admin/match/:id/update', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const matchId = req.params.id;
  const { home_score, away_score, match_date, match_time, home_team_id, away_team_id } = req.body;
  const played = home_score !== '' && away_score !== '' ? 1 : 0;
  
  // Handle empty team selections (allowing TBD)
  const homeTeamIdValue = home_team_id === '' ? null : home_team_id;
  const awayTeamIdValue = away_team_id === '' ? null : away_team_id;
  
  // Always update all fields including team IDs (which might be null)
  const query = 'UPDATE matches SET home_team_id = ?, away_team_id = ?, home_score = ?, away_score = ?, match_date = ?, match_time = ?, played = ? WHERE id = ?';
  const params = [homeTeamIdValue, awayTeamIdValue, home_score || null, away_score || null, match_date, match_time, played, matchId];
  
  db.run(query, params, (err) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    res.redirect(`/admin/match/${matchId}`);
  });
});

app.post('/admin/match/:id/add-goal', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const matchId = req.params.id;
  const { team_id, player_name, minute } = req.body;
  
  db.run('INSERT INTO goals (match_id, team_id, player_name, minute) VALUES (?, ?, ?, ?)',
    [matchId, team_id, player_name, minute], (err) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    // Update match score
    db.get('SELECT COUNT(*) as count FROM goals WHERE match_id = ? AND team_id = ?', 
      [matchId, team_id], (err, row) => {
      if (err) {
        return res.redirect(`/admin/match/${matchId}`);
      }
      
      // Get current match data
      db.get('SELECT home_team_id, away_team_id FROM matches WHERE id = ?', [matchId], (err, match) => {
        if (err) {
          return res.redirect(`/admin/match/${matchId}`);
        }
        
        // Update home_score or away_score based on the team
        let scoreField = team_id == match.home_team_id ? 'home_score' : 'away_score';
        
        db.run(`UPDATE matches SET ${scoreField} = ?, played = 1 WHERE id = ?`, 
          [row.count, matchId], (err) => {
          res.redirect(`/admin/match/${matchId}`);
        });
      });
    });
  });
});

app.post('/admin/match/:id/add-card', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const matchId = req.params.id;
  const { team_id, player_name, card_type, minute } = req.body;
  
  db.run('INSERT INTO cards (match_id, team_id, player_name, card_type, minute) VALUES (?, ?, ?, ?, ?)',
    [matchId, team_id, player_name, card_type, minute], (err) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    res.redirect(`/admin/match/${matchId}`);
  });
});

// Delete a goal
app.post('/admin/match/:id/goal/delete', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const matchId = req.params.id;
  const { goalId } = req.body;
  
  if (!goalId) {
    return res.status(400).send('Goal ID is required');
  }
  
  // First get the goal information to update match score
  db.get('SELECT team_id FROM goals WHERE id = ?', [goalId], (err, goal) => {
    if (err || !goal) {
      return res.redirect(`/admin/match/${matchId}`);
    }
    
    // Delete the goal
    db.run('DELETE FROM goals WHERE id = ?', [goalId], function(err) {
      if (err) {
        console.error('Error deleting goal:', err.message);
        return res.status(500).send('Database error');
      }
      
      // Update match score
      db.get('SELECT home_team_id, away_team_id FROM matches WHERE id = ?', [matchId], (err, match) => {
        if (err) {
          return res.redirect(`/admin/match/${matchId}`);
        }
        
        // Determine which team's score to update
        const isHomeTeam = goal.team_id == match.home_team_id;
        const scoreField = isHomeTeam ? 'home_score' : 'away_score';
        
        // Count remaining goals for this team
        db.get('SELECT COUNT(*) as count FROM goals WHERE match_id = ? AND team_id = ?', 
          [matchId, goal.team_id], (err, row) => {
          if (err) {
            return res.redirect(`/admin/match/${matchId}`);
          }
          
          // Update the score
          db.run(`UPDATE matches SET ${scoreField} = ? WHERE id = ?`, 
            [row.count, matchId], (err) => {
            console.log(`Goal deleted: ID ${goalId}`);
            res.redirect(`/admin/match/${matchId}`);
          });
        });
      });
    });
  });
});

// Delete a card
app.post('/admin/match/:id/card/delete', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const matchId = req.params.id;
  const { cardId } = req.body;
  
  if (!cardId) {
    return res.status(400).send('Card ID is required');
  }
  
  db.run('DELETE FROM cards WHERE id = ?', [cardId], function(err) {
    if (err) {
      console.error('Error deleting card:', err.message);
      return res.status(500).send('Database error');
    }
    
    console.log(`Card deleted: ID ${cardId}`);
    res.redirect(`/admin/match/${matchId}`);
  });
});

app.get('/admin/logout', (req, res) => {
  req.session = null;
  res.redirect('/admin');
});

// Function to update Round of 16 matches based on group stage results
// Update Round of 16 matches based on group standings
function updateRoundOf16Matches() {
  console.log('Updating Round of 16 matches based on group standings...');
  
  // Get all group winners
  const winnersQuery = `
    SELECT t.id, t.name, g.name as group_name
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    WHERE t.team_in_group_id = 1
    ORDER BY g.id
  `;
  
  // Get all group runners-up
  const runnersUpQuery = `
    SELECT t.id, t.name, g.name as group_name
    FROM teams t
    JOIN groups g ON t.group_id = g.id
    WHERE t.team_in_group_id = 2
    ORDER BY g.id
  `;
  
  db.all(winnersQuery, [], (err, winners) => {
    if (err) {
      console.error('Error getting group winners:', err.message);
      return;
    }
    
    db.all(runnersUpQuery, [], (err, runnersUp) => {
      if (err) {
        console.error('Error getting group runners-up:', err.message);
        return;
      }
      
      console.log(`Found ${winners.length} group winners and ${runnersUp.length} runners-up`);
      
      // Only proceed if we have all 8 group winners and 8 runners-up
      if (winners.length === 8 && runnersUp.length === 8) {
        // Map winners and runners-up to their respective groups (A-H)
        const groupWinners = {};
        const groupRunnersUp = {};
        
        winners.forEach(team => {
          const groupLetter = team.group_name.slice(-1); // Extract the last character (e.g., "A" from "Group A")
          groupWinners[groupLetter] = team.id;
        });
        
        runnersUp.forEach(team => {
          const groupLetter = team.group_name.slice(-1);
          groupRunnersUp[groupLetter] = team.id;
        });
        
        // Get the Round of 16 matches
        db.all('SELECT * FROM matches WHERE stage = "Round of 16" ORDER BY match_date, match_time', [], (err, matches) => {
          if (err) {
            console.error('Error getting Round of 16 matches:', err.message);
            return;
          }
          
          if (matches.length === 8) {
            // Day 1 matches
            const day1Matches = matches.slice(0, 4);
            // Match 1: A1 vs B2
            updateMatch(day1Matches[0], groupWinners['A'], groupRunnersUp['B']);
            // Match 2: A2 vs B1
            updateMatch(day1Matches[1], groupRunnersUp['A'], groupWinners['B']);
            // Match 3: C1 vs D2
            updateMatch(day1Matches[2], groupWinners['C'], groupRunnersUp['D']);
            // Match 4: C2 vs D1
            updateMatch(day1Matches[3], groupRunnersUp['C'], groupWinners['D']);
            
            // Day 2 matches
            const day2Matches = matches.slice(4, 8);
            // Match 5: E1 vs F2
            updateMatch(day2Matches[0], groupWinners['E'], groupRunnersUp['F']);
            // Match 6: E2 vs F1
            updateMatch(day2Matches[1], groupRunnersUp['E'], groupWinners['F']);
            // Match 7: G1 vs H2
            updateMatch(day2Matches[2], groupWinners['G'], groupRunnersUp['H']);
            // Match 8: G2 vs H1
            updateMatch(day2Matches[3], groupRunnersUp['G'], groupWinners['H']);
            
            console.log('Round of 16 matches updated successfully!');
          } else {
            console.error(`Expected 8 Round of 16 matches, but found ${matches.length}`);
          }
        });
      } else {
        console.log('Not all group stages are complete yet');
      }
    });
  });
  
  // Helper function to update a match with team IDs
  function updateMatch(match, homeTeamId, awayTeamId) {
    db.run(
      'UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?',
      [homeTeamId, awayTeamId, match.id],
      function(err) {
        if (err) {
          console.error(`Error updating match ${match.id}:`, err.message);
        } else {
          console.log(`Updated match ${match.id} with teams ${homeTeamId} vs ${awayTeamId}`);
        }
      }
    );
  }
}

// Function to update quarter-final matches based on Round of 16 results
function updateQuarterFinalMatches() {
  console.log('Updating Quarter Final matches based on Round of 16 results...');
  
  // Get all completed Round of 16 matches
  db.all(`
    SELECT m.id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, 
           home.name as home_team_name, away.name as away_team_name,
           CASE WHEN m.home_score > m.away_score THEN m.home_team_id 
                WHEN m.home_score < m.away_score THEN m.away_team_id 
                ELSE NULL END as winner_id,
           CASE WHEN m.home_score > m.away_score THEN home.name 
                WHEN m.home_score < m.away_score THEN away.name 
                ELSE NULL END as winner_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.stage = 'Round of 16' AND m.played = 1
  `, [], (err, r16Results) => {
    if (err) {
      console.error('Error getting Round of 16 results:', err.message);
      return;
    }
    
    // Get quarter-final matches
    db.all(`SELECT id, home_placeholder, away_placeholder FROM matches WHERE stage = 'Quarter Final' ORDER BY id`, [], (err, qfMatches) => {
      if (err) {
        console.error('Error getting Quarter Final matches:', err.message);
        return;
      }
      
      // Map Round of 16 matches to their corresponding quarter-final matches
      const r16MatchToWinner = {};
      r16Results.forEach(r16Match => {
        if (r16Match.winner_id) {
          r16MatchToWinner[`Winner Match ${r16Match.id}`] = r16Match.winner_id;
        }
      });
      
      // Update quarter-final matches
      qfMatches.forEach(match => {
        const homeTeamId = r16MatchToWinner[match.home_placeholder];
        const awayTeamId = r16MatchToWinner[match.away_placeholder];
        
        if (homeTeamId && awayTeamId) {
          db.run('UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?', 
            [homeTeamId, awayTeamId, match.id], function(err) {
            if (err) {
              console.error(`Error updating Quarter Final match ${match.id}:`, err.message);
            } else {
              console.log(`Updated Quarter Final match ${match.id} with teams ${homeTeamId} vs ${awayTeamId}`);
            }
          });
        }
      });
    });
  });
}

// Function to update semi-final matches based on quarter-final results
function updateSemiFinalMatches() {
  console.log('Updating Semi Final matches based on Quarter Final results...');
  
  // Get all completed quarter-final matches
  db.all(`
    SELECT m.id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, 
           home.name as home_team_name, away.name as away_team_name,
           CASE WHEN m.home_score > m.away_score THEN m.home_team_id 
                WHEN m.home_score < m.away_score THEN m.away_team_id 
                ELSE NULL END as winner_id,
           CASE WHEN m.home_score > m.away_score THEN home.name 
                WHEN m.home_score < m.away_score THEN away.name 
                ELSE NULL END as winner_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.stage = 'Quarter Final' AND m.played = 1
  `, [], (err, qfResults) => {
    if (err) {
      console.error('Error getting Quarter Final results:', err.message);
      return;
    }
    
    // Get semi-final matches
    db.all(`SELECT id, home_placeholder, away_placeholder FROM matches WHERE stage = 'Semi Final' ORDER BY id`, [], (err, sfMatches) => {
      if (err) {
        console.error('Error getting Semi Final matches:', err.message);
        return;
      }
      
      // Map quarter-final matches to their corresponding semi-final matches
      const qfMatchToWinner = {};
      qfResults.forEach(qfMatch => {
        if (qfMatch.winner_id) {
          qfMatchToWinner[`Winner Match ${qfMatch.id}`] = qfMatch.winner_id;
        }
      });
      
      // Update semi-final matches
      sfMatches.forEach(match => {
        const homeTeamId = qfMatchToWinner[match.home_placeholder];
        const awayTeamId = qfMatchToWinner[match.away_placeholder];
        
        if (homeTeamId && awayTeamId) {
          db.run('UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?', 
            [homeTeamId, awayTeamId, match.id], function(err) {
            if (err) {
              console.error(`Error updating Semi Final match ${match.id}:`, err.message);
            } else {
              console.log(`Updated Semi Final match ${match.id} with teams ${homeTeamId} vs ${awayTeamId}`);
            }
          });
        }
      });
    });
  });
}

// Function to update final match based on semi-final results
function updateFinalMatch() {
  console.log('Updating Final match based on Semi Final results...');
  
  // Get all completed semi-final matches
  db.all(`
    SELECT m.id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, 
           home.name as home_team_name, away.name as away_team_name,
           CASE WHEN m.home_score > m.away_score THEN m.home_team_id 
                WHEN m.home_score < m.away_score THEN m.away_team_id 
                ELSE NULL END as winner_id,
           CASE WHEN m.home_score > m.away_score THEN home.name 
                WHEN m.home_score < m.away_score THEN away.name 
                ELSE NULL END as winner_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.stage = 'Semi Final' AND m.played = 1
  `, [], (err, sfResults) => {
    if (err) {
      console.error('Error getting Semi Final results:', err.message);
      return;
    }
    
    // Get final match
    db.all(`SELECT id, home_placeholder, away_placeholder FROM matches WHERE stage = 'Final' ORDER BY id`, [], (err, finalMatches) => {
      if (err) {
        console.error('Error getting Final match:', err.message);
        return;
      }
      
      if (finalMatches.length === 0) {
        console.error('No Final match found');
        return;
      }
      
      // Map semi-final matches to their corresponding final match
      const sfMatchToWinner = {};
      sfResults.forEach(sfMatch => {
        if (sfMatch.winner_id) {
          sfMatchToWinner[`Winner Match ${sfMatch.id}`] = sfMatch.winner_id;
        }
      });
      
      // Update final match
      const finalMatch = finalMatches[0];
      const homeTeamId = sfMatchToWinner[finalMatch.home_placeholder];
      const awayTeamId = sfMatchToWinner[finalMatch.away_placeholder];
      
      if (homeTeamId && awayTeamId) {
        db.run('UPDATE matches SET home_team_id = ?, away_team_id = ? WHERE id = ?', 
          [homeTeamId, awayTeamId, finalMatch.id], function(err) {
          if (err) {
            console.error(`Error updating Final match ${finalMatch.id}:`, err.message);
          } else {
            console.log(`Updated Final match ${finalMatch.id} with teams ${homeTeamId} vs ${awayTeamId}`);
          }
        });
      }
    });
  });
}

// Update all knockout stages
async function updateAllKnockoutStages() {
  console.log('=== Starting Knockout Stage Auto-Update Process ===');
  
  // First make sure we have all group stage data
  db.all(`SELECT COUNT(*) as count FROM matches WHERE stage = 'Group Stage' AND played = 1`, [], (err, rows) => {
    if (err) {
      console.error('Error checking group stage matches:', err.message);
      return;
    }
    
    const playedGroupMatches = rows[0].count;
    console.log(`Found ${playedGroupMatches} completed group stage matches`);
    
    // Get all the knockout matches
    db.all(`SELECT id, stage, home_placeholder, away_placeholder FROM matches WHERE stage != 'Group Stage' ORDER BY stage`, [], (err, knockoutMatches) => {
      if (err) {
        console.error('Error retrieving knockout matches:', err.message);
        return;
      }
      
      console.log(`Retrieved ${knockoutMatches.length} knockout stage matches to update`);
      
      // Get all teams for reference
      db.all(`SELECT id, name, group_id FROM teams ORDER BY id`, [], (err, allTeams) => {
        if (err) {
          console.error('Error retrieving teams:', err.message);
          return;
        }
        
        // Run the updates in sequence with callbacks to ensure proper order
        updateRoundOf16Matches();
        setTimeout(() => {
          console.log('Moving to Quarter Finals update...');
          updateQuarterFinalMatches();
          
          setTimeout(() => {
            console.log('Moving to Semi Finals update...');
            updateSemiFinalMatches();
            
            setTimeout(() => {
              console.log('Moving to Final match update...');
              updateFinalMatch();
              
              setTimeout(() => {
                console.log('=== Knockout Stage Auto-Update Process Complete ===');
              }, 1000);
            }, 2000);
          }, 2000);
        }, 3000);
      });
    });
  });
}

// Endpoint to trigger updating knockout stages
app.get('/admin/update-knockout-stages', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  updateAllKnockoutStages();
  res.redirect('/admin/matches?stage=Round%20of%2016');
});

// API Routes
// Get upcoming matches
app.get('/api/upcoming-matches', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  console.log('API endpoint /api/upcoming-matches hit with limit:', limit);
  
  // Query all matches marked as not played
  db.all(`
    SELECT 
      m.id, m.match_date, m.match_time, m.stage, m.played,
      m.home_team_id, m.away_team_id, m.home_score, m.away_score,
      home.name as home_team_name, 
      away.name as away_team_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 0
    ORDER BY m.match_date ASC, m.match_time ASC
    LIMIT ?
  `, [limit], (err, matches) => {
    if (err) {
      console.error('Error in /api/upcoming-matches:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('Found upcoming matches:', matches.length);
    if (matches.length === 0) {
      // If no future matches, return any unplayed matches as a fallback
      db.all(`
        SELECT 
          m.id, m.match_date, m.match_time, m.stage, m.played,
          m.home_team_id, m.away_team_id, m.home_score, m.away_score,
          home.name as home_team_name, 
          away.name as away_team_name
        FROM matches m
        LEFT JOIN teams home ON m.home_team_id = home.id
        LEFT JOIN teams away ON m.away_team_id = away.id
        WHERE 1=1
        ORDER BY m.match_date ASC, m.match_time ASC
        LIMIT ?
      `, [limit], (err, allMatches) => {
        if (err) {
          console.error('Error in fallback query:', err.message);
          return res.json([]);
        }
        console.log('Fallback matches found:', allMatches.length);
        res.json(allMatches);
      });
    } else {
      res.json(matches);
    }
  });
});

// Get latest results
app.get('/api/latest-results', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  console.log('API endpoint /api/latest-results hit with limit:', limit);
  
  db.all(`
    SELECT 
      m.id, m.match_date, m.match_time, m.stage, m.played,
      m.home_team_id, m.away_team_id, m.home_score, m.away_score,
      home.name as home_team_name, 
      away.name as away_team_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 1
    ORDER BY m.match_date DESC, m.match_time DESC
    LIMIT ?
  `, [limit], (err, matches) => {
    if (err) {
      console.error('Error in /api/latest-results:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('Found latest results:', matches.length);
    if (matches.length === 0) {
      // If no played matches, create a sample result for display purposes
      console.log('No results found, returning sample data');
      const sampleMatches = [{
        id: 9999,
        match_date: '2025-05-20',
        match_time: '15:00',
        stage: 'Group Stage',
        played: 1,
        home_team_id: 1,
        away_team_id: 2,
        home_score: 2,
        away_score: 1,
        home_team_name: 'Sample Team A',
        away_team_name: 'Sample Team B'
      }];
      res.json(sampleMatches);
    } else {
      res.json(matches);
    }
  });
});

// Get group standings
// API endpoint for admin stats
app.get('/api/admin/stats', (req, res) => {
  console.log('API endpoint /api/admin/stats hit');
  if (!req.session.admin) {
    console.log('Unauthorized access to /api/admin/stats');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get team count
  db.get('SELECT COUNT(*) as teamCount FROM teams', [], (err, teamResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get match count
    db.get('SELECT COUNT(*) as matchCount FROM matches', [], (err, matchResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get completed match count
      db.get('SELECT COUNT(*) as completedCount FROM matches WHERE played = 1', [], (err, completedResult) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get upcoming match count
        db.get('SELECT COUNT(*) as upcomingCount FROM matches WHERE played = 0', [], (err, upcomingResult) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            teamCount: teamResult.teamCount,
            matchCount: matchResult.matchCount,
            completedCount: completedResult.completedCount,
            upcomingCount: upcomingResult.upcomingCount
          });
        });
      });
    });
  });
});

// API endpoint for admin recent matches
app.get('/api/admin/recent-matches', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const limit = req.query.limit || 5;
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name 
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 1
    ORDER BY m.match_date DESC, m.match_time DESC
    LIMIT ?`, [limit], (err, matches) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(matches);
  });
});

// API endpoint for admin upcoming matches
app.get('/api/admin/upcoming-matches', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const limit = req.query.limit || 5;
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name 
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 0
    ORDER BY m.match_date ASC, m.match_time ASC
    LIMIT ?`, [limit], (err, matches) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(matches);
  });
});

// API endpoint for teams
app.get('/api/teams', (req, res) => {
  let query = `SELECT t.*, g.name as group_name 
    FROM teams t
    JOIN groups g ON t.group_id = g.id`;
  
  const params = [];
  
  // If groupId is provided, filter by group
  if (req.query.groupId) {
    query += ` WHERE g.id = ?`;
    params.push(req.query.groupId);
  }
  
  query += ` ORDER BY g.id, t.team_in_group_id`;
  
  db.all(query, params, (err, teams) => {
    if (err) {
      console.error('Error fetching teams:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(teams);
  });
});

// API endpoint for upcoming matches
app.get('/api/upcoming-matches', (req, res) => {
  const limit = req.query.limit || 5;
  console.log('Fetching upcoming matches with limit:', limit);
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name 
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 0
    ORDER BY m.match_date ASC, m.match_time ASC
    LIMIT ?`, [limit], (err, matches) => {
    if (err) {
      console.error('Error fetching upcoming matches:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('Upcoming matches found:', matches.length);
    if (matches.length > 0) {
      console.log('First match sample:', JSON.stringify(matches[0]));
    }
    
    res.json(matches);
  });
});

// API endpoint for admin upcoming matches
app.get('/api/admin/upcoming-matches', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const limit = req.query.limit || 5;
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name 
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 0
    ORDER BY m.match_date ASC, m.match_time ASC
    LIMIT ?`, [limit], (err, matches) => {
    if (err) {
      console.error('Error fetching admin upcoming matches:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(matches);
  });
});

// API endpoint for latest results
app.get('/api/latest-results', (req, res) => {
  const limit = req.query.limit || 5;
  console.log('Fetching latest results with limit:', limit);
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name 
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 1
    ORDER BY m.match_date DESC, m.match_time DESC
    LIMIT ?`, [limit], (err, matches) => {
    if (err) {
      console.error('Error fetching latest results:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('Latest results found:', matches.length);
    if (matches.length > 0) {
      console.log('First result sample:', JSON.stringify(matches[0]));
    }
    
    res.json(matches);
  });
});

// API endpoint for admin recent matches
app.get('/api/admin/recent-matches', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const limit = req.query.limit || 5;
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name 
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 1
    ORDER BY m.match_date DESC, m.match_time DESC
    LIMIT ?`, [limit], (err, matches) => {
    if (err) {
      console.error('Error fetching admin recent matches:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(matches);
  });
});

app.get('/api/group-standings', (req, res) => {
  // First get all groups
  db.all('SELECT * FROM groups ORDER BY id', [], (err, groups) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const result = [];
    let completedGroups = 0;
    
    groups.forEach(group => {
      // Get all teams in this group
      db.all('SELECT * FROM teams WHERE group_id = ? ORDER BY team_in_group_id', [group.id], (err, teams) => {
        if (err) {
          console.error('Error getting teams for group standings', err.message);
          completedGroups++;
          if (completedGroups === groups.length) {
            res.json(result);
          }
          return;
        }
        
        // Calculate standings for each team
        const groupStandings = {
          id: group.id,
          name: group.name,
          team_count: group.team_count,
          standings: []
        };
        
        let completedTeams = 0;
        
        if (teams.length === 0) {
          result.push(groupStandings);
          completedGroups++;
          if (completedGroups === groups.length) {
            res.json(result);
          }
          return;
        }
        
        teams.forEach(team => {
          // Get all matches for this team in group stage
          db.all(`SELECT * FROM matches 
            WHERE (home_team_id = ? OR away_team_id = ?) 
            AND stage = 'Group Stage' 
            AND played = 1`, [team.id, team.id], (err, matches) => {
            if (err) {
              console.error('Error getting matches for team standings', err.message);
              completedTeams++;
              if (completedTeams === teams.length) {
                // Sort standings by points, goal difference, goals for
                groupStandings.standings.sort((a, b) => {
                  if (a.points !== b.points) return b.points - a.points;
                  if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference;
                  return b.goals_for - a.goals_for;
                });
                
                result.push(groupStandings);
                completedGroups++;
                if (completedGroups === groups.length) {
                  // Sort results by group id
                  result.sort((a, b) => a.id - b.id);
                  res.json(result);
                }
              }
              return;
            }
            
            // Calculate team statistics
            let played = 0;
            let won = 0;
            let drawn = 0;
            let lost = 0;
            let goals_for = 0;
            let goals_against = 0;
            
            matches.forEach(match => {
              played++;
              
              if (match.home_team_id === team.id) {
                goals_for += match.home_score;
                goals_against += match.away_score;
                
                if (match.home_score > match.away_score) {
                  won++;
                } else if (match.home_score === match.away_score) {
                  drawn++;
                } else {
                  lost++;
                }
              } else {
                goals_for += match.away_score;
                goals_against += match.home_score;
                
                if (match.away_score > match.home_score) {
                  won++;
                } else if (match.away_score === match.home_score) {
                  drawn++;
                } else {
                  lost++;
                }
              }
            });
            
            const points = won * 3 + drawn;
            const goal_difference = goals_for - goals_against;
            
            groupStandings.standings.push({
              id: team.id,
              name: team.name,
              played,
              won,
              drawn,
              lost,
              goals_for,
              goals_against,
              goal_difference,
              points
            });
            
            completedTeams++;
            if (completedTeams === teams.length) {
              // Sort standings by points, goal difference, goals for
              groupStandings.standings.sort((a, b) => {
                if (a.points !== b.points) return b.points - a.points;
                if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference;
                return b.goals_for - a.goals_for;
              });
              
              result.push(groupStandings);
              completedGroups++;
              if (completedGroups === groups.length) {
                // Sort results by group id
                result.sort((a, b) => a.id - b.id);
                res.json(result);
              }
            }
          });
        });
      });
    });
  });
});

// Admin API Routes
// Get dashboard stats
app.get('/api/admin/stats', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get team count
  db.get('SELECT COUNT(*) as count FROM teams', (err, teamResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get match count
    db.get('SELECT COUNT(*) as count FROM matches', (err, matchResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get completed match count
      db.get('SELECT COUNT(*) as count FROM matches WHERE played = 1', (err, completedResult) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get upcoming match count
        db.get('SELECT COUNT(*) as count FROM matches WHERE played = 0', (err, upcomingResult) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            teamCount: teamResult.count,
            matchCount: matchResult.count,
            completedCount: completedResult.count,
            upcomingCount: upcomingResult.count
          });
        });
      });
    });
  });
});

// Get recent matches for admin dashboard
app.get('/api/admin/recent-matches', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.played = 1
    ORDER BY m.match_date DESC, m.match_time DESC
    LIMIT 5`, (err, matches) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(matches);
  });
});

// Get upcoming matches for admin dashboard
app.get('/api/admin/upcoming-matches', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  db.all(`SELECT m.*, 
    home.name as home_team_name, 
    away.name as away_team_name
    FROM matches m
    LEFT JOIN teams home ON m.home_team_id = home.id
    LEFT JOIN teams away ON m.away_team_id = away.id
    WHERE m.match_date >= ? AND m.played = 0
    ORDER BY m.match_date, m.match_time
    LIMIT 5`, [today], (err, matches) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(matches);
  });
});

// Start the server

// Schedule automatic database backups (every 24 hours)
let lastBackupTime = 0;
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function scheduleBackups() {
  const now = Date.now();
  if (now - lastBackupTime >= BACKUP_INTERVAL) {
    console.log('Creating scheduled database backup...');
    createBackup();
    lastBackupTime = now;
  }
  
  // Schedule next check in 1 hour
  setTimeout(scheduleBackups, 60 * 60 * 1000);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Create initial backup when server starts
  createBackup();
  
  // Start backup scheduling
  scheduleBackups();
});
