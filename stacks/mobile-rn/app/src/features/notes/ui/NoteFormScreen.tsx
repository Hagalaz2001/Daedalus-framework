import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/shared/theme";
import { Button, Input, Screen, useToast } from "@/shared/ui";
import { useCreateNote } from "../state/notes";

const MAX = 500;

// Create form. The contract has no update operation yet: add `updateNote` to contracts/openapi.yaml,
// run `deno task sync`, then pass an `initial` note and call the new mutation to turn this into create/edit.
export function NoteFormScreen({ onDone }: { onDone: () => void }) {
  const { space } = useTheme();
  const toast = useToast();
  const create = useCreateNote();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  async function submit() {
    const value = text.trim();
    if (!value) return setError("Write something first.");
    if (value.length > MAX) return setError(`Keep it under ${MAX} characters.`);
    setError(undefined);
    try {
      await create.mutateAsync(value);
      toast.show("Note saved", "success");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the note.");
    }
  }

  return (
    <Screen
      header={{ title: "New note", onBack: onDone }}
      footer={<Button label="Save note" loading={create.isPending} onPress={submit} />}
    >
      <View style={{ gap: space[2] }}>
        <Input
          label="Note"
          value={text}
          onChangeText={setText}
          error={error}
          hint={`${text.length}/${MAX}`}
          multiline
          maxLength={MAX + 50}
          textAlignVertical="top"
          style={{ minHeight: 160 }}
          placeholder="What is on your mind?"
        />
      </View>
    </Screen>
  );
}
