import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { analyzeDocuments } from '../services/analysisService.js';
import { parsePDF } from '../services/pdfService.js';

export const analysisRouter = router({
  analyze: publicProcedure
    .input(z.object({
      jobDescription: z.string(),
      cv: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeDocuments(input.jobDescription, input.cv);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('Analysis error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }
    }),

  uploadAndAnalyze: publicProcedure
    .input(z.object({
      jobDescriptionFile: z.string(), // base64 encoded PDF
      cvFile: z.string(), // base64 encoded PDF
    }))
    .mutation(async ({ input }) => {
      try {
        // Parse PDFs
        const jobDescriptionText = await parsePDF(input.jobDescriptionFile);
        const cvText = await parsePDF(input.cvFile);

        // Analyze documents
        const result = await analyzeDocuments(jobDescriptionText, cvText);
        
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('Upload and analysis error:', error);
        throw new Error(`Upload and analysis failed: ${error.message}`);
      }
    }),
});
