// Script to find all routes in server.js
const fs = require('fs');
const path = require('path');

// Open server.js file
const serverPath = path.join(__dirname, 'server.js');

fs.readFile(serverPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading server.js:', err.message);
    return;
  }
  
  console.log('Searching for all routes in server.js...\n');
  
  // Using regex to find all app.get, app.post, etc. routes
  const routeRegex = /app\.(get|post|put|delete)\(['"]([^'"]+)['"]/g;
  let match;
  const routes = [];
  
  while ((match = routeRegex.exec(data)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  
  console.log('All routes found:');
  routes.sort((a, b) => a.path.localeCompare(b.path)).forEach(route => {
    console.log(`${route.method.padEnd(6)} ${route.path}`);
  });
  
  // Look for the fixtures route specifically
  console.log('\nSearching for fixtures-related code...');
  
  // Find any mentions of 'fixtures' or 'round of 16'
  const fixturesRegex = /(fixtures|Round of 16|round of 16)/g;
  let fixturesMatches = [];
  let lineNumber = 1;
  const lines = data.split('\n');
  
  lines.forEach((line, i) => {
    if (line.match(fixturesRegex)) {
      fixturesMatches.push({
        line: i + 1,
        content: line.trim()
      });
    }
  });
  
  console.log(`\nFound ${fixturesMatches.length} lines related to fixtures or Round of 16:`);
  fixturesMatches.forEach(match => {
    console.log(`Line ${match.line}: ${match.content}`);
  });
  
  // Search for lines that might be rendering the fixtures page
  const renderRegex = /res\.render\(['"]fixtures['"]/g;
  let renderMatches = [];
  
  lines.forEach((line, i) => {
    if (line.match(renderRegex)) {
      // Try to capture the surrounding function
      let start = i;
      let end = i;
      let bracketCount = 0;
      let foundStart = false;
      
      // Look backwards to find function start
      for (let j = i; j >= 0; j--) {
        if (lines[j].includes('function') || lines[j].includes('=>') || lines[j].includes('app.get')) {
          start = j;
          foundStart = true;
          break;
        }
      }
      
      // If we found a starting point, try to find the end of the function
      if (foundStart) {
        for (let j = i; j < lines.length; j++) {
          const line = lines[j];
          bracketCount += (line.match(/{/g) || []).length;
          bracketCount -= (line.match(/}/g) || []).length;
          
          if (bracketCount <= 0 && j > i) {
            end = j;
            break;
          }
        }
        
        renderMatches.push({
          start,
          end,
          lines: lines.slice(start, end + 1)
        });
      }
    }
  });
  
  console.log('\nFound route handlers that render the fixtures page:');
  renderMatches.forEach((match, i) => {
    console.log(`\nHandler ${i+1} (Lines ${match.start+1}-${match.end+1}):`);
    match.lines.forEach((line, j) => {
      console.log(`${match.start+j+1}: ${line}`);
    });
  });
});
