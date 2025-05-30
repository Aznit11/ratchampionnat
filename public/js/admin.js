/**
 * Admin JavaScript for Rat Ait Bououlli League
 */

document.addEventListener('DOMContentLoaded', function() {
    // Format date function for admin displays
    window.formatDate = function(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Format time function
    window.formatTime = function(timeStr) {
        if (!timeStr) return '';
        
        // Parse time in 24-hour format
        const [hours, minutes] = timeStr.split(':');
        
        // Convert to 12-hour format
        let hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour || 12; // Convert 0 to 12
        
        return `${hour}:${minutes} ${ampm}`;
    };

    // Mobile sidebar toggle
    const sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.admin-sidebar').classList.toggle('active');
        });
    }

    // Date formatting for display
    const dateElements = document.querySelectorAll('.format-date');
    dateElements.forEach(el => {
        const dateStr = el.getAttribute('data-date');
        if (dateStr) {
            el.textContent = formatDate(dateStr);
        }
    });

    // Time formatting for display
    const timeElements = document.querySelectorAll('.format-time');
    timeElements.forEach(el => {
        const timeStr = el.getAttribute('data-time');
        if (timeStr) {
            el.textContent = formatTime(timeStr);
        }
    });
    
    // Load dashboard stats if on dashboard page
    if (document.querySelector('.dashboard-stats')) {
        loadDashboardStats();
    }
    
    // Initialize team edit functionality if on teams page
    if (document.querySelector('.admin-table-container') && document.getElementById('editTeamModal')) {
        initTeamManagement();
    }
});

// Load dashboard stats
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats...');
        // Fetch dashboard stats directly
        const statsResponse = await fetch('/api/admin/stats');
        if (!statsResponse.ok) {
            throw new Error(`Failed to fetch stats: ${statsResponse.status}`);
        }
        
        const stats = await statsResponse.json();
        console.log('Dashboard stats loaded:', stats);
        
        // Update stats on the dashboard
        document.getElementById('team-count').textContent = stats.teamCount || '0';
        document.getElementById('match-count').textContent = stats.matchCount || '0';
        document.getElementById('completed-count').textContent = stats.completedCount || '0';
        document.getElementById('upcoming-count').textContent = stats.upcomingCount || '0';
        
        // Load recent matches
        const recentResponse = await fetch('/api/admin/recent-matches');
        if (!recentResponse.ok) {
            throw new Error('Failed to fetch recent matches');
        }
        
        const recentMatches = await recentResponse.json();
        const recentContainer = document.getElementById('recent-matches');
        recentContainer.innerHTML = '';
        
        if (recentMatches.length === 0) {
            recentContainer.innerHTML = '<p class="no-data">No recent matches</p>';
        } else {
            recentMatches.forEach(match => {
                const matchEl = document.createElement('div');
                matchEl.className = 'match-item';
                matchEl.innerHTML = `
                    <div class="match-date">${formatDate(match.match_date)} - ${match.match_time}</div>
                    <div class="match-teams">
                        <span class="team-name">${match.home_team_name || 'TBD'}</span>
                        <span class="match-score">${match.home_score !== null ? match.home_score : '?'} - ${match.away_score !== null ? match.away_score : '?'}</span>
                        <span class="team-name">${match.away_team_name || 'TBD'}</span>
                    </div>
                    <a href="/admin/match/${match.id}" class="btn btn-sm">Edit</a>
                `;
                recentContainer.appendChild(matchEl);
            });
        }
        
        // Load upcoming matches
        const upcomingResponse = await fetch('/api/admin/upcoming-matches');
        if (!upcomingResponse.ok) {
            throw new Error('Failed to fetch upcoming matches');
        }
        
        const upcomingMatches = await upcomingResponse.json();
        const upcomingContainer = document.getElementById('upcoming-matches');
        upcomingContainer.innerHTML = '';
        
        if (upcomingMatches.length === 0) {
            upcomingContainer.innerHTML = '<p class="no-data">No upcoming matches</p>';
        } else {
            upcomingMatches.forEach(match => {
                const matchEl = document.createElement('div');
                matchEl.className = 'match-item';
                matchEl.innerHTML = `
                    <div class="match-date">${formatDate(match.match_date)} - ${match.match_time}</div>
                    <div class="match-teams">
                        <span class="team-name">${match.home_team_name || 'TBD'}</span>
                        <span class="match-score">vs</span>
                        <span class="team-name">${match.away_team_name || 'TBD'}</span>
                    </div>
                    <a href="/admin/match/${match.id}" class="btn btn-sm">Edit</a>
                `;
                upcomingContainer.appendChild(matchEl);
            });
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Error loading dashboard data. Please check the console for details.');
    }
}

