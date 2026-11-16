import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "../lib/cn";
import { IconButton } from "./Button";
import { Text } from "./Text";

export type PageHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  onBack?: () => void;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, onBack, action }: PageHeaderProps) {
  return (
    <View className="min-h-14 flex-row items-center gap-2">
      {onBack ? <IconButton icon={ArrowLeft} label="Back" onPress={onBack} className="-ml-3" /> : null}
      <View className="flex-1">
        <Text variant="title" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text variant="small" tone="muted">{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export type ScreenProps = {
  children: ReactNode;
  header?: PageHeaderProps;
  /** Skip the scroll view for screens that own a list (FlatList). */
  scroll?: boolean;
  /** Pad the content (default). Turn off when children bring their own padding. */
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned below the content, e.g. a primary button above the keyboard. */
  footer?: ReactNode;
};

/**
 * App shell for a screen: safe areas, keyboard avoidance, page header, scrolling and pull to refresh.
 * Bottom navigation lives in the router's tab layout (app/(app)/_layout.tsx).
 */
export function Screen({ children, header, scroll = true, padded = true, refreshing, onRefresh, footer }: ScreenProps) {
  const content = (
    <>
      {header ? <View className="px-4 pt-2"><PageHeader {...header} /></View> : null}
      <View className={cn("gap-4", scroll ? "" : "flex-1", padded && "p-4")}>{children}</View>
    </>
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        {scroll
          ? (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
            >
              {content}
            </ScrollView>
          )
          : <View className="flex-1">{content}</View>}
        {footer ? <View className="border-t border-border p-4">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
