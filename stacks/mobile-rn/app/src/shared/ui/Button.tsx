import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { cn } from "../lib/cn";
import { Button as BaseButton } from "./primitives/button";
import { Icon } from "./primitives/icon";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "danger";
export type IconName = LucideIcon;
const MAP = { primary: "default", secondary: "outline", ghost: "ghost", danger: "destructive" } as const;
const TONE = { primary: "onPrimary", secondary: "default", ghost: "primary", danger: "onPrimary" } as const;
const ICON = {
  primary: "text-primary-foreground",
  secondary: "text-foreground",
  ghost: "text-primary",
  danger: "text-primary-foreground",
} as const;

export type ButtonProps = Omit<React.ComponentProps<typeof BaseButton>, "children" | "variant" | "size"> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: LucideIcon;
  /** Stretch to the full width of the parent (default). */
  block?: boolean;
};

export function Button({ label, variant = "primary", loading, icon, block = true, disabled, className, ...rest }: ButtonProps) {
  const off = disabled || loading;
  return (
    <BaseButton
      variant={MAP[variant]}
      size="lg"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      className={cn("h-12", block ? "self-stretch" : "self-center", className)}
      {...rest}
    >
      {loading
        ? <ActivityIndicator accessibilityLabel="Loading" />
        : (
          <View className="flex-row items-center gap-2">
            {icon ? <Icon as={icon} size={20} className={ICON[variant]} /> : null}
            <Text variant="heading" tone={TONE[variant]}>{label}</Text>
          </View>
        )}
    </BaseButton>
  );
}

export type IconButtonProps = Omit<React.ComponentProps<typeof BaseButton>, "children" | "variant" | "size"> & {
  icon: LucideIcon;
  /** Required: icon-only controls have no visible text for screen readers. */
  label: string;
  tone?: "default" | "primary" | "danger";
};

export function IconButton({ icon, label, tone = "default", ...rest }: IconButtonProps) {
  const color = { default: "text-foreground", primary: "text-primary", danger: "text-destructive" }[tone];
  return (
    <BaseButton variant="ghost" size="icon" accessibilityLabel={label} {...rest}>
      <Icon as={icon} size={24} className={color} />
    </BaseButton>
  );
}
