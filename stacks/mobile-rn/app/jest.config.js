module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // The ESM build is picked by default and Jest cannot load it; use the CommonJS one.
    "^lucide-react-native$": require.resolve("lucide-react-native"),
  },
  // Deno's node_modules layout nests packages under node_modules/.deno/<pkg>@<ver>/node_modules/.
  transformIgnorePatterns: [
    "node_modules/(?!(\.deno/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@tanstack/.*|better-auth|@better-auth/.*|@better-fetch/.*|lucide-react-native|nativewind|react-native-css-interop|@rn-primitives/.*|tailwind-merge|class-variance-authority|clsx))",
  ],
};
