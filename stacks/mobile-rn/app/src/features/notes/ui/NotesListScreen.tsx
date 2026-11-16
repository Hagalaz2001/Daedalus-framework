import { CirclePlus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDate } from "@/shared/lib/date";
import { useTheme } from "@/shared/theme";
import { EmptyState, ErrorState, IconButton, Input, ListRow, PageHeader, Select, SkeletonList, Tabs } from "@/shared/ui";
import { useNotes } from "../state/notes";
import { filterNotes, type Range, type Sort } from "../state/filter";

const RANGES = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
] as const;
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

type Props = { onOpen: (id: string) => void; onCreate: () => void };

/** List + search + filters. Loading, empty, no-results and error each have their own state. */
export function NotesListScreen({ onOpen, onCreate }: Props) {
  const { colors, space } = useTheme();
  const notes = useNotes();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const rows = useMemo(() => filterNotes(notes.data ?? [], query, range, sort), [notes.data, query, range, sort]);
  const filtering = query.trim() !== "" || range !== "all";

  const header = (
    <View style={{ gap: space[3], paddingBottom: space[3] }}>
      <Input label="Search" placeholder="Search notes" value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} />
      <Tabs items={RANGES} value={range} onChange={setRange} />
      <Select label="Sort" value={sort} options={SORTS} onChange={setSort} />
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingHorizontal: space[4], paddingTop: space[2] }}>
        <PageHeader
          title="Notes"
          subtitle={notes.data ? `${notes.data.length} in total` : undefined}
          action={<IconButton icon={CirclePlus} label="New note" tone="primary" onPress={onCreate} />}
        />
      </View>
      {notes.isPending
        ? <View style={{ padding: space[4] }}><SkeletonList /></View>
        : notes.isError
        ? <ErrorState message={notes.error.message} actionLabel="Try again" onAction={() => void notes.refetch()} />
        : (
          <FlatList
            data={rows}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: space[4], flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={notes.isRefetching} onRefresh={() => void notes.refetch()} />}
            ListHeaderComponent={header}
            ListEmptyComponent={filtering
              ? <EmptyState icon={Search} title="No matching notes" message="Try a different search or filter." />
              : <EmptyState title="No notes yet" message="Capture your first note." actionLabel="New note" onAction={onCreate} />}
            renderItem={({ item }) => (
              <ListRow title={item.text} subtitle={formatDate(item.createdAt)} divider onPress={() => onOpen(item.id)} />
            )}
          />
        )}
    </SafeAreaView>
  );
}
