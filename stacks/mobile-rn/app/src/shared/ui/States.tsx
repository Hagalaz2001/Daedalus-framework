import { CloudOff, Inbox, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "./Button";
import { Icon } from "./primitives/icon";
import { Skeleton } from "./primitives/skeleton";
import { Text } from "./Text";

export { Skeleton };

/** Placeholder rows shown while a list loads. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <View accessible accessibilityLabel="Loading" role="progressbar" className="gap-4">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="gap-2">
          <Skeleton className="h-[18px] w-[70%]" />
          <Skeleton className="h-3.5 w-[45%]" />
        </View>
      ))}
    </View>
  );
}

type StateProps = { icon?: LucideIcon; title: string; message?: string; actionLabel?: string; onAction?: () => void };

function Centered({ icon, title, message, actionLabel, onAction, tint, role }: StateProps & { tint: string; role?: "alert" }) {
  return (
    <View accessible={!!role} role={role} className="items-center justify-center gap-3 px-6 py-8">
      {icon
        ? (
          <View className="size-[72px] items-center justify-center rounded-full bg-muted">
            <Icon as={icon} size={32} className={tint} />
          </View>
        )
        : null}
      <Text variant="heading" className="text-center">{title}</Text>
      {message ? <Text tone="muted" className="text-center">{message}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} block={false} onPress={onAction} className="mt-2" /> : null}
    </View>
  );
}

/** Nothing here yet: say why and offer the next step. */
export function EmptyState(props: StateProps) {
  return <Centered icon={Inbox} {...props} tint="text-muted-foreground" />;
}

/** Something failed: say what in plain words and offer a retry. */
export function ErrorState({ title = "Something went wrong", ...rest }: Partial<StateProps>) {
  return <Centered icon={CloudOff} title={title} {...rest} tint="text-destructive" role="alert" />;
}
