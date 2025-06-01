/**
 * Enhanced Match Image Generator
 * Creates beautiful, modern social media images for match results
 * Incorporates the styling from match-card-enhancement.css
 */

// Execute when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced match image generator loaded');
    initializeImageGenerator();
});

// Initialize the image generator
function initializeImageGenerator() {
    // Find or create generate buttons
    setupGenerateButtons();
    
    // Create the preview modal if it doesn't exist
    createPreviewModal();
}

// Set up generate buttons
function setupGenerateButtons() {
    // First try the main button in the header
    const headerButton = document.querySelector('#generate-match-image');
    if (headerButton) {
        console.log('Found header generate button');
        headerButton.onclick = function(e) {
            e.preventDefault();
            generateMatchImage();
            return false;
        };
    }
    
    // Try the inline button in the match data section
    const inlineButton = document.querySelector('#generate-match-image-inline');
    if (inlineButton) {
        console.log('Found inline generate button');
        inlineButton.onclick = function(e) {
            e.preventDefault();
            generateMatchImage();
            return false;
        };
    }
    
    // If neither button exists, create one
    if (!headerButton && !inlineButton) {
        console.log('No generate buttons found, creating one');
        createGenerateButton();
    }
}

// Create a generate button
function createGenerateButton() {
    // Find a good container for the button
    const container = document.querySelector('.back-button') || 
                     document.querySelector('.admin-section') || 
                     document.querySelector('form');
    
    if (container) {
        // Create button
        const button = document.createElement('button');
        button.id = 'generate-match-image-enhanced';
        button.className = 'download-match-image';
        button.innerHTML = '<i class="fas fa-image"></i> Generate Social Media Image';
        
        // Add styling
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.padding = '10px 15px';
        button.style.margin = '20px 0';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.gap = '8px';
        button.style.transition = 'all 0.3s ease';
        
        // Add hover effect
        button.onmouseover = function() {
            this.style.backgroundColor = '#3e8e41';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        };
        
        button.onmouseout = function() {
            this.style.backgroundColor = '#4CAF50';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        };
        
        // Add click handler
        button.onclick = function(e) {
            e.preventDefault();
            generateMatchImage();
            return false;
        };
        
        // Add to container
        container.appendChild(button);
    }
}