// Initialize team management functionality
function initTeamManagement() {
    // Filter teams by group
    const groupFilter = document.getElementById('group-filter');
    if (groupFilter) {
        groupFilter.addEventListener('change', function() {
            const selectedGroup = this.value;
            const rows = document.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                if (selectedGroup === 'all' || row.getAttribute('data-group') === selectedGroup) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Search teams
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const teamName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                if (teamName.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Add team button and modal
    const addTeamBtn = document.getElementById('add-team-btn');
    const addTeamModal = document.getElementById('addTeamModal');
    const cancelAddBtn = document.getElementById('cancelAdd');
    const addTeamForm = document.getElementById('addTeamForm');
    const closeAddModalBtn = addTeamModal ? addTeamModal.querySelector('.close-modal') : null;
    
    function closeAddModal() {
        if (addTeamModal) addTeamModal.style.display = 'none';
    }
    
    if (addTeamBtn && addTeamModal) {
        addTeamBtn.addEventListener('click', function() {
            addTeamModal.style.display = 'block';
        });
        
        if (closeAddModalBtn) {
            closeAddModalBtn.addEventListener('click', closeAddModal);
        }
        
        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', closeAddModal);
        }
        
        window.addEventListener('click', function(event) {
            if (event.target === addTeamModal) {
                closeAddModal();
            }
        });
        
        // Validate add team form
        if (addTeamForm) {
            addTeamForm.addEventListener('submit', function(e) {
                const teamName = document.getElementById('new-team-name').value;
                if (!teamName.trim()) {
                    e.preventDefault();
                    alert('Team name cannot be empty');
                    return false;
                }
            });
        }
    }
    
    // Edit team modal
    const editModal = document.getElementById('editTeamModal');
    const editButtons = document.querySelectorAll('.btn-edit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const editForm = document.getElementById('editTeamForm');
    const closeEditModalBtn = editModal ? editModal.querySelector('.close-modal') : null;
    
    function closeEditModal() {
        if (editModal) editModal.style.display = 'none';
    }
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            const teamName = this.getAttribute('data-name');
            
            document.getElementById('team-id').value = teamId;
            document.getElementById('team-name').value = teamName;
            
            editModal.style.display = 'block';
        });
    });
    
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeEditModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
    });
    
    // Handle edit form submission
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            const teamId = document.getElementById('team-id').value;
            const teamName = document.getElementById('team-name').value;
            
            if (!teamName.trim()) {
                e.preventDefault();
                alert('Team name cannot be empty');
                return false;
            }
        });
    }
    
    // Delete team modal
    const deleteModal = document.getElementById('deleteTeamModal');
    const deleteButtons = document.querySelectorAll('.btn-delete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const deleteForm = document.getElementById('deleteTeamForm');
    const closeDeleteModalBtn = deleteModal ? deleteModal.querySelector('.close-modal') : null;
    
    function closeDeleteModal() {
        if (deleteModal) deleteModal.style.display = 'none';
    }
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            const teamName = this.getAttribute('data-name');
            
            document.getElementById('delete-team-id').value = teamId;
            document.getElementById('delete-team-name').textContent = teamName;
            
            deleteModal.style.display = 'block';
        });
    });
    
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });
}
