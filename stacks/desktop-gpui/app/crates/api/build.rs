//! contracts/openapi.yaml -> $OUT_DIR/client.rs with progenitor (pinned in Cargo.toml).
//! Offline: reads the local file only. progenitor accepts OpenAPI 3.0.x, so a 3.1.0 document is read
//! as 3.0.3; that is enough for contracts that stick to the common subset (no `type: [x, "null"]`).
use std::{env, fs, path::PathBuf};

fn find_spec() -> PathBuf {
    if let Some(p) = env::var_os("OPENAPI_SPEC") {
        return PathBuf::from(p);
    }
    let here = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    // Generated project: <root>/apps/desktop/crates/api. Blueprint checkout: <repo>/stacks/desktop-gpui/app/crates/api.
    ["../../../../contracts/openapi.yaml", "../../../../../template/contracts/openapi.yaml"]
        .iter()
        .map(|rel| here.join(rel))
        .find(|p| p.exists())
        .expect("contracts/openapi.yaml not found; set OPENAPI_SPEC")
}

fn main() {
    let spec_path = find_spec();
    println!("cargo:rerun-if-changed={}", spec_path.display());
    println!("cargo:rerun-if-env-changed=OPENAPI_SPEC");
    let mut doc: serde_json::Value = serde_yaml_ng::from_str(&fs::read_to_string(&spec_path).expect("read spec")).expect("parse spec");
    if doc["openapi"].as_str().is_some_and(|v| v.starts_with("3.1")) {
        doc["openapi"] = "3.0.3".into();
    }
    let spec = serde_json::from_value(doc).expect("not a supported OpenAPI document");
    let tokens = progenitor::Generator::new(progenitor::GenerationSettings::default().with_interface(progenitor::InterfaceStyle::Builder))
        .generate_tokens(&spec)
        .expect("generate client");
    let code = prettyplease::unparse(&syn::parse2(tokens).expect("parse generated code"));
    fs::write(PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("client.rs"), code).unwrap();
}
