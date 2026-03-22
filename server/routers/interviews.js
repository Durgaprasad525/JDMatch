import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import prisma from '../lib/prisma.js';
import { sendInterviewInvite } from '../lib/resend.js';
import { scoreInterview } from '../services/analysisService.js';

// Standalone handler used by the plain Express webhook route
export async function handleVapiWebhook(body) {
  const message = body?.message;
  if (!message || message.type !== 'end-of-call-report') return;

  const callId = message.call?.id;
  if (!callId) return;

  const interview = await prisma.interview.findFirst({
    where: { vapiCallId: callId },
  });
  if (!interview) return;

  const transcript = message.artifact?.transcript || null;
  const summary = message.artifact?.summary || null;

  const interviewWithJob = await prisma.interview.findUnique({
    where: { id: interview.id },
    include: {
      application: {
        include: { jobPosting: { select: { description: true } } },
      },
    },
  });

  let aiResult = { score: null, notes: null };
  if (transcript) {
    try {
      const jobDesc = interviewWithJob?.application?.jobPosting?.description || '';
      aiResult = await scoreInterview(transcript, jobDesc);
    } catch (err) {
      console.error('Interview scoring error:', err.message);
    }
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      transcript,
      summary,
      aiScore: aiResult.score,
      aiNotes: aiResult.notes
        ? JSON.stringify({
            notes: aiResult.notes,
            strengths: aiResult.strengths,
            concerns: aiResult.concerns,
            communicationScore: aiResult.communicationScore,
            technicalScore: aiResult.technicalScore,
            confidenceScore: aiResult.confidenceScore,
          })
        : null,
    },
  });

  await prisma.application.update({
    where: { id: interview.applicationId },
    data: { status: 'INTERVIEWED' },
  });
}

