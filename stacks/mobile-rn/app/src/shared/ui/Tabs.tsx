import { ScrollView } from "react-native";
import { Tabs as BaseTabs, TabsList, TabsTrigger } from "./primitives/tabs";
import { Text } from "./Text";

export type TabItem<T extends string> = { value: T; label: string };

/** Segmented tabs for filtering inside a screen (screen-level navigation uses the router tab bar). */
export function Tabs<T extends string>({ items, value, onChange }: { items: readonly TabItem<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <BaseTabs value={value} onValueChange={(v) => onChange(v as T)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TabsList role="tablist">
          {items.map((it) => (
            <TabsTrigger key={it.value} value={it.value} accessibilityLabel={it.label} className="min-w-20 px-4">
              <Text variant="small" className="font-semibold">{it.label}</Text>
            </TabsTrigger>
          ))}
        </TabsList>
      </ScrollView>
    </BaseTabs>
  );
}
