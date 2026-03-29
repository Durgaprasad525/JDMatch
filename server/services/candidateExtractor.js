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

  const skipWords = [
    'resume', 'cv', 'curriculum', 'vitae', 'phone', 'email', 'address',
    'objective', 'summary', 'experience', 'education', 'skills', 'profile',
    'please', 'attached', 'dear', 'sir', 'madam', 'http', 'www', 'linkedin'
  ];

  // Check first 8 lines for name (usually at the top)
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip lines that are clearly not names
    if (
      skipWords.some(w => lower.includes(w)) ||
      line.match(/^\d/) ||           // Starts with number
      line.match(/@/) ||             // Contains email
      line.match(/^\+?\d[\d\s-]+/) || // Phone number
      line.length > 60 ||            // Too long to be a name
      line.length < 3 ||             // Too short
      line.split(/\s+/).length > 5   // Too many words
    ) {
      continue;
    }

    // Proper case: "John Smith", "Mary Jane O'Brien"
    if (/^[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?){0,3}$/.test(line)) {
      return line;
    }

    // ALL CAPS name: "JOHN SMITH" → convert to title case
    if (/^[A-Z]{2,}(?:\s+[A-Z]{2,}){0,3}$/.test(line) && line.length < 40) {
      return line.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }

    // Mixed: "JOHN smith" or "john SMITH" — 2-4 words, all alpha
    if (/^[A-Za-z]+(?:\s+[A-Za-z]+){0,3}$/.test(line) && line.length < 40 && line.split(/\s+/).length >= 2) {
      return line.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  // Fallback: first reasonable line that looks name-like (2+ alpha words, short)
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    if (
      line.length >= 3 &&
      line.length < 50 &&
      /^[A-Za-z]/.test(line) &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4 &&
      !skipWords.some(w => line.toLowerCase().includes(w))
    ) {
      return line;
    }
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
