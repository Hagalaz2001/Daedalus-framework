//! Pure form state for the sign-in screen.
use app_core::{ValidationError, validate_credentials};

#[derive(Default, Debug, PartialEq, Eq)]
pub struct SignInForm {
    pub busy: bool,
    pub error: Option<String>,
}

impl SignInForm {
    /// Validate and mark busy. Returns false (and sets the error) when the input is unusable.
    pub fn begin(&mut self, email: &str, password: &str, server: &str) -> bool {
        let check = validate_credentials(email, password).and_then(|_| {
            if server.trim().starts_with("http://") || server.trim().starts_with("https://") { Ok(()) } else { Err(ValidationError::Empty) }
        });
        match check {
            Ok(()) => {
                self.busy = true;
                self.error = None;
                true
            }
            Err(ValidationError::Empty) => {
                self.error = Some("The server address must start with http:// or https://.".into());
                false
            }
            Err(e) => {
                self.error = Some(e.to_string());
                false
            }
        }
    }

    pub fn failed(&mut self, message: String) {
        self.busy = false;
        self.error = Some(message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_bad_input_without_going_busy() {
        let mut f = SignInForm::default();
        assert!(!f.begin("nope", "12345678", "http://localhost:8787"));
        assert!(!f.busy && f.error.is_some());
        assert!(!f.begin("user@example.com", "12345678", "localhost"));
        assert!(f.error.unwrap().contains("http"));
    }

    #[test]
    fn valid_input_goes_busy_then_failure_clears_it() {
        let mut f = SignInForm::default();
        assert!(f.begin("user@example.com", "12345678", "https://api.example.com"));
        assert!(f.busy);
        f.failed("Wrong email or password.".into());
        assert!(!f.busy);
        assert_eq!(f.error.as_deref(), Some("Wrong email or password."));
    }
}
