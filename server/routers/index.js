import { router } from '../trpc.js';
import { analysisRouter } from './analysis.js';
import { authRouter } from './auth.js';
import { jobsRouter } from './jobs.js';
import { interviewsRouter } from './interviews.js';

export const appRouter = router({
  analysis: analysisRouter,
  auth: authRouter,
  jobs: jobsRouter,
  interviews: interviewsRouter,
});
