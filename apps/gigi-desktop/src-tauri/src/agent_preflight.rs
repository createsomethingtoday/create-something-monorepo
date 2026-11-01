//! Read-only setup evidence. Only GiGi's own bundled connector is executed.
use serde_json::{json, Value};
use std::{io::{BufRead, BufReader, Read, Write}, path::{Path, PathBuf}, process::{Command, Stdio}, sync::mpsc, time::Duration};
use std::os::unix::process::CommandExt;
fn stop_probe(child:&mut std::process::Child) {
    // These children have a dedicated process group; never signal an external host.
    unsafe { libc::kill(-(child.id() as i32),libc::SIGKILL); }
    let _=child.wait();
}

pub const MEDIA_TOOLS: [&str; 6] = ["gigi_media_import_prepare", "gigi_media_import", "gigi_media_get", "gigi_media_list", "gigi_media_attach", "gigi_media_operation_status"];

fn same_path(a: &Path, b: &Path) -> bool {
    a.is_absolute() && b.is_absolute() && std::fs::canonicalize(a).ok().zip(std::fs::canonicalize(b).ok()).is_some_and(|(a,b)| a==b)
}

fn registration(text: &str, binary: &Path, data: &Path) -> Value {
    let Ok(config) = text.parse::<toml::Value>() else { return json!({"state":"unreadable","reason":"Invalid Codex configuration"}); };
    let Some(entry) = config.get("mcp_servers").and_then(|v| v.get("gigi")) else { return json!({"state":"missing"}); };
    let command = entry.get("command").and_then(toml::Value::as_str);
    let profile = entry.get("env").and_then(|v|v.get("GIGI_DATA_DIR")).and_then(toml::Value::as_str);
    let args_match = entry.get("args").is_none_or(|v|v.as_array().is_some_and(Vec::is_empty));
    let enabled = entry.get("enabled").is_none_or(|v|v.as_bool()==Some(true));
    // Unknown arguments/environment may change which executable/profile is effective.
    let environment_match = entry.get("env").is_none_or(|v|v.as_table().is_some_and(|m|m.keys().all(|k|k=="GIGI_DATA_DIR"))) && entry.get("env_vars").is_none_or(|v|v.as_array().is_some_and(Vec::is_empty));
    let tool_filters_match = MEDIA_TOOLS.iter().chain(["gigi_connection_check","gigi_workspace_get"].iter()).all(|name|entry.get("enabled_tools").is_none_or(|v|v.as_array().is_some_and(|tools|tools.iter().any(|tool|tool.as_str()==Some(name)))) && entry.get("disabled_tools").is_none_or(|v|v.as_array().is_some_and(|tools|tools.iter().all(|tool|tool.as_str()!=Some(name)))));
    let command_match = command.is_some_and(|p|same_path(Path::new(p),binary));
    let profile_match = profile.is_some_and(|p|same_path(Path::new(p),data));
    json!({"state":if enabled && command_match && profile_match && args_match && environment_match && tool_filters_match {"matches"} else {"mismatch"},"command":command,"profile":profile,"enabled":enabled,"commandMatches":command_match,"profileMatches":profile_match,"argumentsMatch":args_match,"environmentMatches":environment_match,"toolFiltersMatch":tool_filters_match,"registeredVersion":null})
}

fn capabilities(initialize: &Value, catalog: &Value) -> Value {
    let version = initialize["result"]["serverInfo"]["version"].as_str();
    let tools = catalog["result"]["tools"].as_array();
    let missing: Vec<_> = MEDIA_TOOLS.iter().filter(|name| !tools.is_some_and(|tools| tools.iter().any(|t|t["name"]==**name && t["inputSchema"]["type"]=="object"))).copied().collect();
    let valid = initialize["id"]==1 && catalog["id"]==2 && initialize["result"]["serverInfo"]["name"]=="gigi-local" && version==Some(env!("CARGO_PKG_VERSION")) && missing.is_empty();
    json!({"state":if valid {"verified"} else {"mismatch"},"version":version,"expectedVersion":env!("CARGO_PKG_VERSION"),"missingMediaTools":missing,"toolCount":tools.map(Vec::len),"scope":"fresh_bundled_process"})
}

