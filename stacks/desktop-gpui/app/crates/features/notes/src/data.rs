//! Data access for notes. The only module of this feature that talks to the API client.
use app_core::{Load, Note};
use app_services::Services;

pub async fn list(services: &Services) -> Load<Vec<Note>> {
    services.api.list_notes().await.into()
}

pub async fn get(services: &Services, id: &str) -> Result<Note, String> {
    services.api.get_note(id).await.map_err(|e| e.to_string())
}

pub async fn update(services: &Services, id: &str, text: &str) -> Result<Note, String> {
    services.api.update_note(id, text).await.map_err(|e| e.to_string())
}

pub async fn create(services: &Services, text: &str) -> Result<Note, String> {
    services.api.create_note(text).await.map_err(|e| e.to_string())
}

pub async fn delete(services: &Services, id: &str) -> Result<(), String> {
    services.api.delete_note(id).await.map_err(|e| e.to_string())
}

pub fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}
