import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (two levels up from this file)
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuration constants
const API_CONFIG = {
  MODEL: "gemini-1.5-flash",
  MAX_TOKENS: 800,
  TEMPERATURE: 0.7,
  MIN_JOB_DESCRIPTION_LENGTH: 50,
  MIN_CV_LENGTH: 100,
  MAX_INPUT_LENGTH: 50000
};

const API_URL = process.env.API_URL;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!API_URL || !AUTH_TOKEN) {
  console.error('Missing required environment variables:');
  console.error('API_URL:', API_URL ? 'Set' : 'Missing');
  console.error('AUTH_TOKEN:', AUTH_TOKEN ? 'Set' : 'Missing');
  console.error('Please check your .env file or environment configuration');
  process.exit(1);
}

/**
 * Custom error classes for better error categorization
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class APIError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

/**
 * Validates input parameters for document analysis
 * @param {string} jobDescription - The job posting text
 * @param {string} cv - The candidate's CV text
 * @throws {ValidationError} When inputs are invalid
 */
function validateInputs(jobDescription, cv) {
  // Check if inputs exist
  if (!jobDescription || !cv) {
    throw new ValidationError('Both jobDescription and cv are required');
  }

  // Check data types
  if (typeof jobDescription !== 'string' || typeof cv !== 'string') {
    throw new ValidationError('Both jobDescription and cv must be strings');
  }

  // Trim whitespace for length checks
  const trimmedJobDesc = jobDescription.trim();
  const trimmedCV = cv.trim();

  // Check if inputs are not just whitespace
  if (!trimmedJobDesc || !trimmedCV) {
    throw new ValidationError('Both jobDescription and cv must contain actual content');
  }

  // Check minimum length requirements
  if (trimmedJobDesc.length < API_CONFIG.MIN_JOB_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `Job description too short. Minimum ${API_CONFIG.MIN_JOB_DESCRIPTION_LENGTH} characters required, got ${trimmedJobDesc.length}`
    );
  }

  if (trimmedCV.length < API_CONFIG.MIN_CV_LENGTH) {
    throw new ValidationError(
      `CV too short. Minimum ${API_CONFIG.MIN_CV_LENGTH} characters required, got ${trimmedCV.length}`
    );
  }

  // Check maximum length to prevent API abuse
  if (trimmedJobDesc.length > API_CONFIG.MAX_INPUT_LENGTH) {
    throw new ValidationError(
      `Job description too long. Maximum ${API_CONFIG.MAX_INPUT_LENGTH} characters allowed`
    );
  }

  if (trimmedCV.length > API_CONFIG.MAX_INPUT_LENGTH) {
    throw new ValidationError(
      `CV too long. Maximum ${API_CONFIG.MAX_INPUT_LENGTH} characters allowed`
    );
  }

  // Basic content validation - check if inputs look realistic
  const jobDescWords = trimmedJobDesc.split(/\s+/).length;
  const cvWords = trimmedCV.split(/\s+/).length;

  if (jobDescWords < 10) {
    throw new ValidationError('Job description appears too short to be valid (less than 10 words)');
  }

  if (cvWords < 20) {
    throw new ValidationError('CV appears too short to be valid (less than 20 words)');
  }
}

/**
 * Handles different types of API errors with specific messages
 * @param {Error} error - The caught error
 * @param {Response} response - The fetch response (if available)
 * @throws {APIError} Categorized API error
 */
function handleAPIError(error, response = null) {
  // Network/connection errors
  if (error.name === 'TypeError' && (
    error.message.includes('fetch') || 
    error.message.includes('Failed to fetch') ||
    error.message.includes('network')
  )) {
    throw new APIError(
      'Network error: Unable to connect to AI service. Please check your internet connection.',
      0
    );
  }

  // HTTP status code errors
  if (response) {
    const status = response.status;
    
    switch (status) {
      case 400:
        throw new APIError('Bad request: Invalid request format or parameters', status);
      case 401:
        throw new APIError('Authentication failed: Invalid or missing API key', status);
      case 403:
        throw new APIError('Access forbidden: API key does not have required permissions', status);
      case 404:
        throw new APIError('API endpoint not found: Please check the API URL configuration', status);
      case 429:
        throw new APIError('Rate limit exceeded: Too many requests. Please try again later', status);
      case 500:
        throw new APIError('AI service internal error: The service is temporarily unavailable', status);
      case 502:
      case 503:
      case 504:
        throw new APIError('AI service unavailable: Please try again in a few minutes', status);
      default:
        throw new APIError(`AI service error: HTTP ${status} ${response.statusText}`, status);
    }
  }

  // JSON parsing errors
  if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    throw new APIError('Invalid response format: Unable to parse AI service response');
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    throw new APIError('Request timeout: AI service took too long to respond');
  }

  // Generic error fallback
  throw new APIError(`Unexpected error: ${error.message}`);
}

/**
 * Creates mock analysis data for testing purposes
 * @returns {Object} Mock analysis result
 */
