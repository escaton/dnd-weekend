import { supabase } from "./supabase";

export async function debugLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  window.location.href = "/characters";
  return data;
}

declare global {
  interface Window {
    __debugLogin?: typeof debugLogin;
  }
}
