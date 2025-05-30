#!/usr/bin/env bash
# This script ensures native modules are properly rebuilt for the Render environment

# Exit on error
set -e

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force

# Remove node_modules to start fresh
echo "Removing existing node_modules..."
rm -rf node_modules

# Install all dependencies
echo "Installing dependencies..."
npm install

# Rebuild native modules for the current environment
echo "Rebuilding native modules for the current environment..."
npm rebuild bcrypt sqlite3 --update-binary

# Make sure data directory exists
echo "Ensuring data directory exists..."
mkdir -p ./data

echo "Build completed successfully!"
