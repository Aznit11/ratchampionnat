// Script to find all route handlers in server.js
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

fs.readFile(serverPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading server.js:', err.message);
    return;
  }
  
  // Find all app.get, app.post, etc. routes
  const routeRegex = /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
  let match;
  const routes = [];
  
  while ((match = routeRegex.exec(data)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  
  console.log('Found routes in server.js:');
  routes.forEach(route => {
    console.log(`${route.method} ${route.path}`);
  });
  
  // Look for fixture-related routes
  console.log('\nFixture-related routes:');
  routes.filter(r => 
    r.path.includes('fixture') || 
    r.path.includes('match') || 
    r.path.includes('stage') ||
    r.path === '/'
  ).forEach(route => {
    console.log(`${route.method} ${route.path}`);
  });
  
  // Find the fixtures route handler code
  if (routes.some(r => r.path.includes('fixture'))) {
    console.log('\nSearching for fixtures route handler code...');
    
    const fixtureRouteRegex = /app\.get\(['"]\/fixtures.*?\{([\s\S]*?)\}\);/g;
    const fixtureMatch = fixtureRouteRegex.exec(data);
    
    if (fixtureMatch) {
      console.log('\nFixtures route handler found:');
      console.log(fixtureMatch[1].trim());
    } else {
      console.log('Could not locate fixtures route handler code');
    }
  }
});
