//! Pure state for the notes screens (no GPUI), so it is unit-testable.
use app_core::{Load, Note, NoteFilter};

pub struct NotesState {
    pub load: Load<Vec<Note>>,
    pub filter: NoteFilter,
}

impl Default for NotesState {
    fn default() -> Self {
        Self { load: Load::Loading, filter: NoteFilter::default() }
    }
}

impl NotesState {
    pub fn visible(&self, now: i64) -> Vec<Note> {
        self.load.ready().map(|n| self.filter.apply(n, now)).unwrap_or_default()
    }

    pub fn total(&self) -> usize {
        self.load.ready().map_or(0, Vec::len)
    }

    pub fn is_filtering(&self) -> bool {
        self.filter != NoteFilter::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use app_core::{Range, Sort};

    fn note(id: &str, text: &str, at: i64) -> Note {
        Note { id: id.into(), text: text.into(), created_at: at }
    }

    fn ready() -> NotesState {
        NotesState { load: Load::Ready(vec![note("a", "Alpha", 100), note("b", "Beta", 200)]), filter: NoteFilter::default() }
    }

    #[test]
    fn nothing_visible_until_loaded() {
        assert!(NotesState::default().visible(1000).is_empty());
        assert_eq!(NotesState::default().total(), 0);
    }

    #[test]
    fn visible_applies_filter_and_counts() {
        let mut s = ready();
        assert_eq!(s.visible(300)[0].id, "b");
        s.filter = NoteFilter { query: "alp".into(), range: Range::All, sort: Sort::Newest };
        assert_eq!(s.visible(300).len(), 1);
        assert!(s.is_filtering());
        assert_eq!(s.total(), 2);
    }
}
