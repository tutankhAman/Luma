import type * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = ({
  className,
  ref,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & {
  ref?: React.RefObject<HTMLFormElement | null>;
}) => <form className={cn("space-y-6", className)} ref={ref} {...props} />;
Form.displayName = "Form";

const FormItem = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement | null>;
}) => <div className={cn("space-y-2", className)} ref={ref} {...props} />;
FormItem.displayName = "FormItem";

const FormLabel = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label> & {
  ref?: React.RefObject<HTMLLabelElement | null>;
}) => <Label className={cn(className)} ref={ref} {...props} />;
FormLabel.displayName = "FormLabel";

const FormControl = ({
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement | null>;
}) => <div ref={ref} {...props} />;
FormControl.displayName = "FormControl";

const FormDescription = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement | null>;
}) => (
  <p
    className={cn("text-muted-foreground text-sm", className)}
    ref={ref}
    {...props}
  />
);
FormDescription.displayName = "FormDescription";

const FormMessage = ({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement | null>;
}) => {
  if (!children) {
    return null;
  }
  return (
    <p
      className={cn("font-medium text-destructive text-sm", className)}
      ref={ref}
      {...props}
    >
      {children}
    </p>
  );
};
FormMessage.displayName = "FormMessage";

export { Form, FormControl, FormDescription, FormItem, FormLabel, FormMessage };
