//! Domain layer: plain data and rules shared by every crate. No UI, no I/O, no async.

use std::fmt;

/// A note as the app understands it (independent of the generated API types).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Note {
    pub id: String,
    pub text: String,
    /// Unix seconds.
    pub created_at: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct User {
    pub name: String,
    pub email: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Session {
    pub token: String,
    pub user: User,
}

/// Where the user is. Features emit these; the app shell renders them.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Route {
    Dashboard,
    Notes,
    NoteDetail(String),
    NoteNew,
    NoteEdit(String),
    Settings,
    Profile,
    NotFound(String),
}

impl Route {
    /// Parse a path like `notes`, `notes/new`, `notes/<id>`, `notes/<id>/edit`, `settings`.
    /// Anything unknown becomes `NotFound` (used by `--open <path>` and deep links).
    pub fn parse(path: &str) -> Route {
        let parts: Vec<&str> = path.trim_matches('/').split('/').filter(|p| !p.is_empty()).collect();
        match parts.as_slice() {
            [] | ["dashboard"] => Route::Dashboard,
            ["notes"] => Route::Notes,
            ["notes", "new"] => Route::NoteNew,
            ["notes", id] => Route::NoteDetail((*id).to_string()),
            ["notes", id, "edit"] => Route::NoteEdit((*id).to_string()),
            ["settings"] => Route::Settings,
            ["profile"] => Route::Profile,
            _ => Route::NotFound(path.to_string()),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ThemeMode {
    Light,
    Dark,
    #[default]
    System,
}

impl ThemeMode {
    pub const ALL: [ThemeMode; 3] = [Self::System, Self::Light, Self::Dark];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Light => "light",
            Self::Dark => "dark",
            Self::System => "system",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "light" => Self::Light,
            "dark" => Self::Dark,
            _ => Self::System,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Light => "Light",
            Self::Dark => "Dark",
            Self::System => "Match system",
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Range {
    #[default]
    All,
    Today,
    Week,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Sort {
    #[default]
    Newest,
    Oldest,
    Alphabetical,
}

/// Search + filter + sort state of the notes list.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct NoteFilter {
    pub query: String,
    pub range: Range,
    pub sort: Sort,
}

const DAY: i64 = 86_400;

impl NoteFilter {
    /// Apply the filter to `notes`; `now` is unix seconds (injected so it is testable).
    pub fn apply(&self, notes: &[Note], now: i64) -> Vec<Note> {
        let q = self.query.trim().to_lowercase();
        let since = match self.range {
            Range::All => i64::MIN,
            Range::Today => now - DAY,
            Range::Week => now - 7 * DAY,
        };
        let mut out: Vec<Note> =
            notes.iter().filter(|n| n.created_at >= since && (q.is_empty() || n.text.to_lowercase().contains(&q))).cloned().collect();
        match self.sort {
            Sort::Newest => out.sort_by_key(|n| std::cmp::Reverse(n.created_at)),
            Sort::Oldest => out.sort_by_key(|n| n.created_at),
            Sort::Alphabetical => out.sort_by_key(|n| n.text.to_lowercase()),
        }
        out
    }
}

/// Loading state every screen shows: skeleton, content, or an error with retry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Load<T> {
    Loading,
    Ready(T),
    Failed(String),
}

impl<T> Load<T> {
    pub fn ready(&self) -> Option<&T> {
        match self {
            Self::Ready(v) => Some(v),
            _ => None,
        }
    }
}

impl<T, E: std::fmt::Display> From<Result<T, E>> for Load<T> {
    fn from(r: Result<T, E>) -> Self {
        match r {
            Ok(v) => Self::Ready(v),
            Err(e) => Self::Failed(e.to_string()),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ValidationError {
    Empty,
    TooLong(usize),
    BadEmail,
    ShortPassword,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "Write something first."),
            Self::TooLong(max) => write!(f, "Keep it under {max} characters."),
            Self::BadEmail => write!(f, "Enter a valid email address."),
            Self::ShortPassword => write!(f, "Password must be at least 8 characters."),
        }
    }
}

pub const NOTE_MAX: usize = 500;

/// Mirrors the contract's `NewNote` (1..=500 characters). Returns the trimmed text.
pub fn validate_note_text(text: &str) -> Result<String, ValidationError> {
    let t = text.trim();
    match t.chars().count() {
        0 => Err(ValidationError::Empty),
        n if n > NOTE_MAX => Err(ValidationError::TooLong(NOTE_MAX)),
        _ => Ok(t.to_string()),
    }
}

pub fn validate_credentials(email: &str, password: &str) -> Result<(), ValidationError> {
    let e = email.trim();
    let ok = e.split_once('@').is_some_and(|(l, d)| !l.is_empty() && d.contains('.') && !d.ends_with('.'));
    if !ok {
        return Err(ValidationError::BadEmail);
    }
    if password.chars().count() < 8 {
        return Err(ValidationError::ShortPassword);
    }
    Ok(())
}

/// "just now", "5 min ago", "3 h ago", "2 d ago", else the day count.
pub fn time_ago(now: i64, then: i64) -> String {
    let s = (now - then).max(0);
    match s {
        0..=59 => "just now".into(),
        60..=3599 => format!("{} min ago", s / 60),
        3600..=86_399 => format!("{} h ago", s / 3600),
        _ => format!("{} d ago", s / DAY),
    }
}

/// "17 Nov 2026, 14:03 UTC" (civil-from-days; no time zone data on purpose).
pub fn format_utc(ts: i64) -> String {
    let (days, secs) = (ts.div_euclid(DAY), ts.rem_euclid(DAY));
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    const MONTHS: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    format!("{day} {} {year}, {:02}:{:02} UTC", MONTHS[(month - 1) as usize], secs / 3600, secs % 3600 / 60)
}

/// Up to two initials for an avatar.
pub fn initials(name: &str) -> String {
    let s: String = name.split_whitespace().filter_map(|w| w.chars().next()).take(2).collect();
    if s.is_empty() { "?".into() } else { s.to_uppercase() }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn note(id: &str, text: &str, at: i64) -> Note {
        Note { id: id.into(), text: text.into(), created_at: at }
    }

    #[test]
    fn filter_searches_ranges_and_sorts() {
        let now = 10 * DAY;
        let notes = [note("1", "Buy milk", now - 10), note("2", "Plan trip", now - 3 * DAY), note("3", "milk run", now - 20 * DAY)];
        let f = NoteFilter { query: " MILK ".into(), ..Default::default() };
        assert_eq!(f.apply(&notes, now).iter().map(|n| n.id.as_str()).collect::<Vec<_>>(), ["1", "3"]);
        let f = NoteFilter { range: Range::Week, sort: Sort::Alphabetical, ..Default::default() };
        assert_eq!(f.apply(&notes, now).iter().map(|n| n.id.as_str()).collect::<Vec<_>>(), ["1", "2"]);
        let f = NoteFilter { range: Range::Today, ..Default::default() };
        assert_eq!(f.apply(&notes, now).len(), 1);
    }

    #[test]
    fn note_validation_matches_contract() {
        assert_eq!(validate_note_text("  hi "), Ok("hi".into()));
        assert_eq!(validate_note_text("   "), Err(ValidationError::Empty));
        assert_eq!(validate_note_text(&"x".repeat(501)), Err(ValidationError::TooLong(500)));
        assert!(validate_note_text(&"x".repeat(500)).is_ok());
    }

    #[test]
    fn credentials_validation() {
        assert!(validate_credentials("user@example.com", "12345678").is_ok());
        assert_eq!(validate_credentials("nope", "12345678"), Err(ValidationError::BadEmail));
        assert_eq!(validate_credentials("user@example.", "12345678"), Err(ValidationError::BadEmail));
        assert_eq!(validate_credentials("user@example.com", "short"), Err(ValidationError::ShortPassword));
    }

    #[test]
    fn formats_time_and_initials() {
        assert_eq!(time_ago(100, 90), "just now");
        assert_eq!(time_ago(1000, 400), "10 min ago");
        assert_eq!(time_ago(3 * DAY, 0), "3 d ago");
        assert_eq!(initials("ada lovelace byron"), "AL");
        assert_eq!(initials(""), "?");
    }

    #[test]
    fn formats_utc_dates() {
        assert_eq!(format_utc(0), "1 Jan 1970, 00:00 UTC");
        assert_eq!(format_utc(1_767_225_600 + 3600 * 14 + 180), "1 Jan 2026, 14:03 UTC");
        assert_eq!(format_utc(951_782_400), "29 Feb 2000, 00:00 UTC");
    }

    #[test]
    fn parses_routes() {
        assert_eq!(Route::parse(""), Route::Dashboard);
        assert_eq!(Route::parse("/notes/new"), Route::NoteNew);
        assert_eq!(Route::parse("notes/abc"), Route::NoteDetail("abc".into()));
        assert_eq!(Route::parse("notes/abc/edit"), Route::NoteEdit("abc".into()));
        assert_eq!(Route::parse("nope/x"), Route::NotFound("nope/x".into()));
    }

    #[test]
    fn theme_mode_round_trips() {
        for m in ThemeMode::ALL {
            assert_eq!(ThemeMode::parse(m.as_str()), m);
        }
        assert_eq!(ThemeMode::parse("garbage"), ThemeMode::System);
    }
}
