import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Small key/value store: Keychain/Keystore on devices, localStorage on web (SecureStore has no web backend).
// shortcut: web tokens in localStorage are readable by page scripts; fine for dev, use cookies for a real web build.
export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Storage can be unavailable (private mode); the app keeps working for this session.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // see setItem
  }
}
