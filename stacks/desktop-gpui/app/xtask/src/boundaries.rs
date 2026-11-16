//! Architecture check: features must not depend on each other, and layers must not point upwards.
//! Rules (by crate name, read from each crates/**/Cargo.toml `[dependencies]`):
//!   app-core            -> nothing internal
//!   app-api, app-storage, app-ui -> app-core only
//!   app-services        -> app-core, app-api, app-storage
//!   feature-*           -> app-core, app-api, app-storage, app-ui, app-services (never another feature-*)
//!   app                 -> anything
use std::{collections::BTreeMap, fs, path::Path};

fn allowed(from: &str, to: &str) -> bool {
    match from {
        "app-core" => false,
        "app-api" | "app-storage" | "app-ui" => to == "app-core",
        "app-services" => matches!(to, "app-core" | "app-api" | "app-storage"),
        "app" => true,
        f if f.starts_with("feature-") => matches!(to, "app-core" | "app-api" | "app-storage" | "app-ui" | "app-services"),
        _ => true,
    }
}

/// Internal dependency names declared in a Cargo.toml, given the set of workspace crate names.
pub fn internal_deps(toml: &str, crates: &[String]) -> Vec<String> {
    let mut in_deps = false;
    let mut out = vec![];
    for line in toml.lines().map(str::trim) {
        if line.starts_with('[') {
            in_deps = line == "[dependencies]";
            continue;
        }
        let name = line.split(['=', '.', ' ']).next().unwrap_or("");
        if in_deps && crates.iter().any(|c| c == name) {
            out.push(name.to_string());
        }
    }
    out
}

pub fn run(root: &Path) -> Result<(), String> {
    let mut manifests = BTreeMap::new();
    let mut stack = vec![root.join("crates")];
    while let Some(dir) = stack.pop() {
        for e in fs::read_dir(&dir).map_err(|e| format!("{}: {e}", dir.display()))?.flatten() {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
            } else if p.file_name().is_some_and(|n| n == "Cargo.toml") {
                let text = fs::read_to_string(&p).map_err(|e| e.to_string())?;
                let name = text.lines().find_map(|l| l.trim().strip_prefix("name = ")).map(|n| n.trim_matches('"').to_string());
                manifests.extend(name.map(|n| (n, text)));
            }
        }
    }
    let names: Vec<String> = manifests.keys().cloned().collect();
    let mut bad = vec![];
    for (name, text) in &manifests {
        for dep in internal_deps(text, &names) {
            if !allowed(name, &dep) {
                bad.push(format!("{name} must not depend on {dep}"));
            }
        }
    }
    if bad.is_empty() {
        println!("boundaries ok ({} crates)", names.len());
        Ok(())
    } else {
        Err(bad.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn features_cannot_depend_on_features() {
        let names = vec!["feature-notes".to_string(), "feature-auth".to_string(), "app-core".to_string()];
        let toml =
            "[package]\nname = \"feature-notes\"\n[dependencies]\nfeature-auth.workspace = true\napp-core = { path = \"../core\" }\n";
        assert_eq!(internal_deps(toml, &names), ["feature-auth", "app-core"]);
        assert!(!allowed("feature-notes", "feature-auth"));
        assert!(allowed("feature-notes", "app-core"));
        assert!(!allowed("app-core", "ui"));
    }
}
