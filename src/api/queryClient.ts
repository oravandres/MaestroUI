import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { logApiError } from "@/api/logger";

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: import.meta.env.PROD,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        logApiError(error, { source: "query", key: query.queryKey });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        logApiError(error, {
          source: "mutation",
          key: mutation.options.mutationKey,
        });
      },
    }),
  });
}
