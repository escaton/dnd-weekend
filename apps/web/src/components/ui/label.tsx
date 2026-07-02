import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Label as LabelPrimitive } from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = forwardRef<
  ElementRef<typeof LabelPrimitive>,
  ComponentPropsWithoutRef<typeof LabelPrimitive> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.displayName;

export { Label };
