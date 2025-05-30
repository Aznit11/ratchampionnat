/**
 * Direct test script for API endpoints
 */
console.log('Direct test script loaded');

// Function to create a display element for test results
function createTestDisplay() {
    const testDiv = document.createElement('div');
    testDiv.id = 'api-test-results';
    testDiv.style.position = 'fixed';
    testDiv.style.top = '10px';
    testDiv.style.left = '10px';
    testDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    testDiv.style.color = 'white';
    testDiv.style.padding = '15px';
    testDiv.style.borderRadius = '5px';
    testDiv.style.zIndex = '9999';
    testDiv.style.maxWidth = '80%';
    testDiv.style.maxHeight = '80vh';
    testDiv.style.overflow = 'auto';
    document.body.appendChild(testDiv);
    return testDiv;
}

// Function to add a message to the test display
function addMessage(container, message, isError = false) {
    const p = document.createElement('p');
    p.textContent = message;
    if (isError) {
        p.style.color = 'red';
    }
    container.appendChild(p);
    console.log(message);
}

// Function to add a button to the test display
function addButton(container, text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.margin = '5px';
    button.style.padding = '5px 10px';
    button.addEventListener('click', onClick);
    container.appendChild(button);
    return button;
}

// Function to add a separator
function addSeparator(container) {
    const hr = document.createElement('hr');
    hr.style.margin = '10px 0';
    hr.style.border = '1px solid #444';
    container.appendChild(hr);
}

// Function to display match data
function displayMatchData(container, matches, title) {
    const h3 = document.createElement('h3');
    h3.textContent = title;
    h3.style.marginTop = '10px';
    container.appendChild(h3);
    
    if (!matches || matches.length === 0) {
        addMessage(container, 'No matches found');
        return;
    }
    
    addMessage(container, `Found ${matches.length} matches`);
    
    // Display first 3 matches as sample
    const sampleCount = Math.min(3, matches.length);
    for (let i = 0; i < sampleCount; i++) {
        const match = matches[i];
        const matchDiv = document.createElement('div');
        matchDiv.style.padding = '5px';
        matchDiv.style.margin = '5px 0';
        matchDiv.style.backgroundColor = 'rgba(255,255,255,0.1)';
        matchDiv.style.borderRadius = '3px';
        
        // Format match details
        const homeTeam = match.home_team_name || 'TBD';
        const awayTeam = match.away_team_name || 'TBD';
        const matchDate = match.match_date || 'No date';
        const matchTime = match.match_time || 'No time';
        const matchStage = match.stage || 'Unknown stage';
        const matchId = match.id || '?';
        
        // Create match info
        matchDiv.innerHTML = `
            <div><strong>ID:</strong> ${matchId}</div>
            <div><strong>Date:</strong> ${matchDate} ${matchTime}</div>
            <div><strong>Stage:</strong> ${matchStage}</div>
            <div><strong>Teams:</strong> ${homeTeam} vs ${awayTeam}</div>
            <div><strong>Raw match:</strong> ${JSON.stringify(match)}</div>
        `;
        
        container.appendChild(matchDiv);
    }
}

// Function to test upcoming matches API
async function testUpcomingMatches(container) {
    addMessage(container, 'Testing upcoming matches API...');
    
    try {
        const response = await fetch('/api/upcoming-matches?limit=5');
        addMessage(container, `Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        displayMatchData(container, data, 'Upcoming Matches');
        return data;
    } catch (error) {
        addMessage(container, `Error: ${error.message}`, true);
        return null;
    }
}

// Function to test latest results API
async function testLatestResults(container) {
    addMessage(container, 'Testing latest results API...');
    
    try {
        const response = await fetch('/api/latest-results?limit=5');
        addMessage(container, `Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        displayMatchData(container, data, 'Latest Results');
        return data;
    } catch (error) {
        addMessage(container, `Error: ${error.message}`, true);
        return null;
    }
}

// Function to test admin upcoming matches API
async function testAdminUpcomingMatches(container) {
    addMessage(container, 'Testing admin upcoming matches API...');
    
    try {
        const response = await fetch('/api/admin/upcoming-matches?limit=5');
        addMessage(container, `Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        displayMatchData(container, data, 'Admin Upcoming Matches');
        return data;
    } catch (error) {
        addMessage(container, `Error: ${error.message}`, true);
        return null;
    }
}

// Function to test admin recent matches API
async function testAdminRecentMatches(container) {
    addMessage(container, 'Testing admin recent matches API...');
    
    try {
        const response = await fetch('/api/admin/recent-matches?limit=5');
        addMessage(container, `Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        displayMatchData(container, data, 'Admin Recent Matches');
        return data;
    } catch (error) {
        addMessage(container, `Error: ${error.message}`, true);
        return null;
    }
}

// Run the tests when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create a button to start tests
    const startButton = document.createElement('button');
    startButton.textContent = 'Run API Tests';
    startButton.style.position = 'fixed';
    startButton.style.bottom = '20px';
    startButton.style.right = '20px';
    startButton.style.zIndex = '9999';
    startButton.style.padding = '10px 15px';
    startButton.style.backgroundColor = '#007bff';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    
    document.body.appendChild(startButton);
    
    startButton.addEventListener('click', async function() {
        // Remove existing test display if it exists
        const existingDisplay = document.getElementById('api-test-results');
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        // Create test display
        const testDisplay = createTestDisplay();
        
        // Add a close button
        addButton(testDisplay, 'Close', function() {
            testDisplay.remove();
        });
        
        addMessage(testDisplay, 'Starting API tests...');
        
        // Test public endpoints
        await testUpcomingMatches(testDisplay);
        addSeparator(testDisplay);
        await testLatestResults(testDisplay);
        
        // Add separator before admin endpoints
        addSeparator(testDisplay);
        
        // Test admin endpoints
        await testAdminUpcomingMatches(testDisplay);
        addSeparator(testDisplay);
        await testAdminRecentMatches(testDisplay);
        
        // Add a reload button
        addSeparator(testDisplay);
        addButton(testDisplay, 'Run Tests Again', async function() {
            testDisplay.innerHTML = '';
            addMessage(testDisplay, 'Restarting API tests...');
            
            // Add close button again
            addButton(testDisplay, 'Close', function() {
                testDisplay.remove();
            });
            
            // Run tests again
            await testUpcomingMatches(testDisplay);
            addSeparator(testDisplay);
            await testLatestResults(testDisplay);
            
            // Add separator before admin endpoints
            addSeparator(testDisplay);
            
            // Test admin endpoints
            await testAdminUpcomingMatches(testDisplay);
            addSeparator(testDisplay);
            await testAdminRecentMatches(testDisplay);
        });
    });
});
