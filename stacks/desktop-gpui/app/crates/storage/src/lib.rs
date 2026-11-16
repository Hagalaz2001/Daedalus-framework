//! Local persistence. Settings live in an embedded redb file in the OS data directory; the session
//! token lives in the OS credential store (Windows Credential Manager, macOS Keychain, Secret Service).

use app_core::ThemeMode;
use redb::{Database, ReadableDatabase, TableDefinition};
use std::{error::Error, path::PathBuf};

type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

const SETTINGS: TableDefinition<&str, &str> = TableDefinition::new("settings");
const THEME: &str = "theme";
const BASE_URL: &str = "base_url";
pub const DEFAULT_BASE_URL: &str = "http://localhost:8787";

pub struct Storage {
    db: Database,
    service: String,
}

impl Storage {
    /// Open (or create) the settings database under the per-user data directory for `app_id`.
    pub fn open(app_id: &str) -> Result<Self> {
        Self::open_at(data_dir(app_id).join("settings.redb"), app_id)
    }

    pub fn open_at(path: PathBuf, service: &str) -> Result<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        Ok(Self { db: Database::create(path)?, service: service.to_string() })
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let tx = self.db.begin_read().ok()?;
        let table = tx.open_table(SETTINGS).ok()?;
        table.get(key).ok()?.map(|v| v.value().to_string())
    }

    pub fn set(&self, key: &str, value: &str) -> Result<()> {
        let tx = self.db.begin_write()?;
        tx.open_table(SETTINGS)?.insert(key, value)?;
        tx.commit()?;
        Ok(())
    }

    pub fn theme_mode(&self) -> ThemeMode {
        self.get(THEME).map(|s| ThemeMode::parse(&s)).unwrap_or_default()
    }

    pub fn set_theme_mode(&self, mode: ThemeMode) -> Result<()> {
        self.set(THEME, mode.as_str())
    }

    pub fn base_url(&self) -> String {
        self.get(BASE_URL).unwrap_or_else(|| DEFAULT_BASE_URL.to_string())
    }

    pub fn set_base_url(&self, url: &str) -> Result<()> {
        self.set(BASE_URL, url.trim())
    }

    /// Ask before deleting a note (default on).
    pub fn confirm_delete(&self) -> bool {
        self.get("confirm_delete").as_deref() != Some("false")
    }

    pub fn set_confirm_delete(&self, on: bool) -> Result<()> {
        self.set("confirm_delete", if on { "true" } else { "false" })
    }

    // Session token: the credential store, never the settings file.
    fn entry(&self) -> Result<keyring::Entry> {
        Ok(keyring::Entry::new(&self.service, "session-token")?)
    }

    pub fn token(&self) -> Option<String> {
        self.entry().ok()?.get_password().ok()
    }

    pub fn set_token(&self, token: &str) -> Result<()> {
        Ok(self.entry()?.set_password(token)?)
    }

    pub fn clear_token(&self) {
        if let Ok(e) = self.entry() {
            let _ = e.delete_credential();
        }
    }
}

fn data_dir(app_id: &str) -> PathBuf {
    let base = if cfg!(windows) {
        std::env::var_os("APPDATA").map(PathBuf::from)
    } else if cfg!(target_os = "macos") {
        std::env::var_os("HOME").map(|h| PathBuf::from(h).join("Library/Application Support"))
    } else {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
    };
    base.unwrap_or_else(std::env::temp_dir).join(app_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_store(name: &str) -> Storage {
        let path = std::env::temp_dir().join(format!("{name}-{}.redb", std::process::id()));
        let _ = std::fs::remove_file(&path);
        Storage::open_at(path, "storage-test").unwrap()
    }

    #[test]
    fn settings_round_trip_with_defaults() {
        let s = temp_store("settings");
        assert_eq!(s.theme_mode(), ThemeMode::System);
        assert_eq!(s.base_url(), DEFAULT_BASE_URL);
        s.set_theme_mode(ThemeMode::Dark).unwrap();
        s.set_base_url(" http://example.test ").unwrap();
        assert_eq!(s.theme_mode(), ThemeMode::Dark);
        assert_eq!(s.base_url(), "http://example.test");
        assert!(s.confirm_delete());
        s.set_confirm_delete(false).unwrap();
        assert!(!s.confirm_delete());
    }
}
