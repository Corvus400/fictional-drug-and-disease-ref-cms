import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/ui/cn";

export const AccordionRoot = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("section-panel", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="section-header">
      <AccordionPrimitive.Trigger className={cn("section-trigger", className)} {...props}>
        <span>{children}</span>
        <ChevronDown aria-hidden="true" className="section-trigger-icon" size={16} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className={cn("section-content", className)} {...props} />;
}
