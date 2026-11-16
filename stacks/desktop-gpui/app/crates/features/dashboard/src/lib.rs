//! Dashboard: counts and the latest notes. Layers: `state` (pure) <- `data` <- `view`.
mod data;
mod state;
mod view;

pub use view::DashboardView;
