/**
 * Match Card Generator
 * A reliable social media image generator for match results
 */

// Wait until document is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Match Card Generator loaded');
    
    // Find generate buttons
    setupGenerateButtons();
});

// Setup all generate buttons
function setupGenerateButtons() {
    // Try to find the generate buttons
    const generateButtons = document.querySelectorAll('.download-match-image, #generate-match-image, #generate-match-image-inline');
    
    if (generateButtons.length > 0) {
        console.log('Found generate buttons:', generateButtons.length);
        
        // Add click event to each button
        generateButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Generate button clicked');
                createMatchCard();
            });
        });
    } else {
        // If no buttons found, create one
        console.log('No generate buttons found, creating one');
        createGenerateButton();
    }
}

// Create a generate button if none exists
function createGenerateButton() {
    // Find a place to add the button
    const possibleContainers = [
        document.querySelector('.back-button'),
        document.querySelector('.admin-section'),
        document.querySelector('form'),
        document.body
    ].filter(el => el !== null);
    
    if (possibleContainers.length > 0) {
        const container = possibleContainers[0];
        
        // Create button
        const button = document.createElement('button');
        button.id = 'generate-match-image-fallback';
        button.className = 'download-match-image';
        button.innerHTML = '<i class="fas fa-image"></i> Generate Social Media Image';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.padding = '10px 15px';
        button.style.margin = '20px 0';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        
        // Add click event
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Fallback button clicked');
            createMatchCard();
        });
        
        // Add to container
        container.appendChild(button);
    }
}

// Create match card
function createMatchCard() {
    // Get match data
    const matchData = getMatchData();
    console.log('Match data:', matchData);
    
    // Create match card container
    const cardContainer = document.createElement('div');
    cardContainer.id = 'match-card-preview';
    cardContainer.style.position = 'fixed';
    cardContainer.style.top = '0';
    cardContainer.style.left = '0';
    cardContainer.style.width = '100%';
    cardContainer.style.height = '100%';
    cardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    cardContainer.style.zIndex = '9999';
    cardContainer.style.display = 'flex';
    cardContainer.style.justifyContent = 'center';
    cardContainer.style.alignItems = 'center';
    cardContainer.style.flexDirection = 'column';
    
    // Create match card
    const card = createMatchCardElement(matchData);
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.padding = '10px 20px';
    closeButton.style.margin = '20px 5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    
    closeButton.addEventListener('click', function() {
        document.body.removeChild(cardContainer);
    });
    
    // Create download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download Image';
    downloadButton.style.backgroundColor = '#4CAF50';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '4px';
    downloadButton.style.padding = '10px 20px';
    downloadButton.style.margin = '20px 5px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.style.fontWeight = 'bold';
    
    downloadButton.addEventListener('click', function() {
        downloadMatchImage(card);
    });
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.appendChild(downloadButton);
    buttonContainer.appendChild(closeButton);
    
    // Add everything to container
    cardContainer.appendChild(card);
    cardContainer.appendChild(buttonContainer);
    
    // Add to body
    document.body.appendChild(cardContainer);
}

// Get match data from the page
function getMatchData() {
    // Function to safely get element text or value
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
    
    // Determine winner
    let winner = 'Draw';
    if (parseInt(homeScore) > parseInt(awayScore)) {
        winner = homeTeam;
    } else if (parseInt(awayScore) > parseInt(homeScore)) {
        winner = awayTeam;
    }
    
    return {
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        stage,
        matchDate,
        matchTime,
        winner
    };
}

