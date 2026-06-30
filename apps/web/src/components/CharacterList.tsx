import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../styles/character-list.module.css";

export default function CharacterList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.character.list.queryOptions());

  const deleteMutation = useMutation(
    trpc.character.softDelete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.character.list.queryKey() });
      },
    }),
  );

  if (listQuery.isPending) return <p className={styles.empty}>Loading...</p>;
  if (listQuery.isError) return <p className={styles.empty}>Error loading characters</p>;

  const characters = listQuery.data;
  if (!characters || characters.length === 0) {
    return <p className={styles.empty}>No characters yet. Create one above.</p>;
  }

  return (
    <ul className={styles.list}>
      {characters.map((c) => (
        <li key={c.id} className={styles.item}>
          <span className={styles.name}>
            {typeof c.content === "object" && c.content !== null && "name" in c.content
              ? String((c.content as { name: unknown }).name)
              : "Unnamed character"}
          </span>
          <button
            className={styles.delete}
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate({ id: c.id })}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
