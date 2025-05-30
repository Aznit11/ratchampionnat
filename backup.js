const fs = require('fs');
const path = require('path');

// Configuration
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'football-league.sqlite');
const backupDir = path.join(dataDir, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  console.log('Creating backup directory');
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create backup with timestamp
function createBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `football-league-${timestamp}.sqlite`);
  
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    console.log('Database file not found, cannot create backup');
    return;
  }
  
  try {
    // Copy the database file to the backup location
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup created at ${backupPath}`);
    
    // Clean up old backups (keep only the 5 most recent)
    cleanupOldBackups();
  } catch (error) {
    console.error('Error creating backup:', error);
  }
}

// Clean up old backups to save space
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by time (newest first)
    
    // Keep only the 5 most recent backups
    if (files.length > 5) {
      const filesToDelete = files.slice(5);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Deleted old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

// Create a backup when script is run directly
if (require.main === module) {
  createBackup();
}

module.exports = { createBackup };
