use std::env;
use std::path::Path;
use std::process::Command;

fn git_output(manifest_dir: &str, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .args(["-C", manifest_dir])
        .args(args)
        .output()
        .ok()?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .ok()
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
    } else {
        None
    }
}

fn git_source_sha(manifest_dir: &str) -> Option<String> {
    git_output(manifest_dir, &["rev-parse", "HEAD"])
}

fn main() {
    println!("cargo:rerun-if-env-changed=GROUND_SOURCE_SHA");
    println!("cargo:rerun-if-env-changed=TARGET");

    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
    if let Some(head_path) = git_output(&manifest_dir, &["rev-parse", "--git-path", "HEAD"]) {
        let head_path = Path::new(&manifest_dir).join(head_path);
        println!("cargo:rerun-if-changed={}", head_path.display());
    }

    let source_sha = env::var("GROUND_SOURCE_SHA")
        .ok()
        .filter(|sha| !sha.trim().is_empty())
        .or_else(|| git_source_sha(&manifest_dir))
        .unwrap_or_else(|| "unknown".to_owned());
    let target = env::var("TARGET").unwrap_or_else(|_| "unknown".to_owned());

    println!("cargo:rustc-env=GROUND_SOURCE_SHA={source_sha}");
    println!("cargo:rustc-env=GROUND_TARGET_TRIPLE={target}");
}
