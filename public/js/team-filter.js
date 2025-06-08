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
    
    console.log('Filter input found:', !!filterInput);
    console.log('Clear button found:', !!clearFilterBtn);
    console.log('Dropdown found:', !!teamFilterDropdown);
    console.log('Match rows found:', matchRows.length);
    
    if (!filterInput || !clearFilterBtn || !teamFilterDropdown) {
        console.error('One or more required elements not found');
        return;
    }
    
    // Initially hide the clear button
    clearFilterBtn.style.display = 'none';
    
    // Collect all team names from the fixtures
    const allTeams = new Set();
    matchRows.forEach(match => {
        try {
            // Get team names from the match row
            const teamNamesElement = match.querySelector('.team-names');
            if (!teamNamesElement) return;
            
            // Find home and away team spans within the team-names div
            const homeTeamElement = teamNamesElement.querySelector('.home-team');
            const awayTeamElement = teamNamesElement.querySelector('.away-team');
            
            if (!homeTeamElement || !awayTeamElement) return;
            
            const homeTeam = homeTeamElement.textContent.trim();
            const awayTeam = awayTeamElement.textContent.trim();
            
            // Skip placeholders and TBD
            if (homeTeam && !['TBD', 'Winner Group ?', 'Runner-up Group ?', 'Winner Match ?'].includes(homeTeam)) {
                allTeams.add(homeTeam);
            }
            
            if (awayTeam && !['TBD', 'Winner Group ?', 'Runner-up Group ?', 'Winner Match ?'].includes(awayTeam)) {
                allTeams.add(awayTeam);
            }
        } catch (err) {
            console.error('Error processing match row:', err);
        }
    });
    
    console.log('All teams collected:', Array.from(allTeams));
    
    // Sort teams alphabetically
    const sortedTeams = Array.from(allTeams).sort();
    
    // Create the dropdown options
    function updateDropdown(filterText) {
        teamFilterDropdown.innerHTML = '';
        
        if (!filterText) {
            teamFilterDropdown.style.display = 'none';
            return;
        }
        
        const filteredTeams = sortedTeams.filter(team => 
            team.toLowerCase().includes(filterText.toLowerCase())
        );
        
        if (filteredTeams.length > 0) {
            teamFilterDropdown.style.display = 'block';
            
            filteredTeams.forEach(team => {
                const option = document.createElement('div');
                option.classList.add('team-option');
                option.textContent = team;
                option.addEventListener('click', () => selectTeam(team));
                teamFilterDropdown.appendChild(option);
            });
        } else {
            teamFilterDropdown.style.display = 'none';
        }
    }
    
    // Select a team from the dropdown
    function selectTeam(teamName) {
        filterInput.value = teamName;
        teamFilterDropdown.style.display = 'none';
        filterMatches(teamName);
        clearFilterBtn.style.display = 'block';
    }
    
    // Filter matches by team name
    function filterMatches(teamName) {
        const lowercaseTeam = teamName.toLowerCase();
        let matchFound = false;
        
        // First hide all day cards
        document.querySelectorAll('.day-card').forEach(day => {
            day.style.display = 'none';
        });
        
        // Show matches that contain the team
        matchRows.forEach(match => {
            const homeTeam = match.querySelector('.home-team').textContent.trim().toLowerCase();
            const awayTeam = match.querySelector('.away-team').textContent.trim().toLowerCase();
            
            if (homeTeam.includes(lowercaseTeam) || awayTeam.includes(lowercaseTeam)) {
                match.style.display = 'flex';
                // Show the parent day card
                const parentDay = match.closest('.day-card');
                if (parentDay) {
                    parentDay.style.display = 'block';
                    matchFound = true;
                }
            } else {
                match.style.display = 'none';
            }
        });
        
        // Show no matches message if needed
        const noMatchesDiv = document.querySelector('.no-matches') || 
                            document.createElement('div');
        
        if (!matchFound) {
            if (!document.querySelector('.no-matches')) {
                noMatchesDiv.classList.add('no-matches');
                noMatchesDiv.innerHTML = `<p>No matches found for "${teamName}"</p>`;
                document.querySelector('.fixtures-container').appendChild(noMatchesDiv);
            } else {
                noMatchesDiv.style.display = 'block';
                noMatchesDiv.innerHTML = `<p>No matches found for "${teamName}"</p>`;
            }
        } else if (document.querySelector('.no-matches')) {
            document.querySelector('.no-matches').style.display = 'none';
        }
    }
    
    // Clear the filter
    function clearFilter() {
        filterInput.value = '';
        clearFilterBtn.style.display = 'none';
        teamFilterDropdown.style.display = 'none';
        
        // Show all matches
        matchRows.forEach(match => {
            match.style.display = 'flex';
        });
        
        // Show all day cards
        document.querySelectorAll('.day-card').forEach(day => {
            day.style.display = 'block';
        });
        
        // Hide no matches message
        if (document.querySelector('.no-matches')) {
            document.querySelector('.no-matches').style.display = 'none';
        }
    }
    
    // Event listeners
    filterInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value) {
            updateDropdown(value);
            clearFilterBtn.style.display = 'block';
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
    
    // Add active class to match row on hover for better UX
    matchRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.classList.add('match-active');
        });
        
        row.addEventListener('mouseleave', function() {
            this.classList.remove('match-active');
        });
    });
});
