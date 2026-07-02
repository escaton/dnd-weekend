import { lazy, Suspense, useRef, useState } from "react";
import { Play, Plus } from "lucide-react";
import { Button } from "../ui/button";

import "tldraw/tldraw.css";
import type { Editor, TLEventInfo } from "tldraw";

const Tldraw = lazy(async () => {
  const mod = await import("tldraw");
  return { default: mod.Tldraw };
});

function createRedBoxAt(editor: Editor, x: number, y: number) {
  editor.createShape({
    type: "geo",
    x: x - 50,
    y: y - 50,
    props: {
      geo: "rectangle",
      w: 100,
      h: 100,
      color: "red",
      fill: "semi",
    },
  });
}

function Canvas() {
  const editorRef = useRef<Editor | null>(null);

  function handleMount(editor: Editor): (() => void) | void {
    editorRef.current = editor;
    editor.setColorMode("dark");
    editor.selectNone();

    function onBeforeEvent(info: TLEventInfo) {
      if (info.type !== "pointer") return;

      if (info.name === "pointer_down" && info.target === "canvas") {
        // Set isPanning so the Editor pans on drag instead of the select
        // tool entering its brushing (rectangle selection) state.
        // On pointer_up the Editor resets isPanning automatically.
        (editor.inputs as unknown as { setIsPanning: (v: boolean) => void }).setIsPanning(true);
      }
    }

    editor.on("before-event", onBeforeEvent);
    return () => editor.off("before-event", onBeforeEvent);
  }

  function handleAddBox() {
    const editor = editorRef.current;
    if (!editor) return;
    const bounds = editor.getViewportPageBounds();
    createRedBoxAt(editor, bounds.midX, bounds.midY);
  }

  return (
    <div
      className="relative h-full w-full"
      style={
        {
          "--tl-color-background": "hsl(20 14% 4%)",
          touchAction: "none",
        } as React.CSSProperties
      }
    >
      <Tldraw
        hideUi
        licenseKey="tldraw-2026-07-16/WyJpaW9lZWZHVSIsWyIqIl0sMTYsIjIwMjYtMDctMTYiXQ.1z2JwNzZMLb75+MxUPZWWzGPTf3oned2ZSIwF//0XzwHQROHIoXrGDKVUDwGI7Zie6AsMQqiagrwJA8LUZp3cg"
        options={{ createTextOnCanvasDoubleClick: false }}
        components={{
          ContextMenu: null,
          ActionsMenu: null,
          HelpMenu: null,
          ZoomMenu: null,
          MainMenu: null,
          Minimap: null,
          StylePanel: null,
          PageMenu: null,
          NavigationPanel: null,
          Toolbar: null,
          RichTextToolbar: null,
          ImageToolbar: null,
          VideoToolbar: null,
          KeyboardShortcutsDialog: null,
          QuickActions: null,
          HelperButtons: null,
          DebugPanel: null,
          DebugMenu: null,
          MenuPanel: null,
          TopPanel: null,
          SharePanel: null,
          CursorChatBubble: null,
          Dialogs: null,
          Toasts: null,
          A11y: null,
          FollowingIndicator: null,
          PeopleMenu: null,
          PeopleMenuAvatar: null,
          PeopleMenuItem: null,
          PeopleMenuFacePile: null,
          UserPresenceEditor: null,
        }}
        onMount={handleMount}
      />
      <button
        type="button"
        onClick={handleAddBox}
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md bg-card px-4 py-2 text-sm font-medium text-card-foreground shadow-md border border-border hover:bg-accent transition-colors min-h-[44px]"
      >
        <Plus className="h-4 w-4" />
        Add box
      </button>
    </div>
  );
}

export function RoomMap() {
  const [playing, setPlaying] = useState(false);

  if (!playing) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-background">
        <Button size="lg" className="gap-2" onClick={() => setPlaying(true)}>
          <Play className="h-5 w-5" />
          Play
        </Button>
      </div>
    );
  }

  return (
    <Suspense
      fallback={<div className="flex h-full w-full items-center justify-center bg-background" />}
    >
      <Canvas />
    </Suspense>
  );
}
