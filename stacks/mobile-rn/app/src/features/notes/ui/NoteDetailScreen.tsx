import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { formatDate } from "@/shared/lib/date";
import { useTheme } from "@/shared/theme";
import { Button, Card, Dialog, EmptyState, ErrorState, IconButton, Screen, Skeleton, Text, useToast } from "@/shared/ui";
import { useDeleteNote, useNote } from "../state/notes";

type Props = { id: string; onBack: () => void };

export function NoteDetailScreen({ id, onBack }: Props) {
  const { space } = useTheme();
  const toast = useToast();
  const { note, isPending, isError, error, refetch } = useNote(id);
  const del = useDeleteNote();
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    try {
      await del.mutateAsync(id);
      setConfirm(false);
      toast.show("Note deleted", "success");
      onBack();
    } catch (e) {
      setConfirm(false);
      toast.show(e instanceof Error ? e.message : "Could not delete the note.", "error");
    }
  }

  return (
    <Screen
      header={{
        title: "Note",
        onBack,
        action: note ? <IconButton icon={Trash2} label="Delete note" tone="danger" onPress={() => setConfirm(true)} /> : undefined,
      }}
    >
      {isPending
        ? <View style={{ gap: space[3] }}><Skeleton className="h-5" /><Skeleton className="h-5 w-4/5" /></View>
        : isError
        ? <ErrorState message={error.message} actionLabel="Try again" onAction={() => void refetch()} />
        : !note
        ? <EmptyState title="Note not found" message="It may have been deleted." actionLabel="Go back" onAction={onBack} />
        : (
          <Card style={{ gap: space[3] }}>
            <Text variant="heading" selectable>{note.text}</Text>
            <Text variant="small" tone="muted">Created {formatDate(note.createdAt)}</Text>
          </Card>
        )}
      <Dialog
        visible={confirm}
        title="Delete this note?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
      {note ? <Button label="Back to notes" variant="secondary" onPress={onBack} /> : null}
    </Screen>
  );
}
