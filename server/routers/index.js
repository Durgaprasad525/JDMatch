import { router } from '../trpc.js';
import { analysisRouter } from './analysis.js';

export const appRouter = router({
  analysis: analysisRouter,
});
