import { useState } from "react";
import { Plus } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "./ui/sonner";

export default function NewCharacterForm() {
  const [name, setName] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.character.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.character.list.queryKey(),
        });
        setName("");
        toast.success("Character created");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ content: name ? { name } : {} });
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <Input
        type="text"
        placeholder="Character name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={createMutation.isPending}
      />
      <Button type="submit" disabled={createMutation.isPending}>
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}
