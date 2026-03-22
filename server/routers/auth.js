import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { supabaseAdmin } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';

export const authRouter = router({

  // Register: creates Supabase user + Company + HRUser in one call
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      name: z.string().min(1),
      companyName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const { email, password, name, companyName } = input;

      // 1. Create auth user in Supabase (email confirmed immediately)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('An account with this email already exists.');
        }
        throw new Error(`Registration failed: ${authError.message}`);
      }

      const supabaseId = authData.user.id;

      // 2. Create Company + HRUser in DB (atomic)
      try {
        const company = await prisma.company.create({
          data: {
            name: companyName,
            hrUsers: {
              create: {
                supabaseId,
                email,
                name,
                role: 'ADMIN',
              },
            },
          },
          include: { hrUsers: true },
        });

        return {
          success: true,
          message: 'Account created successfully. You can now log in.',
          companyId: company.id,
        };
      } catch (dbError) {
        // Rollback: delete the Supabase user if DB insert fails
        await supabaseAdmin.auth.admin.deleteUser(supabaseId).catch(() => {});
        throw new Error(`Registration failed: ${dbError.message}`);
      }
    }),

  // Returns the current HR user profile + company
  me: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        id: ctx.hrUser.id,
        email: ctx.hrUser.email,
        name: ctx.hrUser.name,
        role: ctx.hrUser.role,
        company: {
          id: ctx.hrUser.company.id,
          name: ctx.hrUser.company.name,
          logoUrl: ctx.hrUser.company.logoUrl,
        },
      };
    }),
});
