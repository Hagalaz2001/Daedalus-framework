import { useState } from "react";
import { View } from "react-native";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { useTheme } from "@/shared/theme";
import { useAuth } from "../state/session";
import { validateEmail } from "./forms";

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const { space } = useTheme();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const e = validateEmail(email);
    setError(e);
    if (e) return;
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={{ title: "Reset password", onBack }}>
      {sent
        ? (
          <View style={{ gap: space[4] }}>
            <Text variant="heading">Check your inbox</Text>
            <Text tone="muted">If an account exists for {email.trim()}, we sent a link to choose a new password.</Text>
            <Button label="Back to sign in" onPress={onBack} />
          </View>
        )
        : (
          <View style={{ gap: space[4] }}>
            <Text tone="muted">Enter the email you signed up with and we will send you a reset link.</Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={submit}
            />
            <Button label="Send reset link" loading={busy} onPress={submit} />
          </View>
        )}
    </Screen>
  );
}
