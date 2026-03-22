import { createTRPCReact } from '@trpc/react-query';
import { httpLink } from '@trpc/client';
import { supabase } from '../lib/supabase';

export const trpc = createTRPCReact();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: '/api/trpc',
      async headers() {
        const { data: { session } } = await supabase.auth.getSession();
        return {
          authorization: session ? `Bearer ${session.access_token}` : '',
        };
      },
    }),
  ],
});
