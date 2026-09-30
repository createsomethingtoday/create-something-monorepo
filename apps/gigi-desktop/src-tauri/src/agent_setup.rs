use std::path::Path;
use serde_json::Value;

fn shell_quote(value: &str) -> String {
 format!("'{}'", value.replace('\'', "'\"'\"'"))
}

pub fn status(data: &Path) -> Result<Value,String> {
 let receipt=data.join("agent-last-call.json");
 let last=if receipt.is_file() {
  let bytes=std::fs::read(&receipt).map_err(|e|e.to_string())?;
  if bytes.len()>4096{return Err("Agent receipt exceeds limit".into());}
  serde_json::from_slice::<Value>(&bytes).map_err(|_|"Agent receipt unreadable".to_string())?
 }else{Value::Null};
 if !last.is_null() && (last.get("lastToolAt").and_then(Value::as_u64).is_none() || !last.get("tool").and_then(Value::as_str).is_some_and(|x|!x.is_empty() && x.len()<=128)) {
  return Err("Agent receipt has invalid fields".into());
 }
 Ok(serde_json::json!({"prepared":data.join("agent/gigi/.mcp.json").is_file(),"lastCall":last,"phoneVerified":false}))
}

pub fn prepare(resources: &Path, data: &Path) -> Result<Value,String> {
 let binary=resources.join("gigi-mcp");
 let skill=resources.join("agent/gigi/skills/gigi/SKILL.md");
 if !binary.is_file() || !skill.is_file() {return Err("Agent package unavailable. Install the complete GiGi app.".into());}
 let output=data.join("agent/gigi");
 let skill_output=output.join("skills/gigi");
 std::fs::create_dir_all(&skill_output).map_err(|e|e.to_string())?;
 std::fs::copy(skill,skill_output.join("SKILL.md")).map_err(|e|e.to_string())?;
 for kind in [".codex-plugin",".claude-plugin"] {
  let folder=output.join(kind);std::fs::create_dir_all(&folder).map_err(|e|e.to_string())?;
  let mut manifest=serde_json::json!({"name":"gigi","version":"0.1.0","description":"Private music-work records through local GiGi MCP"});
  if kind==".codex-plugin" {manifest["skills"]=serde_json::json!("./skills/");manifest["mcpServers"]=serde_json::json!("./.mcp.json");}
  std::fs::write(folder.join("plugin.json"),serde_json::to_vec_pretty(&manifest).unwrap()).map_err(|e|e.to_string())?;
 }
 let config=serde_json::json!({"mcpServers":{"gigi":{"command":binary,"args":[],"env":{"GIGI_DATA_DIR":data}}}});
 std::fs::write(output.join(".mcp.json"),serde_json::to_vec_pretty(&config).unwrap()).map_err(|e|e.to_string())?;
 let codex_command=format!("codex mcp add gigi --env {} -- {}",shell_quote(&format!("GIGI_DATA_DIR={}",data.display())),shell_quote(&binary.to_string_lossy()));
 let claude_command=format!("claude --plugin-dir {}",shell_quote(&output.to_string_lossy()));
 Ok(serde_json::json!({"packagePath":output,"mcpConfig":config,"installed":false,"state":"prepared",
  "codexCommand":codex_command,"claudeCommand":claude_command,"skillPath":skill_output.join("SKILL.md"),
  "starterPrompt":format!("Read {} and use GiGi tools to retrieve my workspace. Use bounded lists and ask before changing records.",skill_output.join("SKILL.md").display()),
  "nextStep":"Run the command for your signed-in subscribed agent, then start a new session and verify a GiGi tool call."}))
}

#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn command_arguments_escape_spaces_and_shell_metacharacters() {
  assert_eq!(shell_quote("/Users/Test's Mac/$(bad)"), "'/Users/Test'\"'\"'s Mac/$(bad)'");
 }
 #[test]
 fn invalid_receipt_cannot_claim_agent_readiness() {
  let dir=std::env::temp_dir().join(format!("gigi-status-{}",uuid::Uuid::new_v4()));
  std::fs::create_dir_all(&dir).unwrap();
  std::fs::write(dir.join("agent-last-call.json"),r#"{"lastToolAt":"yesterday","tool":"invented"}"#).unwrap();
  let result=status(&dir);
  std::fs::remove_dir_all(dir).unwrap();
  assert!(result.is_err());
 }
 #[test]
 fn prepares_exact_installed_paths_without_editing_provider_configuration() {
  let dir=std::env::temp_dir().join(format!("gigi-agent-{}",uuid::Uuid::new_v4()));
  let resources=dir.join("resources"); let data=dir.join("data");
  let skill=resources.join("agent/gigi/skills/gigi");
  std::fs::create_dir_all(&skill).unwrap();
  std::fs::write(skill.join("SKILL.md"),"GiGi skill fixture").unwrap();
  std::fs::write(resources.join("gigi-mcp"),"fixture").unwrap();
  let result=prepare(&resources,&data);
  let value=result.unwrap();
  let config:Value=serde_json::from_str(&std::fs::read_to_string(data.join("agent/gigi/.mcp.json")).unwrap()).unwrap();
  assert_eq!(config["mcpServers"]["gigi"]["command"],resources.join("gigi-mcp").to_string_lossy().as_ref());
  assert_eq!(config["mcpServers"]["gigi"]["env"]["GIGI_DATA_DIR"],data.to_string_lossy().as_ref());
  assert_eq!(value["installed"],false);
  assert!(value["codexCommand"].as_str().unwrap().starts_with("codex mcp add gigi --env "));
  assert!(value["claudeCommand"].as_str().unwrap().contains("--plugin-dir"));
  assert!(data.join("agent/gigi/skills/gigi/SKILL.md").exists());
  std::fs::remove_dir_all(dir).unwrap();
 }
}
