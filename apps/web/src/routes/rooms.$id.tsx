import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../styles/rooms.module.css";

export const Route = createFileRoute("/rooms/$id")({
  component: RoomDetailPage,
});

function getCharacterName(content: unknown): string {
  if (typeof content === "object" && content !== null && "name" in content) {
    return String((content as { name: unknown }).name);
  }
  return "Unnamed character";
}

function RoomDetailPage() {
  const { id } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const roomQuery = useQuery(trpc.room.get.queryOptions({ id }));
  const characterListQuery = useQuery(trpc.character.list.queryOptions());
  const authQuery = useQuery(trpc.auth.me.queryOptions());

  const inviteMutation = useMutation(
    trpc.room.invite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
        setInviteEmail("");
      },
    }),
  );

  const joinMutation = useMutation(
    trpc.room.join.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
      },
    }),
  );

  const setCharacterMutation = useMutation(
    trpc.room.setCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
      },
    }),
  );

  const transferMutation = useMutation(
    trpc.room.transfer.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
      },
    }),
  );

  const removeMutation = useMutation(
    trpc.room.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
      },
    }),
  );

  const leaveMutation = useMutation(
    trpc.room.leave.mutationOptions({
      onSuccess: () => {
        window.location.href = "/rooms";
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.room.delete.mutationOptions({
      onSuccess: () => {
        window.location.href = "/rooms";
      },
    }),
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/sign-in";
  };

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviteEmail.trim()) {
      inviteMutation.mutate({ roomId: id, email: inviteEmail.trim() });
    }
  }

  function handleTransfer() {
    if (transferTargetId) {
      transferMutation.mutate({ roomId: id, newGMUserId: transferTargetId });
    }
  }

  if (roomQuery.isPending) return <p className={styles.empty}>Loading...</p>;
  if (roomQuery.isError) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Join room</h1>
          <button className={styles.signOut} onClick={handleSignOut}>
            Sign out
          </button>
        </header>
        <div className={styles.section}>
          <p>Pick a character to join (optional):</p>
          {characterListQuery.data && characterListQuery.data.length > 0 ? (
            <select
              className={styles.select}
              defaultValue=""
              onChange={(e) =>
                joinMutation.mutate({
                  roomId: id,
                  characterId: e.target.value || null,
                })
              }
              disabled={joinMutation.isPending}
            >
              <option value="">Join without a character</option>
              {characterListQuery.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCharacterName(c.content)}
                </option>
              ))}
            </select>
          ) : (
            <button
              className={styles.button}
              onClick={() => joinMutation.mutate({ roomId: id, characterId: null })}
              disabled={joinMutation.isPending}
            >
              Join room
            </button>
          )}
          {joinMutation.error && <p className={styles.error}>{joinMutation.error.message}</p>}
          <a href="/rooms" className={styles.link}>
            Back to rooms
          </a>
        </div>
      </div>
    );
  }

  const room = roomQuery.data;
  const members = room.members ?? [];
  const currentUserId = authQuery.data?.id;
  const isCurrentUserGM = room.gameMasterId === currentUserId;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{room.title}</h1>
        <div className={styles.nav}>
          <a href="/rooms" className={styles.navLink}>
            Rooms
          </a>
          <a href="/characters" className={styles.navLink}>
            Characters
          </a>
          <button className={styles.signOut} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {isCurrentUserGM && (
        <div className={styles.section}>
          <h2>Invite players</h2>
          <form className={styles.form} onSubmit={handleInvite}>
            <input
              className={styles.input}
              type="email"
              placeholder="player@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
            <button className={styles.button} type="submit" disabled={inviteMutation.isPending}>
              Invite
            </button>
            {inviteMutation.error && <p className={styles.error}>{inviteMutation.error.message}</p>}
          </form>
        </div>
      )}

      <div className={styles.section}>
        <h2>Members ({members.length})</h2>
        <ul className={styles.memberList}>
          {members.map((member) => (
            <li key={member.id} className={styles.memberItem}>
              <div className={styles.memberInfo}>
                <span className={styles.memberEmail}>{member.email}</span>
                <div className={styles.row}>
                  <span className={styles.memberRole}>{member.role}</span>
                  <span className={styles.memberStatus}>{member.status}</span>
                </div>
              </div>
              <div className={styles.memberActions}>
                {member.status === "active" && member.userId === currentUserId && (
                  <select
                    className={styles.select}
                    value={member.characterId ?? ""}
                    onChange={(e) =>
                      setCharacterMutation.mutate({
                        roomId: id,
                        characterId: e.target.value || null,
                      })
                    }
                    disabled={setCharacterMutation.isPending}
                  >
                    <option value="">No character</option>
                    {characterListQuery.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCharacterName(c.content)}
                      </option>
                    ))}
                  </select>
                )}
                {isCurrentUserGM && member.userId !== currentUserId && (
                  <button
                    className={styles.buttonDanger}
                    onClick={() =>
                      removeMutation.mutate({ roomId: id, memberToRemoveId: member.id })
                    }
                    disabled={removeMutation.isPending}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isCurrentUserGM && (
        <div className={styles.section}>
          <h2>Transfer game master</h2>
          <div className={styles.row}>
            <select
              className={styles.select}
              value={transferTargetId}
              onChange={(e) => setTransferTargetId(e.target.value)}
            >
              <option value="">Select a member...</option>
              {members
                .filter((m) => m.status === "active" && m.userId !== currentUserId)
                .map((m) => (
                  <option key={m.id} value={m.userId!}>
                    {m.email}
                  </option>
                ))}
            </select>
            <button
              className={styles.button}
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !transferTargetId}
            >
              Transfer
            </button>
          </div>
          {transferMutation.error && (
            <p className={styles.error}>{transferMutation.error.message}</p>
          )}
        </div>
      )}

      <div className={styles.section}>
        {isCurrentUserGM ? (
          <button
            className={styles.buttonDanger}
            onClick={() => {
              if (confirm("Delete this room for everyone? This cannot be undone.")) {
                deleteMutation.mutate({ roomId: id });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            Delete room
          </button>
        ) : (
          <button
            className={styles.buttonDanger}
            onClick={() => leaveMutation.mutate({ roomId: id })}
            disabled={leaveMutation.isPending}
          >
            Leave room
          </button>
        )}
      </div>
    </div>
  );
}
