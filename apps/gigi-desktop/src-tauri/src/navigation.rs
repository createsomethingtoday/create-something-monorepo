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
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn consent_navigation_stays_on_owning_https_provider(){
  assert!(consent_url("https://connect.composio.dev/link?token=synthetic").is_ok());
  for url in ["file:///etc/passwd","https://connect.composio.dev.attacker.test/link","https://user:secret@connect.composio.dev/link","http://connect.composio.dev/link","https://connect.composio.dev:8443/link"]{assert!(consent_url(url).is_err());}
 }
}
