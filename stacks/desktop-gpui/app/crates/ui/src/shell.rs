//! App shell: custom title bar, sidebar navigation, scrollable content column.
use app_core::{Route, User, initials};
use gpui_kit::component::{
    ActiveTheme as _, IconName, StyledExt as _, TitleBar,
    avatar::Avatar,
    h_flex,
    sidebar::{Sidebar, SidebarFooter, SidebarMenu, SidebarMenuItem},
    v_flex,
};
use gpui_kit::{
    App, InteractiveElement as _, IntoElement, ParentElement as _, SharedString, StatefulInteractiveElement as _, Styled as _, Window, div,
    px,
};
use std::rc::Rc;

pub struct NavEntry {
    pub label: &'static str,
    pub icon: IconName,
    pub route: Route,
}

pub type Navigate = Rc<dyn Fn(Route, &mut Window, &mut App)>;

pub fn app_shell(
    app_name: &str,
    nav: &[NavEntry],
    active: &Route,
    user: Option<&User>,
    on_nav: Navigate,
    content: impl IntoElement,
    cx: &App,
) -> impl IntoElement {
    let theme = cx.theme();
    let items = nav.iter().map(|n| {
        let route = n.route.clone();
        let on_nav = on_nav.clone();
        let is_active = std::mem::discriminant(&n.route) == std::mem::discriminant(active)
            || (n.route == Route::Notes && matches!(active, Route::NoteDetail(_) | Route::NoteNew | Route::NoteEdit(_)));
        SidebarMenuItem::new(n.label).icon(n.icon.clone()).active(is_active).on_click(move |_, w, cx| on_nav(route.clone(), w, cx))
    });
    let footer = user.map(|u| {
        let (name, email) = (u.name.clone(), u.email.clone());
        let on_nav = on_nav.clone();
        h_flex()
            .id("account")
            .tab_stop(true)
            .w_full()
            .gap_2p5()
            .items_center()
            .p_2()
            .rounded(theme.radius)
            .cursor_pointer()
            .hover(|s| s.bg(theme.sidebar_accent))
            .on_click(move |_, w, cx| on_nav(Route::Profile, w, cx))
            .child(Avatar::new().name(SharedString::from(if name.is_empty() { initials(&email) } else { name.clone() })))
            .child(
                v_flex()
                    .min_w_0()
                    .child(div().text_sm().font_medium().truncate().child(if name.is_empty() { email.clone() } else { name }))
                    .child(div().text_xs().text_color(theme.muted_foreground).truncate().child(email)),
            )
    });

    window_frame(
        app_name,
        h_flex()
            .flex_1()
            .min_h_0()
            .child(
                Sidebar::<SidebarMenu>::new("sidebar")
                    .w(px(232.0))
                    .collapsible(false)
                    .child(SidebarMenu::new().children(items))
                    .footer(SidebarFooter::new().children(footer)),
            )
            .child(
                div()
                    .id("content")
                    .flex_1()
                    .min_w_0()
                    .h_full()
                    .overflow_y_scroll()
                    .child(div().w_full().max_w(px(960.0)).mx_auto().px_8().py_8().child(content)),
            ),
        cx,
    )
}

/// Custom title bar (window controls, drag area) above `body`. Used by every screen, signed in or not.
pub fn window_frame(app_name: &str, body: impl IntoElement, cx: &App) -> impl IntoElement {
    let theme = cx.theme();
    v_flex()
        .size_full()
        .bg(theme.background)
        .text_color(theme.foreground)
        .child(TitleBar::new().child(div().text_sm().font_medium().child(app_name.to_string())))
        .child(body)
}
