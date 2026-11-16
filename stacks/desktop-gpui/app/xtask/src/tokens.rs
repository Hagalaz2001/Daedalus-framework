//! design/tokens.json (+ optional preset) -> `crates/ui/src/tokens.g.rs`.
//! Same rules as the other stacks: a preset is deep-merged over the base tokens, `colorDark` overrides
//! the dark palette, which is otherwise derived from the light one.
use serde_json::{Map, Value};
use std::{fmt::Write, fs, path::Path};

type Rgb = [f64; 3];

fn parse_hex(h: &str) -> Result<Rgb, String> {
    let h = h.strip_prefix('#').filter(|h| h.len() == 6).ok_or(format!("bad colour {h:?}"))?;
    let c = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).map(f64::from).map_err(|e| e.to_string());
    Ok([c(0)?, c(2)?, c(4)?])
}

fn to_hex(c: Rgb) -> String {
    let b = |v: f64| v.round().clamp(0.0, 255.0) as u8;
    format!("#{:02x}{:02x}{:02x}", b(c[0]), b(c[1]), b(c[2]))
}

fn mix(a: &str, b: &str, w: f64) -> Result<String, String> {
    let (a, b) = (parse_hex(a)?, parse_hex(b)?);
    Ok(to_hex([0, 1, 2].map(|i| a[i] * (1.0 - w) + b[i] * w)))
}

fn lum(h: &str) -> Result<f64, String> {
    let lin = |v: f64| {
        let v = v / 255.0;
        if v <= 0.03928 { v / 12.92 } else { ((v + 0.055) / 1.055).powf(2.4) }
    };
    let [r, g, b] = parse_hex(h)?.map(lin);
    Ok(0.2126 * r + 0.7152 * g + 0.0722 * b)
}

fn get<'a>(c: &'a Map<String, Value>, k: &str) -> Result<&'a str, String> {
    c.get(k).and_then(Value::as_str).ok_or(format!("color.{k} missing"))
}

/// Dark palette from the light one: ink becomes the canvas, paper the text, accents lift for contrast.
pub fn derive_dark(c: &Map<String, Value>) -> Result<Map<String, Value>, String> {
    let surface = mix(get(c, "text")?, "#000000", 0.35)?;
    let lift = |k: &str| mix(get(c, k)?, "#ffffff", 0.3);
    let primary = lift("primary")?;
    let on_primary = if lum(&primary)? > 0.18 { "#0b0f19" } else { "#ffffff" };
    let mut d = Map::new();
    let mut put = |k: &str, v: String| d.insert(k.into(), Value::String(v));
    put("primary", primary.clone());
    put("onPrimary", on_primary.into());
    put("surface", surface.clone());
    put("surfaceMuted", mix(&surface, "#ffffff", 0.07)?);
    put("text", mix(get(c, "surface")?, &surface, 0.04)?);
    put("textMuted", mix(get(c, "surface")?, &surface, 0.35)?);
    put("border", mix(&surface, "#ffffff", 0.16)?);
    for k in ["success", "warning", "danger"] {
        put(k, lift(k)?);
    }
    Ok(d)
}

fn merge(a: &mut Value, b: &Value) {
    match (a, b) {
        (Value::Object(a), Value::Object(b)) => b.iter().for_each(|(k, v)| merge(a.entry(k).or_insert(Value::Null), v)),
        (a, b) => *a = b.clone(),
    }
}

fn snake(s: &str) -> String {
    s.chars().fold(String::new(), |mut o, c| {
        if c.is_uppercase() {
            o.push('_');
        }
        o.push(c.to_ascii_lowercase());
        o
    })
}

