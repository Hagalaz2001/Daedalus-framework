use crate::data;
use app_core::{Load, Note, Route, format_utc, time_ago};
use app_services::Services;
use app_ui::{
    Navigate,
    components::{card, empty_state, error_state, skeleton_rows},
};
use gpui_kit::component::{
    ActiveTheme as _, IconName, WindowExt as _,
    button::{Button, ButtonVariant, ButtonVariants as _},
    h_flex,
    notification::Notification,
    v_flex,
};
use gpui_kit::{Context, EventEmitter, IntoElement, ParentElement as _, Render, Styled as _, Window, div};
use std::rc::Rc;

pub struct NoteDetailView {
    services: Services,
    id: String,
    load: Load<Note>,
}

impl EventEmitter<Navigate> for NoteDetailView {}

impl NoteDetailView {
    pub fn new(services: Services, id: String, cx: &mut Context<Self>) -> Self {
        let mut this = Self { services, id, load: Load::Loading };
        this.reload(cx);
        this
    }

    fn reload(&mut self, cx: &mut Context<Self>) {
        self.load = Load::Loading;
        cx.notify();
        let (services, id) = (self.services.clone(), self.id.clone());
        cx.spawn(async move |this, cx| {
            let load = data::get(&services, &id).await.into();
            this.update(cx, |this, cx| {
                this.load = load;
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn confirm_delete(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if !self.services.store.confirm_delete() {
            return self.delete(window, cx);
        }
        let this = cx.entity();
        window.open_alert_dialog(cx, move |dialog, _, _| {
            let this = this.clone();
            dialog
                .title("Delete this note?")
                .description("It is removed from every device. This cannot be undone.")
                .confirm()
                .ok_text("Delete")
                .ok_variant(ButtonVariant::Danger)
                .on_ok(move |_, window, cx| {
                    this.update(cx, |this, cx| this.delete(window, cx));
                    true
                })
        });
    }

    fn delete(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let (services, id) = (self.services.clone(), self.id.clone());
        cx.spawn_in(window, async move |this, cx| {
            let result = data::delete(&services, &id).await;
            this.update_in(cx, |_, window, cx| match result {
                Ok(()) => {
                    window.push_notification(Notification::success("Note deleted"), cx);
                    cx.emit(Navigate(Route::Notes));
                }
                Err(e) => window.push_notification(Notification::error(e), cx),
            })
            .ok();
        })
        .detach();
    }
}

impl Render for NoteDetailView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let back = Button::new("back")
            .ghost()
            .icon(IconName::ArrowLeft)
            .label("Notes")
            .on_click(cx.listener(|_, _, _, cx| cx.emit(Navigate(Route::Notes))));
        let body = match &self.load {
            Load::Loading => skeleton_rows(3, cx).into_any_element(),
            Load::Failed(msg) => {
                let gone = msg.starts_with("Not found");
                if gone {
                    empty_state(
                        IconName::FileText,
                        "This note is gone",
                        "It may have been deleted on another device.",
                        Some(
                            Button::new("to-list")
                                .outline()
                                .label("Back to notes")
                                .on_click(cx.listener(|_, _, _, cx| cx.emit(Navigate(Route::Notes))))
                                .into_any_element(),
                        ),
                    )
                    .into_any_element()
                } else {
                    error_state(msg.clone(), Rc::new(cx.listener(|this, _, _, cx| this.reload(cx)))).into_any_element()
                }
            }
            Load::Ready(note) => {
                let now = super::now();
                let id = note.id.clone();
                card(cx)
                    .gap_4()
                    .p_6()
                    .child(div().text_base().line_height(gpui_kit::relative(1.6)).child(note.text.clone()))
                    .child(
                        h_flex()
                            .justify_between()
                            .items_center()
                            .pt_4()
                            .border_t_1()
                            .border_color(cx.theme().border)
                            .child(div().text_sm().text_color(cx.theme().muted_foreground).child(format!(
                                "{} ({})",
                                format_utc(note.created_at),
                                time_ago(now, note.created_at)
                            )))
                            .child(
                                h_flex()
                                    .gap_2()
                                    .child(
                                        Button::new("edit")
                                            .outline()
                                            .icon(IconName::Settings2)
                                            .label("Edit")
                                            .on_click(cx.listener(move |_, _, _, cx| cx.emit(Navigate(Route::NoteEdit(id.clone()))))),
                                    )
                                    .child(
                                        Button::new("delete")
                                            .danger()
                                            .outline()
                                            .icon(IconName::Delete)
                                            .label("Delete")
                                            .on_click(cx.listener(|this, _, window, cx| this.confirm_delete(window, cx))),
                                    ),
                            ),
                    )
                    .into_any_element()
            }
        };
        v_flex().w_full().gap_4().child(h_flex().child(back)).child(body)
    }
}
