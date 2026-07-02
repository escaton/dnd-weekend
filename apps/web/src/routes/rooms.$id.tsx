import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, UserPlus } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "../components/ui/sonner";

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
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const roomQuery = useQuery(trpc.room.get.queryOptions({ id }));
  const characterListQuery = useQuery(trpc.character.list.queryOptions());
  const authQuery = useQuery(trpc.auth.me.queryOptions());

  const [inviteEmail, setInviteEmail] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const inviteMutation = useMutation(
    trpc.room.invite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.get.queryKey({ id }),
        });
        setInviteEmail("");
        toast.success("Invitation sent");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const joinMutation = useMutation(
    trpc.room.join.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.get.queryKey({ id }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setCharacterMutation = useMutation(
    trpc.room.setCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.get.queryKey({ id }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const transferMutation = useMutation(
    trpc.room.transfer.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.get.queryKey({ id }),
        });
        setTransferTargetId("");
        toast.success("Game master transferred");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const removeMutation = useMutation(
    trpc.room.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.get.queryKey({ id }),
        });
        toast.success("Member removed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const leaveMutation = useMutation(
    trpc.room.leave.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.list.queryKey(),
        });
        navigate({ to: "/rooms" });
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.room.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.room.list.queryKey(),
        });
        navigate({ to: "/rooms" });
      },
    }),
  );

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviteEmail.trim()) {
      inviteMutation.mutate({ roomId: id, email: inviteEmail.trim() });
    }
  }

  if (roomQuery.isPending) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (roomQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Join room</h1>
        <p className="text-muted-foreground">Pick a character to join (optional):</p>
        {characterListQuery.data && characterListQuery.data.length > 0 ? (
          <Select
            onValueChange={(value) =>
              joinMutation.mutate({
                roomId: id,
                characterId: value === "none" ? null : value,
              })
            }
            disabled={joinMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Join without a character" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Join without a character</SelectItem>
              {characterListQuery.data.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {getCharacterName(c.content)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button
            onClick={() => joinMutation.mutate({ roomId: id, characterId: null })}
            disabled={joinMutation.isPending}
          >
            Join room
          </Button>
        )}
        <Link to="/rooms" className="text-primary text-sm hover:underline">
          Back to rooms
        </Link>
      </div>
    );
  }

  const room = roomQuery.data;
  const members = room.members ?? [];
  const currentUserId = authQuery.data?.id;
  const isCurrentUserGM = room.gameMasterId === currentUserId;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{room.title}</h1>

      {isCurrentUserGM && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Invite players</h2>
          <form className="flex gap-2" onSubmit={handleInvite}>
            <Input
              type="email"
              placeholder="player@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
            <Button type="submit" disabled={inviteMutation.isPending || !inviteEmail.trim()}>
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          </form>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <Card
              key={member.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                  <AvatarFallback>{member.displayName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{member.displayName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === "game-master" ? "default" : "secondary"}>
                      {member.role === "game-master" ? "GM" : "Player"}
                    </Badge>
                    <Badge variant={member.status === "active" ? "outline" : "secondary"}>
                      {member.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.status === "active" && member.userId === currentUserId && (
                  <Select
                    value={member.characterId ?? "none"}
                    onValueChange={(value) =>
                      setCharacterMutation.mutate({
                        roomId: id,
                        characterId: value === "none" ? null : value,
                      })
                    }
                    disabled={setCharacterMutation.isPending}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No character</SelectItem>
                      {characterListQuery.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {getCharacterName(c.content)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {isCurrentUserGM && member.userId !== currentUserId && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() =>
                      removeMutation.mutate({
                        roomId: id,
                        memberToRemoveId: member.id,
                      })
                    }
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {isCurrentUserGM && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Transfer game master</h2>
          <div className="flex gap-2">
            <Select
              value={transferTargetId || "none"}
              onValueChange={(value) => setTransferTargetId(value === "none" ? "" : value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a member..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a member...</SelectItem>
                {members
                  .filter((m) => m.status === "active" && m.userId !== currentUserId)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.userId!}>
                      {m.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                transferMutation.mutate({
                  roomId: id,
                  newGMUserId: transferTargetId,
                })
              }
              disabled={transferMutation.isPending || !transferTargetId}
            >
              Transfer
            </Button>
          </div>
        </div>
      )}

      <div>
        {isCurrentUserGM ? (
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            Delete room
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={() => leaveMutation.mutate({ roomId: id })}
            disabled={leaveMutation.isPending}
          >
            Leave room
          </Button>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete room?</DialogTitle>
            <DialogDescription>
              This will delete the room for everyone. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ roomId: id })}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
