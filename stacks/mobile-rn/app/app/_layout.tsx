import "../global.css";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/features/auth";
import { OnboardingProvider, useOnboarding } from "@/features/onboarding";
import { ThemeProvider, useTheme } from "@/shared/theme";
import { ToastProvider } from "@/shared/ui";

function Routes() {
  const { status } = useAuth();
  const onboarding = useOnboarding();
  const { scheme } = useTheme();
  if (status === "loading" || onboarding.status === "loading") {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator accessibilityLabel="Loading" /></View>;
  }
  const signedIn = status === "signedIn";
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="note/new" />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && onboarding.status === "pending"}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && onboarding.status === "done"}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ToastProvider>
            <OnboardingProvider>
              <AuthProvider>
                <Routes />
              </AuthProvider>
            </OnboardingProvider>
          </ToastProvider>
          <PortalHost />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