pub fn generate(tokens: &Value) -> Result<String, String> {
    let light = tokens["color"].as_object().ok_or("color missing")?;
    let mut dark = derive_dark(light)?;
    if let Some(over) = tokens["colorDark"].as_object() {
        dark.extend(over.clone());
    }
    let mut o = String::from("// Generated from design/tokens.json by `cargo xtask tokens`. Do not edit.\n\n");
    let roles: Vec<&String> = light.keys().collect();
    o += "/// One colour per role, as 0xRRGGBB.\n#[derive(Clone, Copy, Debug)]\npub struct Palette {\n";
    for k in &roles {
        writeln!(o, "    pub {}: u32,", snake(k)).unwrap();
    }
    o += "}\n\n";
    for (name, src) in [("LIGHT", light), ("DARK", &dark)] {
        writeln!(o, "pub const {name}: Palette = Palette {{").unwrap();
        for k in &roles {
            let v = parse_hex(get(src, k)?)?;
            writeln!(o, "    {}: 0x{:02X}{:02X}{:02X},", snake(k), v[0] as u8, v[1] as u8, v[2] as u8).unwrap();
        }
        o += "};\n\n";
    }
    for (module, key, prefix) in [("radius", "radius", ""), ("space", "space", "S")] {
        writeln!(o, "pub mod {module} {{").unwrap();
        for (k, v) in tokens[key].as_object().ok_or(format!("{key} missing"))? {
            writeln!(o, "    pub const {}{}: f32 = {:.1};", prefix, k.to_uppercase(), v.as_f64().ok_or("number")?).unwrap();
        }
        o += "}\n\n";
    }
    for (k, v) in tokens["font"].as_object().ok_or("font missing")? {
        writeln!(o, "pub const FONT_{}: &str = {:?};", k.to_uppercase(), v.as_str().ok_or("font name")?).unwrap();
    }
    Ok(o)
}

pub fn run(tokens: &Path, preset: Option<&Path>, out: &Path) -> Result<(), String> {
    let read = |p: &Path| -> Result<Value, String> {
        serde_json::from_str(&fs::read_to_string(p).map_err(|e| format!("{}: {e}", p.display()))?).map_err(|e| e.to_string())
    };
    let mut t = read(tokens)?;
    if let Some(p) = preset {
        merge(&mut t, &read(p)?);
    }
    let text = generate(&t)?;
    if let Some(dir) = out.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::write(out, text).map_err(|e| e.to_string())?;
    println!("  wrote {}", out.display());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn base() -> Value {
        json!({
            "color": {"primary":"#2563eb","onPrimary":"#ffffff","surface":"#ffffff","surfaceMuted":"#f8fafc",
                      "text":"#0f172a","textMuted":"#475569","border":"#e2e8f0","success":"#15803d","warning":"#b45309","danger":"#b91c1c"},
            "radius": {"sm":4,"md":8}, "space": {"1":4}, "font": {"sans":"Inter","mono":"JetBrains Mono"}
        })
    }

    #[test]
    fn derives_dark_from_light() {
        let t = base();
        let d = derive_dark(t["color"].as_object().unwrap()).unwrap();
        assert_ne!(d["surface"], t["color"]["surface"]);
        assert_eq!(d["onPrimary"], "#0b0f19");
    }

    #[test]
    fn generates_consts_and_honours_dark_override() {
        let mut t = base();
        t["colorDark"] = json!({"primary": "#112233"});
        let s = generate(&t).unwrap();
        assert!(s.contains("pub const FONT_SANS: &str = \"Inter\";"));
        assert!(s.contains("on_primary: 0xFFFFFF"));
        assert!(s.contains("primary: 0x112233"));
        assert!(s.contains("pub const S1: f32 = 4.0;"));
    }

    #[test]
    fn preset_deep_merges() {
        let mut t = base();
        merge(&mut t, &json!({"color": {"primary": "#000000"}, "radius": {"sm": 0}}));
        assert_eq!(t["color"]["primary"], "#000000");
        assert_eq!(t["color"]["surface"], "#ffffff");
        assert_eq!(t["radius"]["md"], 8);
    }

    #[test]
    fn rejects_bad_colour() {
        let mut t = base();
        t["color"]["primary"] = json!("blue");
        assert!(generate(&t).is_err());
    }
}
