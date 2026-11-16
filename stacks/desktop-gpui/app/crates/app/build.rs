//! Embeds the Windows icon and version info into the exe. Other platforms: nothing to do.
fn main() {
    #[cfg(windows)]
    {
        println!("cargo:rerun-if-changed=assets/icon.ico");
        if std::path::Path::new("assets/icon.ico").exists() {
            let mut res = winresource::WindowsResource::new();
            res.set_icon("assets/icon.ico");
            res.compile().expect("embed icon");
        }
    }
}
