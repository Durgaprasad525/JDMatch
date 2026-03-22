#!/bin/bash

# Deployment script for Vercel
# This script prepares the project for deployment

echo "🚀 Preparing for Vercel deployment..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if logged in
echo "📋 Checking Vercel login status..."
vercel whoami || {
    echo "❌ Not logged in to Vercel. Please run: vercel login"
    exit 1
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Build client
echo "🏗️  Building client..."
cd client && npm run build && cd ..

echo "✅ Build complete!"
echo ""
echo "📤 Deploying to Vercel..."
echo ""
echo "Choose deployment option:"
echo "1. Preview deployment (vercel)"
echo "2. Production deployment (vercel --prod)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "2" ]; then
    vercel --prod
else
    vercel
fi

echo ""
echo "✅ Deployment complete!"
echo "📝 Don't forget to set environment variables in Vercel dashboard!"
