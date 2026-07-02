import { supabase } from "./supabase";
import { router } from "./router";

export async function debugLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  router.navigate({ to: "/rooms" });
  return data.session?.access_token;
}

declare global {
  interface Window {
    __debugLogin?: typeof debugLogin;
  }
}
