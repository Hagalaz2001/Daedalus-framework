import { type LucideIcon, Lock, PenLine, Search } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { cn } from "@/shared/lib/cn";
import { Button, Icon, Screen, Text } from "@/shared/ui";

const PAGES: readonly { icon: LucideIcon; title: string; body: string }[] = [
  { icon: PenLine, title: "Capture in seconds", body: "Jot a thought the moment you have it. No folders, no fuss." },
  { icon: Search, title: "Find it again", body: "Search and filter your notes so the right one is always close." },
  { icon: Lock, title: "Yours alone", body: "Your notes sit behind your account and are never shared." },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const page = PAGES[i]!;
  const last = i === PAGES.length - 1;
  return (
    <Screen
      scroll={false}
      footer={
        <View className="gap-2">
          <Button label={last ? "Get started" : "Next"} onPress={() => (last ? onDone() : setI(i + 1))} />
          {last ? null : <Button label="Skip" variant="ghost" onPress={onDone} />}
        </View>
      }
    >
      <View className="flex-1 items-center justify-center gap-4">
        <View className="size-[120px] items-center justify-center rounded-full bg-muted">
          <Icon as={page.icon} size={56} className="text-primary" />
        </View>
        <Text variant="display" className="text-center">{page.title}</Text>
        <Text tone="muted" className="text-center">{page.body}</Text>
        <View accessibilityLabel={`Step ${i + 1} of ${PAGES.length}`} className="mt-4 flex-row gap-2">
          {PAGES.map((_, n) => <View key={n} className={cn("h-2 rounded-full", n === i ? "w-6 bg-primary" : "w-2 bg-border")} />)}
        </View>
      </View>
    </Screen>
  );
}
