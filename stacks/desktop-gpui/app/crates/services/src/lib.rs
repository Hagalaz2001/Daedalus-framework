//! `Services` is what every screen receives: the API client (already holding the stored token) and the
//! local storage. Session handling lives here so features stay thin.

use app_api::{Api, ApiError};
use app_core::{Session, User};
use app_storage::Storage;
use std::sync::Arc;

#[derive(Clone)]
pub struct Services {
    pub api: Api,
    pub store: Arc<Storage>,
}

impl Services {
    pub fn new(store: Storage) -> Self {
        let api = Api::new(&store.base_url(), store.token());
        Self { api, store: Arc::new(store) }
    }

    /// The signed-in user, if the stored token is still valid. A dead token is removed.
    pub async fn restore_session(&self) -> Option<User> {
        if !self.api.has_token() {
            return None;
        }
        match self.api.current_user().await {
            Ok(user) => Some(user),
            Err(ApiError::Unauthorized) => {
                self.forget();
                None
            }
            // Offline: stay signed out for this run but keep the token for the next one.
            Err(_) => None,
        }
    }

    pub async fn sign_in(&self, base_url: &str, email: &str, password: &str) -> Result<Session, ApiError> {
        self.api.set_base_url(base_url);
        let session = self.api.sign_in(email, password).await?;
        // Persist after success only; a storage failure must not block the session in memory.
        let _ = self.store.set_base_url(base_url);
        let _ = self.store.set_token(&session.token);
        self.api.set_token(Some(session.token.clone()));
        Ok(session)
    }

    pub async fn sign_out(&self) {
        self.api.sign_out().await;
        self.forget();
    }

    fn forget(&self) {
        self.store.clear_token();
        self.api.set_token(None);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starts_signed_out_with_default_server() {
        let path = std::env::temp_dir().join(format!("services-test-{}.redb", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let s = Services::new(Storage::open_at(path, "services-test-no-token").unwrap());
        assert!(!s.api.has_token());
    }
}