fn probe(binary: &Path, data: &Path) -> Result<Value, String> {
    let mut child = Command::new(binary).env("GIGI_DATA_DIR", data).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).process_group(0).spawn().map_err(|_|"Bundled connector could not start")?;
    let result = (|| {
        let mut stdin = child.stdin.take().ok_or("Connector input unavailable")?;
        stdin.write_all(b"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{},\"clientInfo\":{\"name\":\"gigi-preflight\",\"version\":\"1\"}}}\n{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}\n").map_err(|_|"Connector input failed")?;
        drop(stdin);
        let stdout = child.stdout.take().ok_or("Connector output unavailable")?;
        let (tx,rx) = mpsc::channel();
        std::thread::spawn(move || {
            let mut reader = BufReader::new(stdout.take(262145));
            let mut values = Vec::new(); let mut total=0;
            for _ in 0..2 { let mut line=String::new(); match reader.read_line(&mut line) { Ok(n) if n>0 => {total+=n;if total>262144 {break} match serde_json::from_str::<Value>(&line) {Ok(v)=>values.push(v),Err(_)=>break}},_=>break } }
            let _ = tx.send(values);
        });
        let values = rx.recv_timeout(Duration::from_secs(3)).map_err(|_|"Connector check timed out")?;
        if values.len()!=2 {return Err("Connector returned invalid or oversized output")}
        Ok(capabilities(&values[0], &values[1]))
    })();
    // A probe never owns the external host and never restarts it.
    stop_probe(&mut child);
    result.map_err(String::from)
}

fn cli_version(binary:&Path)->Result<String,String> {
    let path=crate::chat::companion_path(binary,std::env::var_os("PATH"))?;
    let mut child=Command::new(binary).arg("--version").env("PATH",path).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null()).process_group(0).spawn().map_err(|_|"Codex version check could not start")?;
    let stdout=child.stdout.take().ok_or("Codex version output unavailable")?;
    let (tx,rx)=mpsc::channel();
    std::thread::spawn(move||{let mut bytes=Vec::new();let result=stdout.take(4097).read_to_end(&mut bytes);let _=tx.send((result,bytes));});
    let result=rx.recv_timeout(Duration::from_secs(3));
    let deadline=std::time::Instant::now()+Duration::from_millis(100);
    let status=loop {match child.try_wait(){Ok(Some(status))=>break Some(status),_ if std::time::Instant::now()<deadline=>std::thread::sleep(Duration::from_millis(5)),_=>break None}};
    stop_probe(&mut child);
    let (read,bytes)=result.map_err(|_|"Codex version check timed out")?;read.map_err(|_|"Codex version output unavailable")?;
    if !status.is_some_and(|status|status.success()) {return Err("Codex version check did not complete successfully".into())}
    if bytes.len()>4096 {return Err("Codex version output exceeds limit".into())}
    let text=std::str::from_utf8(&bytes).map_err(|_|"Codex version output invalid")?.trim();
    let version=text.strip_prefix("codex-cli ").filter(|v| !v.is_empty()&&v.len()<=100&&v.chars().all(|c|c.is_ascii_alphanumeric()||".-+".contains(c))).ok_or("Codex version format unrecognized")?;
    Ok(version.into())
}

