import { useState } from "react";
import { View } from "react-native";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { useTheme } from "@/shared/theme";
import { useAuth } from "../state/session";
import { validateEmail } from "./forms";

type Props = { onSignUp: () => void; onForgotPassword: () => void };

export function SignInScreen({ onSignUp, onForgotPassword }: Props) {
  const { space } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    const e = validateEmail(email);
    const p = password ? undefined : "Enter your password.";
    setEmailError(e);
    setPasswordError(p);
    setFormError(undefined);
    if (e || p) return;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space[2], marginTop: space[8] }}>
        <Text variant="display">Welcome back</Text>
        <Text tone="muted">Sign in to pick up where you left off.</Text>
      </View>
      <View style={{ gap: space[4], marginTop: space[4] }}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {formError ? <Text tone="danger" accessibilityLiveRegion="polite">{formError}</Text> : null}
        <Button label="Sign in" loading={busy} onPress={submit} />
        <Button label="Forgot password?" variant="ghost" onPress={onForgotPassword} />
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: space[4] }}>
        <Button label="New here? Create an account" variant="secondary" onPress={onSignUp} />
      </View>
    </Screen>
  );
}
