use crate::data;
use app_core::{NOTE_MAX, Route, validate_note_text};
use app_services::Services;
use app_ui::{
    Navigate,
    components::{card, field, page_header},
};
use gpui_kit::component::{
    ActiveTheme as _, IconName, WindowExt as _,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::{InputEvent, Textarea, TextareaState},
    notification::Notification,
    v_flex,
};
use gpui_kit::{
    AppContext as _, Context, Entity, EventEmitter, IntoElement, ParentElement as _, Render, Styled as _, Subscription, Window, div,
};

/// Create or edit form. `editing` is the id of the note being edited, if any.
pub struct NoteFormView {
    services: Services,
    editing: Option<String>,
    text: Entity<TextareaState>,
    error: Option<String>,
    busy: bool,
    _sub: Subscription,
}

impl EventEmitter<Navigate> for NoteFormView {}

impl NoteFormView {
    pub fn new(services: Services, editing: Option<String>, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let text = cx.new(|cx| TextareaState::new(window, cx).rows(6).placeholder("What do you want to remember?"));
        let sub = cx.subscribe_in(&text, window, |this, _, ev: &InputEvent, window, cx| match ev {
            InputEvent::Change => {
                this.error = None;
                cx.notify();
            }
            InputEvent::PressEnter { secondary: true, .. } => this.save(window, cx),
            _ => {}
        });
        text.update(cx, |s, cx| s.focus(window, cx));
        let mut this = Self { services, editing, text, error: None, busy: false, _sub: sub };
        this.load_existing(window, cx);
        this
    }

    fn load_existing(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(id) = self.editing.clone() else { return };
        self.busy = true;
        let services = self.services.clone();
        cx.spawn_in(window, async move |this, cx| {
            let result = data::get(&services, &id).await;
            this.update_in(cx, |this, window, cx| {
                this.busy = false;
                match result {
                    Ok(note) => this.text.update(cx, |t, cx| t.set_value(note.text, window, cx)),
                    Err(e) => this.error = Some(e),
                }
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn save(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        let text = match validate_note_text(&self.text.read(cx).value()) {
            Ok(t) => t,
            Err(e) => {
                self.error = Some(e.to_string());
                cx.notify();
                return;
            }
        };
        self.busy = true;
        cx.notify();
        let (services, editing) = (self.services.clone(), self.editing.clone());
        cx.spawn_in(window, async move |this, cx| {
            let result = match &editing {
                Some(id) => data::update(&services, id, &text).await,
                None => data::create(&services, &text).await,
            };
            this.update_in(cx, |this, window, cx| {
                this.busy = false;
                match result {
                    Ok(note) => {
                        window.push_notification(Notification::success("Note saved"), cx);
                        cx.emit(Navigate(Route::NoteDetail(note.id)));
                    }
                    Err(e) => this.error = Some(e),
                }
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn cancel(&mut self, cx: &mut Context<Self>) {
        cx.emit(Navigate(match &self.editing {
            Some(id) => Route::NoteDetail(id.clone()),
            None => Route::Notes,
        }));
    }
}

impl Render for NoteFormView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let count = self.text.read(cx).value().chars().count();
        let hint = match &self.error {
            Some(e) => (e.clone().into(), true),
            None => (format!("{count} / {NOTE_MAX}").into(), count > NOTE_MAX),
        };
        let (title, subtitle) = if self.editing.is_some() {
            ("Edit note", "Changes sync to every device.")
        } else {
            ("New note", "Plain text, up to 500 characters.")
        };
        v_flex()
            .w_full()
            .child(page_header(title, subtitle, div(), cx))
            .child(
                card(cx).gap_5().p_6().child(field("Note", Textarea::new(&self.text), Some(hint), cx)).child(
                    h_flex()
                        .gap_2()
                        .justify_end()
                        .child(Button::new("cancel").outline().label("Cancel").on_click(cx.listener(|this, _, _, cx| this.cancel(cx))))
                        .child(
                            Button::new("save")
                                .primary()
                                .icon(IconName::Check)
                                .label("Save note")
                                .loading(self.busy)
                                .on_click(cx.listener(|this, _, window, cx| this.save(window, cx))),
                        ),
                ),
            )
            .child(div().pt_3().text_xs().text_color(cx.theme().muted_foreground).child("Tip: Ctrl+Enter saves."))
    }
}
