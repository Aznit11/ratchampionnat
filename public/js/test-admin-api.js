// Test script for admin API endpoints
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.createElement('div');
    resultDiv.style.position = 'fixed';
    resultDiv.style.top = '10px';
    resultDiv.style.right = '10px';
    resultDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    resultDiv.style.color = 'white';
    resultDiv.style.padding = '10px';
    resultDiv.style.borderRadius = '5px';
    resultDiv.style.maxWidth = '400px';
    resultDiv.style.maxHeight = '80%';
    resultDiv.style.overflow = 'auto';
    resultDiv.style.zIndex = '9999';
    document.body.appendChild(resultDiv);

    function log(message) {
        const p = document.createElement('p');
        p.textContent = message;
        resultDiv.appendChild(p);
        console.log(message);
    }

    async function testAPI() {
        log('Testing admin API endpoints...');
        
        try {
            // Test stats endpoint
            log('Testing /api/admin/stats endpoint...');
            const statsResponse = await fetch('/api/admin/stats');
            log(`Status: ${statsResponse.status}`);
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                log(`Stats data: ${JSON.stringify(statsData)}`);
            } else {
                log(`Error response: ${await statsResponse.text()}`);
            }
            
            // Test recent matches endpoint
            log('Testing /api/admin/recent-matches endpoint...');
            const recentResponse = await fetch('/api/admin/recent-matches');
            log(`Status: ${recentResponse.status}`);
            
            if (recentResponse.ok) {
                const recentData = await recentResponse.json();
                log(`Recent matches count: ${recentData.length}`);
            } else {
                log(`Error response: ${await recentResponse.text()}`);
            }
            
            // Test upcoming matches endpoint
            log('Testing /api/admin/upcoming-matches endpoint...');
            const upcomingResponse = await fetch('/api/admin/upcoming-matches');
            log(`Status: ${upcomingResponse.status}`);
            
            if (upcomingResponse.ok) {
                const upcomingData = await upcomingResponse.json();
                log(`Upcoming matches count: ${upcomingData.length}`);
            } else {
                log(`Error response: ${await upcomingResponse.text()}`);
            }
            
            // Test teams endpoint
            log('Testing /api/teams endpoint...');
            const teamsResponse = await fetch('/api/teams');
            log(`Status: ${teamsResponse.status}`);
            
            if (teamsResponse.ok) {
                const teamsData = await teamsResponse.json();
                log(`Teams count: ${teamsData.length}`);
            } else {
                log(`Error response: ${await teamsResponse.text()}`);
            }
            
        } catch (error) {
            log(`Error during API testing: ${error.message}`);
        }
    }

    // Add test button
    const button = document.createElement('button');
    button.textContent = 'Test Admin APIs';
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.addEventListener('click', testAPI);
    document.body.appendChild(button);
    
    log('Test script loaded. Click the button to test admin APIs.');
});
