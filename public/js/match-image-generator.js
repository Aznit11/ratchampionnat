/**
 * Match Image Generator
 * Creates professional-looking match result images for social media sharing
 */

// Create and download a match result image
function generateMatchImage(matchData) {
    console.log('Generating match image with data:', matchData);
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions (optimal for social media sharing)
    canvas.width = 1200;
    canvas.height = 630;
    
    // Match data from parameters
    const {
        homeTeamName, 
        awayTeamName, 
        homeScore, 
        awayScore, 
        matchDate, 
        matchTime, 
        stage,
        homeTeamLogo,
        awayTeamLogo,
        tournamentLogo
    } = matchData;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a2a6c');
    gradient.addColorStop(0.5, '#2d4373');
    gradient.addColorStop(1, '#1a2a6c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add background pattern
    drawBackgroundPattern(ctx, canvas.width, canvas.height);
    
    // Draw tournament logo if available
    if (tournamentLogo) {
        drawImage(ctx, tournamentLogo, canvas.width / 2, 80, 200, 80, () => {
            // Continue with rest of the drawing after logo loads
            drawMatchContent();
        });
    } else {
        // No logo, draw tournament name text
        drawMatchContent();
    }
    
    function drawMatchContent() {
        // Draw stage name
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(stage.toUpperCase(), canvas.width / 2, 180);
        
        // Draw date and time
        ctx.font = '24px Arial';
        ctx.fillText(formatDate(matchDate) + ' | ' + matchTime, canvas.width / 2, 220);
        
        // Draw dividing line
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.1, 250);
        ctx.lineTo(canvas.width * 0.9, 250);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Center vertical position
        const centerY = 350;
        
        // Draw team logos
        const logoSize = 150;
        const logoY = centerY - 40;
        
        // Left team (home)
        if (homeTeamLogo) {
            drawImage(ctx, homeTeamLogo, canvas.width * 0.25, logoY, logoSize, logoSize);
        }
        
        // Right team (away)
        if (awayTeamLogo) {
            drawImage(ctx, awayTeamLogo, canvas.width * 0.75, logoY, logoSize, logoSize);
        }
        
        // Draw team names
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(homeTeamName, canvas.width * 0.25, centerY + 130);
        ctx.fillText(awayTeamName, canvas.width * 0.75, centerY + 130);
        
        // Draw score
        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#ffffff';
        const scoreText = homeScore + ' - ' + awayScore;
        ctx.fillText(scoreText, canvas.width / 2, centerY + 30);
        
        // Determine winner
        let winnerText = '';
        if (parseInt(homeScore) > parseInt(awayScore)) {
            winnerText = homeTeamName + ' ' + getWinText();
        } else if (parseInt(homeScore) < parseInt(awayScore)) {
            winnerText = awayTeamName + ' ' + getWinText();
        } else {
            winnerText = 'DRAW';
        }
        
        // Draw winner text
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(winnerText, canvas.width / 2, centerY + 180);
        
        // Draw website URL at bottom
        ctx.font = '24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('www.aznit11-football.com', canvas.width / 2, canvas.height - 40);
        
        // Add subtle watermark
        drawWatermark(ctx, canvas.width, canvas.height);
    }
    
    // Return the canvas for further processing
    return canvas;
}

// Helper function to draw an image on canvas
function drawImage(ctx, src, x, y, width, height, callback) {
    const img = new Image();
    img.onload = function() {
        // Center the image at x,y
        const drawX = x - width / 2;
        const drawY = y - height / 2;
        ctx.drawImage(img, drawX, drawY, width, height);
        if (callback) callback();
    };
    img.onerror = function() {
        console.error('Error loading image:', src);
        if (callback) callback();
    };
    img.src = src;
}

// Helper function to draw a subtle background pattern
function drawBackgroundPattern(ctx, width, height) {
    ctx.save();
    
    // Add subtle diagonal lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    
    const spacing = 40;
    for (let i = -height; i < width + height; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height, height);
        ctx.stroke();
    }
    
    // Add vignette effect
    const radialGradient = ctx.createRadialGradient(
        width / 2, height / 2, height / 10,
        width / 2, height / 2, height
    );
    radialGradient.addColorStop(0, 'rgba(0,0,0,0)');
    radialGradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    
    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
}

// Helper function to draw a subtle watermark
function drawWatermark(ctx, width, height) {
    ctx.save();
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.textAlign = 'center';
    ctx.fillText('Aznit11 Football League', width / 2, height - 15);
    ctx.restore();
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Get random win text
function getWinText() {
    const phrases = ['WINS!', 'VICTORIOUS', 'TRIUMPHS', 'CHAMPIONS', 'TAKES THE VICTORY'];
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// Function to download the generated image
function downloadMatchImage(canvas, filename) {
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || 'match-result.png';
    
    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Preview the image in a modal
function showImagePreview(canvas) {
    // Create or get existing modal
    let modal = document.getElementById('image-preview-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-preview-modal';
        modal.className = 'image-preview-modal';
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-modal';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        modal.appendChild(closeBtn);
        
        // Add modal content container
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modal.appendChild(modalContent);
        
        // Add download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-image-btn';
        downloadBtn.textContent = 'Download Image';
        downloadBtn.onclick = function() {
            const previewCanvas = document.querySelector('#image-preview-modal canvas');
            if (previewCanvas) {
                downloadMatchImage(previewCanvas, 'match-result.png');
            }
        };
        
        modal.appendChild(downloadBtn);
        
        // Add to document
        document.body.appendChild(modal);
    }
    
    // Clear existing content
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = '';
    
    // Add the canvas to the modal
    modalContent.appendChild(canvas);
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Close when clicking outside the content
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// Initialize with default team logos
function initializeMatchImageGenerator() {
    console.log('Match image generator initialized');
    
    // Add event listener to the generate button if it exists
    const generateBtn = document.getElementById('generate-match-image');
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            // Get match data from the page
            const matchData = getMatchDataFromPage();
            
            // Generate the image
            const canvas = generateMatchImage(matchData);
            
            // Show preview
            showImagePreview(canvas);
        });
    }
}

// Extract match data from the page
function getMatchDataFromPage() {
    // This function will extract all the necessary data from the admin match page
    return {
        homeTeamName: document.getElementById('home-team-name').textContent || 'Home Team',
        awayTeamName: document.getElementById('away-team-name').textContent || 'Away Team',
        homeScore: document.getElementById('home-score').value || '0',
        awayScore: document.getElementById('away-score').value || '0',
        matchDate: document.getElementById('match-date').value || '2025-01-01',
        matchTime: document.getElementById('match-time').value || '12:00',
        stage: document.getElementById('match-stage').textContent || 'Match',
        // For logos, we'll use placeholders for now
        homeTeamLogo: '/img/team-placeholder.png',
        awayTeamLogo: '/img/team-placeholder.png',
        tournamentLogo: '/img/tournament-logo.png'
    };
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', initializeMatchImageGenerator);