export const interviewsRouter = router({

  // HR invites selected candidates to AI interview
  invite: protectedProcedure
    .input(z.object({
      applicationIds: z.array(z.string()).min(1).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const applicationId of input.applicationIds) {
        // Verify application belongs to this company's job
        const application = await prisma.application.findFirst({
          where: {
            id: applicationId,
            jobPosting: { companyId: ctx.hrUser.companyId },
          },
          include: {
            candidate: true,
            jobPosting: true,
          },
        });

        if (!application) {
          results.push({ applicationId, success: false, error: 'Not found' });
          continue;
        }

        // Create or retrieve existing interview
        let interview = await prisma.interview.findUnique({
          where: { applicationId },
        });

        if (!interview) {
          interview = await prisma.interview.create({
            data: {
              applicationId,
              status: 'SCHEDULED',
            },
          });
        }

        // Update application status
        await prisma.application.update({
          where: { id: applicationId },
          data: { status: 'INTERVIEW_INVITED' },
        });

        // Build invite link
        const baseUrl = process.env.APP_URL || 'http://localhost:5173';
        const interviewUrl = `${baseUrl}/interview/${interview.token}`;

        // Send email if candidate has one
        if (application.candidate.email) {
          await sendInterviewInvite({
            to: application.candidate.email,
            candidateName: application.candidate.name,
            jobTitle: application.jobPosting.title,
            companyName: ctx.hrUser.company.name,
            interviewUrl,
          });
        }

        results.push({
          applicationId,
          success: true,
          interviewToken: interview.token,
          interviewUrl,
          candidateEmail: application.candidate.email,
        });
      }

      return { results };
    }),

  // List interviews for a job (HR view)
  listByJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.interview.findMany({
        where: {
          application: {
            jobPosting: {
              id: input.jobId,
              companyId: ctx.hrUser.companyId,
            },
          },
        },
        include: {
          application: {
            include: { candidate: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Candidate fetches their interview details by token (public)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const interview = await prisma.interview.findUnique({
        where: { token: input.token },
        include: {
          application: {
            include: {
              candidate: true,
              jobPosting: {
                select: {
                  title: true,
                  description: true,
                  company: { select: { name: true, logoUrl: true } },
                },
              },
            },
          },
        },
      });

      if (!interview) throw new Error('Interview not found.');

      return {
        interviewId: interview.id,
        status: interview.status,
        candidateName: interview.application.candidate.name,
        jobTitle: interview.application.jobPosting.title,
        jobDescription: interview.application.jobPosting.description,
        companyName: interview.application.jobPosting.company.name,
        vapiAssistantId: process.env.VAPI_ASSISTANT_ID || null,
        vapiPublicKey: process.env.VAPI_PUBLIC_KEY || null,
      };
    }),

  // Vapi webhook — called when interview call ends
  vapiWebhook: publicProcedure
    .input(z.object({
      message: z.object({
        type: z.string(),
        call: z.object({ id: z.string() }).optional(),
        artifact: z.object({
          transcript: z.string().optional(),
          summary: z.string().optional(),
        }).optional(),
      }).passthrough(),
    }))
    .mutation(async ({ input }) => {
      const { message } = input;

      if (message.type !== 'end-of-call-report') {
        return { received: true };
      }

      const callId = message.call?.id;
      if (!callId) return { received: true };

      // Find interview by vapiCallId
      const interview = await prisma.interview.findFirst({
        where: { vapiCallId: callId },
      });

      if (!interview) return { received: true };

      const transcript = message.artifact?.transcript || null;
      const summary = message.artifact?.summary || null;

      // Fetch job description for AI scoring
      const interviewWithJob = await prisma.interview.findUnique({
        where: { id: interview.id },
        include: {
          application: {
            include: { jobPosting: { select: { description: true } } },
          },
        },
      });

      // AI-score the transcript
      let aiResult = { score: null, notes: null };
      if (transcript) {
        try {
          const jobDesc = interviewWithJob?.application?.jobPosting?.description || '';
          aiResult = await scoreInterview(transcript, jobDesc);
        } catch (err) {
          console.error('Interview scoring error:', err.message);
        }
      }

      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          transcript,
          summary,
          aiScore: aiResult.score,
          aiNotes: aiResult.notes
            ? JSON.stringify({
                notes: aiResult.notes,
                strengths: aiResult.strengths,
                concerns: aiResult.concerns,
                communicationScore: aiResult.communicationScore,
                technicalScore: aiResult.technicalScore,
                confidenceScore: aiResult.confidenceScore,
              })
            : null,
        },
      });

      await prisma.application.update({
        where: { id: interview.applicationId },
        data: { status: 'INTERVIEWED' },
      });

      return { received: true };
    }),

  // Candidate updates their interview with Vapi call ID (called when call starts)
  startCall: publicProcedure
    .input(z.object({
      token: z.string(),
      vapiCallId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const interview = await prisma.interview.findUnique({
        where: { token: input.token },
      });
      if (!interview) throw new Error('Interview not found.');

      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          vapiCallId: input.vapiCallId,
          status: 'IN_PROGRESS',
        },
      });

      return { success: true };
    }),

  // Log anti-cheat signals from candidate's browser
  logSignal: publicProcedure
    .input(z.object({
      token: z.string(),
      type: z.enum(['TAB_SWITCH', 'COPY_PASTE', 'CAMERA_OFF']),
    }))
    .mutation(async ({ input }) => {
      const interview = await prisma.interview.findUnique({
        where: { token: input.token },
      });
      if (!interview) return { received: true };

      const increment =
        input.type === 'TAB_SWITCH'   ? { tabSwitches: { increment: 1 } } :
        input.type === 'COPY_PASTE'   ? { copyPasteEvents: { increment: 1 } } :
                                        { cameraOffEvents: { increment: 1 } };

      await prisma.interview.update({
        where: { id: interview.id },
        data: increment,
      });

      return { received: true };
    }),

  // HR views detailed interview report
  getReport: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await prisma.interview.findFirst({
        where: {
          id: input.interviewId,
          application: {
            jobPosting: { companyId: ctx.hrUser.companyId },
          },
        },
        include: {
          application: {
            include: {
              candidate: true,
              jobPosting: { select: { title: true } },
            },
          },
        },
      });

      if (!interview) throw new Error('Interview not found.');

      let aiNotesParsed = null;
      if (interview.aiNotes) {
        try { aiNotesParsed = JSON.parse(interview.aiNotes); } catch {}
      }

      return {
        id: interview.id,
        status: interview.status,
        completedAt: interview.completedAt,
        candidateName: interview.application.candidate.name,
        jobTitle: interview.application.jobPosting.title,
        // Scores
        aiScore: interview.aiScore,
        aiNotes: aiNotesParsed,
        summary: interview.summary,
        transcript: interview.transcript,
        // Anti-cheat
        tabSwitches: interview.tabSwitches,
        copyPasteEvents: interview.copyPasteEvents,
        cameraOffEvents: interview.cameraOffEvents,
      };
    }),
});
