//! The only place that talks to the backend. `generated` comes from contracts/openapi.yaml;
//! Better Auth's endpoints are not in the contract (they live under /api/auth/*), so they are
//! called here directly. Everything is mapped to `app-core` types before leaving this crate.

#[allow(clippy::all, unused, missing_docs, rustdoc::all)]
pub mod generated {
    include!(concat!(env!("OUT_DIR"), "/client.rs"));
}

use app_core::{Note, Session, User};
use std::sync::{Arc, RwLock};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ApiError {
    /// 401: not signed in or the token expired.
    Unauthorized,
    /// Server unreachable or the response was unreadable.
    Network(String),
    /// Server answered with an error.
    Server(String),
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unauthorized => write!(f, "Your session has expired. Sign in again."),
            Self::Network(m) => write!(f, "Cannot reach the server ({m})."),
            Self::Server(m) => write!(f, "{m}"),
        }
    }
}

type Result<T> = std::result::Result<T, ApiError>;

struct Config {
    base_url: String,
    token: Option<String>,
}

/// Cheap to clone. Calls run on a small private tokio runtime so they can be awaited from any executor.
#[derive(Clone)]
pub struct Api {
    rt: Arc<tokio::runtime::Runtime>,
    cfg: Arc<RwLock<Config>>,
}

impl Api {
    pub fn new(base_url: &str, token: Option<String>) -> Self {
        let rt = tokio::runtime::Builder::new_multi_thread().worker_threads(1).enable_all().build().expect("tokio runtime");
        Self { rt: Arc::new(rt), cfg: Arc::new(RwLock::new(Config { base_url: base_url.trim_end_matches('/').to_string(), token })) }
    }

    pub fn set_base_url(&self, url: &str) {
        self.cfg.write().unwrap().base_url = url.trim().trim_end_matches('/').to_string();
    }

    pub fn set_token(&self, token: Option<String>) {
        self.cfg.write().unwrap().token = token;
    }

    pub fn has_token(&self) -> bool {
        self.cfg.read().unwrap().token.is_some()
    }

    fn http(&self) -> reqwest::Client {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(v) = self.cfg.read().unwrap().token.as_ref().and_then(|t| format!("Bearer {t}").parse().ok()) {
            headers.insert(reqwest::header::AUTHORIZATION, v);
        }
        reqwest::Client::builder().default_headers(headers).timeout(std::time::Duration::from_secs(15)).build().expect("http client")
    }

    fn generated(&self) -> generated::Client {
        generated::Client::new_with_client(&self.cfg.read().unwrap().base_url, self.http())
    }

    fn base(&self) -> String {
        self.cfg.read().unwrap().base_url.clone()
    }

