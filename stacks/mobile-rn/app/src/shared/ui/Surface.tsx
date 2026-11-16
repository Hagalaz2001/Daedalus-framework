import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cn } from "../lib/cn";
import { Avatar as BaseAvatar, AvatarFallback } from "./primitives/avatar";
import { Card as BaseCard } from "./primitives/card";
import { Icon } from "./primitives/icon";
import { Text } from "./Text";

export function Card({ className, ...rest }: React.ComponentProps<typeof BaseCard>) {
  return <BaseCard className={cn("gap-0 rounded-lg p-4 shadow-none", className)} {...rest} />;
}

export type ListRowProps = {
  title: string;
  subtitle?: string | undefined;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: LucideIcon;
  onPress?: () => void;
  /** Red title, for destructive rows such as "Delete account". */
  destructive?: boolean;
  /** Hairline between rows. */
  divider?: boolean;
};

/** A tappable (or static) row: leading visual, title and subtitle, trailing content or a chevron. */
export function ListRow({ title, subtitle, leading, trailing, icon, onPress, destructive, divider }: ListRowProps) {
  const body = (
    <>
      {leading ?? (icon ? <Icon as={icon} size={22} className={destructive ? "text-destructive" : "text-muted-foreground"} /> : null)}
      <View className="flex-1 py-2">
        <Text className={cn("font-medium", destructive && "text-destructive")} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text variant="small" tone="muted" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Icon as={ChevronRight} size={18} className="text-muted-foreground" /> : null)}
    </>
  );
  const base = cn("min-h-14 flex-row items-center gap-3", divider && "border-b border-border");
  return onPress
    ? (
      <Pressable
        role="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        onPress={onPress}
        className={cn(base, "active:bg-muted")}
      >
        {body}
      </Pressable>
    )
    : <View className={base}>{body}</View>;
}

const SIZES = { sm: "size-8", md: "size-11", lg: "size-[72px]" } as const;
const SIZE_TEXT = { sm: "text-xs", md: "text-base", lg: "text-2xl" } as const;

export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZES }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <BaseAvatar alt={`Avatar for ${name}`} className={SIZES[size]}>
      <AvatarFallback className="bg-primary">
        <Text allowFontScaling={false} className={cn("font-bold text-primary-foreground", SIZE_TEXT[size])}>{initials}</Text>
      </AvatarFallback>
    </BaseAvatar>
  );
}

const BADGE = {
  neutral: "border-border text-muted-foreground",
  primary: "border-primary text-primary",
  success: "border-success text-success",
  warning: "border-warning text-warning",
  danger: "border-destructive text-destructive",
} as const;

export function Badge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof BADGE }) {
  const [border, color] = BADGE[tone].split(" ") as [string, string];
  return (
    <View className={cn("self-start rounded-full border px-2 py-0.5", border)}>
      <Text variant="caption" className={color}>{label}</Text>
    </View>
  );
}
