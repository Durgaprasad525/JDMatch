/**
 * Utility functions to extract candidate information from CV text
 */

/**
 * Extracts email address from text using regex
 * @param {string} text - CV text
 * @returns {string|null} Email address or null if not found
 */
export function extractEmail(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Common email regex pattern
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  
  if (matches && matches.length > 0) {
    // Return the first email found (usually the primary one)
    return matches[0].toLowerCase();
  }
  
  return null;
}

/**
 * Extracts candidate name from CV text
 * Usually found in the first few lines
 * @param {string} text - CV text
 * @returns {string|null} Candidate name or null if not found
 */
export function extractName(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Split into lines and get first few lines (usually contains name)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) return null;
  
  // Check first 5 lines for name (usually at the top)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    
    // Skip lines that are clearly not names
    if (
      line.toLowerCase().includes('resume') ||
      line.toLowerCase().includes('cv') ||
      line.toLowerCase().includes('curriculum') ||
      line.toLowerCase().includes('phone') ||
      line.toLowerCase().includes('email') ||
      line.toLowerCase().includes('address') ||
      line.match(/^\d+/) || // Starts with number
      line.length > 100 || // Too long to be a name
      line.match(/^[A-Z\s]{20,}$/) // All caps and too long (likely a header)
    ) {
      continue;
    }
    
    // Check if line looks like a name (2-4 words, proper case, no special chars except hyphens/apostrophes)
    const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;
    if (namePattern.test(line)) {
      return line;
    }
    
    // Also check for names with hyphens or apostrophes
    const namePatternExtended = /^[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?(?:\s+[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?){0,2}$/;
    if (namePatternExtended.test(line)) {
      return line;
    }
  }
  
  // Fallback: return first non-empty line if it's reasonable
  const firstLine = lines[0];
  if (firstLine && firstLine.length > 2 && firstLine.length < 80 && !firstLine.match(/^[^A-Za-z]/)) {
    return firstLine;
  }
  
  return null;
}

/**
 * Extracts candidate information from CV text
 * @param {string} cvText - CV text content
 * @returns {Object} Object with name and email
 */
export function extractCandidateInfo(cvText) {
  const name = extractName(cvText);
  const email = extractEmail(cvText);
  
  return {
    name: name || 'Candidate',
    email: email || null,
  };
}
