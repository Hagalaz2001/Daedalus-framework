// Builds a DESIGN.md from one seed colour with Google's Material colour utilities (Apache-2.0).
// Light and dark schemes come from the same seed; the prose quotes the front matter values, so the
// two cannot disagree. The library is loaded on first use so it stays out of the main bundle.
const ROLES = [
  "surface",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "onSurface",
  "onSurfaceVariant",
  "inverseSurface",
  "inverseOnSurface",
  "outline",
  "outlineVariant",
  "surfaceTint",
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "inversePrimary",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surfaceVariant",
] as const;
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

type Roles = Record<string, string>;

async function schemes(seed: string): Promise<{ light: Roles; dark: Roles }> {
  const m = await import("./vendor/material-color-utilities.js");
  const argb = m.argbFromHex(seed);
  const colors = new m.MaterialDynamicColors() as unknown as Record<string, () => { getArgb(s: unknown): number }>;
  const build = (dark: boolean): Roles => {
    const scheme = new m.SchemeTonalSpot(m.Hct.fromInt(argb), dark, 0);
    return Object.fromEntries(
      ROLES.map((role) => [kebab(role), m.hexFromArgb(colors[role]!().getArgb(scheme)).toLowerCase()]),
    );
  };
  return { light: build(false), dark: build(true) };
}

const yamlColors = (key: string, roles: Roles) =>
  `${key}:\n${Object.entries(roles).map(([k, v]) => `  ${k}: '${v}'`).join("\n")}`;

const TYPE: [string, number, number, number, string][] = [
  ["display-lg", 36, 44, 700, "-0.03em"],
  ["headline-lg", 24, 32, 600, "-0.02em"],
  ["headline-md", 20, 28, 600, "-0.015em"],
  ["body-lg", 16, 24, 400, "-0.01em"],
  ["body-md", 14, 20, 400, "0em"],
  ["label-lg", 14, 20, 600, "0.01em"],
  ["label-sm", 12, 16, 600, "0.02em"],
];
const SYSTEM_FONT = "system-ui";

export async function buildDesignMd(input: { name: string; seed: string }): Promise<string> {
  if (!/^#[0-9a-fA-F]{6}$/.test(input.seed)) throw new Error("The seed colour must look like #1a73e8.");
  const { light, dark } = await schemes(input.seed);
  const type = TYPE.map(([k, size, line, weight, spacing]) =>
    `  ${k}:\n    fontFamily: ${SYSTEM_FONT}\n    fontSize: ${size}px\n    fontWeight: '${weight}'\n    lineHeight: ${line}px\n    letterSpacing: ${spacing}`
  ).join("\n");
  const front = [
    "---",
    `name: ${input.name.trim() || "Untitled"}`,
    yamlColors("colors", light),
    yamlColors("colors-dark", dark),
    `typography:\n${type}`,
    "rounded:\n  sm: 0.25rem\n  DEFAULT: 0.5rem\n  md: 0.75rem\n  lg: 1rem\n  xl: 1.5rem\n  full: 9999px",
    "spacing:\n  gutter: 1rem\n  margin: 1rem\n  space-xs: 0.25rem\n  space-sm: 0.5rem\n  space-md: 1rem\n  space-lg: 1.5rem\n  space-xl: 2rem",
    "---",
  ].join("\n");
  const quote = (name: string) => `- **${name}** ${light[name]} (dark ${dark[name]})`;
  return `${front}

## Brand & Style

Generated from the seed colour ${input.seed}. Edit this file; the Design Studio reads it before every generation.

## Colors

Material 3 roles derived from one seed, light scheme first and the dark scheme in \`colors-dark\`. Values below are copied from the front matter.

${["primary", "on-primary", "surface", "on-surface", "outline", "error"].map(quote).join("\n")}

## Typography

One family, the system font stack, so nothing is loaded at render time. Sizes follow the tiers in the front matter.

## Layout & Spacing

A 4px grid. Spacing tokens are \`space-xs\` to \`space-xl\`; gutters and margins are 1rem.

## Elevation & Depth

Use the surface-container roles for depth; avoid shadows heavier than 1px borders.

## Shapes

Radii come from \`rounded\`: small 4px, default 8px, large 16px, pills use \`full\`.

## Components

Buttons are at least 44px tall. Navigation sits in a shell kept separate from content.
`;
}
