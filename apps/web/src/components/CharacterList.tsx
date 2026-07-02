import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "./ui/sonner";

export default function CharacterList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const listQuery = useQuery(trpc.character.list.queryOptions());

  const deleteMutation = useMutation(
    trpc.character.softDelete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.character.list.queryKey(),
        });
        toast.success("Character deleted");
        setDeleteTargetId(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (listQuery.isPending) {
    return <p className="text-muted-foreground py-4">Loading...</p>;
  }
  if (listQuery.isError) {
    return <p className="text-muted-foreground py-4">Error loading characters</p>;
  }

  const characters = listQuery.data;
  if (!characters || characters.length === 0) {
    return <p className="text-muted-foreground py-4">No characters yet. Create one above.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-2 mt-6">
        {characters.map((c) => {
          const name =
            typeof c.content === "object" && c.content !== null && "name" in c.content
              ? String((c.content as { name: unknown }).name)
              : "Unnamed character";
          return (
            <Card key={c.id} className="flex items-center justify-between p-4">
              <span className="text-sm">{name}</span>
              <Button variant="destructive" size="icon" onClick={() => setDeleteTargetId(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete character?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The character will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetId) {
                  deleteMutation.mutate({ id: deleteTargetId });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
