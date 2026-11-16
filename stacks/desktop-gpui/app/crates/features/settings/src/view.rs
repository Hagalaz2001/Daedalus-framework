use crate::state::{SECTIONS, mode_at, mode_index, valid_server};
use app_core::ThemeMode;
use app_services::Services;
use app_ui::{
    components::{card, field, page_header},
    theme,
};
use gpui_kit::component::{
    ActiveTheme as _, StyledExt as _, WindowExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::{Input, InputState},
    notification::Notification,
    switch::Switch,
    tab::{Tab, TabBar},
    v_flex,
};
use gpui_kit::{AppContext as _, Context, Entity, IntoElement, ParentElement as _, Render, Styled as _, Window, div, px};

pub struct SettingsView {
    services: Services,
    section: usize,
    mode: ThemeMode,
    server: Entity<InputState>,
}

impl SettingsView {
    pub fn new(services: Services, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let url = services.store.base_url();
        let mode = services.store.theme_mode();
        let server = cx.new(|cx| InputState::new(window, cx).default_value(url));
        Self { services, section: 0, mode, server }
    }

    fn set_mode(&mut self, mode: ThemeMode, cx: &mut Context<Self>) {
        self.mode = mode;
        let _ = self.services.store.set_theme_mode(mode);
        theme::apply(mode, cx);
        cx.notify();
    }

    fn save_server(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let url = self.server.read(cx).value().to_string();
        if !valid_server(&url) {
            window.push_notification(Notification::error("The server address must start with http:// or https://"), cx);
            return;
        }
        self.services.api.set_base_url(&url);
        let _ = self.services.store.set_base_url(&url);
        window.push_notification(Notification::success("Server address saved"), cx);
    }
}

/// A settings row: title and description on the left, the control on the right.
fn row(title: &str, description: &str, control: impl IntoElement, cx: &gpui_kit::App) -> impl IntoElement {
    h_flex()
        .w_full()
        .justify_between()
        .items_center()
        .gap_6()
        .py_3()
        .child(
            v_flex()
                .gap_0p5()
                .child(div().text_sm().font_medium().child(title.to_string()))
                .child(div().text_sm().text_color(cx.theme().muted_foreground).child(description.to_string())),
        )
        .child(control)
}

impl Render for SettingsView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let tabs = TabBar::new("settings-tabs")
            .underline()
            .selected_index(self.section)
            .on_click(cx.listener(|this, ix: &usize, _, cx| {
                this.section = *ix;
                cx.notify();
            }))
            .children(SECTIONS.iter().map(|s| Tab::new().label(*s)));

        let panel = if self.section == 0 {
            let modes = TabBar::new("theme-mode")
                .segmented()
                .selected_index(mode_index(self.mode))
                .on_click(cx.listener(|this, ix: &usize, _, cx| this.set_mode(mode_at(*ix), cx)))
                .children(ThemeMode::ALL.iter().map(|m| Tab::new().label(m.label())));
            let confirm = self.services.store.confirm_delete();
            let services = self.services.clone();
            card(cx)
                .px_6()
                .py_2()
                .child(row("Theme", "Light, dark, or follow the system.", modes, cx))
                .child(div().h(px(1.0)).w_full().bg(cx.theme().border))
                .child(row(
                    "Confirm before deleting",
                    "Ask first when you delete a note.",
                    Switch::new("confirm-delete").checked(confirm).on_click(move |on, _, _| {
                        let _ = services.store.set_confirm_delete(*on);
                    }),
                    cx,
                ))
                .into_any_element()
        } else {
            card(cx)
                .gap_4()
                .p_6()
                .child(field(
                    "Server address",
                    Input::new(&self.server),
                    Some(("Where the backend runs, for example https://api.example.com.".into(), false)),
                    cx,
                ))
                .child(
                    h_flex().justify_end().child(
                        Button::new("save-server")
                            .primary()
                            .label("Save")
                            .on_click(cx.listener(|this, _, window, cx| this.save_server(window, cx))),
                    ),
                )
                .into_any_element()
        };

        v_flex()
            .w_full()
            .child(page_header("Settings", "Applies immediately and is remembered.", div(), cx))
            .child(div().pb_4().child(tabs))
            .child(panel)
    }
}
