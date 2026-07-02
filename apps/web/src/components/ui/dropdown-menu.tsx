import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
} from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/utils";

const DropdownMenu = DropdownMenuPrimitive;
const DropdownMenuTrigger = DropdownMenuTriggerPrimitive;

const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuContentPrimitive>,
  ComponentPropsWithoutRef<typeof DropdownMenuContentPrimitive>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuContentPrimitive
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
DropdownMenuContent.displayName = DropdownMenuContentPrimitive.displayName;

const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuItemPrimitive>,
  ComponentPropsWithoutRef<typeof DropdownMenuItemPrimitive> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuItemPrimitive
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuItemPrimitive.displayName;

const DropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuLabelPrimitive>,
  ComponentPropsWithoutRef<typeof DropdownMenuLabelPrimitive> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuLabelPrimitive
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuLabelPrimitive.displayName;

const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuSeparatorPrimitive>,
  ComponentPropsWithoutRef<typeof DropdownMenuSeparatorPrimitive>
>(({ className, ...props }, ref) => (
  <DropdownMenuSeparatorPrimitive
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuSeparatorPrimitive.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
