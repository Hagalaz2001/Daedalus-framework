import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { MAX_FONT_SCALE } from "../theme";
import { Text as BaseText } from "./primitives/text";

const text = cva("", {
  variants: {
    variant: {
      display: "text-3xl font-bold leading-9",
      title: "text-2xl font-bold leading-8",
      heading: "text-lg font-semibold leading-6",
      body: "text-base leading-6",
      small: "text-sm leading-5",
      caption: "text-xs font-medium leading-4",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      danger: "text-destructive",
      success: "text-success",
      onPrimary: "text-primary-foreground",
    },
  },
  defaultVariants: { variant: "body", tone: "default" },
});

type Props = Omit<React.ComponentProps<typeof BaseText>, "variant"> & VariantProps<typeof text>;

/** All text goes through here: type scale, theme colours and the system font size. */
export function Text({ variant, tone, className, ...rest }: Props) {
  const header = variant === "display" || variant === "title";
  return (
    <BaseText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      role={header ? "heading" : undefined}
      className={cn(text({ variant, tone }), className)}
      {...rest}
    />
  );
}
