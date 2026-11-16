//! Root view: boots the session, owns the current route and renders the shell around the page.
use app_core::{Route, ThemeMode, User};
use app_services::Services;
use app_ui::{
    Navigate,
    components::empty_state,
    shell::{NavEntry, app_shell, window_frame},
    theme,
};
use feature_auth::{SignInView, SignedIn};
use feature_dashboard::DashboardView;
use feature_notes::{NoteDetailView, NoteFormView, NotesView};
use feature_profile::{ProfileView, SignedOut};
use feature_settings::SettingsView;
use gpui_kit::component::{
    ActiveTheme as _, IconName,
    button::{Button, ButtonVariants as _},
    skeleton::Skeleton,
    v_flex,
};
use gpui_kit::{
    AnyView, AppContext as _, Context, FocusHandle, Focusable, InteractiveElement as _, IntoElement, ParentElement as _, Render,
    SharedString, Styled as _, Subscription, Window, actions, div, px,
};

actions!(app, [GoDashboard, GoNotes, NewNote, GoSettings, GoProfile, ToggleTheme, Quit]);

pub struct AppRoot {
    name: SharedString,
    services: Services,
    user: Option<User>,
    route: Route,
    page: Option<AnyView>,
    booting: bool,
    focus: FocusHandle,
    _page_subs: Vec<Subscription>,
    _appearance: Subscription,
}

impl AppRoot {
    pub fn new(name: &str, services: Services, open: Option<String>, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let appearance = cx.observe_window_appearance(window, |this, _, cx| {
            if this.services.store.theme_mode() == ThemeMode::System {
                theme::apply(ThemeMode::System, cx);
            }
        });
        let this = Self {
            name: name.to_string().into(),
            services: services.clone(),
            user: None,
            route: Route::Dashboard,
            page: None,
            booting: true,
            focus: cx.focus_handle(),
            _page_subs: vec![],
            _appearance: appearance,
        };
        let start = open.map(|p| Route::parse(&p)).unwrap_or(Route::Dashboard);
        cx.spawn_in(window, async move |this, cx| {
            let user = services.restore_session().await;
            this.update_in(cx, |this, window, cx| {
                this.booting = false;
                match user {
                    Some(u) => {
                        this.user = Some(u);
                        this.navigate(start, window, cx);
                    }
                    None => this.show_sign_in(window, cx),
                }
            })
            .ok();
        })
        .detach();
        this
    }

    fn show_sign_in(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let services = self.services.clone();
        let view = cx.new(|cx| SignInView::new(services, window, cx));
        self._page_subs = vec![cx.subscribe_in(&view, window, |this, _, ev: &SignedIn, window, cx| {
            this.user = Some(ev.0.user.clone());
            this.navigate(Route::Dashboard, window, cx);
        })];
        self.page = Some(view.into());
        cx.notify();
    }

    pub fn navigate(&mut self, route: Route, window: &mut Window, cx: &mut Context<Self>) {
        let Some(user) = self.user.clone() else { return self.show_sign_in(window, cx) };
        let services = self.services.clone();
        // Root first, so shortcuts work on pages without inputs; pages with inputs take focus in their constructor.
        self.focus.focus(window, cx);
        let mut subs = vec![];
        macro_rules! page {
            ($view:expr) => {{
                let view = $view;
                subs.push(cx.subscribe_in(&view, window, |this, _, ev: &Navigate, window, cx| this.navigate(ev.0.clone(), window, cx)));
                AnyView::from(view)
            }};
        }
        let page = match &route {
            Route::Dashboard => page!(cx.new(|cx| DashboardView::new(services, cx))),
            Route::Notes => page!(cx.new(|cx| NotesView::new(services, window, cx))),
            Route::NoteDetail(id) => page!(cx.new(|cx| NoteDetailView::new(services, id.clone(), cx))),
            Route::NoteNew => page!(cx.new(|cx| NoteFormView::new(services, None, window, cx))),
            Route::NoteEdit(id) => page!(cx.new(|cx| NoteFormView::new(services, Some(id.clone()), window, cx))),
            Route::Settings => AnyView::from(cx.new(|cx| SettingsView::new(services, window, cx))),
            Route::Profile => {
                let view = cx.new(|_| ProfileView::new(services, user));
                subs.push(cx.subscribe_in(&view, window, |this, _, _: &SignedOut, window, cx| {
                    this.user = None;
                    this.show_sign_in(window, cx);
                }));
                AnyView::from(view)
            }
            Route::NotFound(path) => {
                let path = path.clone();
                AnyView::from(cx.new(|_| NotFound { path }))
            }
        };
        self._page_subs = subs;
        self.page = Some(page);
        self.route = route;
        cx.notify();
    }

