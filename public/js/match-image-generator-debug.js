/**
 * Match Image Generator with Debugging
 * Creates professional-looking match result images for social media sharing
 */

// Log initialization
console.log('Loading match image generator debug script...');

// Function to check all the necessary elements and log their status
function debugMatchImageGenerator() {
    console.log('Debugging match image generator...');
    
    // Check for the button
    const generateBtn = document.getElementById('generate-match-image');
    console.log('Generate button found:', !!generateBtn);
    
    // Check for hidden data elements
    const homeTeamName = document.getElementById('home-team-name');
    const awayTeamName = document.getElementById('away-team-name');
    const matchStage = document.getElementById('match-stage');
    const homeScore = document.getElementById('home-score');
    const awayScore = document.getElementById('away-score');
    const matchDate = document.getElementById('match-date');
    const matchTime = document.getElementById('match-time');
    
    console.log('Required elements found:', {
        homeTeamName: !!homeTeamName,
        awayTeamName: !!awayTeamName,
        matchStage: !!matchStage,
        homeScore: !!homeScore,
        awayScore: !!awayScore,
        matchDate: !!matchDate,
        matchTime: !!matchTime
    });
    
    // Log element values if they exist
    if (homeTeamName) console.log('Home team:', homeTeamName.textContent || homeTeamName.value);
    if (awayTeamName) console.log('Away team:', awayTeamName.textContent || awayTeamName.value);
    if (matchStage) console.log('Stage:', matchStage.textContent || matchStage.value);
    if (homeScore) console.log('Home score:', homeScore.value);
    if (awayScore) console.log('Away score:', awayScore.value);
    if (matchDate) console.log('Match date:', matchDate.value);
    if (matchTime) console.log('Match time:', matchTime.value);
    
    // Add event listener with explicit console logging
    if (generateBtn) {
        console.log('Adding click event listener to generate button...');
        generateBtn.addEventListener('click', function(e) {
            console.log('Generate button clicked!');
            e.preventDefault();
            
            // Call the simplified image generator
            generateSimpleMatchImage();
        });
    }
}

// Simplified version to test basic functionality
function generateSimpleMatchImage() {
    console.log('Generating simple match image...');
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set dimensions
    canvas.width = 1200;
    canvas.height = 630;
    
    // Fill background
    ctx.fillStyle = '#1a2a6c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some text
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Match Result', canvas.width / 2, 100);
    
    // Try to get team names and scores
    const homeTeamName = document.getElementById('home-team-name')?.textContent || 'Home Team';
    const awayTeamName = document.getElementById('away-team-name')?.textContent || 'Away Team';
    const homeScore = document.getElementById('home-score')?.value || '0';
    const awayScore = document.getElementById('away-score')?.value || '0';
    
    // Draw teams and score
    ctx.font = 'bold 36px Arial';
    ctx.fillText(homeTeamName, canvas.width / 3, 200);
    ctx.fillText(awayTeamName, (canvas.width / 3) * 2, 200);
    
    ctx.font = 'bold 60px Arial';
    ctx.fillText(homeScore + ' - ' + awayScore, canvas.width / 2, 300);
    
    // Show the image in a simple way
    showSimpleImagePreview(canvas);
}

// Very simple preview function
function showSimpleImagePreview(canvas) {
    console.log('Showing simple image preview...');
    
    // Check if preview container already exists
    let previewContainer = document.getElementById('simple-preview-container');
    
    if (!previewContainer) {
        // Create a container for the preview
        previewContainer = document.createElement('div');
        previewContainer.id = 'simple-preview-container';
        previewContainer.style.position = 'fixed';
        previewContainer.style.top = '0';
        previewContainer.style.left = '0';
        previewContainer.style.width = '100%';
        previewContainer.style.height = '100%';
        previewContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
        previewContainer.style.zIndex = '1000';
        previewContainer.style.display = 'flex';
        previewContainer.style.flexDirection = 'column';
        previewContainer.style.alignItems = 'center';
        previewContainer.style.justifyContent = 'center';
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '20px';
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.backgroundColor = '#4CAF50';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function() {
            document.body.removeChild(previewContainer);
        };
        
        // Create download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download Image';
        downloadBtn.style.marginTop = '10px';
        downloadBtn.style.padding = '10px 20px';
        downloadBtn.style.backgroundColor = '#2196F3';
        downloadBtn.style.color = 'white';
        downloadBtn.style.border = 'none';
        downloadBtn.style.borderRadius = '4px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.onclick = function() {
            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'match-result.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // Add elements to container
        previewContainer.appendChild(canvas);
        previewContainer.appendChild(downloadBtn);
        previewContainer.appendChild(closeBtn);
        
        // Add to document
        document.body.appendChild(previewContainer);
    } else {
        // Clear and reuse existing container
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'flex';
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '20px';
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.backgroundColor = '#4CAF50';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function() {
            previewContainer.style.display = 'none';
        };
        
        // Create download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download Image';
        downloadBtn.style.marginTop = '10px';
        downloadBtn.style.padding = '10px 20px';
        downloadBtn.style.backgroundColor = '#2196F3';
        downloadBtn.style.color = 'white';
        downloadBtn.style.border = 'none';
        downloadBtn.style.borderRadius = '4px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.onclick = function() {
            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'match-result.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // Add elements to container
        previewContainer.appendChild(canvas);
        previewContainer.appendChild(downloadBtn);
        previewContainer.appendChild(closeBtn);
    }
}

// Run debug on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, running debug...');
    debugMatchImageGenerator();
    
    // Additional safety - try again after a short delay
    setTimeout(function() {
        console.log('Running delayed debug check...');
        debugMatchImageGenerator();
        
        // Try to attach click handler to both buttons directly
        const mainButton = document.getElementById('generate-match-image');
        const inlineButton = document.getElementById('generate-match-image-inline');
        
        if (mainButton) {
            console.log('Attaching click handler directly to main button');
            mainButton.onclick = function(e) {
                console.log('Main button clicked (direct onclick)');
                e.preventDefault();
                generateSimpleMatchImage();
            };
        }
        
        if (inlineButton) {
            console.log('Attaching click handler directly to inline button');
            inlineButton.onclick = function(e) {
                console.log('Inline button clicked (direct onclick)');
                e.preventDefault();
                generateSimpleMatchImage();
            };
        }
    }, 1000);
});

// Add click handlers using jQuery if available (as a fallback)
if (typeof jQuery !== 'undefined') {
    console.log('jQuery detected, adding jQuery click handlers as fallback');
    jQuery(document).ready(function($) {
        $('#generate-match-image, #generate-match-image-inline').on('click', function(e) {
            console.log('Button clicked via jQuery');
            e.preventDefault();
            generateSimpleMatchImage();
        });
    });
}
