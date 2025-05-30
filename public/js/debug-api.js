/**
 * Debug script for API endpoints
 */
console.log('Debug API script loaded');

// Test upcoming matches endpoint
async function testUpcomingMatches() {
    try {
        console.log('Testing upcoming matches endpoint...');
        const response = await fetch('/api/upcoming-matches?limit=5');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Response not OK: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Upcoming matches data:', data);
        console.log('Number of upcoming matches:', data.length);
        
        // Check data format
        if (data.length > 0) {
            console.log('Sample match:', data[0]);
            console.log('Team names:', data[0].home_team_name, data[0].away_team_name);
        }
        
        return data;
    } catch (error) {
        console.error('Error testing upcoming matches:', error);
        return null;
    }
}

// Test latest results endpoint
async function testLatestResults() {
    try {
        console.log('Testing latest results endpoint...');
        const response = await fetch('/api/latest-results?limit=5');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Response not OK: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Latest results data:', data);
        console.log('Number of results:', data.length);
        
        // Check data format
        if (data.length > 0) {
            console.log('Sample result:', data[0]);
            console.log('Team names:', data[0].home_team_name, data[0].away_team_name);
        }
        
        return data;
    } catch (error) {
        console.error('Error testing latest results:', error);
        return null;
    }
}

// Run tests when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Running API tests...');
    const upcomingMatches = await testUpcomingMatches();
    const latestResults = await testLatestResults();
    
    // Log results in a visible way
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'fixed';
    debugDiv.style.top = '10px';
    debugDiv.style.right = '10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugDiv.style.color = 'white';
    debugDiv.style.padding = '10px';
    debugDiv.style.borderRadius = '5px';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.maxWidth = '500px';
    debugDiv.style.maxHeight = '80vh';
    debugDiv.style.overflow = 'auto';
    
    debugDiv.innerHTML = `
        <h3>API Debug Results</h3>
        <p>Upcoming Matches: ${upcomingMatches ? upcomingMatches.length : 'Error'}</p>
        <p>Latest Results: ${latestResults ? latestResults.length : 'Error'}</p>
        <button id="close-debug">Close</button>
    `;
    
    document.body.appendChild(debugDiv);
    
    document.getElementById('close-debug').addEventListener('click', () => {
        debugDiv.remove();
    });
});
