use app_core::{User, initials};
use app_services::Services;
use app_ui::components::{card, page_header};
use gpui_kit::component::{ActiveTheme as _, IconName, StyledExt as _, avatar::Avatar, button::Button, h_flex, tag::Tag, v_flex};
use gpui_kit::{Context, EventEmitter, IntoElement, ParentElement as _, Render, SharedString, Styled as _, Window, div, px};

/// Emitted after the session was ended (server told, token removed).
pub struct SignedOut;

pub struct ProfileView {
    services: Services,
    user: User,
    busy: bool,
}

impl EventEmitter<SignedOut> for ProfileView {}

impl ProfileView {
    pub fn new(services: Services, user: User) -> Self {
        Self { services, user, busy: false }
    }

    fn sign_out(&mut self, cx: &mut Context<Self>) {
        self.busy = true;
        cx.notify();
        let services = self.services.clone();
        cx.spawn(async move |this, cx| {
            services.sign_out().await;
            this.update(cx, |_, cx| cx.emit(SignedOut)).ok();
        })
        .detach();
    }
}

impl Render for ProfileView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let name = if self.user.name.is_empty() { self.user.email.clone() } else { self.user.name.clone() };
        let server = self.services.store.base_url();
        v_flex().w_full().child(page_header("Profile", "Your account on this device.", div(), cx)).child(
            card(cx)
                .gap_5()
                .p_6()
                .child(
                    h_flex()
                        .gap_4()
                        .items_center()
                        .child(
                            Avatar::new()
                                .name(SharedString::from(if self.user.name.is_empty() {
                                    initials(&self.user.email)
                                } else {
                                    self.user.name.clone()
                                }))
                                .size(px(56.0)),
                        )
                        .child(
                            v_flex()
                                .gap_1()
                                .child(
                                    h_flex()
                                        .gap_2()
                                        .items_center()
                                        .child(div().text_lg().font_semibold().child(name))
                                        .child(Tag::success().child("Signed in")),
                                )
                                .child(div().text_sm().text_color(cx.theme().muted_foreground).child(self.user.email.clone())),
                        ),
                )
                .child(
                    h_flex()
                        .pt_5()
                        .border_t_1()
                        .border_color(cx.theme().border)
                        .justify_between()
                        .items_center()
                        .child(div().text_sm().text_color(cx.theme().muted_foreground).child(format!("Server: {server}")))
                        .child(
                            Button::new("sign-out")
                                .outline()
                                .icon(IconName::ArrowRight)
                                .label("Sign out")
                                .loading(self.busy)
                                .on_click(cx.listener(|this, _, _, cx| this.sign_out(cx))),
                        ),
                ),
        )
    }
}
