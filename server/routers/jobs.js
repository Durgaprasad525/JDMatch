import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import prisma from '../lib/prisma.js';
import { parsePDF } from '../services/pdfService.js';
import { analyzeDocuments } from '../services/analysisService.js';
import { extractCandidateInfo } from '../services/candidateExtractor.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const API_URL = process.env.API_URL;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

export const jobsRouter = router({

  // Generate a JD using AI from basic inputs
  generateJD: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      department: z.string().optional().default(''),
      experienceLevel: z.string().optional().default('Mid-Level'),
      skills: z.string().optional().default(''),
      location: z.string().optional().default(''),
      employmentType: z.string().optional().default('Full-time'),
      additionalNotes: z.string().optional().default(''),
    }))
    .mutation(async ({ input }) => {
      if (!API_URL || !AUTH_TOKEN) {
        throw new Error('AI service not configured. Set API_URL and AUTH_TOKEN.');
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN,
        },
        body: JSON.stringify({
          model: 'gemini-1.5-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an expert HR recruiter. Generate a professional, detailed job description based on these inputs.

Role Title: ${input.title}
Department: ${input.department || 'Not specified'}
Experience Level: ${input.experienceLevel}
Key Skills: ${input.skills || 'Not specified'}
Location: ${input.location || 'Not specified'}
Employment Type: ${input.employmentType}
Additional Notes: ${input.additionalNotes || 'None'}

Write a complete job description that includes:
1. Role Overview (2-3 sentences)
2. Key Responsibilities (5-8 bullet points)
3. Required Qualifications (5-7 bullet points)
4. Preferred Qualifications (3-5 bullet points)
5. What We Offer / Benefits (3-5 bullet points)

Format it as clean text (not markdown). Use bullet points with "•" character.
Make it sound professional but engaging. Be specific to the role and skills mentioned.
Do NOT include a company name — use "[Company Name]" as placeholder.`
            }]
          }],
          generation_config: {
            max_output_tokens: 1200,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response from AI service.');

      return { description: text.trim() };
    }),

  // Parse a JD PDF and extract text
  parseJDFile: protectedProcedure
    .input(z.object({
      file: z.string(), // base64 PDF
    }))
    .mutation(async ({ input }) => {
      const text = await parsePDF(input.file);
      if (!text || text.trim().length < 20) {
        throw new Error('Could not extract meaningful text from PDF.');
      }
      return { text: text.trim() };
    }),

  // Create a new job posting
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().min(10),
      status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
    }))
    .mutation(async ({ ctx, input }) => {
      const job = await prisma.jobPosting.create({
        data: {
          title: input.title,
          description: input.description,
          status: input.status,
          companyId: ctx.hrUser.companyId,
          createdById: ctx.hrUser.id,
        },
      });
      return job;
    }),

  // List all jobs for the HR user's company
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const jobs = await prisma.jobPosting.findMany({
        where: { companyId: ctx.hrUser.companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { applications: true },
          },
          createdBy: {
            select: { name: true },
          },
        },
      });
      return jobs;
    }),

  // Get a single job with full application list
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await prisma.jobPosting.findFirst({
        where: {
          id: input.id,
          companyId: ctx.hrUser.companyId, // scoped to company
        },
        include: {
          applications: {
            orderBy: { score: 'desc' },
            include: {
              candidate: true,
              interview: {
                select: {
                  id: true,
                  token: true,
                  status: true,
                  aiScore: true,
                  scheduledAt: true,
                },
              },
            },
          },
          createdBy: {
            select: { name: true, email: true },
          },
        },
      });

      if (!job) {
        throw new Error('Job not found.');
      }

      return job;
    }),

  // Upload resumes, run AI scoring, persist results to DB
  uploadAndScore: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      cvFiles: z.array(z.string()).min(1).max(20), // base64 PDFs
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify job belongs to this company
      const job = await prisma.jobPosting.findFirst({
        where: { id: input.jobId, companyId: ctx.hrUser.companyId },
      });
      if (!job) throw new Error('Job not found.');

      // Parse all CVs
      const cvTexts = await Promise.allSettled(
        input.cvFiles.map(f => parsePDF(f))
      );

      const results = [];

      for (let i = 0; i < cvTexts.length; i++) {
        const parsed = cvTexts[i];
        if (parsed.status === 'rejected') {
          results.push({ index: i, success: false, error: 'Failed to parse PDF' });
          continue;
        }

        const cvText = parsed.value;
        try {
          const [analysis, candidateInfo] = await Promise.all([
            analyzeDocuments(job.description, cvText),
            Promise.resolve(extractCandidateInfo(cvText)),
          ]);

          const name = analysis.candidateName || candidateInfo.name || `Candidate ${i + 1}`;
          const email = analysis.candidateEmail || candidateInfo.email || null;

          // Find existing candidate by email or create new
          let candidate;
          if (email) {
            candidate = await prisma.candidate.findFirst({ where: { email } });
            if (!candidate) {
              candidate = await prisma.candidate.create({ data: { name, email } });
            }
          } else {
            candidate = await prisma.candidate.create({ data: { name } });
          }

          // Create application with scores
          const application = await prisma.application.create({
            data: {
              jobPostingId: job.id,
              candidateId: candidate.id,
              resumeText: cvText,
              score: analysis.overallScore ?? null,
              strengths: analysis.strengths ?? [],
              weaknesses: analysis.weaknesses ?? [],
              recommendation: analysis.summary ?? null,
              status: 'SCORED',
            },
            include: { candidate: true },
          });

          results.push({ index: i, success: true, application });
        } catch (err) {
          results.push({ index: i, success: false, error: err.message });
        }
      }

      const succeeded = results.filter(r => r.success).length;
      return { total: cvTexts.length, scored: succeeded, results };
    }),

  // Update job status (ACTIVE, DRAFT, CLOSED)
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']),
    }))
    .mutation(async ({ ctx, input }) => {
      const job = await prisma.jobPosting.updateMany({
        where: { id: input.id, companyId: ctx.hrUser.companyId },
        data: { status: input.status },
      });
      return { success: job.count > 0 };
    }),
});
