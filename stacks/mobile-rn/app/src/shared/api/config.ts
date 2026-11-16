import { Platform } from "react-native";

/** Backend URL. Set EXPO_PUBLIC_API_URL; the default reaches a backend on your PC. */
export const API_URL = process.env["EXPO_PUBLIC_API_URL"] ??
  (Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787");
