import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import CharacterList from "../components/CharacterList";
import NewCharacterForm from "../components/NewCharacterForm";

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
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Characters</h1>
        <NewCharacterForm />
        <CharacterList />
      </div>
    </div>
  );
}
