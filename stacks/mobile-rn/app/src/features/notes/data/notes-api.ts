import type { Schemas } from "@app/api";
import { api, unwrap } from "@/shared/api";

export type Note = Schemas["Note"];

export const listNotes = () => unwrap<Note[]>(api.GET("/notes"));
export const createNote = (text: string) => unwrap<Note>(api.POST("/notes", { body: { text } }));
export const deleteNote = async (id: string) => {
  await unwrap<unknown>(api.DELETE("/notes/{id}", { params: { path: { id } } }));
};
