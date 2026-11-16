import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { cn } from "../lib/cn";
import { Sheet } from "./Overlay";
import { Icon } from "./primitives/icon";
import { Text } from "./Text";

export type Option<T extends string> = { value: T; label: string };

export type SelectProps<T extends string> = {
  label: string;
  value: T | undefined;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
};

/** Picker that opens a bottom sheet: same behaviour on every platform, large touch targets. */
export function Select<T extends string>({ label, value, options, onChange, placeholder = "Choose" }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View className="gap-1">
      <Text variant="small" className="font-semibold">{label}</Text>
      <Pressable
        role="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        className="h-12 flex-row items-center justify-between rounded-md border border-input bg-background px-3 active:bg-muted"
      >
        <Text tone={current ? "default" : "muted"}>{current?.label ?? placeholder}</Text>
        <Icon as={ChevronDown} size={20} className="text-muted-foreground" />
      </Pressable>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              role="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="min-h-12 flex-row items-center justify-between"
            >
              <Text className={cn(selected && "font-semibold")}>{o.label}</Text>
              {selected ? <Icon as={Check} size={22} className="text-primary" /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}
