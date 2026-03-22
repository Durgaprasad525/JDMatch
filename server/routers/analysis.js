import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { analyzeDocuments } from '../services/analysisService.js';
import { parsePDF } from '../services/pdfService.js';
import { extractCandidateInfo } from '../services/candidateExtractor.js';

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
        throw new Error(`Upload and analysis failed: ${error.message}`);
      }
    }),

  /** Batch: 1 JD + up to 10 CVs; returns list sorted by score (top to less) with full analysis per candidate */
  uploadAndAnalyzeBatch: publicProcedure
    .input(z.object({
      jobDescriptionFile: z.string(),
      cvFiles: z.array(z.string()).min(1).max(10),
    }))
    .mutation(async ({ input }) => {
      try {
        // Parse job description once
        const jobDescriptionText = await parsePDF(input.jobDescriptionFile);
        
        // Parse all CVs with individual error handling
        const cvTexts = await Promise.allSettled(
          input.cvFiles.map((base64) => parsePDF(base64))
        );

        // Check if any CV parsing failed
        const failedParses = cvTexts.filter((r) => r.status === 'rejected');
        if (failedParses.length > 0) {
          const errors = failedParses.map((r, idx) => 
            `CV ${idx + 1}: ${r.reason?.message || 'Failed to parse PDF'}`
          ).join('; ');
          throw new Error(`Failed to parse ${failedParses.length} CV(s): ${errors}`);
        }

        const parsedCvTexts = cvTexts.map((r) => r.value);

        // Analyze each CV with individual error handling
        const analysisResults = await Promise.allSettled(
          parsedCvTexts.map((cvText, index) =>
            Promise.all([
              analyzeDocuments(jobDescriptionText, cvText),
              Promise.resolve(extractCandidateInfo(cvText))
            ]).then(([data, candidateInfo]) => {
              // Prioritize AI-extracted info, fallback to regex extraction
              const candidateName = data.candidateName || candidateInfo.name || `Resume ${index + 1}`;
              const candidateEmail = data.candidateEmail || candidateInfo.email || null;
              
              return {
                cvIndex: index,
                overallScore: data.overallScore ?? 0,
                analysis: data,
                candidateName,
                candidateEmail,
              };
            })
          )
        );

        // Check if any analysis failed
        const failedAnalyses = analysisResults.filter((r) => r.status === 'rejected');
        if (failedAnalyses.length > 0) {
          const errors = failedAnalyses.map((r, idx) => 
            `CV ${idx + 1}: ${r.reason?.message || 'Analysis failed'}`
          ).join('; ');
          throw new Error(`Failed to analyze ${failedAnalyses.length} CV(s): ${errors}`);
        }

        // Extract successful results
        const results = analysisResults.map((r) => r.value);

        // Sort by score (highest first)
        const sorted = [...results].sort(
          (a, b) => (b.overallScore - a.overallScore)
        );

        // Add rank to each result
        const ranked = sorted.map((item, idx) => ({
          rank: idx + 1,
          cvIndex: item.cvIndex,
          overallScore: item.overallScore,
          candidateName: item.candidateName || `Resume ${item.cvIndex + 1}`,
          candidateEmail: item.candidateEmail || null,
          analysis: item.analysis,
        }));

        return {
          success: true,
          data: { results: ranked },
        };
      } catch (error) {
        console.error('Batch analysis error:', error);
        // Ensure we throw a proper Error that tRPC can serialize
        const errorMessage = error?.message || 'Unknown error occurred during batch analysis';
        throw new Error(`Batch analysis failed: ${errorMessage}`);
      }
    }),
});