// Create the preview modal
function createPreviewModal() {
    // Check if modal already exists
    if (document.getElementById('match-image-modal')) {
        return;
    }
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'match-image-modal';
    modal.className = 'image-preview-modal';
    modal.style.display = 'none';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Create canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'canvas-container';
    
    // Create download button
    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-image-button';
    downloadButton.className = 'download-image-btn';
    downloadButton.innerHTML = '<i class="fas fa-download"></i> Download Image';
    downloadButton.onclick = function() {
        downloadMatchImage();
    };
    
    // Add elements to modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(canvasContainer);
    modal.appendChild(modalContent);
    modal.appendChild(downloadButton);
    
    // Add loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    
    // Add modal to body
    document.body.appendChild(modal);
    document.body.appendChild(loadingOverlay);
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Generate match image
function generateMatchImage() {
    console.log('Generating match image...');
    
    // Show loading overlay
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
    
    // Get match data
    const matchData = getMatchData();
    console.log('Match data:', matchData);
    
    // Create canvas for image
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a2a6c');
    gradient.addColorStop(0.5, '#2a3a9c');
    gradient.addColorStop(1, '#1a2a6c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pattern overlay
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < canvas.width; x += 20) {
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
    
    // Draw league title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('Rat Ait Bououlli League', canvas.width / 2, 40);
    
    // Draw stage
    ctx.font = '30px Montserrat, Arial, sans-serif';
    ctx.shadowBlur = 5;
    ctx.fillText(matchData.stage, canvas.width / 2, 100);
    
    // Draw date and time
    ctx.font = '24px Montserrat, Arial, sans-serif';
    ctx.fillText(matchData.matchDate + ' | ' + matchData.matchTime, canvas.width / 2, 140);
    
    // Draw team sections
    ctx.shadowBlur = 0;
    
    // Home team
    drawTeamSection(ctx, {
        x: canvas.width / 4,
        y: 200,
        team: matchData.homeTeam,
        score: matchData.homeScore,
        isWinner: parseInt(matchData.homeScore) > parseInt(matchData.awayScore)
    });
    
    // Away team
    drawTeamSection(ctx, {
        x: (canvas.width / 4) * 3,
        y: 200,
        team: matchData.awayTeam,
        score: matchData.awayScore,
        isWinner: parseInt(matchData.awayScore) > parseInt(matchData.homeScore)
    });
    
    // Draw VS
    ctx.font = 'bold 36px Montserrat, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('VS', canvas.width / 2, 280);
    
    // Draw result banner
    if (parseInt(matchData.homeScore) !== parseInt(matchData.awayScore)) {
        const winner = parseInt(matchData.homeScore) > parseInt(matchData.awayScore) ? 
                      matchData.homeTeam : matchData.awayTeam;
        
        // Banner background
        ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
        roundRect(ctx, canvas.width / 2 - 300, 450, 600, 70, 8, true);
        
        // Banner text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Montserrat, Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(winner + ' WINS!', canvas.width / 2, 485);
    } else {
        // Draw banner for draw
        ctx.fillStyle = 'rgba(255, 152, 0, 0.8)';
        roundRect(ctx, canvas.width / 2 - 300, 450, 600, 70, 8, true);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Montserrat, Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('match drawn ', canvas.width / 2, 485);
    }
    
    // Draw footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '18px Montserrat, Arial, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText('© 2025 Rat Ait Bououlli League', canvas.width / 2, canvas.height - 20);
    
    // Display the canvas in the modal
    displayCanvasInModal(canvas);
    
    // Hide loading overlay
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

// Draw team section on canvas
function drawTeamSection(ctx, options) {
    const { x, y, team, score, isWinner } = options;
    
    // Draw team logo circle
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw team initial or icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(team.charAt(0), x, y);
    ctx.restore();
    
    // Draw team name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(team, x, y + 90);
    
    // Draw score with circle background
    ctx.save();
    if (isWinner) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    }
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.arc(x, y + 170, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw score text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(score, x, y + 170);
    ctx.restore();
    
    // Add winner indicator if this team won
    if (isWinner) {
        ctx.save();
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.moveTo(x - 30, y - 90);
        ctx.lineTo(x + 30, y - 90);
        ctx.lineTo(x, y - 110);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
        stroke = false;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        const defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (let side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

// Display canvas in modal
function displayCanvasInModal(canvas) {
    const modal = document.getElementById('match-image-modal');
    const canvasContainer = document.getElementById('canvas-container');
    
    if (modal && canvasContainer) {
        // Clear container
        canvasContainer.innerHTML = '';
        
        // Add canvas with responsive scaling
        const scaledCanvas = document.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');
        
        // Make it responsive while maintaining aspect ratio
        const maxWidth = Math.min(window.innerWidth * 0.8, 800);
        const scale = maxWidth / canvas.width;
        
        scaledCanvas.width = canvas.width * scale;
        scaledCanvas.height = canvas.height * scale;
        
        // Draw original canvas onto scaled canvas
        scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        
        // Add to container
        canvasContainer.appendChild(scaledCanvas);
        
        // Store original canvas for download
        canvasContainer.dataset.originalCanvas = canvas.toDataURL('image/png');
        
        // Show modal
        modal.style.display = 'flex';
    }
}

// Download match image
function downloadMatchImage() {
    const canvasContainer = document.getElementById('canvas-container');
    
    if (canvasContainer && canvasContainer.dataset.originalCanvas) {
        const link = document.createElement('a');
        link.download = 'match-result.png';
        link.href = canvasContainer.dataset.originalCanvas;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Get match data from the page
function getMatchData() {
    // Helper function to safely get element content
    function getElementContent(selector) {
        const element = document.querySelector(selector);
        if (!element) return null;
        return element.textContent.trim() || element.value || null;
    }
    
    // Extract match data
    const homeTeam = getElementContent('#home-team-name') || 
                     getElementContent('[name="home_team"]') || 'Home Team';
                     
    const awayTeam = getElementContent('#away-team-name') || 
                     getElementContent('[name="away_team"]') || 'Away Team';
                     
    const homeScore = getElementContent('#home-score-display') || 
                      getElementContent('#home-score') || '0';
                      
    const awayScore = getElementContent('#away-score-display') || 
                      getElementContent('#away-score') || '0';
                      
    const stage = getElementContent('#match-stage') || 
                  getElementContent('[name="stage"]') || 'Match';
                  
    const matchDate = getElementContent('#match-date-display') || 
                      getElementContent('[name="match_date"]') || 
                      new Date().toLocaleDateString();
                      
    const matchTime = getElementContent('#match-time-display') || 
                      getElementContent('[name="match_time"]') || 
                      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return {
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        stage,
        matchDate,
        matchTime
    };
}

// Support for older browsers
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || 
                               Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

// Handle direct initialization
initializeImageGenerator();

// Also set up a global click handler for the buttons
document.addEventListener('click', function(e) {
    const target = e.target.closest('.download-match-image, #generate-match-image, #generate-match-image-inline');
    if (target) {
        e.preventDefault();
        generateMatchImage();
        return false;
    }
});
