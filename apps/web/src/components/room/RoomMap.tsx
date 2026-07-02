import { lazy, Suspense, useRef, useState } from "react";
import { Play, Plus } from "lucide-react";
import { Button } from "../ui/button";

import "tldraw/tldraw.css";
import type { Editor } from "tldraw";

// Lazy-load the heavy Tldraw component so the room route's initial bundle
// stays lean. Suspense fallback is rendered while the editor chunk loads.
const Tldraw = lazy(async () => {
  const mod = await import("tldraw");
  return { default: mod.Tldraw };
});

function createRedBoxAt(editor: Editor, x: number, y: number) {
  // Center the 100x100 box on the given page point.
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
