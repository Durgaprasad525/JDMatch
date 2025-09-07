import { createTRPCReact } from '@trpc/react-query';
import { httpLink } from '@trpc/client';

export const trpc = createTRPCReact();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: '/api/trpc',
      fetch: (url, options) => {
        console.log('🔍 tRPC Fetch Request:', { url, method: options?.method, body: options?.body?.length });
        return fetch(url, options).then(async response => {
          console.log('🔍 tRPC Fetch Response:', { status: response.status, ok: response.ok });
          
          // Clone the response to read the body without consuming it
          const clonedResponse = response.clone();
          try {
            const responseText = await clonedResponse.text();
            console.log('🔍 tRPC Response Body:', responseText.substring(0, 500) + '...');
          } catch (e) {
            console.log('🔍 tRPC Response Body Error:', e);
          }
          
          return response;
        });
      }
    }),
  ],
});
