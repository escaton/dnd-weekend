import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import {
  ScrollArea as ScrollAreaPrimitive,
  ScrollAreaViewport as ScrollAreaViewportPrimitive,
  ScrollAreaScrollbar as ScrollAreaScrollbarPrimitive,
  ScrollAreaThumb as ScrollAreaThumbPrimitive,
  ScrollAreaCorner as ScrollAreaCornerPrimitive,
} from "@radix-ui/react-scroll-area";
import { cn } from "../../lib/utils";

const ScrollArea = forwardRef<
  ElementRef<typeof ScrollAreaPrimitive>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaViewportPrimitive className="h-full w-full rounded-[inherit] [&>div]:!block">
      {children}
    </ScrollAreaViewportPrimitive>
    <ScrollAreaScrollbarPrimitive
      orientation="vertical"
      className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-px"
    >
      <ScrollAreaThumbPrimitive className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaScrollbarPrimitive>
    <ScrollAreaCornerPrimitive />
  </ScrollAreaPrimitive>
));
ScrollArea.displayName = ScrollAreaPrimitive.displayName;

export { ScrollArea };