// Create match card element
function createMatchCardElement(matchData) {
    // Create card container with the right dimensions for social media
    const card = document.createElement('div');
    card.id = 'match-card-element';
    card.style.width = '1200px';
    card.style.height = '630px';
    card.style.backgroundColor = '#1a2a6c';
    card.style.background = 'linear-gradient(135deg, #1a2a6c 0%, #2a3a9c 50%, #1a2a6c 100%)';
    card.style.borderRadius = '10px';
    card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    card.style.padding = '40px';
    card.style.boxSizing = 'border-box';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.style.color = 'white';
    card.style.fontFamily = 'Montserrat, Arial, sans-serif';
    card.style.textAlign = 'center';
    
    // Add a pattern overlay
    const pattern = document.createElement('div');
    pattern.style.position = 'absolute';
    pattern.style.top = '0';
    pattern.style.left = '0';
    pattern.style.width = '100%';
    pattern.style.height = '100%';
    pattern.style.backgroundImage = 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)';
    pattern.style.backgroundSize = '20px 20px';
    pattern.style.opacity = '0.5';
    pattern.style.pointerEvents = 'none';
    
    // Create header
    const header = document.createElement('div');
    header.style.marginBottom = '30px';
    
    // Create league title
    const leagueTitle = document.createElement('h1');
    leagueTitle.textContent = 'Rat Ait Bououlli League';
    leagueTitle.style.fontSize = '36px';
    leagueTitle.style.fontWeight = 'bold';
    leagueTitle.style.margin = '0 0 10px 0';
    leagueTitle.style.textTransform = 'uppercase';
    leagueTitle.style.letterSpacing = '2px';
    leagueTitle.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
    
    // Create stage
    const stage = document.createElement('div');
    stage.textContent = matchData.stage;
    stage.style.fontSize = '24px';
    stage.style.fontWeight = '500';
    stage.style.marginBottom = '5px';
    stage.style.opacity = '0.9';
    
    // Create date and time
    const dateTime = document.createElement('div');
    dateTime.textContent = matchData.matchDate + ' | ' + matchData.matchTime;
    dateTime.style.fontSize = '18px';
    dateTime.style.opacity = '0.8';
    
    // Add elements to header
    header.appendChild(leagueTitle);
    header.appendChild(stage);
    header.appendChild(dateTime);
    
    // Create match content
    const matchContent = document.createElement('div');
    matchContent.style.display = 'flex';
    matchContent.style.justifyContent = 'space-between';
    matchContent.style.alignItems = 'center';
    matchContent.style.margin = '40px 0';
    
    // Create home team
    const homeTeam = document.createElement('div');
    homeTeam.style.flex = '1';
    homeTeam.style.textAlign = 'center';
    
    // Home team logo
    const homeLogo = document.createElement('div');
    homeLogo.style.width = '150px';
    homeLogo.style.height = '150px';
    homeLogo.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    homeLogo.style.borderRadius = '50%';
    homeLogo.style.margin = '0 auto 20px';
    homeLogo.style.display = 'flex';
    homeLogo.style.justifyContent = 'center';
    homeLogo.style.alignItems = 'center';
    homeLogo.style.fontSize = '40px';
    homeLogo.innerHTML = '<i class="fas fa-shield-alt"></i>';
    
    // Home team name
    const homeName = document.createElement('div');
    homeName.textContent = matchData.homeTeam;
    homeName.style.fontSize = '28px';
    homeName.style.fontWeight = 'bold';
    homeName.style.marginBottom = '15px';
    
    // Home team score
    const homeScore = document.createElement('div');
    homeScore.textContent = matchData.homeScore;
    homeScore.style.fontSize = '64px';
    homeScore.style.fontWeight = 'bold';
    homeScore.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
    
    // Add elements to home team
    homeTeam.appendChild(homeLogo);
    homeTeam.appendChild(homeName);
    homeTeam.appendChild(homeScore);
    
    // Create score separator
    const scoreSeparator = document.createElement('div');
    scoreSeparator.style.padding = '0 30px';
    scoreSeparator.style.fontSize = '40px';
    scoreSeparator.style.fontWeight = 'bold';
    scoreSeparator.style.opacity = '0.7';
    scoreSeparator.textContent = 'VS';
    
    // Create away team
    const awayTeam = document.createElement('div');
    awayTeam.style.flex = '1';
    awayTeam.style.textAlign = 'center';
    
    // Away team logo
    const awayLogo = document.createElement('div');
    awayLogo.style.width = '150px';
    awayLogo.style.height = '150px';
    awayLogo.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    awayLogo.style.borderRadius = '50%';
    awayLogo.style.margin = '0 auto 20px';
    awayLogo.style.display = 'flex';
    awayLogo.style.justifyContent = 'center';
    awayLogo.style.alignItems = 'center';
    awayLogo.style.fontSize = '40px';
    awayLogo.innerHTML = '<i class="fas fa-shield-alt"></i>';
    
    // Away team name
    const awayName = document.createElement('div');
    awayName.textContent = matchData.awayTeam;
    awayName.style.fontSize = '28px';
    awayName.style.fontWeight = 'bold';
    awayName.style.marginBottom = '15px';
    
    // Away team score
    const awayScore = document.createElement('div');
    awayScore.textContent = matchData.awayScore;
    awayScore.style.fontSize = '64px';
    awayScore.style.fontWeight = 'bold';
    awayScore.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
    
    // Add elements to away team
    awayTeam.appendChild(awayLogo);
    awayTeam.appendChild(awayName);
    awayTeam.appendChild(awayScore);
    
    // Add teams and separator to match content
    matchContent.appendChild(homeTeam);
    matchContent.appendChild(scoreSeparator);
    matchContent.appendChild(awayTeam);
    
    // Create result banner if not a draw
    if (matchData.winner !== 'Draw') {
        const resultBanner = document.createElement('div');
        resultBanner.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
        resultBanner.style.padding = '15px';
        resultBanner.style.borderRadius = '8px';
        resultBanner.style.marginTop = '30px';
        resultBanner.style.fontWeight = 'bold';
        resultBanner.style.fontSize = '24px';
        resultBanner.style.textTransform = 'uppercase';
        resultBanner.style.letterSpacing = '1px';
        resultBanner.textContent = matchData.winner + ' WINS!';
        
        card.appendChild(pattern);
        card.appendChild(header);
        card.appendChild(matchContent);
        card.appendChild(resultBanner);
    } else {
        // If it's a draw
        const resultBanner = document.createElement('div');
        resultBanner.style.backgroundColor = 'rgba(255, 152, 0, 0.8)';
        resultBanner.style.padding = '15px';
        resultBanner.style.borderRadius = '8px';
        resultBanner.style.marginTop = '30px';
        resultBanner.style.fontWeight = 'bold';
        resultBanner.style.fontSize = '24px';
        resultBanner.style.textTransform = 'uppercase';
        resultBanner.style.letterSpacing = '1px';
        resultBanner.textContent = 'MATCH DRAWN';
        
        card.appendChild(pattern);
        card.appendChild(header);
        card.appendChild(matchContent);
        card.appendChild(resultBanner);
    }
    
    // Create footer with watermark
    const footer = document.createElement('div');
    footer.style.position = 'absolute';
    footer.style.bottom = '20px';
    footer.style.left = '0';
    footer.style.width = '100%';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '16px';
    footer.style.opacity = '0.7';
    footer.textContent = '© 2025 Rat Ait Bououlli League';
    
    card.appendChild(footer);
    
    return card;
}

