# Rat Ait Bououlli League

A responsive web application for managing a football league tournament with 35 teams distributed across 8 groups, complete with match scheduling, results tracking, and an admin interface.

## Features

- **Public Area**:
  - Responsive design for all devices
  - View groups and team standings
  - Browse match schedules for all tournament stages
  - View match details including goals and cards
  - Real-time updates for match results

- **Admin Area**:
  - Secure login system
  - Manage team information
  - Update match results and details
  - Add goals and cards for matches
  - Dashboard with tournament statistics

## Deployment Instructions

### Prerequisites
- Node.js 16.x or higher
- A registered domain (ratchampionnat.com)
- A hosting provider account (Heroku, DigitalOcean, Render, etc.)

### Local Setup
1. Clone the repository
2. Run `npm install` to install dependencies
3. Start the application with `npm start`
4. Visit `http://ratchampionnat.com` in your browser

### Production Deployment

#### Using Heroku
1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku: `heroku login`
3. Create a new app: `heroku create ratchampionnat`
4. Push your code: `git push heroku main`
5. Set up your domain: 
   - In Heroku dashboard, navigate to Settings > Domains
   - Add domain: `ratchampionnat.com`
   - Follow DNS configuration instructions

#### Using DigitalOcean
1. Create a DigitalOcean account
2. Create a new App (App Platform)
3. Connect to your GitHub repository
4. Configure your app:
   - Set environment variables
   - Add your domain name
   - Deploy your app

#### Domain Configuration
1. Log in to your domain registrar account
2. Update DNS settings:
   - Add A records pointing to your hosting provider's IP
   - Or set up CNAME records as per hosting provider instructions

## Technologies Used

- **Backend**: Node.js with Express
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript
- **Template Engine**: EJS
- **Authentication**: bcrypt for password hashing

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) installed on your system.

2. Clone the repository or extract the project files to your preferred location.

3. Open a terminal/command prompt and navigate to the project directory.

4. Install the dependencies:
   ```
   npm install
   ```

## Running the Application

1. Start the application:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://ratchampionnat.com
   ```

3. To access the admin area:
   ```
   http://ratchampionnat.com/admin
   ```

## Tournament Structure

- **Group Stage**: 8 groups (5 groups with 4 teams, 3 groups with 5 teams)
- **Round of 16**: Top teams from each group and best runners-up
- **Quarter Finals**: 8 teams compete
- **Semi Finals**: 4 teams compete
- **Final**: Championship match

## Schedule Details

- **Group Stage**:
  - Day 1: One match at 6:00 PM
  - Other days: 4 matches per day (8:00 AM, 10:00 AM, 4:00 PM, 6:00 PM)
  - Rest periods: 3+ days for 4-team groups, 2+ days for 5-team groups

- **Knockout Stages**:
  - Matches scheduled with adequate rest periods
  - Prime time slots for important matches

## Development

This application was created with simplicity and performance in mind. The SQLite database ensures easy deployment without the need for a separate database server.

To modify the application:
1. Edit the views in the `views` directory
2. Update styles in the `public/css` directory
3. Modify server logic in `server.js`
