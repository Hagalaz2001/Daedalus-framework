use app_core::{Load, Note};
use app_services::Services;

pub async fn notes(services: &Services) -> Load<Vec<Note>> {
    services.api.list_notes().await.into()
}

pub fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}