// Download match image
function downloadMatchImage(cardElement) {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '0';
    loadingIndicator.style.left = '0';
    loadingIndicator.style.width = '100%';
    loadingIndicator.style.height = '100%';
    loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.display = 'flex';
    loadingIndicator.style.justifyContent = 'center';
    loadingIndicator.style.alignItems = 'center';
    loadingIndicator.style.zIndex = '10000';
    
    const spinner = document.createElement('div');
    spinner.style.border = '5px solid #f3f3f3';
    spinner.style.borderTop = '5px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '50px';
    spinner.style.height = '50px';
    spinner.style.animation = 'spin 2s linear infinite';
    
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    
    loadingIndicator.appendChild(spinner);
    document.head.appendChild(style);
    document.body.appendChild(loadingIndicator);
    
    // Use native canvas API for image generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = cardElement.offsetWidth;
    canvas.height = cardElement.offsetHeight;
    
    // Draw background
    ctx.fillStyle = getComputedStyle(cardElement).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Function to capture HTML as image
    const captureHTML = function() {
        // Create image from HTML
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'match-result.png';
        link.href = dataUrl;
        link.click();
        
        // Remove loading indicator
        document.body.removeChild(loadingIndicator);
    };
    
    // Create image from HTML directly
    const html = cardElement.outerHTML;
    const data = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    const img = new Image();
    
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        captureHTML();
    };
    
    img.src = data;
    
    // Fallback if the above method doesn't work
    setTimeout(function() {
        if (!link) {
            // Draw simple text as fallback
            ctx.fillStyle = 'white';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Match Result', canvas.width / 2, 100);
            
            captureHTML();
        }
    }, 3000);
}

// Listen for any DOM changes to make sure buttons are always set up
const observer = new MutationObserver(function(mutations) {
    setupGenerateButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

// Execute setup again after a delay to catch late-loaded elements
setTimeout(setupGenerateButtons, 2000);
