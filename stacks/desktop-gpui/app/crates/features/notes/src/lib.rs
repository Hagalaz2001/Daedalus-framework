//! Notes: list with search and filters, detail, and the create form.
//! Layers: `state` (pure) <- `data` (API calls) <- `ui` (GPUI views). Public surface is only the views.
mod data;
mod state;
mod ui;

pub use ui::{NoteDetailView, NoteFormView, NotesView};
