import { useState } from "react";
import { View } from "react-native";
import { cn } from "../lib/cn";
import { MAX_FONT_SCALE } from "../theme";
import { Input as BaseInput } from "./primitives/input";
import { Text } from "./Text";

export type InputProps = React.ComponentProps<typeof BaseInput> & { label: string; error?: string | undefined; hint?: string };

/** Labelled text field with an inline error. The label doubles as the accessibility label. */
export function Input({ label, error, hint, className, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1">
      <Text variant="small" className="font-semibold">{label}</Text>
      <BaseInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        className={cn(focused && "border-2 border-ring", error && "border-2 border-destructive", className)}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error
        ? <Text variant="small" tone="danger" accessibilityLiveRegion="polite">{error}</Text>
        : hint
        ? <Text variant="small" tone="muted">{hint}</Text>
        : null}
    </View>
  );
}
