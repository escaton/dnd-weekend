import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import styles from "../styles/sign-in.module.css";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/characters" });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: "/characters" });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/characters`,
      },
    });
  }

  return (
    <div className={styles.container}>
      <h1>DnD Weekend</h1>
      <button className={styles.button} onClick={handleSignIn}>
        Sign in with Google
      </button>
    </div>
  );
}
