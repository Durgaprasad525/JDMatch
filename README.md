# JDMatch - Stop Guessing if CVs Match Your Job Posts

Look, I got tired of spending hours figuring out if a candidate's CV actually matches what we're looking for. So I built this thing.

JDMatch uses AI to compare job descriptions with CVs and tells you if they're a good fit. Upload both documents, get a score and detailed breakdown. Simple as that.

**Try it here**: https://jdm-atch.vercel.app

## Getting Started (Actually Easy This Time)

```bash
git clone https://github.com/yourusername/JDMatch.git
cd JDMatch
npm install
cd server && npm install && cd ../client && npm install && cd ..
```

Copy the env file and add your API key:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

Start it up:
```bash
npm run dev
```

That's it. Frontend runs on http://localhost:5173, backend on http://localhost:3001.

## What You Need

- Node.js 18 or newer


That's literally it. No Docker, no databases, no complicated setup.

## How It Works

Upload a job description and a CV (both as PDFs), and you get:

- Overall match score (0-100)
- What the candidate is good at
- What they're missing
- Breakdown by technical skills, experience, education
- Whether you should interview them or not

The AI actually reads through both documents and gives you useful insights, not just keyword matching.

## Project Structure

```
JDMatch/
├── client/          # React frontend
│   └── src/
│       └── components/
│           └── __tests__/  # Frontend tests
├── server/          # Node.js backend
│   └── tests/       # Backend tests
├── test/            # Sample data files
└── package.json     # Scripts to run everything
```

Most of your time will be spent in `client/src` or `server/` folders.

## Development

Start both frontend and backend:
```bash
npm run dev
```

Or run them separately:
```bash
npm run dev:client    # Just frontend
npm run dev:server    # Just backend
```

## Testing Your Changes

```bash
npm test              # Run all tests (frontend + backend)
npm run client:test   # Run only frontend tests (with watch mode)
npm run server:test   # Run only backend tests
```

**Frontend Tests**: Uses Vitest with React Testing Library
- Tests are in `client/src/components/__tests__/`
- Run with `npm run client:test` (includes watch mode)

**Backend Tests**: Uses Jest with ES modules support
- Tests are in `server/tests/`
- Run with `npm run server:test`

I've included some sample job descriptions and CVs in the `test/data/` folder so you can test without needing real files.

## API Usage

The main endpoint is `/api/trpc/analysis.analyze`. Send it job description text and CV text:

```javascript
{
  "jobDescription": "We need a React developer...",
  "cv": "I'm a React developer with 3 years..."
}
```

You get back:
```javascript
{
  "success": true,
  "data": {
    "overallScore": 85,
    "strengths": ["Good React skills", "Solid experience"],
    "weaknesses": ["No backend experience mentioned"],
    // ... more details
  }
}
```

There's also an endpoint for uploading PDF files directly if you don't want to extract text first.

## Configuration

Edit `.env` for your setup:

```bash
GEMINI_API_KEY=your_key_here          # Required
PORT=3001                             # Optional, defaults to 3001
RATE_LIMIT_MAX_REQUESTS=20           # API calls per minute
RATE_LIMIT_HOURLY_MAX=300            # API calls per hour
MAX_FILE_SIZE=10485760               # 10MB file size limit
```

## Common Problems

**"Can't parse this PDF"**
- Make sure it's not password protected
- Some scanned PDFs don't work great
- Try a different PDF if possible

**"API key doesn't work"**
- Double-check you copied it correctly
- Make sure you're using the right Gemini API endpoint
- Check if your API has usage limits

**"Frontend won't connect to backend"**
- Make sure both are running (npm run dev starts both)
- Check if something else is using port 3001
- Look at the browser console for errors

## Deploying

I use Vercel because it's simple:

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set these environment variables in Vercel:
- `GEMINI_API_KEY` - your production API key
- `NODE_ENV=production`

The whole thing deploys as a single app, no separate backend deployment needed.


## Tech Stack

**Backend:**
- Node.js with Express
- Invoke API for the AI magic
- pdf-parse for reading PDF files
- Some basic rate limiting and security

**Frontend:**
- React (functional components, hooks)
- Vite for fast builds
- Tailwind CSS for styling
- File upload with drag and drop

Nothing fancy, just solid tools that work.

## Performance

The AI API can be a bit slow sometimes (2-5 seconds), but that's way faster than reading CVs manually.

I've added rate limiting so you don't accidentally spam the API and blow through your quota.

File uploads are limited to 10MB - that should be plenty for any reasonable CV or job description.

## Security

Basic stuff is covered:
- File type validation (PDFs only)
- Size limits
- Rate limiting
- CORS headers
- Input sanitization

Don't put sensitive data in your job descriptions or CVs if you're worried about it.

## What's Missing

Some things I might add later:
- Word doc support (PDFs work better for now)
- Batch processing multiple CVs
- Save results to compare candidates
- Integration with job boards or ATS systems


## Getting Help


## License

MIT - do whatever you want with it.

## Final Notes


The AI isn't perfect - it sometimes misses context or overweights certain keywords. But it's consistently better than my tired brain at 5 PM trying to read the 20th CV of the day.

---
