//! Pure helpers for the settings screen.
use app_core::ThemeMode;

pub const SECTIONS: [&str; 2] = ["Appearance", "Connection"];

pub fn mode_index(mode: ThemeMode) -> usize {
    ThemeMode::ALL.iter().position(|m| *m == mode).unwrap_or(0)
}

pub fn mode_at(index: usize) -> ThemeMode {
    ThemeMode::ALL.get(index).copied().unwrap_or_default()
}

/// A server address is usable when it is an http(s) URL with a host.
pub fn valid_server(url: &str) -> bool {
    let u = url.trim();
    u.strip_prefix("https://").or_else(|| u.strip_prefix("http://")).is_some_and(|rest| !rest.is_empty() && !rest.starts_with('/'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mode_index_round_trips() {
        for (i, m) in ThemeMode::ALL.iter().enumerate() {
            assert_eq!(mode_index(*m), i);
            assert_eq!(mode_at(i), *m);
        }
        assert_eq!(mode_at(99), ThemeMode::System);
    }

    #[test]
    fn server_validation() {
        assert!(valid_server("http://localhost:8787"));
        assert!(valid_server(" https://api.example.com "));
        assert!(!valid_server("localhost:8787"));
        assert!(!valid_server("http://"));
        assert!(!valid_server("http:///x"));
    }
}
