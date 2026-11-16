import { getItem, removeItem, setItem } from "./storage";

const KEY = "auth_token";
let cached: string | null = null;

/** The bearer token: in memory for requests, persisted in secure storage across launches. */
export const token = {
  get: () => cached,
  async restore() {
    cached = await getItem(KEY);
    return cached;
  },
  async set(value: string) {
    cached = value;
    await setItem(KEY, value);
  },
  async clear() {
    cached = null;
    await removeItem(KEY);
  },
};
