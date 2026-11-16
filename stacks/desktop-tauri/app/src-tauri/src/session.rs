//! The session token: kept in the operating system's credential store, never in a file or in the webview's storage.
//! The webview asks for it through three commands; the logic lives in `TokenStore` so tests run without a real keyring.

use std::sync::Mutex;

/// Where the bearer token is kept.
pub trait TokenStore: Send + Sync {
    fn get(&self) -> Result<Option<String>, String>;
    fn set(&self, token: &str) -> Result<(), String>;
    fn clear(&self) -> Result<(), String>;
}

/// Windows Credential Manager, macOS Keychain or the Secret Service, through the `keyring` crate.
pub struct KeyringStore {
    entry: keyring::Entry,
}

impl KeyringStore {
    pub fn new(service: &str) -> Result<Self, String> {
        let entry = keyring::Entry::new(service, "session-token").map_err(|e| e.to_string())?;
        Ok(Self { entry })
    }
}

impl TokenStore for KeyringStore {
    fn get(&self) -> Result<Option<String>, String> {
        match self.entry.get_password() {
            Ok(t) => Ok(Some(t)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }
    fn set(&self, token: &str) -> Result<(), String> {
        self.entry.set_password(token).map_err(|e| e.to_string())
    }
    fn clear(&self) -> Result<(), String> {
        match self.entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

/// In-memory store used by tests, and as the fallback when the OS store cannot be opened (the app then asks to sign in
/// again on the next launch instead of failing).
#[derive(Default)]
pub struct MemoryStore(Mutex<Option<String>>);

impl TokenStore for MemoryStore {
    fn get(&self) -> Result<Option<String>, String> {
        Ok(self.0.lock().map_err(|e| e.to_string())?.clone())
    }
    fn set(&self, token: &str) -> Result<(), String> {
        *self.0.lock().map_err(|e| e.to_string())? = Some(token.to_owned());
        Ok(())
    }
    fn clear(&self) -> Result<(), String> {
        *self.0.lock().map_err(|e| e.to_string())? = None;
        Ok(())
    }
}

/// Tokens are opaque strings from the backend. Refuse anything that is empty, absurdly long or not printable ASCII,
/// so a bug or a hostile page cannot park arbitrary data in the credential store.
pub fn validate_token(token: &str) -> Result<&str, String> {
    let t = token.trim();
    if t.is_empty() || t.len() > 4096 || !t.bytes().all(|b| (0x21..=0x7e).contains(&b)) {
        return Err("invalid token".into());
    }
    Ok(t)
}

pub type SharedStore = Box<dyn TokenStore>;

#[tauri::command]
pub fn token_get(store: tauri::State<'_, SharedStore>) -> Result<Option<String>, String> {
    store.get()
}

#[tauri::command]
pub fn token_set(store: tauri::State<'_, SharedStore>, token: String) -> Result<(), String> {
    store.set(validate_token(&token)?)
}

#[tauri::command]
pub fn token_clear(store: tauri::State<'_, SharedStore>) -> Result<(), String> {
    store.clear()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn memory_store_round_trip() {
        let s = MemoryStore::default();
        assert_eq!(s.get().unwrap(), None);
        s.set("abc123").unwrap();
        assert_eq!(s.get().unwrap().as_deref(), Some("abc123"));
        s.clear().unwrap();
        assert_eq!(s.get().unwrap(), None);
        s.clear().unwrap(); // clearing twice is fine
    }

    #[test]
    fn validates_tokens() {
        assert_eq!(validate_token("  tok.en-1_2  ").unwrap(), "tok.en-1_2");
        assert!(validate_token("").is_err());
        assert!(validate_token("   ").is_err());
        assert!(validate_token("has space").is_err());
        assert!(validate_token("new\nline").is_err());
        assert!(validate_token("caf\u{e9}").is_err());
        assert!(validate_token(&"a".repeat(4097)).is_err());
        assert!(validate_token(&"a".repeat(4096)).is_ok());
    }

    /// Talks to the real OS credential store, so it is opt-in: `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn keyring_round_trip() {
        let s = KeyringStore::new("com.example.daedalus-test").unwrap();
        s.set("tok-123").unwrap();
        assert_eq!(s.get().unwrap().as_deref(), Some("tok-123"));
        s.clear().unwrap();
        assert_eq!(s.get().unwrap(), None);
    }
}
