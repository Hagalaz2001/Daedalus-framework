import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./primitives/alert-dialog";
import { Text } from "./Text";

export type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Centered confirmation (Reusables AlertDialog). Use for decisions that must not happen by accident. */
export function Dialog(
  { visible, title, message, confirmLabel, cancelLabel = "Cancel", destructive, loading, onConfirm, onClose }: DialogProps,
) {
  return (
    <AlertDialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {message ? <AlertDialogDescription>{message}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <View className="gap-2">
          <Button label={confirmLabel} variant={destructive ? "danger" : "primary"} loading={loading ?? false} onPress={onConfirm} />
          <Button label={cancelLabel} variant="ghost" onPress={onClose} />
        </View>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type SheetProps = { visible: boolean; title?: string; onClose: () => void; children: ReactNode };

/** Bottom sheet for pickers and secondary actions. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable role="button" accessibilityLabel="Close" onPress={onClose} className="absolute inset-0 bg-black/50" />
        <View
          accessibilityViewIsModal
          className="max-h-[80%] rounded-t-3xl bg-background px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="mb-3 h-1 w-9 self-center rounded-sm bg-border" />
          {title ? <Text variant="heading" className="mb-2">{title}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
