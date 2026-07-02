import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../styles/rooms.module.css";

export const Route = createFileRoute("/rooms/")({
  component: RoomsPage,
});

function RoomsPage() {
  const [title, setTitle] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.room.list.queryOptions());

  const createMutation = useMutation(
    trpc.room.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.list.queryKey() });
        setTitle("");
      },
    }),
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/sign-in";
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate({ title });
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Rooms</h1>
        <div className={styles.nav}>
          <a href="/characters" className={styles.navLink}>
            Characters
          </a>
          <button className={styles.signOut} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Room title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={createMutation.isPending}
        />
        <button className={styles.button} type="submit" disabled={createMutation.isPending}>
          Create room
        </button>
        {createMutation.error && <p className={styles.error}>{createMutation.error.message}</p>}
      </form>

      {listQuery.isPending && <p className={styles.empty}>Loading...</p>}
      {listQuery.isError && <p className={styles.empty}>Error loading rooms</p>}
      {listQuery.data && listQuery.data.length === 0 && (
        <p className={styles.empty}>No rooms yet. Create one above.</p>
      )}
      {listQuery.data && listQuery.data.length > 0 && (
        <ul className={styles.list}>
          {listQuery.data.map((room) => (
            <li key={room.id}>
              <a href={`/rooms/${room.id}`} className={styles.roomCard}>
                <span className={styles.roomTitle}>{room.title}</span>
                <span className={styles.roomMeta}>
                  {room.role} · {room.memberCount} member{room.memberCount === 1 ? "" : "s"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
