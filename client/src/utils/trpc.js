import { createTRPCReact } from '@trpc/react-query';
import { httpLink } from '@trpc/client';

export const trpc = createTRPCReact();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: '/api/trpc',
      fetch: (url, options) => {
        return fetch(url, options);
      }
    }),
  ],
});
