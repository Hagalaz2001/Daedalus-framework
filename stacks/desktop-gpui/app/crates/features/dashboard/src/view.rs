use crate::{
    data,
    state::{recent, stats},
};
use app_core::{Load, Note, Route, time_ago};
use app_services::Services;
use app_ui::{
    Navigate,
    components::{card, error_state, list_row, page_header, skeleton_rows},
};
use gpui_kit::component::{
    ActiveTheme as _, Icon, IconName, StyledExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    skeleton::Skeleton,
    v_flex,
};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{Context, EventEmitter, IntoElement, ParentElement as _, Render, SharedString, Styled as _, Window, div, px};
use std::rc::Rc;

pub struct DashboardView {
    services: Services,
    load: Load<Vec<Note>>,
}

impl EventEmitter<Navigate> for DashboardView {}

impl DashboardView {
    pub fn new(services: Services, cx: &mut Context<Self>) -> Self {
        let mut this = Self { services, load: Load::Loading };
        this.reload(cx);
        this
    }

    fn reload(&mut self, cx: &mut Context<Self>) {
        self.load = Load::Loading;
        cx.notify();
        let services = self.services.clone();
        cx.spawn(async move |this, cx| {
            let load = data::notes(&services).await;
            this.update(cx, |this, cx| {
                this.load = load;
                cx.notify();
            })
            .ok();
        })
        .detach();
    }
}

fn stat(label: &str, value: Option<usize>, cx: &gpui_kit::App) -> impl IntoElement {
    card(cx).flex_1().gap_2().child(div().text_sm().text_color(cx.theme().muted_foreground).child(label.to_string())).child(match value {
        Some(v) => div().text_size(px(32.0)).font_semibold().line_height(px(36.0)).child(v.to_string()).into_any_element(),
        None => Skeleton::new().h(px(32.0)).w(px(56.0)).into_any_element(),
    })
}

impl Render for DashboardView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let now = data::now();
        let counts = self.load.ready().map(|n| stats(n, now));
        let new = Button::new("dash-new")
            .primary()
            .icon(IconName::Plus)
            .label("New note")
            .on_click(cx.listener(|_, _, _, cx| cx.emit(Navigate(Route::NoteNew))));

        let latest = match &self.load {
            Load::Loading => skeleton_rows(4, cx).into_any_element(),
            Load::Failed(msg) => error_state(msg.clone(), Rc::new(cx.listener(|this, _, _, cx| this.reload(cx)))).into_any_element(),
            Load::Ready(notes) if notes.is_empty() => div()
                .p_6()
                .text_sm()
                .text_color(cx.theme().muted_foreground)
                .child("Nothing yet. Press Ctrl+N to write your first note.")
                .into_any_element(),
            Load::Ready(notes) => v_flex()
                .children(recent(notes, 5).into_iter().enumerate().map(|(i, n)| {
                    let id = n.id.clone();
                    div().when(i > 0, |d| d.border_t_1().border_color(cx.theme().border)).child(list_row(
                        SharedString::from(format!("recent-{}", n.id)),
                        n.text.lines().next().unwrap_or("").to_string(),
                        time_ago(now, n.created_at),
                        Icon::new(IconName::ChevronRight).size_4().text_color(cx.theme().muted_foreground),
                        Rc::new(cx.listener(move |_, _, _, cx| cx.emit(Navigate(Route::NoteDetail(id.clone()))))),
                        cx,
                    ))
                }))
                .into_any_element(),
        };

        v_flex()
            .w_full()
            .child(page_header("Dashboard", "A quick look at your notes.", new, cx))
            .child(
                h_flex()
                    .gap_4()
                    .pb_6()
                    .child(stat("Total notes", counts.as_ref().map(|c| c.total), cx))
                    .child(stat("Last 7 days", counts.as_ref().map(|c| c.week), cx))
                    .child(stat("Last 24 hours", counts.as_ref().map(|c| c.today), cx)),
            )
            .child(
                v_flex()
                    .gap_3()
                    .child(
                        h_flex().justify_between().items_center().child(div().text_base().font_semibold().child("Latest")).child(
                            Button::new("see-all")
                                .ghost()
                                .label("See all")
                                .on_click(cx.listener(|_, _, _, cx| cx.emit(Navigate(Route::Notes)))),
                        ),
                    )
                    .child(
                        div()
                            .w_full()
                            .border_1()
                            .border_color(cx.theme().border)
                            .rounded(cx.theme().radius_lg)
                            .overflow_hidden()
                            .child(latest),
                    ),
            )
    }
}
