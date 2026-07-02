import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/rooms")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: () => <Outlet />,
});