    /// Run `fut` on the private runtime and await its result from any executor.
    async fn on_rt<T: Send + 'static>(&self, fut: impl std::future::Future<Output = Result<T>> + Send + 'static) -> Result<T> {
        self.rt.spawn(fut).await.map_err(|e| ApiError::Network(e.to_string()))?
    }

    /// All notes, newest first. Follows the `X-Next-Cursor` header page by page (100 per page, at most
    /// 20 pages); a screen that outgrows that should paginate on demand.
    pub async fn list_notes(&self) -> Result<Vec<Note>> {
        let client = self.generated();
        self.on_rt(async move {
            let mut notes = vec![];
            let mut cursor: Option<String> = None;
            for _ in 0..20 {
                let mut req = client.list_notes().limit(100u64);
                if let Some(c) = cursor.take() {
                    req = req.cursor(c);
                }
                let res = req.send().await.map_err(map_err)?;
                cursor = res.headers().get("x-next-cursor").and_then(|v| v.to_str().ok()).map(str::to_string);
                notes.extend(res.into_inner().into_iter().map(note));
                if cursor.is_none() {
                    break;
                }
            }
            Ok(notes)
        })
        .await
    }

    pub async fn get_note(&self, id: &str) -> Result<Note> {
        let (client, id) = (self.generated(), parse_id(id)?);
        self.on_rt(async move { Ok(note(client.get_note().id(id).send().await.map_err(map_err)?.into_inner())) }).await
    }

    pub async fn create_note(&self, text: &str) -> Result<Note> {
        let (client, body) = (self.generated(), new_note(text)?);
        // A fresh key per user action: a retried request cannot create a duplicate.
        let key = uuid::Uuid::new_v4().to_string();
        self.on_rt(
            async move { Ok(note(client.create_note().idempotency_key(key).body(body).send().await.map_err(map_err)?.into_inner())) },
        )
        .await
    }

    pub async fn update_note(&self, id: &str, text: &str) -> Result<Note> {
        let (client, id, body) = (self.generated(), parse_id(id)?, new_note(text)?);
        self.on_rt(async move { Ok(note(client.update_note().id(id).body(body).send().await.map_err(map_err)?.into_inner())) }).await
    }

    pub async fn delete_note(&self, id: &str) -> Result<()> {
        let (client, id) = (self.generated(), parse_id(id)?);
        self.on_rt(async move {
            client.delete_note().id(id).send().await.map_err(map_err)?;
            Ok(())
        })
        .await
    }

    /// Better Auth: POST /api/auth/sign-in/email. Mobile/desktop clients read the bearer token from the
    /// `set-auth-token` response header.
    pub async fn sign_in(&self, email: &str, password: &str) -> Result<Session> {
        let (url, http) = (format!("{}/api/auth/sign-in/email", self.base()), self.http());
        let body = serde_json::json!({ "email": email.trim(), "password": password });
        let (token, user) = self
            .on_rt(async move {
                let res = http.post(url).json(&body).send().await.map_err(|e| ApiError::Network(e.to_string()))?;
                let status = res.status();
                let token = res.headers().get("set-auth-token").and_then(|v| v.to_str().ok()).map(str::to_string);
                if !status.is_success() {
                    let msg = res.json::<serde_json::Value>().await.ok().and_then(|v| v["message"].as_str().map(str::to_string));
                    return Err(if status.as_u16() == 401 || status.as_u16() == 403 {
                        ApiError::Server(msg.unwrap_or_else(|| "Wrong email or password.".into()))
                    } else {
                        ApiError::Server(msg.unwrap_or_else(|| format!("Sign in failed ({status}).")))
                    });
                }
                let v: serde_json::Value = res.json().await.map_err(|e| ApiError::Network(e.to_string()))?;
                let token = token
                    .or_else(|| v["token"].as_str().map(str::to_string))
                    .ok_or_else(|| ApiError::Server("The server sent no session token.".into()))?;
                Ok((token, parse_user(&v["user"])))
            })
            .await?;
        Ok(Session { token, user })
    }

    /// GET /me. `Unauthorized` when the stored token is no longer valid.
    pub async fn current_user(&self) -> Result<User> {
        let client = self.generated();
        self.on_rt(async move {
            let me = client.get_me().send().await.map_err(map_err)?.into_inner();
            Ok(User { name: me.name, email: me.email })
        })
        .await
    }

    pub async fn sign_out(&self) {
        let (url, http) = (format!("{}/api/auth/sign-out", self.base()), self.http());
        let _ = self
            .on_rt(async move {
                http.post(url).json(&serde_json::json!({})).send().await.map(|_| ()).map_err(|e| ApiError::Network(e.to_string()))
            })
            .await;
    }
}

fn parse_user(v: &serde_json::Value) -> User {
    User { name: v["name"].as_str().unwrap_or("").to_string(), email: v["email"].as_str().unwrap_or("").to_string() }
}

fn note(n: generated::types::Note) -> Note {
    Note { id: n.id, text: n.text, created_at: n.created_at.timestamp() }
}

fn parse_id(id: &str) -> Result<uuid::Uuid> {
    uuid::Uuid::parse_str(id).map_err(|_| ApiError::Server("That note id is not valid.".into()))
}

fn new_note(text: &str) -> Result<generated::types::NewNote> {
    let text = generated::types::NewNoteText::try_from(text.to_string()).map_err(|e| ApiError::Server(e.to_string()))?;
    Ok(generated::types::NewNote { text })
}

/// Problem responses (`application/problem+json`) arrive as raw streams, so the message is derived from the status.
fn map_err<E>(e: generated::Error<E>) -> ApiError {
    match e.status().map(|s| s.as_u16()) {
        Some(401) => ApiError::Unauthorized,
        Some(404) => ApiError::Server("Not found. It may have been deleted.".into()),
        Some(400 | 422) => ApiError::Server("The server rejected that input.".into()),
        Some(403) => ApiError::Server("You do not have access to that.".into()),
        Some(s) => ApiError::Server(format!("The server answered with an error ({s}).")),
        None => ApiError::Network(match &e {
            generated::Error::CommunicationError(c) => c.to_string(),
            _ => "unexpected response".into(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_user_json() {
        let u = parse_user(&serde_json::json!({"name": "Ada", "email": "user@example.com"}));
        assert_eq!(u, User { name: "Ada".into(), email: "user@example.com".into() });
        assert_eq!(parse_user(&serde_json::Value::Null).name, "");
    }

    #[test]
    fn generated_client_matches_contract() {
        // Compile-time proof the contract produced these operations; also checks mapping.
        let n = generated::types::Note { id: "1".into(), text: "hi".into(), created_at: "2026-01-01T00:00:00Z".parse().unwrap() };
        assert_eq!(note(n).created_at, 1_767_225_600);
    }

    #[test]
    fn unreachable_server_is_a_network_error() {
        let api = Api::new("http://127.0.0.1:9", None);
        let err = api.rt.block_on(api.list_notes()).unwrap_err();
        assert!(matches!(err, ApiError::Network(_)), "{err:?}");
    }
}
