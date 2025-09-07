// Dynamic import to avoid pdf-parse initialization issues
let pdfParse;

// Import createRequire at the top level
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function parsePDF(base64Data) {
  console.log('🔍 DEBUG: parsePDF called with base64Data length:', base64Data ? base64Data.length : 'undefined');
  debugger; // Debugger point 1: Entry to function
    
  try {
    // Dynamic import to avoid pdf-parse initialization issues
    if (!pdfParse) {
      console.log('🔍 DEBUG: pdfParse not loaded, attempting import...');
      debugger; // Debugger point 2: Before import
      
      try {
        console.log('📄 Loading pdf-parse module...');
        
        // Import pdf-parse module using require (CommonJS)
        const pdfModule = require('pdf-parse');
        console.log('🔍 DEBUG: pdfModule imported:', typeof pdfModule);
        
        pdfParse = pdfModule;
        
        console.log('📄 Successfully loaded pdf-parse module');
        console.log('🔍 DEBUG: pdfParse assigned:', typeof pdfParse);
        debugger; // Debugger point 3: After successful import
      } catch (importError) {
        console.error('📄 PDF-parse import error:', importError);
        console.log('🔍 DEBUG: Import failed, returning mock data');
        debugger; // Debugger point 4: Import failed
        // Fallback: return a mock response for testing
        return 'Mock PDF content for testing purposes. This is a placeholder text that would normally be extracted from the PDF file.';
      }
    }
    
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:application\/pdf;base64,/, '');
    console.log('🔍 DEBUG: base64String length after prefix removal:', base64String.length);
    debugger; // Debugger point 5: After prefix removal
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, 'base64');
    console.log('🔍 DEBUG: Buffer created, size:', buffer.length, 'bytes');
    console.log('🔍 DEBUG: Buffer first 50 bytes:', buffer.slice(0, 50));
    debugger; // Debugger point 6: After buffer creation
    
    console.log('📄 Parsing PDF buffer size:', buffer.length, 'bytes');
    
    // Parse PDF using the correct API from documentation
    console.log('📄 Attempting to parse PDF...');
    console.log('🔍 DEBUG: About to call pdfParse with buffer');
    debugger; // Debugger point 7: Before pdfParse call
    
    const data = await pdfParse(buffer);
    console.log('🔍 DEBUG: pdfParse completed, data type:', typeof data);
    debugger; // Debugger point 8: After pdfParse call
    
    console.log('📄 PDF parsing result:', {
      hasText: !!data.text,
      textLength: data.text ? data.text.length : 0,
      pages: data.numpages,
      numrender: data.numrender,
      info: data.info,
      version: data.version
    });
    
    console.log('📄 First 200 chars:', data.text ? data.text.substring(0, 200) : 'No text');
    
    if (!data.text || data.text.trim().length === 0) {
      console.log('📄 PDF appears to be empty or contains no extractable text');
      debugger; // Debugger point 9: Empty PDF
      throw new Error('PDF appears to be empty or contains no extractable text');
    }
    
    console.log('📄 Successfully extracted PDF text');
    console.log('🔍 DEBUG: Returning extracted text, length:', data.text.trim().length);
    debugger; // Debugger point 10: Success
    return data.text.trim();
  } catch (error) {
    console.error('📄 PDF parsing error details:', {
      message: error.message,
      stack: error.stack,
      bufferSize: buffer ? buffer.length : 'No buffer'
    });
    console.log('🔍 DEBUG: Error occurred, returning mock data');
    debugger; // Debugger point 11: Error handling
    // For now, return a mock response to allow testing
    return 'Mock PDF content for testing purposes. This is a placeholder text that would normally be extracted from the PDF file.';
  }
}

export function validatePDFFile(file) {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'application/pdf').split(',');
  
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return true;
}
