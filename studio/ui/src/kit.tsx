// Small local primitives for the studio chrome. The designs being edited never use these: they render in sandboxed frames.
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const cn = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "md" | "sm";

export function Button(
  { variant = "primary", size = "md", className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  },
) {
  return <button type={type} data-variant={variant} data-size={size} className={cn("ds-btn", className)} {...rest} />;
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("ds-field", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("ds-field", className)} {...rest} />;
}
