/**
 * Simple Team Filter
 * - Filters matches by team name
 * - No fancy dropdown, just direct filtering
 */
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const filterInput = document.getElementById('teamFilterInput');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    
    if (!filterInput || !clearFilterBtn) {
        console.error('Team filter: Required elements not found');
        return;
    }
    
    // Initially hide the clear button
    clearFilterBtn.style.display = 'none';
    
    // Filter function
    function filterTeams() {
        const searchText = filterInput.value.trim().toLowerCase();
        
        // Show/hide clear button
        clearFilterBtn.style.display = searchText ? 'block' : 'none';
        
        // If empty search, show everything
        if (!searchText) {
            document.querySelectorAll('.day-card').forEach(day => {
                day.style.display = 'block';
            });
            document.querySelectorAll('.match-row').forEach(match => {
                match.style.display = 'flex';
            });
            
            // Hide any "no matches" message
            const noMatches = document.querySelector('.no-matches');
            if (noMatches) noMatches.style.display = 'none';
            return;
        }
        
        // Hide all days initially
        document.querySelectorAll('.day-card').forEach(day => {
            day.style.display = 'none';
        });
        
        // Track if we found any matches
        let matchFound = false;
        
        // Check each match
        document.querySelectorAll('.match-row').forEach(match => {
            const homeTeam = match.querySelector('.team-names .home-team');
            const awayTeam = match.querySelector('.team-names .away-team');
            
            if (!homeTeam || !awayTeam) return;
            
            const homeText = homeTeam.textContent.trim().toLowerCase();
            const awayText = awayTeam.textContent.trim().toLowerCase();
            
            // Show matches that contain the search text
            if (homeText.includes(searchText) || awayText.includes(searchText)) {
                match.style.display = 'flex';
                const dayCard = match.closest('.day-card');
                if (dayCard) {
                    dayCard.style.display = 'block';
                    matchFound = true;
                }
            } else {
                match.style.display = 'none';
            }
        });
        
        // Show "no matches" message if needed
        let noMatches = document.querySelector('.no-matches');
        
        if (!matchFound) {
            if (!noMatches) {
                noMatches = document.createElement('div');
                noMatches.className = 'no-matches';
                document.querySelector('.fixtures-container').appendChild(noMatches);
            }
            noMatches.innerHTML = `<p>No matches found for "${filterInput.value}"</p>`;
            noMatches.style.display = 'block';
        } else if (noMatches) {
            noMatches.style.display = 'none';
        }
    }
    
    // Event listeners
    filterInput.addEventListener('input', filterTeams);
    
    clearFilterBtn.addEventListener('click', function() {
        filterInput.value = '';
        filterTeams();
    });
});