    fn toggle_theme(&mut self, cx: &mut Context<Self>) {
        let dark = theme::is_dark(self.services.store.theme_mode(), cx);
        let next = if dark { ThemeMode::Light } else { ThemeMode::Dark };
        let _ = self.services.store.set_theme_mode(next);
        theme::apply(next, cx);
    }
}

impl Focusable for AppRoot {
    fn focus_handle(&self, _: &gpui_kit::App) -> FocusHandle {
        self.focus.clone()
    }
}

struct NotFound {
    path: String,
}

impl Render for NotFound {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let go = Button::new("home").primary().icon(IconName::LayoutDashboard).label("Go to dashboard").on_click(cx.listener(
            |_, _, window, cx| {
                window.dispatch_action(Box::new(GoDashboard), cx);
            },
        ));
        empty_state(IconName::Search, "Page not found", format!("There is no screen at \"{}\".", self.path), Some(go.into_any_element()))
    }
}

impl Render for AppRoot {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let this = cx.entity();
        let body = if self.booting {
            window_frame(
                &self.name,
                v_flex()
                    .flex_1()
                    .items_center()
                    .justify_center()
                    .gap_3()
                    .child(Skeleton::new().w(px(180.0)).h(px(14.0)))
                    .child(Skeleton::new().w(px(120.0)).h(px(10.0))),
                cx,
            )
            .into_any_element()
        } else if let (Some(user), Some(page)) = (self.user.clone(), self.page.clone()) {
            let nav = [
                NavEntry { label: "Dashboard", icon: IconName::LayoutDashboard, route: Route::Dashboard },
                NavEntry { label: "Notes", icon: IconName::FileText, route: Route::Notes },
                NavEntry { label: "Settings", icon: IconName::Settings, route: Route::Settings },
            ];
            let on_nav = std::rc::Rc::new(move |route: Route, window: &mut Window, cx: &mut gpui_kit::App| {
                this.update(cx, |this, cx| this.navigate(route, window, cx));
            });
            app_shell(&self.name, &nav, &self.route, Some(&user), on_nav, page, cx).into_any_element()
        } else if let Some(page) = self.page.clone() {
            window_frame(&self.name, page, cx).into_any_element()
        } else {
            div().into_any_element()
        };
        div()
            .id("app-root")
            .key_context("AppRoot")
            .track_focus(&self.focus)
            .size_full()
            .bg(cx.theme().background)
            .on_action(cx.listener(|this, _: &GoDashboard, window, cx| this.navigate(Route::Dashboard, window, cx)))
            .on_action(cx.listener(|this, _: &GoNotes, window, cx| this.navigate(Route::Notes, window, cx)))
            .on_action(cx.listener(|this, _: &NewNote, window, cx| this.navigate(Route::NoteNew, window, cx)))
            .on_action(cx.listener(|this, _: &GoSettings, window, cx| this.navigate(Route::Settings, window, cx)))
            .on_action(cx.listener(|this, _: &GoProfile, window, cx| this.navigate(Route::Profile, window, cx)))
            .on_action(cx.listener(|this, _: &ToggleTheme, _, cx| this.toggle_theme(cx)))
            .child(body)
    }
}
