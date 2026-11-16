import { focusManager, onlineManager } from "@tanstack/react-query";

// Under Deno the sandbox window.addEventListener is not callable the way query-core calls it; tests need no focus events.
focusManager.setEventListener(() => () => {});
onlineManager.setEventListener(() => () => {});

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));


// Reanimated and Worklets need native modules that do not exist under Jest; the kit only uses fade presets.
jest.mock("react-native-worklets", () => ({}));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const preset: Record<string, unknown> = {};
  for (const m of ["duration", "delay", "reduceMotion"]) preset[m] = () => preset;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    FadeIn: preset,
    FadeOut: preset,
    ReduceMotion: { System: "system" },
  };
});
