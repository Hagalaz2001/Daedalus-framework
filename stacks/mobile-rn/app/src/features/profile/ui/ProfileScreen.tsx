import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/features/auth";
import { Avatar, Badge, Button, Card, Dialog, Input, Screen, Text, useToast } from "@/shared/ui";

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const { user, deleteAccount } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await deleteAccount();
    } catch (e) {
      setConfirm(false);
      toast.show(e instanceof Error ? e.message : "Could not delete the account.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={{ title: "Profile", onBack }}>
      <View className="items-center gap-2 py-4">
        <Avatar name={user?.name ?? "?"} size="lg" />
        <Text variant="title">{user?.name}</Text>
        <Badge label="Signed in" tone="success" />
      </View>
      <Input label="Email" value={user?.email ?? ""} editable={false} hint="Contact support to change your email." />
      <Card className="gap-3 border-destructive">
        <Text variant="heading" tone="danger">Delete account</Text>
        <Text variant="small" tone="muted">Permanently removes your account and every note in it. This cannot be undone.</Text>
        <Button label="Delete my account" variant="danger" onPress={() => setConfirm(true)} />
      </Card>
      <Dialog
        visible={confirm}
        title="Delete your account?"
        message="All of your notes will be erased immediately."
        confirmLabel="Delete forever"
        destructive
        loading={busy}
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </Screen>
  );
}
