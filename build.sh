#!/usr/bin/env bash
# This script ensures SQLite3 is properly rebuilt for the Render environment

# Exit on error
set -e

# Rebuild SQLite3 for the current environment
echo "Rebuilding SQLite3 for the current environment..."
npm rebuild sqlite3 --update-binary

# Make sure data directory exists
echo "Ensuring data directory exists..."
mkdir -p ./data

echo "Build completed successfully!"
