import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@dnd-weekend/api";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "../../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "../ui/sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type RoomGetOutput = RouterOutput["room"]["get"];
type PendingRoom = Extract<RoomGetOutput, { viewerStatus: "pending" }>;
type Character = RouterOutput["character"]["list"][number];

function getCharacterName(content: unknown): string {
  if (typeof content === "object" && content !== null && "name" in content) {
    return String((content as { name: unknown }).name);
  }
  return "Unnamed character";
}

export function RoomJoinScreen({ room }: { room: PendingRoom }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const characterListQuery = useQuery(trpc.character.list.queryOptions());

  const joinMutation = useMutation(
    trpc.room.join.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.room.get.queryKey({ id: room.id }) });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Join room</h1>
          <p className="text-muted-foreground">{room.title}</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Pick a character to join (optional):</p>
          {characterListQuery.data && characterListQuery.data.length > 0 ? (
            <Select
              onValueChange={(value) =>
                joinMutation.mutate({
                  roomId: room.id,
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
                {characterListQuery.data.map((c: Character) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getCharacterName(c.content)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button
              className="w-full"
              onClick={() => joinMutation.mutate({ roomId: room.id, characterId: null })}
              disabled={joinMutation.isPending}
            >
              Join room
            </Button>
          )}
        </div>

        <div className="text-center">
          <Link to="/rooms" className="text-primary text-sm hover:underline">
            Back to rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
