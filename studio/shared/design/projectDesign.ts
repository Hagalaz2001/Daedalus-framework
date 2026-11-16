// Design Studio types shared by the server and the UI.
// Files live in the project under design/<slug>/; only the server writes the manifest.

export const DESIGN_FOLDER = "design";
export const DESIGN_TARGETS = ["web-desktop", "web-mobile", "flutter-phone"] as const;
export type DesignTarget = (typeof DESIGN_TARGETS)[number];
export type DesignEngine = "model" | "stitch";
export type DesignStepKind = "generate" | "refine" | "screens" | "fix";

export interface DesignStep {
  id: string;
  kind: DesignStepKind;
  /** The brief, the refine instruction or the screen names. */
  instruction: string;
  created: string;
  /** The variant file this step started from (refine, fix, screens). */
  parent?: string;
  /** Files the step is expected to produce, relative to design/<slug>/. */
  files: string[];
  /** refine/fix: surgical patch (default) or a full regenerate. */
  mode?: "surgical" | "full";
}

/** design/<slug>/design.json */
export interface DesignManifest {
  version: 1;
  slug: string;
  brief: string;
  target: DesignTarget;
  /** Which model wrote the designs: "project-agent" is whatever model the project chat uses. */
  model: string;
  engine: DesignEngine;
  created: string;
  reference?: string;
  steps: DesignStep[];
}

export interface DesignFileInfo {
  file: string;
  modifiedAt: string;
  ok: boolean;
  /** Why a file that exists cannot be previewed. */
  problems: string[];
  scripts: boolean;
  /** Screenshot saved beside the file (Stitch). */
  image?: string;
  /** True while the file still points at remote assets that the preview blocks. */
  remote?: boolean;
  /** Set when the file is a screen body merged into an app shell. */
  shellId?: string;
  route?: string;
}

export interface DesignScreen {
  slug: string;
  manifest: DesignManifest;
  files: DesignFileInfo[];
  /** Staged export files, relative to design/<slug>/export/. */
  exports: string[];
  /** Surgical patches that could not be applied, by the file they were meant to produce. */
  patchErrors?: Record<string, string>;
}

export interface DesignList {
  screens: DesignScreen[];
  hasDesignMd: boolean;
  /** Shells (design/shell/<id>) that load cleanly, with their route maps. */
  shells: { id: string; map: import("./projectDesignShell.ts").DesignRouteMap }[];
  /** Raw DESIGN.md (YAML front matter + prose), when the project has one. */
  designMd: string | null;
}

export type DesignCommand =
  | { kind: "list" }
  | { kind: "read"; slug: string; file: string }
  | {
    kind: "begin";
    step: DesignStepKind;
    /** New screen (generate). */
    name?: string;
    brief?: string;
    target?: DesignTarget;
    count?: number;
    reference?: { mime: string; bytes: Uint8Array };
    /** Existing screen (refine, fix, screens). */
    slug?: string;
    parent?: string;
    instruction?: string;
    names?: string[];
    mode?: "surgical" | "full";
  }
  | { kind: "stitch-status" }
  | { kind: "stitch-generate"; name: string; brief: string; target: DesignTarget; count: number }
  | { kind: "inline-remote"; slug: string; file: string }
  /** Imports a Stitch export folder (code.html, DESIGN.md, screen.png) as a labelled design. */
  | { kind: "import-stitch"; folder: string }
  | ({ kind: "directions-begin" } & import("./projectDesignDirections.ts").DirectionsInput)
  | { kind: "directions-list" }
  | { kind: "directions-md"; id: string }
  | { kind: "directions-design-md"; id: string; text: string }
  | { kind: "directions-read"; id: string; screen: string }
  | { kind: "directions-select"; directionId: string; notes?: string }
  | { kind: "directions-unlock" };

export interface DesignBeginResult {
  slug: string;
  step: DesignStep;
}
