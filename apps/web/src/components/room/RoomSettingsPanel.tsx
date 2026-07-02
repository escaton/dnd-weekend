import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, UserPlus } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@dnd-weekend/api";
import { useTRPC } from "../../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "../ui/sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type RoomGetOutput = RouterOutput["room"]["get"];
type ActiveRoom = Extract<RoomGetOutput, { viewerStatus: "active" }>;
type Member = ActiveRoom["members"][number];
type Character = RouterOutput["character"]["list"][number];

function getCharacterName(content: unknown): string {
  if (typeof content === "object" && content !== null && "name" in content) {
    return String((content as { name: unknown }).name);
  }
  return "Unnamed character";
}

export function RoomSettingsPanel({
  room,
  currentUserId,
}: {
  room: ActiveRoom;
  currentUserId: string | undefined;
}) {
  const id = room.id;
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const characterListQuery = useQuery(trpc.character.list.queryOptions());

  const [inviteEmail, setInviteEmail] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isCurrentUserGM = room.gameMasterId === currentUserId;
  const members = room.members ?? [];

  const inviteMutation = useMutation(
    trpc.room.invite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
        setInviteEmail("");
        toast.success("Invitation sent");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setCharacterMutation = useMutation(
    trpc.room.setCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const transferMutation = useMutation(
    trpc.room.transfer.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
        setTransferTargetId("");
        toast.success("Game master transferred");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const removeMutation = useMutation(
    trpc.room.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id }) });
        toast.success("Member removed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const leaveMutation = useMutation(
    trpc.room.leave.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.list.queryKey() });
        navigate({ to: "/rooms" });
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.room.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.list.queryKey() });
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

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 md:p-6">
      <h2 className="text-lg font-semibold">{room.title}</h2>

      {isCurrentUserGM && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Invite players</h3>
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
        <h3 className="text-sm font-semibold">Members ({members.length})</h3>
        <div className="flex flex-col gap-2">
          {members.map((member: Member) => (
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
                      {characterListQuery.data?.map((c: Character) => (
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
          <h3 className="text-sm font-semibold">Transfer game master</h3>
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

      <div className="mt-auto">
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
