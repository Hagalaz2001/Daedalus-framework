import { useState } from "react";
import { View } from "react-native";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { useTheme } from "@/shared/theme";
import { useAuth } from "../state/session";
import { validateEmail, validateName, validatePassword } from "./forms";

export function SignUpScreen({ onSignIn }: { onSignIn: () => void }) {
  const { space } = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next = { name: validateName(name), email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    setFormError(undefined);
    if (next.name || next.email || next.password) return;
    setBusy(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={{ title: "Create account", onBack: onSignIn }}>
      <View style={{ gap: space[4] }}>
        <Input label="Name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" textContentType="name" />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint="At least 8 characters."
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={submit}
        />
        {formError ? <Text tone="danger" accessibilityLiveRegion="polite">{formError}</Text> : null}
        <Button label="Create account" loading={busy} onPress={submit} />
        <Button label="I already have an account" variant="ghost" onPress={onSignIn} />
      </View>
    </Screen>
  );
}
