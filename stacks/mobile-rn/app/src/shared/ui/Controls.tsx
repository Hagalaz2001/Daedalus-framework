import { Pressable, View } from "react-native";
import { Checkbox as BaseCheckbox } from "./primitives/checkbox";
import { Switch as BaseSwitch } from "./primitives/switch";
import { Text } from "./Text";

type Props = { label: string; description?: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean };

function Labels({ label, description }: Pick<Props, "label" | "description">) {
  return (
    <View className="flex-1">
      <Text>{label}</Text>
      {description ? <Text variant="small" tone="muted">{description}</Text> : null}
    </View>
  );
}

/** The whole row is the tap target (48 dp), not just the small box. */
export function Checkbox({ label, description, value, onValueChange, disabled }: Props) {
  return (
    <Pressable
      role="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className="min-h-12 flex-row items-center gap-3"
    >
      <BaseCheckbox checked={value} onCheckedChange={onValueChange} disabled={disabled ?? false} accessible={false} />
      <Labels label={label} description={description} />
    </Pressable>
  );
}

export function Switch({ label, description, value, onValueChange, disabled }: Props) {
  return (
    <View className="min-h-12 flex-row items-center gap-3">
      <Labels label={label} description={description} />
      <BaseSwitch accessibilityLabel={label} checked={value} onCheckedChange={onValueChange} disabled={disabled ?? false} />
    </View>
  );
}
