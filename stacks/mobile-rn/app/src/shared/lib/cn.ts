// Adapted from React Native Reusables (MIT, https://github.com/founded-labs/react-native-reusables); see THIRD_PARTY.md.
// deno-lint-ignore-file
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
