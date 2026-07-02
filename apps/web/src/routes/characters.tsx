import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import CharacterList from "../components/CharacterList";
import NewCharacterForm from "../components/NewCharacterForm";
import styles from "../styles/characters.module.css";

export const Route = createFileRoute("/characters")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    return { session };
  },
  component: CharactersPage,
});

function CharactersPage() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/sign-in";
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Characters</h1>
        <div className={styles.nav}>
          <a href="/rooms" className={styles.navLink}>
            Rooms
          </a>
          <button className={styles.signOut} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <NewCharacterForm />
      <CharacterList />
    </div>
  );
}
