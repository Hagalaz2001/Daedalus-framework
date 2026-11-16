//! Numbers shown on the dashboard, derived from the note list.
use app_core::Note;

#[derive(Debug, PartialEq, Eq)]
pub struct Stats {
    pub total: usize,
    pub today: usize,
    pub week: usize,
}

pub fn stats(notes: &[Note], now: i64) -> Stats {
    let within = |secs: i64| notes.iter().filter(|n| n.created_at >= now - secs).count();
    Stats { total: notes.len(), today: within(86_400), week: within(7 * 86_400) }
}

/// The newest `n` notes.
pub fn recent(notes: &[Note], n: usize) -> Vec<Note> {
    let mut v = notes.to_vec();
    v.sort_by_key(|x| std::cmp::Reverse(x.created_at));
    v.truncate(n);
    v
}

#[cfg(test)]
mod tests {
    use super::*;

    fn note(id: &str, at: i64) -> Note {
        Note { id: id.into(), text: id.into(), created_at: at }
    }

    #[test]
    fn counts_windows_and_orders_recent() {
        let now = 10 * 86_400;
        let notes = [note("old", 0), note("week", now - 3 * 86_400), note("today", now - 60)];
        assert_eq!(stats(&notes, now), Stats { total: 3, today: 1, week: 2 });
        let r = recent(&notes, 2);
        assert_eq!(r.iter().map(|n| n.id.as_str()).collect::<Vec<_>>(), ["today", "week"]);
    }
}
