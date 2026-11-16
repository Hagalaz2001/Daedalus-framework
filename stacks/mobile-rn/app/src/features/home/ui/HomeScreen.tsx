import { Pressable, View } from "react-native";
import { useAuth } from "@/features/auth";
import { type Note, useNotes } from "@/features/notes";
import { formatDate, isWithinDays } from "@/shared/lib/date";
import { Avatar, Button, Card, EmptyState, ErrorState, ListRow, Screen, Skeleton, Text } from "@/shared/ui";

type Props = { onOpenNote: (id: string) => void; onSeeAll: () => void; onCreate: () => void; onProfile: () => void };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex-1 gap-1" accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="display">{value}</Text>
      <Text variant="small" tone="muted">{label}</Text>
    </Card>
  );
}

/** Dashboard: greeting, headline numbers and the latest notes, with all four data states. */
export function HomeScreen({ onOpenNote, onSeeAll, onCreate, onProfile }: Props) {
  const { user } = useAuth();
  const notes = useNotes();
  const name = user?.name ?? "there";
  const recent: Note[] = notes.data?.slice(0, 3) ?? [];
  const today = notes.data?.filter((n) => isWithinDays(n.createdAt, 1)).length ?? 0;

  return (
    <Screen refreshing={notes.isRefetching} onRefresh={() => void notes.refetch()}>
      <View className="mt-2 flex-row items-center gap-3">
        <View className="flex-1">
          <Text variant="small" tone="muted">Good to see you</Text>
          <Text variant="display" numberOfLines={1}>{name}</Text>
        </View>
        <Pressable role="button" accessibilityLabel="Open profile" onPress={onProfile} className="size-12 items-center justify-center">
          <Avatar name={name} />
        </Pressable>
      </View>

      {notes.isPending
        ? (
          <View className="gap-3">
            <View className="flex-row gap-3"><Skeleton className="h-[88px] flex-1" /><Skeleton className="h-[88px] flex-1" /></View>
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-14" />
          </View>
        )
        : notes.isError
        ? <ErrorState message={notes.error.message} actionLabel="Try again" onAction={() => void notes.refetch()} />
        : (
          <>
            <View className="flex-row gap-3">
              <Stat label="Total notes" value={notes.data.length} />
              <Stat label="Added today" value={today} />
            </View>
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text variant="heading">Latest</Text>
                {recent.length ? <Button label="See all" variant="ghost" block={false} onPress={onSeeAll} /> : null}
              </View>
              {recent.length
                ? recent.map((n) => <ListRow key={n.id} title={n.text} subtitle={formatDate(n.createdAt)} divider onPress={() => onOpenNote(n.id)} />)
                : <EmptyState title="Nothing here yet" message="Notes you add show up here." actionLabel="Add a note" onAction={onCreate} />}
            </View>
          </>
        )}
    </Screen>
  );
}
