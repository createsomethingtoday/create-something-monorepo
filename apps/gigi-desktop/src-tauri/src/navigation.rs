use serde_json::{json,Value};
fn consent_url(value:&str)->Result<String,String>{
 let url=tauri::Url::parse(value).map_err(|_|"Invalid consent URL")?;
 if url.scheme()!="https"||url.host_str()!=Some("connect.composio.dev")||!url.username().is_empty()||url.password().is_some()||url.fragment().is_some()||url.port().is_some(){return Err("Invalid consent destination".into());}
 Ok(url.to_string())
}
pub fn open_consent(input:Value)->Result<Value,String>{
 let url=consent_url(input.get("url").and_then(Value::as_str).ok_or("Consent URL required")?)?;
 let status=std::process::Command::new("/usr/bin/open").arg(url).stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).status().map_err(|_|"Browser could not open")?;
 if !status.success(){return Err("Browser could not open".into());}
 Ok(json!({"opened":true,"verified":false}))
}
fn help_url(topic:&str)->Result<&'static str,String>{
 match topic {
  "codex-setup"=>Ok("https://learn.chatgpt.com/docs/codex/cli"),
  "claude-setup"=>Ok("https://code.claude.com/docs/en/quickstart"),
  "codex-remote"=>Ok("https://learn.chatgpt.com/docs/remote-connections"),
  "claude-remote"=>Ok("https://code.claude.com/docs/en/remote-control"),
  _=>Err("Unknown setup guide".into())
 }
}
pub fn open_help(input:Value)->Result<Value,String>{
 let url=help_url(input.get("topic").and_then(Value::as_str).ok_or("Setup guide required")?)?;
 let status=std::process::Command::new("/usr/bin/open").arg(url).stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).status().map_err(|_|"Browser could not open")?;
 if !status.success(){return Err("Browser could not open".into());}
 Ok(json!({"opened":true}))
}
#[cfg(test)]
mod help_tests {
 use super::*;
 #[test]
 fn help_topics_can_only_open_reviewed_provider_guides() {
  assert_eq!(help_url("codex-setup").unwrap(),"https://learn.chatgpt.com/docs/codex/cli");
  assert_eq!(help_url("claude-setup").unwrap(),"https://code.claude.com/docs/en/quickstart");
  assert_eq!(help_url("codex-remote").unwrap(),"https://learn.chatgpt.com/docs/remote-connections");
  assert_eq!(help_url("claude-remote").unwrap(),"https://code.claude.com/docs/en/remote-control");
  for value in ["https://evil.invalid", "file:///tmp/a", "codex-setup?token=x", ""] { assert!(help_url(value).is_err()); }
 }
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn consent_navigation_stays_on_owning_https_provider(){
  assert!(consent_url("https://connect.composio.dev/link?token=synthetic").is_ok());
  for url in ["file:///etc/passwd","https://connect.composio.dev.attacker.test/link","https://user:secret@connect.composio.dev/link","http://connect.composio.dev/link","https://connect.composio.dev:8443/link"]{assert!(consent_url(url).is_err());}
 }
}
