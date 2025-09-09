import { createRequire } from 'module';

// Create require function for CommonJS modules
const require = createRequire(import.meta.url);

// Configuration constants
const CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB limit
  TIMEOUT_MS: 30000, // 30 second timeout
  FALLBACK_ENABLED: true,
  RETRY_ATTEMPTS: 2
};

// Custom error classes for better error handling
class PDFParseError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'PDFParseError';
    this.cause = cause;
  }
}

class PDFValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PDFValidationError';
  }
}

/**
 * Lazy-loaded PDF parser instance
 * Avoids initialization issues by loading only when needed
 */
class PDFParserService {
  constructor() {
    this._parser = null;
    this._isInitialized = false;
  }

  async _initializeParser() {
    if (this._isInitialized) return this._parser;

    try {
      // Attempt to load pdf-parse
      const pdfModule = require('pdf-parse');
      this._parser = pdfModule;
      this._isInitialized = true;
      return this._parser;
    } catch (error) {
      // Log the actual error for debugging
      console.warn('Failed to initialize PDF parser:', error.message);
      throw new PDFParseError('PDF parsing library unavailable', error);
    }
  }

  async parse(buffer, options = {}) {
    const parser = await this._initializeParser();
    
    // Set up timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new PDFParseError('PDF parsing timeout')), CONFIG.TIMEOUT_MS);
    });

    // Parse with timeout
    const parsePromise = parser(buffer, {
      // Default options - can be overridden
      max: 0, // Parse all pages
      version: 'v1.10.100', // Specify version for consistency
      ...options
    });

    return Promise.race([parsePromise, timeoutPromise]);
  }
}

const pdfParserService = new PDFParserService();

/**
 * Validates base64 PDF data
 * @param {string} base64Data - The base64 encoded PDF data
 * @throws {PDFValidationError} If validation fails
 */
function validatePDFData(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new PDFValidationError('Invalid input: base64Data must be a non-empty string');
  }

  // Extract base64 content, handling data URLs
  const base64Content = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data;

  if (!base64Content || base64Content.length === 0) {
    throw new PDFValidationError('Invalid base64 data: content is empty');
  }

  // Basic base64 validation
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Content)) {
    throw new PDFValidationError('Invalid base64 format');
  }

  // Estimate decoded size and check against limit
  const estimatedSize = (base64Content.length * 3) / 4;
  if (estimatedSize > CONFIG.MAX_FILE_SIZE) {
    throw new PDFValidationError(`File too large: ${Math.round(estimatedSize / 1024 / 1024)}MB (max: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  return base64Content;
}

/**
 * Creates a buffer from base64 data with error handling
 * @param {string} base64String - Valid base64 string
 * @returns {Buffer} The decoded buffer
 */
function createBufferFromBase64(base64String) {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    
    // Verify it's actually a PDF by checking magic bytes
    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      throw new PDFValidationError('Invalid PDF format: missing PDF signature');
    }
    
    return buffer;
  } catch (error) {
    if (error instanceof PDFValidationError) throw error;
    throw new PDFValidationError('Failed to decode base64 data: ' + error.message);
  }
}

/**
 * Attempts to parse PDF with retry logic
 * @param {Buffer} buffer - PDF buffer to parse
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Parse result
 */
async function attemptParse(buffer, attempt = 1) {
  try {
    const result = await pdfParserService.parse(buffer);
    
    if (!result || typeof result !== 'object') {
      throw new PDFParseError('Invalid parser response');
    }
    
    return result;
  } catch (error) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      console.warn(`PDF parse attempt ${attempt} failed, retrying...`, error.message);
      // Add exponential backoff delay
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      return attemptParse(buffer, attempt + 1);
    }
    throw error;
  }
}

/**
 * Generates fallback content when parsing fails
 * @param {Error} error - The error that caused fallback
 * @returns {string} Fallback content
 */
function generateFallbackContent(error) {
  const timestamp = new Date().toISOString();
  return `PDF Content Unavailable
  
Timestamp: ${timestamp}
Reason: ${error.message}

This is a fallback response. The PDF content could not be extracted due to parsing limitations or library unavailability. In a production environment, you might want to:

1. Use alternative PDF processing services
2. Implement OCR for image-based PDFs  
3. Provide manual content upload options
4. Cache successful parsing results

Error Type: ${error.name}`;
}

/**
 * Main PDF parsing function with comprehensive error handling
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {Object} options - Parsing options
 * @param {boolean} options.fallbackEnabled - Whether to return fallback content on failure
 * @param {boolean} options.strictMode - Whether to throw errors or return fallback
 * @returns {Promise<string>} Extracted text content
 */
export async function parsePDF(base64Data, options = {}) {
  const opts = {
    fallbackEnabled: CONFIG.FALLBACK_ENABLED,
    strictMode: false,
    ...options
  };

  try {
    // Validate input
    const validBase64 = validatePDFData(base64Data);
    
    // Create buffer
    const buffer = createBufferFromBase64(validBase64);
    
    // Parse with retry logic
    const parseResult = await attemptParse(buffer);
    
    // Extract and validate text
    const extractedText = parseResult.text?.trim();
    
    if (!extractedText || extractedText.length === 0) {
      throw new PDFParseError('No text content found in PDF - document may be image-based or encrypted');
    }

    return extractedText;

  } catch (error) {
    // Log error for monitoring/debugging
    console.error('PDF parsing failed:', {
      error: error.message,
      type: error.name,
      timestamp: new Date().toISOString()
    });

    // Handle different error scenarios
    if (opts.strictMode) {
      throw error;
    }

    if (opts.fallbackEnabled) {
      return generateFallbackContent(error);
    }

    // Default behavior - throw the error
    throw error;
  }
}

/**
 * Utility function to check if PDF parsing is available
 * @returns {Promise<boolean>} Whether PDF parsing is available
 */
export async function isPDFParsingAvailable() {
  try {
    await pdfParserService._initializeParser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get PDF metadata without full text extraction
 * @param {string} base64Data - Base64 encoded PDF data  
 * @returns {Promise<Object>} PDF metadata
 */
export async function getPDFMetadata(base64Data) {
  try {
    const validBase64 = validatePDFData(base64Data);
    const buffer = createBufferFromBase64(validBase64);
    const result = await attemptParse(buffer);
    
    return {
      pages: result.numpages || 0,
      info: result.info || {},
      metadata: result.metadata || null,
      version: result.version || 'unknown'
    };
  } catch (error) {
    throw new PDFParseError('Failed to extract PDF metadata: ' + error.message, error);
  }
}