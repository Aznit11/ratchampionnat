const fs = require('fs');
const path = require('path');

// Paths
const oldDbPath = path.join(__dirname, 'database.db');
const dataDir = path.join(__dirname, 'data');
const newDbPath = path.join(dataDir, 'football-league.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// Check if old database exists
if (fs.existsSync(oldDbPath)) {
  console.log(`Found existing database at ${oldDbPath}`);
  
  // Check if new database already exists
  if (fs.existsSync(newDbPath)) {
    console.log(`WARNING: New database already exists at ${newDbPath}`);
    console.log('Backing up existing new database...');
    const backupPath = `${newDbPath}.backup-${Date.now()}`;
    fs.copyFileSync(newDbPath, backupPath);
    console.log(`Backup created at ${backupPath}`);
  }
  
  // Copy old database to new location
  try {
    console.log(`Copying database from ${oldDbPath} to ${newDbPath}...`);
    fs.copyFileSync(oldDbPath, newDbPath);
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error migrating database:', error);
    process.exit(1);
  }
} else {
  console.log(`No existing database found at ${oldDbPath}`);
  console.log('A new database will be created when you start the server.');
}

console.log('Migration script completed.');
