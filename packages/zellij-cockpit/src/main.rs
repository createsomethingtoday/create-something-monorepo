use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use zellij_tile::prelude::*;

#[derive(Default, Deserialize, Serialize)]
struct Task {
    #[serde(default)]
    title: String,
    #[serde(default)]
    issue: String,
    #[serde(default)]
    pane_id: Option<u32>,
    #[serde(default)]
    agent_state: String,
    #[serde(default)]
    evidence: String,
}

#[derive(Default)]
struct State {
    task: Task,
    present: bool,
    exited: bool,
    allowed: bool,
    cache_file: Option<String>,
}
register_plugin!(State);

impl ZellijPlugin for State {
    fn load(&mut self, config: BTreeMap<String, String>) {
        self.task.title = config.get("task_title").cloned().unwrap_or_default();
        self.task.issue = config.get("issue").cloned().unwrap_or_default();
        self.task.pane_id = config.get("pane_id").and_then(|s| s.parse().ok());
        self.cache_file = config
            .get("task_key")
            .filter(|key| {
                !key.is_empty()
                    && key.len() <= 64
                    && key
                        .chars()
                        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
            })
            .map(|key| format!("/cache/create-something-{key}.json"));
        if let Some(file) = &self.cache_file {
            if let Ok(bytes) = std::fs::read(file) {
                if let Ok(task) = serde_json::from_slice::<Task>(&bytes) {
                    if task.pane_id == self.task.pane_id {
                        self.task = task;
                    }
                }
            }
        }
        request_permission(&[
            PermissionType::ReadApplicationState,
            PermissionType::ChangeApplicationState,
        ]);
        subscribe(&[
            EventType::PermissionRequestResult,
            EventType::PaneUpdate,
            EventType::Key,
            EventType::Mouse,
        ]);
    }

    fn update(&mut self, event: Event) -> bool {
        match event {
            Event::PermissionRequestResult(PermissionStatus::Granted) => self.allowed = true,
            Event::PaneUpdate(manifest) => {
                let pane = manifest
                    .panes
                    .values()
                    .flatten()
                    .find(|p| !p.is_plugin && Some(p.id) == self.task.pane_id);
                self.present = pane.is_some();
                self.exited = pane.map(|p| p.exited).unwrap_or(false);
            }
            Event::Key(key) if key.bare_key == BareKey::Enter => self.focus(),
            Event::Mouse(Mouse::LeftClick(_, _)) => self.focus(),
            _ => {}
        }
        true
    }

    fn pipe(&mut self, message: PipeMessage) -> bool {
        if message.name != "create-something-task" {
            return false;
        }
        if let Some(payload) = message.payload {
            if let Ok(task) = serde_json::from_str::<Task>(&payload) {
                // Pipes update presentation only; they never execute or approve input.
                if task.pane_id != self.task.pane_id {
                    self.present = false;
                }
                self.task = task;
                if let Some(file) = &self.cache_file {
                    if let Ok(bytes) = serde_json::to_vec(&self.task) {
                        let temp = format!("{file}.{}.tmp", cache_writer_id());
                        if std::fs::write(&temp, bytes).is_ok() {
                            let _ = std::fs::rename(temp, file);
                        }
                    }
                }
                return true;
            }
        }
        false
    }

    fn render(&mut self, rows: usize, cols: usize) {
        let terminal = if !self.allowed {
            "Permission needed"
        } else if self.task.pane_id.is_none() {
            "No worker assigned"
        } else if !self.present {
            "Worker missing"
        } else if self.exited {
            "Worker exited"
        } else {
            "Connected"
        };
        let agent = if self.present && !self.exited && !self.task.agent_state.is_empty() {
            &self.task.agent_state
        } else {
            "Unknown"
        };
        let lines = vec![
            "CREATE SOMETHING".to_string(),
            String::new(),
            self.task.issue.clone(),
            self.task.title.clone(),
            String::new(),
            format!("Terminal: {terminal}"),
            format!("Last agent state: {agent}"),
            format!(
                "Pane: {}",
                self.task
                    .pane_id
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| "unassigned".into())
            ),
            String::new(),
            "Enter / click: focus worker".into(),
            String::new(),
            "Completion: Codex verifies".into(),
            String::new(),
            self.task.evidence.clone(),
        ];
        for line in lines.iter().take(rows) {
            println!("{}", clean_line(line, cols));
        }
    }
}
impl State {
    fn focus(&self) {
        if self.allowed && self.present && !self.exited {
            if let Some(id) = self.task.pane_id {
                focus_terminal_pane(id, false, false);
            }
        }
    }
}
// Zellij host imports exist only in the WASM runtime. Native tests use the OS
// process identity solely to keep temporary cache filenames distinct.
fn cache_writer_id() -> u32 {
    #[cfg(target_arch = "wasm32")]
    {
        u32::from(get_plugin_ids().client_id)
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        std::process::id()
    }
}
fn clean_line(text: &str, cols: usize) -> String {
    text.chars()
        .filter(|c| !c.is_control())
        .take(cols)
        .collect()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn text_cannot_emit_terminal_controls() {
        assert_eq!(clean_line("a\x1bb\nc", 10), "abc");
        assert_eq!(clean_line("hello", 3), "hel");
    }
}
