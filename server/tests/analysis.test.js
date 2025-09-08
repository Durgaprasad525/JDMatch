import { describe, test, expect, jest } from '@jest/globals';
import { analyzeDocuments } from '../services/analysisService.js';

// Mock fetch
global.fetch = jest.fn();

describe('Analysis Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should analyze documents successfully', async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  overallScore: 85,
                  strengths: ['Strong technical background'],
                  weaknesses: ['Limited experience'],
                  alignment: {
                    technicalSkills: 80,
                    experience: 90,
                    education: 75,
                    softSkills: 85
                  },
                  recommendations: ['Consider additional training'],
                  summary: 'Good match overall',
                  keyMatches: ['React experience'],
                  missingRequirements: ['TypeScript knowledge']
                })
              }
            ]
          }
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const jobDescription = 'Looking for a React developer with 5+ years experience';
    const cv = 'Experienced React developer with 6 years of experience';

    const result = await analyzeDocuments(jobDescription, cv);

    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('weaknesses');
    expect(result).toHaveProperty('alignment');
    expect(result.overallScore).toBe(85);
  });

  test('should handle API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    const jobDescription = 'Test job description';
    const cv = 'Test CV';

    // The service returns fallback data instead of throwing errors
    const result = await analyzeDocuments(jobDescription, cv);
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('weaknesses');
  });

  test('should handle invalid API response', async () => {
    const mockResponse = {
      candidates: []
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const jobDescription = 'Test job description';
    const cv = 'Test CV';

    // The service returns fallback data instead of throwing errors
    const result = await analyzeDocuments(jobDescription, cv);
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('weaknesses');
  });
});
