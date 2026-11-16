mod detail;
mod form;
mod list;

pub use detail::NoteDetailView;
pub use form::NoteFormView;
pub use list::NotesView;

pub(crate) fn now() -> i64 {
    crate::data::now()
}

/// First line of a note, shortened for list titles.
pub(crate) fn title_of(text: &str) -> String {
    let line = text.lines().next().unwrap_or("").trim();
    if line.chars().count() > 90 { format!("{}...", line.chars().take(90).collect::<String>().trim_end()) } else { line.to_string() }
}

#[cfg(test)]
mod tests {
    use super::title_of;

    #[test]
    fn title_is_first_line_and_shortened() {
        assert_eq!(title_of("  hello\nworld"), "hello");
        assert_eq!(title_of(&"x".repeat(200)).chars().count(), 93);
        assert_eq!(title_of(""), "");
    }
}
