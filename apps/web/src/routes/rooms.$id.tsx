import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Map as MapIcon, Settings } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { RoomMap } from "../components/room/RoomMap";
import { RoomSettingsPanel } from "../components/room/RoomSettingsPanel";
import { RoomJoinScreen } from "../components/room/RoomJoinScreen";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/rooms/$id")({
  component: RoomDetailPage,
});

type Segment = "map" | "room";

function SegmentedControl({
  value,
  onChange,
}: {
  value: Segment;
  onChange: (value: Segment) => void;
}) {
  return (
    <div className="flex border-b border-border bg-card">
      {(["map", "room"] as const).map((seg) => (
        <button
          key={seg}
          type="button"
          onClick={() => onChange(seg)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
            value === seg
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {seg === "map" ? <MapIcon className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          <span className="capitalize">{seg}</span>
        </button>
      ))}
    </div>
  );
}

function RoomDetailPage() {
  const { id } = Route.useParams();
  const trpc = useTRPC();
  const [segment, setSegment] = useState<Segment>("map");

  const roomQuery = useQuery(trpc.room.get.queryOptions({ id }, { retry: false }));
  const authQuery = useQuery(trpc.auth.me.queryOptions());

  if (roomQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (roomQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-muted-foreground">You don't have access to this room.</p>
          <Link to="/rooms" className="text-primary text-sm hover:underline">
            Back to rooms
          </Link>
        </div>
      </div>
    );
  }

  const room = roomQuery.data;

  if (room.viewerStatus === "pending") {
    return <RoomJoinScreen room={room} />;
  }

  const currentUserId = authQuery.data?.id;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col md:flex-row">
      <div className="md:hidden">
        <SegmentedControl value={segment} onChange={setSegment} />
      </div>

      <div className={cn("min-h-0 flex-1", segment === "room" && "hidden md:block")}>
        <RoomMap />
      </div>

      <div
        className={cn(
          "min-h-0 md:w-80 md:flex-shrink-0 md:border-l md:border-border",
          segment === "map" && "hidden md:block",
        )}
      >
        <RoomSettingsPanel room={room} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
