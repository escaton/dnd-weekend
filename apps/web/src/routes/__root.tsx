import { Outlet, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { TRPCProvider, trpcClient } from "../lib/trpc";
import { createQueryClient } from "../lib/query-client";

const queryClient = createQueryClient();

export const Route = createRootRoute({
  component: () => (
    <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </TRPCProvider>
  ),
});
