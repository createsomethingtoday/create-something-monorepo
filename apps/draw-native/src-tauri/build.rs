use std::process::Command;

fn git(args: &[&str]) -> String {
    let output = Command::new("git").args(args).output().expect("git build provenance");
    assert!(output.status.success(), "git build provenance failed");
    String::from_utf8(output.stdout).expect("UTF-8 git output").trim().to_owned()
}

fn main() {
    // Re-evaluate provenance for commits, index changes, and tracked source changes.
    let root = git(&["rev-parse", "--show-toplevel"]);
    for path in git(&["-C", &root, "ls-files", "--full-name"]).lines() {
        println!("cargo:rerun-if-changed={root}/{path}");
    }
    for item in ["HEAD", "index", "packed-refs"] {
        println!("cargo:rerun-if-changed={}", git(&["rev-parse", "--git-path", item]));
    }
    let reference = git(&["rev-parse", "--symbolic-full-name", "HEAD"]);
    if reference != "HEAD" {
        println!("cargo:rerun-if-changed={}", git(&["rev-parse", "--git-path", &reference]));
    }
    println!("cargo:rustc-env=DRAW_BUILD_SOURCE_SHA={}", git(&["rev-parse", "HEAD"]));
    println!("cargo:rustc-env=DRAW_BUILD_SOURCE_CLEAN={}", git(&["status", "--porcelain", "--untracked-files=no"]).is_empty());
    tauri_build::build()
}
