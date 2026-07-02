import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import {
  Avatar as AvatarPrimitive,
  AvatarFallback as AvatarFallbackPrimitive,
  AvatarImage as AvatarImagePrimitive,
} from "@radix-ui/react-avatar";
import { cn } from "../../lib/utils";

const Avatar = forwardRef<
  ElementRef<typeof AvatarPrimitive>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.displayName;

const AvatarImage = forwardRef<
  ElementRef<typeof AvatarImagePrimitive>,
  ComponentPropsWithoutRef<typeof AvatarImagePrimitive>
>(({ className, ...props }, ref) => (
  <AvatarImagePrimitive
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarImagePrimitive.displayName;

const AvatarFallback = forwardRef<
  ElementRef<typeof AvatarFallbackPrimitive>,
  ComponentPropsWithoutRef<typeof AvatarFallbackPrimitive>
>(({ className, ...props }, ref) => (
  <AvatarFallbackPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarFallbackPrimitive.displayName;

export { Avatar, AvatarImage, AvatarFallback };
