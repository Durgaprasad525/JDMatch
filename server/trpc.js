import { initTRPC, TRPCError } from '@trpc/server';

const t = initTRPC.context().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        message: error.message,
        code: error.code || 'INTERNAL_SERVER_ERROR',
      },
    };
  },
});

export const router = t.router;

// Public — no auth required
export const publicProcedure = t.procedure;

// Protected — requires a valid logged-in HR user
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.hrUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      hrUser: ctx.hrUser, // now guaranteed non-null
    },
  });
});
