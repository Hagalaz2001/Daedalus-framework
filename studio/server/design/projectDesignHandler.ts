// Routes Design Studio commands. The project is fixed when the server starts; the Stitch key comes from the
// environment and is passed straight to the SDK: no command returns or logs it.
import type { DesignCommand } from "../../shared/design/index.ts";
import {
  beginDirections,
  listDirections,
  readDirectionDesignMd,
  readDirectionScreen,
  selectDirection,
  unlockSelection,
  writeDirectionDesignMd,
} from "./projectDesignDirections.ts";
import { importStitchExport } from "./projectDesignImport.ts";
import { settlePatches } from "./projectDesignPatch.ts";
import { beginStep, listDesigns, readDesign } from "./projectDesignStore.ts";
import { inlineRemote, runStitch, type StitchDeps } from "./projectDesignStitch.ts";

export function createDesignHandler(options: {
  root: string;
  stitchKey: string | null;
  stitch: StitchDeps;
  /** Called after a step or direction set is recorded: the server starts the model work for it. */
  onBegun?: (event: { kind: "step"; slug: string; stepId: string } | { kind: "directions" }) => void;
}) {
  const { root, stitchKey, stitch, onBegun } = options;
  return async (command: unknown): Promise<unknown> => {
    const cmd = command as DesignCommand | null;
    switch (cmd?.kind) {
      case "stitch-status":
        return { configured: stitchKey !== null };
      case "list": {
        let list = await listDesigns(root);
        const { wrote, errors } = await settlePatches(root, list.screens);
        if (wrote) list = await listDesigns(root);
        return { ...list, screens: list.screens.map((s) => (errors.has(s.slug) ? { ...s, patchErrors: errors.get(s.slug) } : s)) };
      }
      case "read":
        return readDesign(root, cmd.slug, cmd.file);
      case "begin": {
        const ref = (cmd as { reference?: { mime: string; base64?: string; bytes?: Uint8Array } }).reference;
        if (ref?.base64) cmd.reference = { mime: ref.mime, bytes: Uint8Array.from(atob(ref.base64), (c) => c.charCodeAt(0)) };
        const begun = await beginStep(root, cmd);
        onBegun?.({ kind: "step", slug: begun.slug, stepId: begun.step.id });
        return begun;
      }
      case "inline-remote":
        return inlineRemote(root, cmd.slug, cmd.file, stitch.download);
      case "import-stitch":
        return importStitchExport(root, String((cmd as { folder?: unknown }).folder ?? ""));
      case "directions-list":
        return listDirections(root);
      case "directions-begin": {
        const set = await beginDirections(root, cmd);
        onBegun?.({ kind: "directions" });
        return set;
      }
      case "directions-design-md":
        return writeDirectionDesignMd(root, cmd.id, cmd.text);
      case "directions-md":
        return readDirectionDesignMd(root, (cmd as { id?: unknown }).id);
      case "directions-read":
        return readDirectionScreen(root, cmd.id, cmd.screen);
      case "directions-select":
        return selectDirection(root, cmd.directionId, cmd.notes);
      case "directions-unlock":
        return unlockSelection(root);
      case "stitch-generate": {
        if (!stitchKey) throw new Error("Set STITCH_API_KEY in studio/.env to use Google Stitch.");
        return runStitch(root, cmd, stitchKey, stitch);
      }
      default:
        throw new Error("Unknown design command.");
    }
  };
}
