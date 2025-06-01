// Script to find the fixtures route in server.js
const fs = require('fs');
const path = require('path');

// Read the server.js file
const serverPath = path.join(__dirname, 'server.js');

fs.readFile(serverPath, 'utf8', (err, data) => {
  if (err) {
    console.error("Error reading server.js:", err.message);
    return;
  }
  
  console.log("Searching for fixtures route in server.js...");
  
  // Split the file into lines for easier examination
  const lines = data.split('\n');
  
  // Look for route patterns including app.get, router.get, etc.
  const routePatterns = [
    {pattern: /app\.(get|post)\s*\(\s*['"]([^'"]+)['"]/g, name: 'Express routes'},
    {pattern: /router\.(get|post)\s*\(\s*['"]([^'"]+)['"]/g, name: 'Router routes'},
    {pattern: /res\.render\(\s*['"](fixtures|Fixtures)['"]/g, name: 'Render fixtures calls'}
  ];
  
  // Search for each pattern
  routePatterns.forEach(({pattern, name}) => {
    console.log(`\nSearching for ${name}:`);
    
    let match;
    let found = false;
    const resetPattern = new RegExp(pattern);
    pattern = resetPattern;
    
    while ((match = pattern.exec(data)) !== null) {
      found = true;
      const lineNumber = findLineNumber(data, match.index);
      console.log(`- Line ${lineNumber}: ${match[0]}`);
      
      // Print surrounding context
      console.log("  Context:");
      const startLine = Math.max(0, lineNumber - 5);
      const endLine = Math.min(lines.length, lineNumber + 15);
      
      for (let i = startLine; i < endLine; i++) {
        console.log(`  ${i+1}: ${lines[i]}`);
      }
      console.log("\n---------------------------------\n");
    }
    
    if (!found) {
      console.log("  No matches found");
    }
  });
  
  // Also check for any mentions of fixtures or specific stages
  console.log("\nSearching for mentions of fixtures or stages:");
  
  const fixturesPattern = /(fixtures|Fixtures|Round of 16|match_date)/g;
  let fixturesMatch;
  let fixturesFound = false;
  
  while ((fixturesMatch = fixturesPattern.exec(data)) !== null) {
    fixturesFound = true;
    const lineNumber = findLineNumber(data, fixturesMatch.index);
    console.log(`- Line ${lineNumber}: ${lines[lineNumber-1]}`);
  }
  
  if (!fixturesFound) {
    console.log("  No direct mentions found");
  }
  
  // Now look specifically for the fixtures EJS template usage
  console.log("\nSearching for uses of the fixtures.ejs template:");
  
  const lines20 = data.split('\n').slice(0, 20);
  console.log(`First 20 lines of server.js for reference:`);
  lines20.forEach((line, i) => {
    console.log(`${i+1}: ${line}`);
  });
  
  // Helper function to find line number from character index
  function findLineNumber(text, index) {
    const lines = text.substring(0, index).split('\n');
    return lines.length;
  }
});
