import type { Module } from "../../shared/http/types.ts";
import { notesRoutes } from "./routes.ts";

export default { name: "notes", routes: notesRoutes } satisfies Module;
