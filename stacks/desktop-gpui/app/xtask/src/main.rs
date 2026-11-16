//! Project tasks: `cargo xtask tokens` (design tokens -> Rust) and `cargo xtask boundaries`.
mod boundaries;
mod tokens;

use std::{path::PathBuf, process::ExitCode};

fn arg(args: &[String], name: &str) -> Option<PathBuf> {
    args.iter().position(|a| a == name).and_then(|i| args.get(i + 1)).map(PathBuf::from)
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let result = match args.first().map(String::as_str) {
        Some("tokens") => tokens::run(
            &arg(&args, "--tokens").unwrap_or_else(|| "../../design/tokens.json".into()),
            arg(&args, "--preset").as_deref(),
            &arg(&args, "--out").unwrap_or_else(|| "crates/ui/src/tokens.g.rs".into()),
        ),
        Some("boundaries") => boundaries::run(&arg(&args, "--root").unwrap_or_else(|| ".".into())),
        _ => Err("usage: cargo xtask <tokens|boundaries> [options]".into()),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("xtask: {e}");
            ExitCode::FAILURE
        }
    }
}