function createMockResponse() {
  return {
    overallScore: 85,
    strengths: [
      "Strong technical background in React and Node.js",
      "5+ years of relevant experience",
      "Previous work in similar industry",
      "Excellent problem-solving skills",
      "Good communication abilities"
    ],
    weaknesses: [
      "Limited experience with TypeScript",
      "No experience with cloud platforms (AWS/Azure)",
      "Gap in employment history (2020-2021)",
      "Limited leadership experience"
    ],
    alignment: {
      technicalSkills: 80,
      experience: 90,
      education: 75,
      softSkills: 85
    },
    recommendations: [
      "Consider additional training in TypeScript to meet job requirements",
      "Highlight relevant project experience in cover letter",
      "Address employment gap with explanation of personal development activities",
      "Emphasize any leadership or mentoring experience",
      "Consider obtaining cloud platform certifications"
    ],
    summary: "The candidate shows strong potential with relevant technical skills and experience. While there are some gaps in specific technologies mentioned in the job description, the overall profile aligns well with the role requirements. The candidate's experience in similar projects and strong problem-solving skills make them a competitive applicant. With some additional training in the missing technologies, they would be an excellent fit for the position.",
    keyMatches: [
      "React development experience",
      "Node.js backend knowledge",
      "Agile methodology experience",
      "Database management skills",
      "Version control proficiency"
    ],
    missingRequirements: [
      "TypeScript proficiency",
      "AWS/Cloud experience",
      "Team leadership experience",
      "Docker containerization knowledge"
    ]
  };
}

/**
 * Analyzes job description against CV using AI service
 * @param {string} jobDescription - The job posting text
 * @param {string} cv - The candidate's CV text
 * @returns {Promise<Object>} Analysis results with scores and recommendations
 * @throws {ValidationError} When inputs are invalid
 * @throws {APIError} When API call fails
 */
export async function analyzeDocuments(jobDescription, cv) {
  // Step 1: Validate inputs
  try {
    validateInputs(jobDescription, cv);
  } catch (error) {
    // Re-throw validation errors with clear context
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Input validation failed: ${error.message}`);
  }

  // Step 2: Check if we have mock data
  const isMockData = jobDescription.includes('Mock PDF content') || cv.includes('Mock PDF content');
  
  if (isMockData) {
    console.log('Using mock data for analysis');
    return createMockResponse();
  }

  // Step 3: Call real AI service with improved error handling
  let response;
  try {
    console.log('Calling API for analysis...');
    
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_TOKEN, 
      },
      body: JSON.stringify({
        model: API_CONFIG.MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Compare the job description and CV and return JSON with overallScore, strengths, weaknesses, alignmentScores, recommendations, summary, keyMatches, and missingRequirements.

Job Description: ${jobDescription}

CV: ${cv}`
              }
            ]
          }
        ],
        generation_config: {
          max_output_tokens: API_CONFIG.MAX_TOKENS,
          temperature: API_CONFIG.TEMPERATURE
        }
      })
    });

    // Check if response is ok before proceeding
    if (!response.ok) {
      handleAPIError(new Error(`HTTP ${response.status}`), response);
    }

  } catch (error) {
    console.error('API call failed:', error.message);
    handleAPIError(error, response);
  }

  // Step 4: Parse response with error handling
  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error('Failed to parse API response as JSON:', error.message);
    handleAPIError(error);
  }

  // Step 5: Extract AI response
  const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiResponse) {
    throw new APIError('No AI response received: Empty or invalid response format');
  }

  // Step 6: Parse and transform AI response
  try {
    // Extract JSON from code block if present
    let jsonText = aiResponse;
    if (aiResponse.includes('```json')) {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else if (aiResponse.includes('```')) {
      // Handle other code block formats
      const jsonMatch = aiResponse.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    }
    
    const parsedResponse = JSON.parse(jsonText);
    
    // Transform alignmentScores to alignment format for UI compatibility
    if (parsedResponse.alignmentScores) {
      parsedResponse.alignment = {
        technicalSkills: Math.round((parsedResponse.alignmentScores.skills || 0) * 100),
        experience: Math.round((parsedResponse.alignmentScores.experience || 0) * 100),
        education: Math.round((parsedResponse.alignmentScores.qualifications || 0) * 100),
        softSkills: Math.round((parsedResponse.alignmentScores.responsibilities || 0) * 100)
      };
    }
    
    // Ensure overallScore is a percentage
    if (parsedResponse.overallScore && parsedResponse.overallScore <= 1) {
      parsedResponse.overallScore = Math.round(parsedResponse.overallScore * 100);
    }

    // Validate required fields are present
    const requiredFields = ['overallScore', 'strengths', 'weaknesses'];
    const missingFields = requiredFields.filter(field => !parsedResponse[field]);
    
    if (missingFields.length > 0) {
      console.warn(`AI response missing required fields: ${missingFields.join(', ')}`);
      // Continue with partial response rather than failing completely
    }
    
    console.log('Analysis completed successfully');
    return parsedResponse;

  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', parseError.message);
    
    // If AI doesn't return JSON, create structured response from text
    console.log('Falling back to text-based response');
    return {
      overallScore: 75,
      strengths: ["AI analysis completed - see summary for details"],
      weaknesses: ["AI response format needs improvement"],
      alignment: {
        technicalSkills: 70,
        experience: 75,
        education: 70,
        softSkills: 80
      },
      recommendations: ["Review AI analysis in summary section"],
      summary: aiResponse,
      keyMatches: ["AI analysis completed"],
      missingRequirements: ["AI response formatting"]
    };
  }
}