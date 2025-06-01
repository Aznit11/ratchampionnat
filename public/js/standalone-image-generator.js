/**
 * Standalone Match Image Generator
 * No dependencies, simplified functionality
 */

// Simple initialization - will run immediately when loaded
console.log('Standalone image generator loaded');

// Immediately attach event handlers when the script loads
(function() {
    console.log('Immediately executing setup function');
    
    // Find all buttons with specific IDs or classes
    const buttons = [
        document.getElementById('generate-match-image'),
        document.getElementById('generate-match-image-inline'),
        ...Array.from(document.querySelectorAll('.download-match-image'))
    ].filter(button => button !== null);
    
    console.log('Found buttons:', buttons.length);
    
    // Attach click handler to each button
    buttons.forEach((button, index) => {
        console.log('Setting up button', index);
        button.onclick = function(e) {
            console.log('Button clicked:', index);
            e.preventDefault();
            createSimpleMatchCard();
            return false;
        };
    });
    
    // Also set up a global click handler as a fallback
    document.addEventListener('click', function(e) {
        if (e.target.id === 'generate-match-image' || 
            e.target.id === 'generate-match-image-inline' ||
            e.target.classList.contains('download-match-image') ||
            e.target.closest('.download-match-image')) {
            
            console.log('Button clicked via global click handler');
            e.preventDefault();
            createSimpleMatchCard();
            return false;
        }
    });
})();

// Also set up on DOMContentLoaded for safety
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - setting up again');
    
    // Find all buttons with specific IDs or classes
    const buttons = [
        document.getElementById('generate-match-image'),
        document.getElementById('generate-match-image-inline'),
        ...Array.from(document.querySelectorAll('.download-match-image'))
    ].filter(button => button !== null);
    
    console.log('Found buttons after DOM load:', buttons.length);
    
    // Attach click handler to each button
    buttons.forEach((button, index) => {
        console.log('Setting up button after DOM load', index);
        button.onclick = function(e) {
            console.log('Button clicked (DOM loaded):', index);
            e.preventDefault();
            createSimpleMatchCard();
            return false;
        };
    });
});

// Super simple match card creation
function createSimpleMatchCard() {
    console.log('Creating simple match card');
    
    // Create the elements
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.flexDirection = 'column';
    
    // Create a simple card
    const card = document.createElement('div');
    card.style.width = '90%';
    card.style.maxWidth = '600px';
    card.style.backgroundColor = '#fff';
    card.style.borderRadius = '8px';
    card.style.padding = '20px';
    card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    card.style.textAlign = 'center';
    
    // Try to get match data
    let homeTeam = 'Home Team';
    let awayTeam = 'Away Team';
    let homeScore = '0';
    let awayScore = '0';
    let stage = 'Match';
    
    try {
        // Try to get data from various possible sources
        homeTeam = document.getElementById('home-team-name')?.textContent || 
                  document.querySelector('[name="home_team"]')?.value || 
                  'Home Team';
                  
        awayTeam = document.getElementById('away-team-name')?.textContent || 
                  document.querySelector('[name="away_team"]')?.value || 
                  'Away Team';
                  
        homeScore = document.getElementById('home-score')?.value || 
                   document.getElementById('home-score-display')?.textContent || 
                   '0';
                   
        awayScore = document.getElementById('away-score')?.value || 
                   document.getElementById('away-score-display')?.textContent || 
                   '0';
                   
        stage = document.getElementById('match-stage')?.textContent || 
               document.querySelector('[name="stage"]')?.value || 
               'Match';
    } catch (e) {
        console.error('Error getting match data:', e);
    }
    
    // Add content to card
    card.innerHTML = `
        <h2 style="margin-top: 0; color: #333;">Match Result</h2>
        <div style="display: flex; justify-content: space-between; margin: 20px 0;">
            <div style="flex: 1; text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">${homeTeam}</div>
                <div style="font-size: 36px; margin: 10px 0;">${homeScore}</div>
            </div>
            <div style="font-size: 24px; margin: 0 20px; line-height: 80px;">vs</div>
            <div style="flex: 1; text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">${awayTeam}</div>
                <div style="font-size: 36px; margin: 10px 0;">${awayScore}</div>
            </div>
        </div>
        <div style="margin-top: 20px; color: #666;">${stage}</div>
    `;
    
    // Add a close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.marginTop = '20px';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = function() {
        document.body.removeChild(overlay);
    };
    
    // Add a download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download Image';
    downloadButton.style.backgroundColor = '#4CAF50';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.padding = '10px 20px';
    downloadButton.style.marginTop = '10px';
    downloadButton.style.borderRadius = '4px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.onclick = function() {
        // Create a simple canvas with the match data
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 630;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#1a2a6c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Match Result', canvas.width / 2, 100);
        
        // Teams
        ctx.font = 'bold 36px Arial';
        ctx.fillText(homeTeam, canvas.width / 3, 200);
        ctx.fillText(awayTeam, (canvas.width / 3) * 2, 200);
        
        // Score
        ctx.font = 'bold 72px Arial';
        ctx.fillText(homeScore + ' - ' + awayScore, canvas.width / 2, 300);
        
        // Stage
        ctx.font = '32px Arial';
        ctx.fillText(stage, canvas.width / 2, 400);
        
        // Convert to data URL and download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'match-result.png';
        link.href = dataUrl;
        link.click();
    };
    
    // Add elements to the page
    overlay.appendChild(card);
    overlay.appendChild(downloadButton);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
}

// Try to set up after a delay as well, in case of slow loading
setTimeout(function() {
    console.log('Delayed setup running');
    
    // Find all buttons with specific IDs or classes
    const buttons = [
        document.getElementById('generate-match-image'),
        document.getElementById('generate-match-image-inline'),
        ...Array.from(document.querySelectorAll('.download-match-image'))
    ].filter(button => button !== null);
    
    console.log('Found buttons after delay:', buttons.length);
    
    // Create a completely standalone button if none exist
    if (buttons.length === 0) {
        console.log('No buttons found, creating one');
        
        // Find a good container to add our button to
        const containers = [
            document.querySelector('.back-button'),
            document.querySelector('.admin-section'),
            document.querySelector('form'),
            document.body
        ].filter(container => container !== null);
        
        if (containers.length > 0) {
            const container = containers[0];
            console.log('Adding button to container:', container.tagName);
            
            const button = document.createElement('button');
            button.id = 'standalone-generate-button';
            button.textContent = 'Generate Match Image (Standalone)';
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.padding = '10px 20px';
            button.style.margin = '20px 0';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.onclick = function(e) {
                console.log('Standalone button clicked');
                e.preventDefault();
                createSimpleMatchCard();
                return false;
            };
            
            container.appendChild(button);
        }
    } else {
        // Attach click handler to each button again
        buttons.forEach((button, index) => {
            console.log('Setting up button after delay', index);
            button.onclick = function(e) {
                console.log('Button clicked (delayed setup):', index);
                e.preventDefault();
                createSimpleMatchCard();
                return false;
            };
        });
    }
}, 2000);
