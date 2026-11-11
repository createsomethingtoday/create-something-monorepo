use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    path::Path,
    process::{Command, Stdio},
    time::{Duration, Instant},
};

fn query(record: &Value) -> Result<String, String> {
    let fields = &record["fields"];
    let parts: Vec<_> = ["Address", "City", "Region", "Country"]
        .into_iter()
        .filter_map(|key| fields[key].as_str())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .collect();
    let value = if parts.is_empty() {
        record["title"].as_str().unwrap_or("").trim().to_string()
    } else {
        parts.join(", ")
    };
    if value.is_empty() || value.chars().count() > 500 || value.chars().any(char::is_control) {
        return Err("Add a saved place name or address first".into());
    }
    Ok(value)
}
fn maps_url(query: &str) -> Result<String, String> {
    let mut url = tauri::Url::parse("https://maps.apple.com/").map_err(|_| "Maps unavailable")?;
    url.query_pairs_mut().append_pair("q", query);
    Ok(url.to_string())
}
pub fn dispatch(
    resources: &Path,
    root: &Path,
    operation: &str,
    input: Value,
) -> Result<Value, String> {
    let wid = input["workspaceId"].as_str().ok_or("Workspace required")?;
    let id = input["id"].as_str().ok_or("Saved place required")?;
    let record = crate::domain::dispatch(
        root,
        "records.get",
        json!({"workspaceId":wid,"entity":"locations","id":id}),
    )?;
    let query = query(&record)?;
    if operation == "places.openMaps" {
        let status = Command::new("/usr/bin/open")
            .arg(maps_url(&query)?)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|_| "Maps could not open")?;
        return if status.success() {
            Ok(json!({"opened":true,"verified":false}))
        } else {
            Err("Maps could not open".into())
        };
    }
    if operation != "places.mapPreview" {
        return Err("Unknown place action".into());
    }
    let mut child = Command::new(resources.join("gigi-map-preview"))
        .env_clear()
        .env("PATH", "/usr/bin:/bin")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Map previews are unavailable in this build")?;
    if child
        .stdin
        .take()
        .ok_or("Map request unavailable")?
        .write_all(json!({"query":query}).to_string().as_bytes())
        .is_err()
    {
        let _ = child.kill();
        let _ = child.wait();
        return Err("Map request unavailable".into());
    }
    let stdout = child.stdout.take().ok_or("Map response unavailable")?;
    let reader = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        stdout
            .take(1_500_001)
            .read_to_end(&mut bytes)
            .map(|_| bytes)
    });
    let start = Instant::now();
    let success = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status.success(),
            Ok(None) if start.elapsed() < Duration::from_secs(32) => {
                std::thread::sleep(Duration::from_millis(40))
            }
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                break false;
            }
        }
    };
    let bytes = reader
        .join()
        .map_err(|_| "Map response interrupted")?
        .map_err(|_| "Map response unavailable")?;
    if !success || bytes.len() > 1_500_000 {
        return Err("Map preview unavailable. Try again or open the saved place in Maps.".into());
    }
    let result: Value = serde_json::from_slice(&bytes).map_err(|_| "Invalid map preview")?;
    if !result["dataUrl"]
        .as_str()
        .is_some_and(|v| v.starts_with("data:image/png;base64,"))
    {
        return Err("Invalid map preview".into());
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn saved_address_is_bounded_and_provider_fixed() {
        assert_eq!(
            query(&json!({"title":"Hall","fields":{"Address":"1 Example St","City":"Example"}}))
                .unwrap(),
            "1 Example St, Example"
        );
        assert!(query(&json!({"title":""})).is_err());
        assert!(query(&json!({"title":"a".repeat(501)})).is_err());
        assert!(query(&json!({"title":"Hall\nOther"})).is_err());
        let url =
            tauri::Url::parse(&maps_url("https://elsewhere.invalid/?x=1&address=other").unwrap())
                .unwrap();
        assert_eq!(url.host_str(), Some("maps.apple.com"));
        assert_eq!(url.query_pairs().count(), 1);
    }
    #[test]
    fn foreign_saved_place_is_rejected_before_any_helper_operation() {
        let root = std::env::temp_dir().join(format!("gigi-place-scope-{}", uuid::Uuid::new_v4()));
        let w =
            crate::domain::dispatch(&root, "workspace.create", json!({"name":"Synthetic Maps"}))
                .unwrap()["id"]
                .clone();
        let place=crate::domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"locations","title":"Saved synthetic place","fields":{"Address":"1 Example St"}})).unwrap();
        let other = uuid::Uuid::new_v4().to_string();
        crate::domain::open(&root)
            .unwrap()
            .execute(
                "INSERT INTO workspaces(id,name) VALUES(?1,'Other')",
                [&other],
            )
            .unwrap();
        let input = json!({"workspaceId":other,"id":place["id"],"query":"Untrusted replacement"});
        for operation in ["places.mapPreview", "places.openMaps"] {
            let error = dispatch(
                &root.join("absent-resources"),
                &root,
                operation,
                input.clone(),
            )
            .unwrap_err();
            assert!(
                !error.contains("this build"),
                "Foreign ownership must fail before spawning a helper"
            );
        }
        let error = dispatch(
            &root.join("absent-resources"),
            &root,
            "places.mapPreview",
            json!({"workspaceId":w,"id":place["id"]}),
        )
        .unwrap_err();
        assert_eq!(error, "Map previews are unavailable in this build");
        std::fs::remove_dir_all(root).unwrap();
    }
}
