//! Small shared components on top of GPUI Component. Every colour/radius comes from the theme, which
//! is generated from the design tokens: no literals here.
use crate::tokens::space;
use gpui_kit::component::{
    ActiveTheme as _, Icon, IconName, StyledExt as _,
    button::Button,
    empty::{Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle},
    h_flex,
    skeleton::Skeleton,
    v_flex,
};
use gpui_kit::{
    AnyElement, App, ClickEvent, ElementId, InteractiveElement as _, IntoElement, ParentElement as _, SharedString,
    StatefulInteractiveElement as _, Styled as _, Window, div, px,
};
use std::rc::Rc;

type Click = Rc<dyn Fn(&ClickEvent, &mut Window, &mut App)>;

/// Title + subtitle on the left, actions on the right.
pub fn page_header(
    title: impl Into<SharedString>,
    subtitle: impl Into<SharedString>,
    actions: impl IntoElement,
    cx: &App,
) -> impl IntoElement {
    h_flex()
        .w_full()
        .items_end()
        .justify_between()
        .gap_4()
        .pb(px(space::S6))
        .child(
            v_flex()
                .gap_1()
                .child(div().text_size(px(24.0)).font_semibold().line_height(px(30.0)).child(title.into()))
                .child(div().text_sm().text_color(cx.theme().muted_foreground).child(subtitle.into())),
        )
        .child(actions)
}

/// Bordered surface. Use for grouped content; avoid nesting cards.
pub fn card(cx: &App) -> gpui_kit::Div {
    v_flex().bg(cx.theme().background).border_1().border_color(cx.theme().border).rounded(cx.theme().radius_lg).p(px(space::S4))
}

/// Label above a control, with an optional error or hint below.
pub fn field(
    label: impl Into<SharedString>,
    control: impl IntoElement,
    message: Option<(SharedString, bool)>,
    cx: &App,
) -> impl IntoElement {
    v_flex().gap_1p5().child(div().text_sm().font_medium().child(label.into())).child(control).children(message.map(|(text, is_error)| {
        let color = if is_error { cx.theme().danger } else { cx.theme().muted_foreground };
        div().text_xs().text_color(color).child(text)
    }))
}

/// One row of a list: title, secondary line, trailing element. Focusable and clickable.
pub fn list_row(
    id: impl Into<ElementId>,
    title: impl Into<SharedString>,
    meta: impl Into<SharedString>,
    trailing: impl IntoElement,
    on_click: Click,
    cx: &App,
) -> impl IntoElement {
    let hover = cx.theme().list_hover;
    h_flex()
        .id(id)
        .tab_stop(true)
        .w_full()
        .items_center()
        .justify_between()
        .gap_4()
        .px(px(space::S4))
        .py(px(space::S3))
        .cursor_pointer()
        .hover(move |s| s.bg(hover))
        .focus_visible(|s| s.bg(hover))
        .on_click(move |e, w, cx| on_click(e, w, cx))
        .child(
            v_flex()
                .gap_0p5()
                .min_w_0()
                .child(div().text_sm().font_medium().truncate().child(title.into()))
                .child(div().text_xs().text_color(cx.theme().muted_foreground).child(meta.into())),
        )
        .child(trailing)
}

/// Nothing here yet: say why and offer the next step.
pub fn empty_state(
    icon: IconName,
    title: impl Into<SharedString>,
    description: impl Into<SharedString>,
    action: Option<AnyElement>,
) -> impl IntoElement {
    Empty::new()
        .header(
            EmptyHeader::new()
                .media(EmptyMedia::new().child(Icon::new(icon).size_6()))
                .title(EmptyTitle::new().child(title.into()))
                .description(EmptyDescription::new().child(description.into())),
        )
        .children(action.map(|a| EmptyContent::new().child(a)))
}

/// Something failed: say what the user can do about it.
pub fn error_state(message: impl Into<SharedString>, on_retry: Click) -> impl IntoElement {
    empty_state(
        IconName::TriangleAlert,
        "Something went wrong",
        message,
        Some(
            Button::new("retry")
                .outline()
                .icon(IconName::RefreshCw)
                .label("Try again")
                .on_click(move |e, w, cx| on_retry(e, w, cx))
                .into_any_element(),
        ),
    )
}

/// Placeholder rows while data loads.
pub fn skeleton_rows(count: usize, cx: &App) -> impl IntoElement {
    v_flex().w_full().children((0..count).map(|i| {
        v_flex()
            .gap_2()
            .px(px(space::S4))
            .py(px(space::S3))
            .border_b_1()
            .border_color(cx.theme().border)
            .child(Skeleton::new().h(px(12.0)).w(px(180.0 + (i % 3) as f32 * 60.0)))
            .child(Skeleton::new().h(px(10.0)).w(px(90.0)))
    }))
}
