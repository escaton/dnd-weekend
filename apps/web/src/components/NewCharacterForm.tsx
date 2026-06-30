import { useState } from "react";
import { useTRPC } from "../lib/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../styles/new-character-form.module.css";

export default function NewCharacterForm() {
  const [name, setName] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.character.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.character.list.queryKey() });
        setName("");
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ content: name ? { name } : {} });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="Character name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={createMutation.isPending}
      />
      <button className={styles.button} type="submit" disabled={createMutation.isPending}>
        Add character
      </button>
      {createMutation.error && <p className={styles.error}>{createMutation.error.message}</p>}
    </form>
  );
}
