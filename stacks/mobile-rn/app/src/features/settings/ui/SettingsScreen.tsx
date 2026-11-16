import Constants from "expo-constants";
import { CircleUserRound, Info, LogOut } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/features/auth";
import { type ThemeMode, useTheme } from "@/shared/theme";
import { Button, Dialog, ListRow, Screen, Select, Text } from "@/shared/ui";

const MODES = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function SettingsScreen({ onProfile }: { onProfile: () => void }) {
  const { mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  return (
    <Screen header={{ title: "Settings" }}>
      <View className="gap-2">
        <Text variant="caption" tone="muted">ACCOUNT</Text>
        <ListRow icon={CircleUserRound} title={user?.name ?? "Profile"} subtitle={user?.email} divider onPress={onProfile} />
      </View>
      <View className="gap-2">
        <Text variant="caption" tone="muted">APPEARANCE</Text>
        <Select<ThemeMode> label="Theme" value={mode} options={MODES} onChange={setMode} />
      </View>
      <View className="gap-2">
        <Text variant="caption" tone="muted">ABOUT</Text>
        <ListRow icon={Info} title="Version" trailing={<Text tone="muted">{Constants.expoConfig?.version ?? "0.1.0"}</Text>} />
      </View>
      <Button label="Sign out" variant="secondary" icon={LogOut} onPress={() => setConfirm(true)} />
      <Dialog
        visible={confirm}
        title="Sign out?"
        message="You will need to sign in again to see your notes."
        confirmLabel="Sign out"
        onConfirm={() => void signOut()}
        onClose={() => setConfirm(false)}
      />
    </Screen>
  );
}
