use super::title_of;
use crate::{data, state::NotesState};
use app_core::{Load, Range, Route, Sort, time_ago};
use app_ui::{
    Navigate,
    components::{empty_state, error_state, list_row, page_header, skeleton_rows},
};
use gpui_kit::component::{
    ActiveTheme as _, Icon, IconName, IndexPath,
    button::{Button, ButtonVariants as _},
    h_flex,
    input::{Input, InputEvent, InputState},
    select::{Select, SelectEvent, SelectState},
    v_flex,
};
use gpui_kit::prelude::FluentBuilder as _;
use gpui_kit::{
    AppContext as _, Context, Entity, EventEmitter, IntoElement, ParentElement as _, Render, SharedString, Styled as _, Subscription,
    Window, div, px,
};
use std::rc::Rc;

type Choices = Vec<SharedString>;

const RANGES: [(&str, Range); 3] = [("All time", Range::All), ("Last 24 hours", Range::Today), ("Last 7 days", Range::Week)];
const SORTS: [(&str, Sort); 3] = [("Newest first", Sort::Newest), ("Oldest first", Sort::Oldest), ("A to Z", Sort::Alphabetical)];

pub struct NotesView {
    services: app_services::Services,
    state: NotesState,
    search: Entity<InputState>,
    range: Entity<SelectState<Choices>>,
    sort: Entity<SelectState<Choices>>,
    _subs: Vec<Subscription>,
}

impl EventEmitter<Navigate> for NotesView {}

fn choices<T>(items: &[(&str, T)]) -> Choices {
    items.iter().map(|(l, _)| SharedString::from(*l)).collect()
}

impl NotesView {
    pub fn new(services: app_services::Services, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let search = cx.new(|cx| InputState::new(window, cx).placeholder("Search notes"));
        let range = cx.new(|cx| SelectState::new(choices(&RANGES), Some(IndexPath::default()), window, cx));
        let sort = cx.new(|cx| SelectState::new(choices(&SORTS), Some(IndexPath::default()), window, cx));
        let subs = vec![
            cx.subscribe_in(&search, window, |this, input, ev: &InputEvent, _, cx| {
                if matches!(ev, InputEvent::Change) {
                    this.state.filter.query = input.read(cx).value().to_string();
                    cx.notify();
                }
            }),
            cx.subscribe_in(&range, window, |this, _, ev: &SelectEvent<Choices>, _, cx| {
                let SelectEvent::Confirm(Some(v)) = ev else { return };
                if let Some((_, r)) = RANGES.iter().find(|(l, _)| *l == v.as_ref()) {
                    this.state.filter.range = *r;
                    cx.notify();
                }
            }),
            cx.subscribe_in(&sort, window, |this, _, ev: &SelectEvent<Choices>, _, cx| {
                let SelectEvent::Confirm(Some(v)) = ev else { return };
                if let Some((_, s)) = SORTS.iter().find(|(l, _)| *l == v.as_ref()) {
                    this.state.filter.sort = *s;
                    cx.notify();
                }
            }),
        ];
        search.update(cx, |s, cx| s.focus(window, cx));
        let mut this = Self { services, state: NotesState::default(), search, range, sort, _subs: subs };
        this.reload(cx);
        this
    }

    fn reload(&mut self, cx: &mut Context<Self>) {
        self.state.load = Load::Loading;
        cx.notify();
        let services = self.services.clone();
        cx.spawn(async move |this, cx| {
            let load = data::list(&services).await;
            this.update(cx, |this, cx| {
                this.state.load = load;
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn clear_filters(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        self.state.filter = Default::default();
        self.search.update(cx, |s, cx| s.set_value("", window, cx));
        self.range.update(cx, |s, cx| s.set_selected_index(Some(IndexPath::default()), window, cx));
        self.sort.update(cx, |s, cx| s.set_selected_index(Some(IndexPath::default()), window, cx));
        cx.notify();
    }

    fn go(&mut self, route: Route, cx: &mut Context<Self>) {
        cx.emit(Navigate(route));
    }
}

impl Render for NotesView {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let now = data::now();
        let visible = self.state.visible(now);
        let total = self.state.total();
        let subtitle = match &self.state.load {
            Load::Ready(_) if self.state.is_filtering() => format!("{} of {total} notes", visible.len()),
            Load::Ready(_) => format!("{total} notes"),
            _ => "Everything you wrote down.".to_string(),
        };
        let new_button = Button::new("new-note")
            .primary()
            .icon(IconName::Plus)
            .label("New note")
            .on_click(cx.listener(|this, _, _, cx| this.go(Route::NoteNew, cx)));

        let body = match &self.state.load {
            Load::Loading => skeleton_rows(6, cx).into_any_element(),
            Load::Failed(msg) => error_state(msg.clone(), Rc::new(cx.listener(|this, _, _, cx| this.reload(cx)))).into_any_element(),
            Load::Ready(_) if total == 0 => empty_state(
                IconName::Inbox,
                "No notes yet",
                "Write the first one. It syncs with the web and mobile apps.",
                Some(
                    Button::new("empty-new")
                        .primary()
                        .icon(IconName::Plus)
                        .label("New note")
                        .on_click(cx.listener(|this, _, _, cx| this.go(Route::NoteNew, cx)))
                        .into_any_element(),
                ),
            )
            .into_any_element(),
            Load::Ready(_) if visible.is_empty() => empty_state(
                IconName::Search,
                "No matches",
                "Nothing fits this search and filter.",
                Some(
                    Button::new("clear")
                        .outline()
                        .label("Clear filters")
                        .on_click(cx.listener(|this, _, window, cx| this.clear_filters(window, cx)))
                        .into_any_element(),
                ),
            )
            .into_any_element(),
            Load::Ready(_) => v_flex()
                .w_full()
                .children(visible.iter().enumerate().map(|(i, n)| {
                    let id = n.id.clone();
                    let go = Rc::new(cx.listener(move |this, _, _, cx| this.go(Route::NoteDetail(id.clone()), cx)));
                    div().w_full().when(i > 0, |d| d.border_t_1().border_color(cx.theme().border)).child(list_row(
                        SharedString::from(format!("note-{}", n.id)),
                        title_of(&n.text),
                        time_ago(now, n.created_at),
                        Icon::new(IconName::ChevronRight).size_4().text_color(cx.theme().muted_foreground),
                        go,
                        cx,
                    ))
                }))
                .into_any_element(),
        };

        v_flex()
            .w_full()
            .child(page_header("Notes", subtitle, new_button, cx))
            .child(
                h_flex()
                    .gap_3()
                    .pb_4()
                    .child(div().flex_1().child(Input::new(&self.search).prefix(Icon::new(IconName::Search).size_4()).cleanable(true)))
                    .child(div().w(px(170.0)).child(Select::new(&self.range)))
                    .child(div().w(px(160.0)).child(Select::new(&self.sort))),
            )
            .child(div().w_full().border_1().border_color(cx.theme().border).rounded(cx.theme().radius_lg).overflow_hidden().child(body))
    }
}
