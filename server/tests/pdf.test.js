import { describe, test, expect, jest } from '@jest/globals';
import { parsePDF, validatePDFFile } from '../services/pdfService.js';

// Mock pdf-parse
jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import pdf from 'pdf-parse';

describe('PDF Service', () => {
  beforeEach(() => {
    pdf.mockClear();
  });

  test('should parse PDF successfully', async () => {
    const mockText = 'This is sample PDF content';
    pdf.mockResolvedValueOnce({ text: mockText });

    const base64Data = 'data:application/pdf;base64,testdata';
    const result = await parsePDF(base64Data);

    expect(result).toBe(mockText);
    expect(pdf).toHaveBeenCalledWith(expect.any(Buffer));
  });

  test('should handle empty PDF', async () => {
    pdf.mockResolvedValueOnce({ text: '' });

    const base64Data = 'data:application/pdf;base64,testdata';
    
    await expect(parsePDF(base64Data)).rejects.toThrow('PDF appears to be empty or contains no extractable text');
  });

  test('should handle PDF parsing errors', async () => {
    pdf.mockRejectedValueOnce(new Error('PDF parsing failed'));

    const base64Data = 'data:application/pdf;base64,testdata';
    
    await expect(parsePDF(base64Data)).rejects.toThrow('Failed to parse PDF: PDF parsing failed');
  });

  test('should validate PDF file successfully', () => {
    const validFile = {
      type: 'application/pdf',
      size: 1024 * 1024, // 1MB
    };

    expect(() => validatePDFFile(validFile)).not.toThrow();
  });

  test('should reject file that is too large', () => {
    const largeFile = {
      type: 'application/pdf',
      size: 20 * 1024 * 1024, // 20MB
    };

    expect(() => validatePDFFile(largeFile)).toThrow('File size exceeds maximum allowed size');
  });

  test('should reject invalid file type', () => {
    const invalidFile = {
      type: 'text/plain',
      size: 1024,
    };

    expect(() => validatePDFFile(invalidFile)).toThrow('File type text/plain is not allowed');
  });
});