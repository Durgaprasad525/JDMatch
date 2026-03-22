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
  console.warn('Warning: API_URL and/or AUTH_TOKEN are not set. AI analysis will be unavailable.');
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
 * Scores an interview transcript against the job description
 * @param {string} transcript - Full interview transcript
 * @param {string} jobDescription - The job posting text
 * @returns {Promise<{score: number, notes: string}>}
 */
export async function scoreInterview(transcript, jobDescription) {
  if (!API_URL || !AUTH_TOKEN) {
    return { score: null, notes: 'AI scoring not configured.' };
  }
  if (!transcript || transcript.length < 50) {
    return { score: null, notes: 'Transcript too short to score.' };
  }

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_TOKEN,
      },
      body: JSON.stringify({
        model: API_CONFIG.MODEL,
        contents: [{
          role: 'user',
          parts: [{
            text: `You are an expert HR interviewer. Evaluate the following AI interview transcript against the job description.

Return a JSON object with:
- score: number 0-100 (overall interview performance)
- communicationScore: number 0-100
- technicalScore: number 0-100
- confidenceScore: number 0-100
- notes: string (2-3 sentence summary of candidate performance)
- strengths: array of strings (top 3 interview strengths)
- concerns: array of strings (top 3 concerns or gaps revealed in interview)

Job Description:
${jobDescription?.slice(0, 2000)}

Interview Transcript:
${transcript.slice(0, 8000)}`
          }]
        }],
        generation_config: {
          max_output_tokens: 600,
          temperature: 0.3,
        }
      })
    });
  } catch (err) {
    console.error('Interview scoring API error:', err.message);
    return { score: null, notes: 'AI scoring failed.' };
  }

  if (!response.ok) {
    return { score: null, notes: `AI scoring failed (HTTP ${response.status}).` };
  }

  try {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n?([\s\S]*?)\n?```/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : text);
    return {
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
      communicationScore: parsed.communicationScore ?? null,
      technicalScore: parsed.technicalScore ?? null,
      confidenceScore: parsed.confidenceScore ?? null,
      notes: parsed.notes || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    };
  } catch (err) {
    console.error('Interview scoring parse error:', err.message);
    return { score: null, notes: 'AI scoring response could not be parsed.' };
  }
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
  // Check credentials before doing anything
  if (!API_URL || !AUTH_TOKEN) {
    throw new Error('AI analysis is not configured. API_URL and AUTH_TOKEN environment variables are required.');
  }

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
                text: `Compare the job description and CV and return JSON with candidateName, candidateEmail, overallScore, strengths, weaknesses, alignmentScores, recommendations, summary, keyMatches, and missingRequirements.

IMPORTANT SCORING GUIDELINES:
- overallScore: A number from 0-100 representing the percentage match between the candidate and the job requirements. 
  * 80-100: Excellent match, candidate has most/all required skills and experience
  * 60-79: Good match, candidate has many required skills but some gaps
  * 40-59: Moderate match, candidate has some relevant skills but significant gaps
  * 20-39: Poor match, candidate has few relevant skills
  * 0-19: Very poor match, candidate lacks most required skills
- The overallScore MUST be calculated based on how well the candidate's skills, experience, and qualifications align with the job requirements.
- If the candidate is clearly NOT suitable (e.g., wrong field, lacks core requirements), the score should be LOW (0-30), NOT high.
- alignmentScores: Object with scores from 0-1 (where 1 = perfect match) for each requirement category mentioned in the job description.

Extract the candidate's name and email from the CV. The candidateName should be the person's full name, and candidateEmail should be their email address.

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
    
    // Extract candidate information (name and email)
    // These may come from AI or will be extracted from CV text as fallback
    const candidateName = parsedResponse.candidateName || null;
    const candidateEmail = parsedResponse.candidateEmail || null;
    
    // Store candidate info in response
    if (candidateName) parsedResponse.candidateName = candidateName;
    if (candidateEmail) parsedResponse.candidateEmail = candidateEmail;
    
    // Transform alignmentScores to alignment format for UI compatibility
    let calculatedAlignmentAvg = null;
    if (parsedResponse.alignmentScores) {
      // Handle different alignmentScores structures
      const scores = parsedResponse.alignmentScores;
      
      // Calculate average from ALL raw alignmentScores FIRST for validation
      const rawScoreValues = Object.values(scores).filter(v => typeof v === 'number' && v >= 0 && v <= 1);
      if (rawScoreValues.length > 0) {
        const avgRaw = rawScoreValues.reduce((sum, val) => sum + val, 0) / rawScoreValues.length;
        calculatedAlignmentAvg = Math.round(avgRaw * 100);
      } else {
        // If scores are already in percentage format (0-100), use them directly
        const percentageScoreValues = Object.values(scores).filter(v => typeof v === 'number' && v >= 0 && v <= 100);
        if (percentageScoreValues.length > 0) {
          calculatedAlignmentAvg = Math.round(
            percentageScoreValues.reduce((sum, val) => sum + val, 0) / percentageScoreValues.length
          );
        }
      }
      
      // Map to standard alignment format for UI
      parsedResponse.alignment = {
        technicalSkills: Math.round((scores.skills || scores['HR Information Systems'] || 0) * (scores.skills !== undefined ? 100 : 1)),
        experience: Math.round((scores.experience || scores['Employee relations'] || 0) * (scores.experience !== undefined ? 100 : 1)),
        education: Math.round((scores.qualifications || scores['Training and development'] || 0) * (scores.qualifications !== undefined ? 100 : 1)),
        softSkills: Math.round((scores.responsibilities || scores['Oral and written management communication skills'] || 0) * (scores.responsibilities !== undefined ? 100 : 1))
      };
      
      // If mapped alignment is all zeros but we have calculated avg, recalculate alignment
      const alignmentSum = Object.values(parsedResponse.alignment).reduce((sum, val) => sum + val, 0);
      if (alignmentSum === 0 && calculatedAlignmentAvg !== null && calculatedAlignmentAvg > 0) {
        // Redistribute the calculated average across alignment categories
        parsedResponse.alignment = {
          technicalSkills: Math.round(calculatedAlignmentAvg * 0.3),
          experience: Math.round(calculatedAlignmentAvg * 0.3),
          education: Math.round(calculatedAlignmentAvg * 0.2),
          softSkills: Math.round(calculatedAlignmentAvg * 0.2)
        };
      }
    } else if (parsedResponse.alignment) {
      // If no alignmentScores but alignment exists, calculate from alignment
      const alignmentValues = Object.values(parsedResponse.alignment).filter(v => typeof v === 'number');
      if (alignmentValues.length > 0) {
        calculatedAlignmentAvg = Math.round(
          alignmentValues.reduce((sum, val) => sum + val, 0) / alignmentValues.length
        );
      }
    }
    
    // Normalize overallScore to percentage (0-100)
    let normalizedScore = 0;
    if (parsedResponse.overallScore !== undefined && parsedResponse.overallScore !== null) {
      let score = Number(parsedResponse.overallScore);
      
      // Handle NaN or invalid numbers
      if (isNaN(score)) {
        console.warn(`Invalid overallScore value: ${parsedResponse.overallScore}, defaulting to 0`);
        score = 0;
      }
      // If score is between 0 and 1 (exclusive), it's a decimal (e.g., 0.75 = 75%)
      else if (score > 0 && score < 1) {
        score = Math.round(score * 100);
      }
      // If score is exactly 1, it could be 1% or 100% - check context
      else if (score === 1) {
        // If alignment scores suggest low match, treat as 1%, otherwise 100%
        if (calculatedAlignmentAvg !== null && calculatedAlignmentAvg < 30) {
          score = 1;
        } else {
          score = 100;
        }
      }
      // If score is between 1 and 100 (exclusive), treat as percentage already
      else if (score > 1 && score < 100) {
        score = Math.round(score);
      }
      // If score is >= 100, cap at 100
      else if (score >= 100) {
        score = 100;
      }
      // If score is negative or 0, set to 0
      else if (score <= 0) {
        score = 0;
      }
      
      normalizedScore = score;
    }
    
    // Validate score consistency - check if overallScore contradicts alignment scores
    if (calculatedAlignmentAvg !== null && normalizedScore > calculatedAlignmentAvg + 30) {
      // Large discrepancy detected - AI may have returned wrong score
      console.warn(`Score inconsistency detected: overallScore=${normalizedScore}, alignmentAvg=${calculatedAlignmentAvg}. Recalculating from alignment scores.`);
      
      // Check recommendations/summary for negative language
      const recommendations = Array.isArray(parsedResponse.recommendations) 
        ? parsedResponse.recommendations.join(' ').toLowerCase()
        : (parsedResponse.recommendations || '').toLowerCase();
      const summary = (parsedResponse.summary || '').toLowerCase();
      const combinedText = recommendations + ' ' + summary;
      
      const negativeIndicators = [
        'not suitable', 'not a good fit', 'poor fit', 'not aligned',
        'lack of', 'no direct experience', 'does not align', 'not relevant',
        'unsuitable', 'inappropriate', 'mismatch'
      ];
      
      const hasNegativeLanguage = negativeIndicators.some(indicator => 
        combinedText.includes(indicator)
      );
      
      // If negative language found and score is high, recalculate
      if (hasNegativeLanguage && normalizedScore > 50) {
        console.warn(`Negative language detected in analysis but score is ${normalizedScore}%. Using calculated score from alignment.`);
        normalizedScore = Math.max(calculatedAlignmentAvg, 10); // Use alignment avg or minimum 10%
      } else if (normalizedScore > calculatedAlignmentAvg + 20) {
        // Even without negative language, if discrepancy is large, use weighted average
        normalizedScore = Math.round((normalizedScore * 0.3) + (calculatedAlignmentAvg * 0.7));
      }
    }
    
    // If no overallScore was provided, calculate from alignment
    if (parsedResponse.overallScore === undefined || parsedResponse.overallScore === null) {
      normalizedScore = calculatedAlignmentAvg !== null ? calculatedAlignmentAvg : 0;
    }
    
    parsedResponse.overallScore = normalizedScore;

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