# JDMatch - AI-Powered Job Matching

A modern web application that uses AI to analyze job descriptions and CVs, providing intelligent matching insights and recommendations.

## 🚀 Features

- **PDF Upload & Processing**: Upload job descriptions and CVs as PDF files
- **AI-Powered Analysis**: Uses Gemini 1.5 Flash for intelligent document analysis
- **Comprehensive Scoring**: Overall match score with detailed breakdowns
- **Detailed Insights**: Strengths, weaknesses, key matches, and missing requirements
- **Actionable Recommendations**: Specific suggestions for improvement
- **Modern UI**: Built with React, Tailwind CSS, and tRPC
- **Type Safety**: Full TypeScript support with tRPC
- **Rate Limiting**: Built-in protection against abuse

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express
- **tRPC** for type-safe APIs
- **pdf-parse** for PDF text extraction
- **Gemini 1.5 Flash** for AI analysis
- **Zod** for input validation
- **Helmet** for security
- **Rate limiting** for API protection

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **tRPC** for type-safe API calls
- **React Query** for data fetching
- **React Router** for navigation
- **React Dropzone** for file uploads
- **Lucide React** for icons

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Gemini API key (provided separately)

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd JDMatch
npm install
\`\`\`

### 2. Environment Setup

Copy the example environment file and configure your settings:

\`\`\`bash
cp env.example .env
\`\`\`

Edit `.env` with your configuration:

\`\`\`env
# Server Configuration
PORT=3001
NODE_ENV=development

# Gemini API Configuration
GEMINI_API_URL=https://intertest.woolf.engineering/invoke
GEMINI_API_KEY=your_gemini_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf
\`\`\`

### 3. Install Dependencies

\`\`\`bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
\`\`\`

### 4. Start Development Servers

\`\`\`bash
# From the root directory
npm run dev
\`\`\`

This will start:
- Backend server on http://localhost:3001
- Frontend development server on http://localhost:5173

## 📁 Project Structure

\`\`\`
JDMatch/
├── server/                 # Backend API
│   ├── index.js           # Express server setup
│   ├── context.js         # tRPC context
│   ├── trpc.js            # tRPC configuration
│   ├── routers/           # API routes
│   │   ├── index.js       # Main router
│   │   └── analysis.js    # Analysis endpoints
│   └── services/          # Business logic
│       ├── analysisService.js  # AI analysis
│       └── pdfService.js       # PDF processing
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utilities
│   │   └── main.jsx       # App entry point
│   ├── index.html
│   └── vite.config.js
├── package.json           # Root package.json
├── vercel.json           # Deployment config
└── README.md
\`\`\`

## 🔧 API Endpoints

### tRPC Procedures

- \`analysis.analyze\` - Analyze text documents directly
- \`analysis.uploadAndAnalyze\` - Upload PDFs and analyze

### REST Endpoints

- \`GET /health\` - Health check
- \`POST /api/trpc/*\` - tRPC endpoints

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run server tests only
npm run server:test

# Run client tests only
npm run client:test
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment

\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

## 🔒 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PORT\` | Server port | 3001 |
| \`NODE_ENV\` | Environment | development |
| \`GEMINI_API_URL\` | Gemini API endpoint | https://intertest.woolf.engineering/invoke |
| \`GEMINI_API_KEY\` | Gemini API key | Required |
| \`RATE_LIMIT_WINDOW_MS\` | Rate limit window | 60000 |
| \`RATE_LIMIT_MAX_REQUESTS\` | Max requests per window | 20 |
| \`MAX_FILE_SIZE\` | Max file size in bytes | 10485760 |
| \`ALLOWED_FILE_TYPES\` | Allowed file types | application/pdf |

## 📊 Rate Limits

- **20 requests per minute** per IP
- **300 requests per hour** per IP
- Configurable via environment variables

## 🛡️ Security Features

- **Helmet.js** for security headers
- **CORS** protection
- **Rate limiting** to prevent abuse
- **File type validation**
- **File size limits**
- **Input validation** with Zod

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the example environment configuration

## 🔄 Changelog

### v1.0.0
- Initial release
- PDF upload and analysis
- AI-powered matching
- Modern React UI
- tRPC integration
- Rate limiting and security
