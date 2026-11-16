use crate::state::SignInForm;
use app_core::Session;
use app_services::Services;
use app_ui::components::field;
use gpui_kit::component::{
    ActiveTheme as _, Icon, IconName, StyledExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::{Input, InputEvent, InputState},
    v_flex,
};
use gpui_kit::{
    AppContext as _, Context, Entity, EventEmitter, IntoElement, ParentElement as _, Render, Styled as _, Subscription, Window, div, px,
};

/// Emitted once the server accepted the credentials.
pub struct SignedIn(pub Session);

pub struct SignInView {
    services: Services,
    email: Entity<InputState>,
    password: Entity<InputState>,
    server: Entity<InputState>,
    form: SignInForm,
    _subs: Vec<Subscription>,
}

impl EventEmitter<SignedIn> for SignInView {}

impl SignInView {
    pub fn new(services: Services, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let server_url = services.store.base_url();
        let email = cx.new(|cx| InputState::new(window, cx).placeholder("you@example.com"));
        let password = cx.new(|cx| InputState::new(window, cx).placeholder("At least 8 characters").masked(true));
        let server = cx.new(|cx| InputState::new(window, cx).default_value(server_url));
        let mut subs = vec![];
        for input in [&email, &password, &server] {
            subs.push(cx.subscribe_in(input, window, |this, _, ev: &InputEvent, window, cx| {
                if matches!(ev, InputEvent::PressEnter { .. }) {
                    this.submit(window, cx);
                }
            }));
        }
        email.update(cx, |s, cx| s.focus(window, cx));
        Self { services, email, password, server, form: SignInForm::default(), _subs: subs }
    }

    fn submit(&mut self, _: &mut Window, cx: &mut Context<Self>) {
        if self.form.busy {
            return;
        }
        let (email, password, server) = (self.email.read(cx).value(), self.password.read(cx).value(), self.server.read(cx).value());
        if !self.form.begin(&email, &password, &server) {
            cx.notify();
            return;
        }
        cx.notify();
        let services = self.services.clone();
        cx.spawn(async move |this, cx| {
            let result = services.sign_in(server.trim(), email.trim(), &password).await;
            this.update(cx, |this, cx| match result {
                Ok(session) => {
                    this.form.busy = false;
                    cx.emit(SignedIn(session));
                }
                Err(e) => this.form.failed(e.to_string()),
            })
            .ok();
            this.update(cx, |_, cx| cx.notify()).ok();
        })
        .detach();
    }
}

impl Render for SignInView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme();
        let error = self.form.error.clone();
        v_flex().size_full().items_center().justify_center().bg(theme.muted).child(
            v_flex()
                .w(px(380.0))
                .gap_5()
                .p_8()
                .bg(theme.background)
                .border_1()
                .border_color(theme.border)
                .rounded(theme.radius_lg)
                .child(v_flex().gap_1().child(div().text_size(px(22.0)).font_semibold().child("Sign in")).child(
                    div().text_sm().text_color(theme.muted_foreground).child("Use the account you created in the web or mobile app."),
                ))
                .child(field("Email", Input::new(&self.email), None, cx))
                .child(field("Password", Input::new(&self.password).mask_toggle(), None, cx))
                .child(field("Server", Input::new(&self.server), Some(("Where your backend runs.".into(), false)), cx))
                .children(error.map(|e| {
                    h_flex()
                        .gap_2()
                        .items_start()
                        .text_sm()
                        .text_color(theme.danger)
                        .child(Icon::new(IconName::CircleAlert).size_4())
                        .child(div().flex_1().child(e))
                }))
                .child(
                    Button::new("sign-in")
                        .primary()
                        .w_full()
                        .label(if self.form.busy { "Signing in..." } else { "Sign in" })
                        .loading(self.form.busy)
                        .on_click(cx.listener(|this, _, window, cx| this.submit(window, cx))),
                ),
        )
    }
}