pub fn check(resources: &Path, data: &Path) -> Value {
    let binary = resources.join("gigi-mcp");
    let config_home = std::env::var_os("CODEX_HOME").map(PathBuf::from).or_else(||std::env::var_os("HOME").map(|p|PathBuf::from(p).join(".codex")));
    let path = config_home.map(|p|p.join("config.toml"));
    let mut observed = match path.as_ref().map(|path|std::fs::File::open(path).and_then(|file|{let mut bytes=Vec::new();file.take(1048577).read_to_end(&mut bytes)?;Ok(bytes)})) {
        Some(Ok(bytes)) if bytes.len()<=1048576 => std::str::from_utf8(&bytes).map(|text|registration(text,&binary,data)).unwrap_or_else(|_|json!({"state":"unreadable"})),
        Some(Err(e)) if e.kind()==std::io::ErrorKind::NotFound => json!({"state":"missing"}),
        _=>json!({"state":"unreadable"}),
    };
    observed["configPath"]=json!(path);
    let fresh = probe(&binary,data).unwrap_or_else(|reason|json!({"state":"unavailable","reason":reason,"scope":"fresh_bundled_process"}));
    if observed["state"]=="matches" {observed["registeredVersion"]=fresh["version"].clone();}
    let cli=match crate::chat::find_codex(){None=>json!({"state":"missing"}),Some(path)=>match cli_version(&path){Ok(version)=>json!({"state":"verified","path":path,"version":version}),Err(reason)=>json!({"state":"unverified","path":path,"reason":reason})}};
    json!({"appVersion":env!("CARGO_PKG_VERSION"),"codexCli":cli,"expectedCommand":binary,"expectedProfile":data,"registration":observed,"connector":fresh,"activeSession":{"state":"unverified","reason":"Run gigi_connection_check in the external agent session. A fresh process and a past tool receipt cannot verify its cached connection."},"nativeGeneration":{"state":"host_capability_required"},"configurationChanged":false})
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn registration_is_narrow_and_rejects_stale_path_profile_arguments_and_disabled_entries() {
        let root=std::env::temp_dir().join(format!("preflight-{}",uuid::Uuid::new_v4())); std::fs::create_dir_all(&root).unwrap();
        let binary=root.join("GiGi with spaces"); std::fs::write(&binary,b"fixture").unwrap();
        let config=format!("[mcp_servers.gigi]\ncommand = {:?}\n[mcp_servers.gigi.env]\nGIGI_DATA_DIR = {:?}\n",binary.to_str().unwrap(),root.to_str().unwrap());
        assert_eq!(registration(&config,&binary,&root)["state"],"matches");
        for bad in [config.replace("GiGi with spaces","old GiGi"),config.replace(root.to_str().unwrap(),"/wrong"),config.replace("[mcp_servers.gigi.env]","enabled = false\n[mcp_servers.gigi.env]"),config.replace("[mcp_servers.gigi.env]","args = [\"--other\"]\n[mcp_servers.gigi.env]")] {assert_eq!(registration(&bad,&binary,&root)["state"],"mismatch");}
        assert_eq!(registration("broken = [",&binary,&root)["state"],"unreadable");
        assert_eq!(registration("[unrelated]\nsecret='do not return'",&binary,&root),json!({"state":"missing"}));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test] fn fresh_catalog_requires_version_and_media_schemas_without_claiming_cached_host() {
        let init=json!({"id":1,"result":{"serverInfo":{"name":"gigi-local","version":env!("CARGO_PKG_VERSION")}}});
        let mut catalog=json!({"id":2,"result":{"tools":MEDIA_TOOLS.map(|name|json!({"name":name,"inputSchema":{"type":"object"}}))}});
        assert_eq!(capabilities(&init,&catalog)["state"],"verified");
        catalog["result"]["tools"][0]["inputSchema"]["type"]=json!("string");
        assert_eq!(capabilities(&init,&catalog)["state"],"mismatch");
        assert_eq!(capabilities(&json!({"id":1,"result":{"serverInfo":{"name":"gigi-local","version":"0.1.0"}}}),&catalog)["state"],"mismatch");
    }
    #[test] fn connector_probe_bounds_time_output_and_does_not_run_registration_commands() {
        use std::os::unix::fs::PermissionsExt;
        let root=std::env::temp_dir().join(format!("preflight-probe-{}",uuid::Uuid::new_v4()));std::fs::create_dir_all(&root).unwrap();
        let binary=root.join("connector fixture");
        for (script,expected) in [("#!/bin/sh\nprintf 'not-json\\n'\n","invalid or oversized"),("#!/bin/sh\nexec /bin/sleep 10\n","timed out"),("#!/bin/sh\nhead -c 262146 /dev/zero\n","invalid or oversized")] {
            std::fs::write(&binary,script).unwrap();std::fs::set_permissions(&binary,std::fs::Permissions::from_mode(0o700)).unwrap();
            assert!(probe(&binary,&root).unwrap_err().contains(expected));
        }
        assert!(probe(&root.join("missing"),&root).unwrap_err().contains("could not start"));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test] fn cli_version_uses_argv_with_spaces_and_rejects_unrecognized_output() {
        use std::os::unix::fs::PermissionsExt;
        let root=std::env::temp_dir().join(format!("cli-version-{}",uuid::Uuid::new_v4()));std::fs::create_dir_all(&root).unwrap();let path=root.join("codex with spaces");
        std::fs::write(&path,"#!/bin/sh\n[ \"$1\" = --version ] || exit 1\nprintf 'codex-cli 0.120.0\\n'\n").unwrap();std::fs::set_permissions(&path,std::fs::Permissions::from_mode(0o700)).unwrap();
        assert_eq!(cli_version(&path).unwrap(),"0.120.0");
        std::fs::write(&path,"#!/bin/sh\nprintf 'unexpected secret text\\n'\n").unwrap();assert_eq!(cli_version(&path).unwrap_err(),"Codex version format unrecognized");
        std::fs::remove_dir_all(root).unwrap();
    }
}
