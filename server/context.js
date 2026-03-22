import { supabaseAdmin } from './lib/supabase.js';
import prisma from './lib/prisma.js';

export const createContext = async ({ req, res }) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { req, res, user: null, hrUser: null };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { req, res, user: null, hrUser: null };
    }

    const hrUser = await prisma.hRUser.findUnique({
      where: { supabaseId: user.id },
      include: { company: true },
    });

    return { req, res, user, hrUser };
  } catch {
    return { req, res, user: null, hrUser: null };
  }
};
