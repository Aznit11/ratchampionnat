/**
 * Team filter functionality for the fixtures page
 * Allows users to filter matches by team name
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Team filter script loaded');
    
    // Elements
    const filterInput = document.getElementById('teamFilterInput');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const teamFilterDropdown = document.getElementById('teamFilterDropdown');
    const matchRows = document.querySelectorAll('.match-row');
    const dayCards = document.querySelectorAll('.day-card');
    
    // Check if elements exist
    if (!filterInput || !clearFilterBtn || !teamFilterDropdown) {
        console.error('Team filter elements not found');
        return;
    }
    
    // Hide clear button initially
    clearFilterBtn.style.display = 'none';
    
    // Collect all team names
    const allTeams = new Set();
    matchRows.forEach(match => {
        const homeTeamEl = match.querySelector('.team-names .home-team');
        const awayTeamEl = match.querySelector('.team-names .away-team');
        
        if (homeTeamEl && awayTeamEl) {
            const homeTeam = homeTeamEl.textContent.trim();
            const awayTeam = awayTeamEl.textContent.trim();
            
            // Skip placeholders
            if (homeTeam && !isPlaceholder(homeTeam)) {
                allTeams.add(homeTeam);
            }
            
            if (awayTeam && !isPlaceholder(awayTeam)) {
                allTeams.add(awayTeam);
            }
        }
    });
    
    // Check if string is a placeholder
    function isPlaceholder(str) {
        const placeholders = ['TBD', 'Winner Group', 'Runner-up Group', 'Winner Match'];
        return placeholders.some(p => str.includes(p));
    }
    
    // Sort teams alphabetically
    const sortedTeams = Array.from(allTeams).sort();
    
    // Filter matches by team name
    function filterMatches(teamName) {
        const query = teamName.toLowerCase();
        let matchFound = false;
        
        // First hide all day cards
        dayCards.forEach(day => {
            day.style.display = 'none';
        });
        
        // For each match, check if it involves the team
        matchRows.forEach(match => {
            const homeTeam = match.querySelector('.home-team').textContent.trim().toLowerCase();
            const awayTeam = match.querySelector('.away-team').textContent.trim().toLowerCase();
            
            if (homeTeam.includes(query) || awayTeam.includes(query)) {
                match.style.display = 'flex';
                // Show parent day card
                const dayCard = match.closest('.day-card');
                if (dayCard) {
                    dayCard.style.display = 'block';
                    matchFound = true;
                }
            } else {
                match.style.display = 'none';
            }
        });
        
        // Show no matches message if needed
        showNoMatchesMessage(!matchFound, teamName);
    }
    
    // Show/hide no matches message
    function showNoMatchesMessage(show, teamName) {
        let noMatchesDiv = document.querySelector('.no-matches');
        
        if (show) {
            if (!noMatchesDiv) {
                noMatchesDiv = document.createElement('div');
                noMatchesDiv.className = 'no-matches';
                document.querySelector('.fixtures-container').appendChild(noMatchesDiv);
            }
            
            noMatchesDiv.innerHTML = `<p>No matches found for "${teamName}"</p>`;
            noMatchesDiv.style.display = 'block';
        } else if (noMatchesDiv) {
            noMatchesDiv.style.display = 'none';
        }
    }
    
    // Clear the filter
    function clearFilter() {
        filterInput.value = '';
        clearFilterBtn.style.display = 'none';
        teamFilterDropdown.style.display = 'none';
        
        // Show all matches and day cards
        matchRows.forEach(match => match.style.display = 'flex');
        dayCards.forEach(day => day.style.display = 'block');
        
        // Hide no matches message
        showNoMatchesMessage(false);
    }
    
    // Update dropdown with filtered teams
    function updateDropdown(query) {
        teamFilterDropdown.innerHTML = '';
        
        if (!query) {
            teamFilterDropdown.style.display = 'none';
            return;
        }
        
        const filteredTeams = sortedTeams.filter(team => 
            team.toLowerCase().includes(query.toLowerCase())
        );
        
        if (filteredTeams.length > 0) {
            teamFilterDropdown.style.display = 'block';
            
            filteredTeams.forEach(team => {
                const option = document.createElement('div');
                option.className = 'team-option';
                option.textContent = team;
                option.addEventListener('click', () => {
                    filterInput.value = team;
                    teamFilterDropdown.style.display = 'none';
                    filterMatches(team);
                    clearFilterBtn.style.display = 'block';
                });
                teamFilterDropdown.appendChild(option);
            });
        } else {
            teamFilterDropdown.style.display = 'none';
        }
    }
    
    // Event listeners
    filterInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value) {
            updateDropdown(value);
            clearFilterBtn.style.display = 'block';
            filterMatches(value);
        } else {
            clearFilter();
        }
    });
    
    clearFilterBtn.addEventListener('click', clearFilter);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.filter-container') && 
            !event.target.closest('.filter-dropdown')) {
            teamFilterDropdown.style.display = 'none';
        }
    });
});
