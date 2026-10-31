use std::process::Command;

fn main() {
    // Compile only public build identity; never read environment credentials.
    let git = |args: &[&str]| Command::new("git").args(args).output().ok().filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok()).map(|s| s.trim().to_string());
    let sha = git(&["rev-parse", "HEAD"]).filter(|s| s.len() == 40 && s.bytes().all(|c| c.is_ascii_hexdigit())).unwrap_or_else(|| "unknown".into());
    let dirty = git(&["status", "--porcelain", "--untracked-files=normal", "--", "..", "../../../packages/gigi-integrations"])
        .is_none_or(|s| !s.is_empty());
    println!("cargo:rustc-env=GIGI_BUILD_SOURCE_SHA={sha}");
    println!("cargo:rustc-env=GIGI_BUILD_SOURCE_DIRTY={dirty}");
    // Watch source surfaces explicitly, without watching generated target/resources.
    for path in ["src", "build.rs", "Cargo.toml", "Cargo.lock", "tauri.conf.json", "../web", "../scripts", "../agent", "../canon-overlay", "../../../packages/gigi-integrations/src", "../../../packages/gigi-integrations/worker", "../../../packages/gigi-integrations/package.json"] {
        println!("cargo:rerun-if-changed={path}");
    }
    for name in ["HEAD", "index", "packed-refs"] {
        if let Some(path) = git(&["rev-parse", "--git-path", name]) { println!("cargo:rerun-if-changed={path}"); }
    }
    if let Some(branch) = git(&["symbolic-ref", "-q", "HEAD"]) {
        if let Some(path) = git(&["rev-parse", "--git-path", &branch]) { println!("cargo:rerun-if-changed={path}"); }
    }
    tauri_build::build()
}
