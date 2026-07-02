import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "../components/ui/sonner";

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
        queryClient.invalidateQueries({
          queryKey: trpc.room.list.queryKey(),
        });
        setTitle("");
        toast.success("Room created");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate({ title });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rooms</h1>

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <Input
          type="text"
          placeholder="Room title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={createMutation.isPending}
        />
        <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </form>

      {listQuery.isPending && <p className="text-muted-foreground">Loading...</p>}
      {listQuery.isError && <p className="text-muted-foreground">Error loading rooms</p>}
      {listQuery.data && listQuery.data.length === 0 && (
        <p className="text-muted-foreground">No rooms yet. Create one above.</p>
      )}
      {listQuery.data && listQuery.data.length > 0 && (
        <div className="flex flex-col gap-2">
          {listQuery.data.map((room) => (
            <Link key={room.id} to="/rooms/$id" params={{ id: room.id }} className="block">
              <Card className="flex items-center justify-between p-4 transition-colors hover:bg-accent">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{room.title}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant={room.role === "game-master" ? "default" : "secondary"}>
                      {room.role === "game-master" ? "GM" : "Player"}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {room.memberCount}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
