/**
 * API Client for Rat Ait Bououlli League
 * Handles API requests for the frontend
 */

// Fetch upcoming matches
async function fetchUpcomingMatches(limit = 5) {
    try {
        const response = await fetch(`/api/upcoming-matches?limit=${limit}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching upcoming matches:', error);
        return [];
    }
}

// Fetch latest results
async function fetchLatestResults(limit = 5) {
    try {
        const response = await fetch(`/api/latest-results?limit=${limit}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching latest results:', error);
        return [];
    }
}

// Fetch group standings
async function fetchGroupStandings() {
    try {
        const response = await fetch('/api/group-standings');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching group standings:', error);
        return [];
    }
}

// Fetch admin dashboard stats
async function fetchAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return { teamCount: 0, matchCount: 0, completedCount: 0, upcomingCount: 0 };
    }
}

// Fetch recent matches for admin dashboard
async function fetchAdminRecentMatches() {
    try {
        const response = await fetch('/api/admin/recent-matches');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching admin recent matches:', error);
        return [];
    }
}

// Fetch upcoming matches for admin dashboard
async function fetchAdminUpcomingMatches() {
    try {
        const response = await fetch('/api/admin/upcoming-matches');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching admin upcoming matches:', error);
        return [];
    }
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateStr);
            return dateStr; // Return original string if invalid
        }
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateStr; // Return original string on error
    }
}

// Format time for display
function formatTime(timeStr) {
    if (!timeStr) return '';
    
    try {
        // Parse time in 24-hour format
        const [hours, minutes] = timeStr.split(':');
        
        if (!hours || !minutes) {
            console.error('Invalid time format:', timeStr);
            return timeStr; // Return original string if invalid
        }
        
        // Convert to 12-hour format
        let hour = parseInt(hours, 10);
        if (isNaN(hour)) {
            console.error('Invalid hour:', hours);
            return timeStr;
        }
        
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour || 12; // Convert 0 to 12
        
        return `${hour}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        return timeStr; // Return original string on error
    }
}

// Fetch teams by group
async function fetchTeamsByGroup(groupId) {
    try {
        const response = await fetch(`/api/teams?groupId=${groupId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching teams by group:', error);
        return [];
    }
}

// Fetch all teams
async function fetchAllTeams() {
    try {
        const response = await fetch('/api/teams');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching all teams:', error);
        return [];
    }
}

// Update team
async function updateTeam(teamId, teamName) {
    try {
        const response = await fetch('/admin/teams/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${teamId}&name=${encodeURIComponent(teamName)}`,
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return true;
    } catch (error) {
        console.error('Error updating team:', error);
        return false;
    }
}
