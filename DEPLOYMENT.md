# Deployment Guide for Vercel

## Prerequisites

1. Install Vercel CLI (if not already installed):
```bash
npm install -g vercel
```

2. Make sure you're logged in to Vercel:
```bash
vercel login
```

## Environment Variables

Before deploying, make sure to set these environment variables in Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

### Required Variables:
- `API_URL` - Your Gemini API endpoint (e.g., `https://intertest.woolf.engineering/invoke`)
- `AUTH_TOKEN` - Your API authentication token
- `NODE_ENV` - Set to `production`

### Optional Variables (with defaults):
- `PORT` - Server port (defaults to 3001)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (defaults to 60000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (defaults to 20)
- `RATE_LIMIT_HOURLY_MAX` - Max requests per hour (defaults to 300)

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Build and test locally first:**
```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Build client
npm run client:build

# Test the build
npm run preview
```

2. **Deploy to preview:**
```bash
vercel
```

3. **Deploy to production:**
```bash
vercel --prod
```

### Option 2: Deploy via GitHub (Recommended)

1. **Push your code to GitHub:**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset:** Other
     - **Root Directory:** (leave empty)
     - **Build Command:** `cd client && npm install && npm run build`
     - **Output Directory:** `client/dist`
     - **Install Command:** `npm install`

3. **Add Environment Variables:**
   - Add all required environment variables in the Vercel dashboard

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy

## Project Structure

```
JDMatch/
├── api/
│   └── server.js          # Vercel serverless function
├── client/
│   ├── dist/              # Built frontend (generated)
│   └── src/               # Frontend source
├── server/
│   └── index.js           # Express server
└── vercel.json            # Vercel configuration
```

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test the health endpoint: `https://your-domain.vercel.app/health`
- [ ] Test API endpoint: `https://your-domain.vercel.app/api/trpc`
- [ ] Test file upload functionality
- [ ] Verify CORS settings match your domain
- [ ] Check Vercel function logs for any errors

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (should be 18.x)
- Check build logs in Vercel dashboard

### API Routes Not Working
- Verify `vercel.json` routes configuration
- Check that `api/server.js` exists
- Verify environment variables are set

### CORS Errors
- Update CORS origin in `server/index.js` to include your Vercel domain
- Check that credentials are properly configured

### Environment Variables Not Loading
- Ensure variables are set in Vercel dashboard
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Updating CORS for Production

After deployment, update the CORS origin in `server/index.js`:

```javascript
origin: process.env.NODE_ENV === 'production' 
  ? ['https://your-actual-domain.vercel.app'] 
  : ['http://localhost:5173', 'http://localhost:3000'],
```

Replace `your-actual-domain.vercel.app` with your actual Vercel deployment URL.
