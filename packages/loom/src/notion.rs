//! Notion Sync
//!
//! Syncs Loom tasks to a Notion database for work analytics visibility.
//!
//! ## Usage
//!
//! ```bash
//! # Initialize - creates database in Notion
//! lm notion init <parent_page_id>
//!
//! # Sync tasks to Notion
//! lm notion sync
//!
//! # Preview without writing
//! lm notion sync --dry-run
//! ```
//!
//! ## Schema
//!
//! The Notion database is created with these properties:
//! - Title (title) - Task title
//! - Loom ID (rich_text) - Unique key for deduplication (e.g., "lm-9281")
//! - Description (rich_text) - Task description (truncated to 2000 chars)
//! - Status (select) - ready, claimed, blocked, done, cancelled
//! - Priority (select) - critical, high, normal, low
//! - Type (select) - feature, bug, task, epic, chore
//! - Labels (multi_select) - Task labels
//! - Agent (select) - claude-code, human, etc.
//! - Repository (select) - Repository identifier
//! - Created (date) - Task creation date
//! - Updated (date) - Last update date
//! - Completed (date) - Completion date (if done)
//! - Duration (number) - Duration in hours (from execution records)
//! - Cost (number) - Cost in USD (actual_cost_usd)

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

use crate::work::{Task, Status};

const NOTION_API_BASE: &str = "https://api.notion.com/v1";
const NOTION_VERSION: &str = "2022-06-28";

#[derive(Error, Debug)]
pub enum NotionError {
    #[error("HTTP error: {0}")]
    Http(String),
    
    #[error("API error: {status} - {message}")]
    Api { status: u16, message: String },
    
    #[error("Not configured: {0}")]
    NotConfigured(String),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Notion sync configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NotionConfig {
    /// OAuth access token
    pub access_token: Option<String>,
    /// Database ID (set after init)
    pub database_id: Option<String>,
}

impl NotionConfig {
    /// Check if configured
    pub fn is_configured(&self) -> bool {
        self.access_token.is_some() && self.database_id.is_some()
    }
}

/// Notion API client
pub struct NotionClient {
    access_token: String,
    http_client: ureq::Agent,
}

impl NotionClient {
    /// Create a new client
    pub fn new(access_token: &str) -> Self {
        Self {
            access_token: access_token.to_string(),
            http_client: ureq::Agent::new(),
        }
    }
    
    /// Make an API request
    fn request(&self, method: &str, endpoint: &str, body: Option<serde_json::Value>) -> Result<serde_json::Value, NotionError> {
        let url = format!("{}{}", NOTION_API_BASE, endpoint);
        
        let request = match method {
            "GET" => self.http_client.get(&url),
            "POST" => self.http_client.post(&url),
            "PATCH" => self.http_client.request("PATCH", &url),
            _ => return Err(NotionError::Http(format!("Unknown method: {}", method))),
        };
        
        let request = request
            .set("Authorization", &format!("Bearer {}", self.access_token))
            .set("Notion-Version", NOTION_VERSION)
            .set("Content-Type", "application/json");
        
        let response = if let Some(body) = body {
            request.send_json(body)
        } else {
            request.call()
        };
        
        match response {
            Ok(resp) => {
                let text = resp.into_string()
                    .map_err(|e| NotionError::Http(e.to_string()))?;
                serde_json::from_str(&text).map_err(NotionError::Serialization)
            }
            Err(ureq::Error::Status(status, resp)) => {
                let message = resp.into_string().unwrap_or_default();
                Err(NotionError::Api { status, message })
            }
            Err(e) => Err(NotionError::Http(e.to_string())),
        }
    }
    
    /// Create a database with the Loom schema
    pub fn create_database(&self, parent_page_id: &str) -> Result<String, NotionError> {
        let body = serde_json::json!({
            "parent": { "page_id": parent_page_id },
            "icon": { "emoji": "🧵" },
            "title": [{ "text": { "content": "Loom Work Log" } }],
            "properties": {
                "Title": { "title": {} },
                "Loom ID": { "rich_text": {} },
                "Description": { "rich_text": {} },
                "Status": {
                    "select": {
                        "options": [
                            { "name": "ready", "color": "blue" },
                            { "name": "claimed", "color": "yellow" },
                            { "name": "blocked", "color": "red" },
                            { "name": "done", "color": "green" },
                            { "name": "cancelled", "color": "gray" }
                        ]
                    }
                },
                "Priority": {
                    "select": {
                        "options": [
                            { "name": "critical", "color": "red" },
                            { "name": "high", "color": "orange" },
                            { "name": "normal", "color": "blue" },
                            { "name": "low", "color": "gray" }
                        ]
                    }
                },
                "Type": {
                    "select": {
                        "options": [
                            { "name": "feature", "color": "purple" },
                            { "name": "bug", "color": "red" },
                            { "name": "task", "color": "blue" },
                            { "name": "epic", "color": "pink" },
                            { "name": "chore", "color": "gray" }
                        ]
                    }
                },
                "Labels": { "multi_select": {} },
                "Agent": { "select": {} },
                "Repository": { "select": {} },
                "Created": { "date": {} },
                "Updated": { "date": {} },
                "Completed": { "date": {} },
                "Duration (hrs)": { "number": {} },
                "Cost (USD)": { "number": {} }
            }
        });
        
        let result = self.request("POST", "/databases", Some(body))?;
        
        result["id"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| NotionError::Api { 
                status: 0, 
                message: "No database ID in response".to_string() 
            })
    }
    
    /// Query existing pages by Loom ID
    pub fn query_by_loom_id(&self, database_id: &str) -> Result<HashMap<String, NotionPage>, NotionError> {
        let mut pages = HashMap::new();
        let mut cursor: Option<String> = None;
        
        loop {
            let mut body = serde_json::json!({
                "page_size": 100
            });
            
            if let Some(ref c) = cursor {
                body["start_cursor"] = serde_json::json!(c);
            }
            
            let result = self.request("POST", &format!("/databases/{}/query", database_id), Some(body))?;
            
            if let Some(results) = result["results"].as_array() {
                for page in results {
                    if let Some(loom_id) = extract_loom_id(page) {
                        pages.insert(loom_id, NotionPage {
                            id: page["id"].as_str().unwrap_or_default().to_string(),
                            last_edited_time: page["last_edited_time"].as_str().unwrap_or_default().to_string(),
                        });
                    }
                }
            }
            
            if result["has_more"].as_bool().unwrap_or(false) {
                cursor = result["next_cursor"].as_str().map(String::from);
            } else {
                break;
            }
        }
        
        Ok(pages)
    }
    
    /// Create a page for a task
    pub fn create_page(&self, database_id: &str, task: &Task) -> Result<String, NotionError> {
        let body = serde_json::json!({
            "parent": { "database_id": database_id },
            "properties": task_to_properties(task)
        });
        
        let result = self.request("POST", "/pages", Some(body))?;
        
        result["id"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| NotionError::Api { 
                status: 0, 
                message: "No page ID in response".to_string() 
            })
    }
    
    /// Update a page
    pub fn update_page(&self, page_id: &str, task: &Task) -> Result<(), NotionError> {
        let body = serde_json::json!({
            "properties": task_to_properties(task)
        });
        
        self.request("PATCH", &format!("/pages/{}", page_id), Some(body))?;
        Ok(())
    }
}

/// Minimal page info for sync
#[derive(Debug, Clone)]
pub struct NotionPage {
    pub id: String,
    pub last_edited_time: String,
}

/// Extract Loom ID from page properties
fn extract_loom_id(page: &serde_json::Value) -> Option<String> {
    page["properties"]["Loom ID"]["rich_text"]
        .as_array()?
        .first()?
        ["plain_text"]
        .as_str()
        .map(String::from)
}

/// Convert a task to Notion properties
fn task_to_properties(task: &Task) -> serde_json::Value {
    let mut props = serde_json::json!({
        "Title": {
            "title": [{ "text": { "content": &task.title } }]
        },
        "Loom ID": {
            "rich_text": [{ "text": { "content": &task.id } }]
        },
        "Status": {
            "select": { "name": task.status.as_str() }
        },
        "Priority": {
            "select": { "name": task.priority.as_str() }
        },
        "Type": {
            "select": { "name": task.issue_type.as_str() }
        },
        "Created": {
            "date": { "start": task.created_at.to_rfc3339() }
        },
        "Updated": {
            "date": { "start": task.updated_at.to_rfc3339() }
        }
    });
    
    // Description (truncate to 2000 chars)
    if let Some(ref desc) = task.description {
        let truncated = if desc.len() > 2000 {
            format!("{}...", &desc[..1997])
        } else {
            desc.clone()
        };
        props["Description"] = serde_json::json!({
            "rich_text": [{ "text": { "content": truncated } }]
        });
    }
    
    // Labels (multi_select)
    if !task.labels.is_empty() {
        props["Labels"] = serde_json::json!({
            "multi_select": task.labels.iter().map(|l| serde_json::json!({ "name": l })).collect::<Vec<_>>()
        });
    }
    
    // Agent
    if let Some(ref agent) = task.agent {
        props["Agent"] = serde_json::json!({
            "select": { "name": agent }
        });
    }
    
    // Repository
    if let Some(ref repo) = task.repo {
        props["Repository"] = serde_json::json!({
            "select": { "name": repo }
        });
    }
    
    // Completed date (if done)
    if task.status == Status::Done {
        props["Completed"] = serde_json::json!({
            "date": { "start": task.updated_at.to_rfc3339() }
        });
    }
    
    // Cost
    if let Some(cost) = task.actual_cost_usd {
        props["Cost (USD)"] = serde_json::json!({
            "number": cost
        });
    }
    
    props
}

/// Sync options
#[derive(Debug, Clone, Default)]
pub struct SyncOptions {
    /// Preview without writing
    pub dry_run: bool,
    /// Update all pages regardless of timestamp
    pub force: bool,
    /// Filter by status
    pub status: Option<Status>,
    /// Only sync tasks updated after this date
    pub since: Option<chrono::DateTime<chrono::Utc>>,
}

/// Sync result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    /// Number of tasks considered
    pub total: usize,
    /// Number of pages created
    pub created: usize,
    /// Number of pages updated
    pub updated: usize,
    /// Number of pages skipped (unchanged)
    pub skipped: usize,
    /// Errors encountered
    pub errors: Vec<String>,
}

/// Sync tasks to Notion
pub fn sync_tasks(
    client: &NotionClient,
    database_id: &str,
    tasks: &[Task],
    options: &SyncOptions,
) -> Result<SyncResult, NotionError> {
    let mut result = SyncResult {
        total: tasks.len(),
        created: 0,
        updated: 0,
        skipped: 0,
        errors: vec![],
    };
    
    // Filter tasks
    let tasks: Vec<_> = tasks.iter()
        .filter(|t| {
            if let Some(status) = &options.status {
                if t.status != *status {
                    return false;
                }
            }
            if let Some(since) = options.since {
                if t.updated_at < since {
                    return false;
                }
            }
            true
        })
        .collect();
    
    result.total = tasks.len();
    
    if options.dry_run {
        // Just count what would be done
        let existing = client.query_by_loom_id(database_id)?;
        
        for task in &tasks {
            if existing.contains_key(&task.id) {
                if options.force {
                    result.updated += 1;
                } else {
                    // Check if changed
                    let page = &existing[&task.id];
                    let page_time = chrono::DateTime::parse_from_rfc3339(&page.last_edited_time)
                        .map(|dt| dt.with_timezone(&chrono::Utc))
                        .unwrap_or_else(|_| chrono::Utc::now());
                    
                    if task.updated_at > page_time {
                        result.updated += 1;
                    } else {
                        result.skipped += 1;
                    }
                }
            } else {
                result.created += 1;
            }
        }
        
        return Ok(result);
    }
    
    // Get existing pages
    let existing = client.query_by_loom_id(database_id)?;
    
    for task in &tasks {
        if let Some(page) = existing.get(&task.id) {
            // Check if needs update
            let needs_update = if options.force {
                true
            } else {
                let page_time = chrono::DateTime::parse_from_rfc3339(&page.last_edited_time)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now());
                task.updated_at > page_time
            };
            
            if needs_update {
                match client.update_page(&page.id, task) {
                    Ok(_) => result.updated += 1,
                    Err(e) => result.errors.push(format!("{}: {}", task.id, e)),
                }
            } else {
                result.skipped += 1;
            }
        } else {
            // Create new page
            match client.create_page(database_id, task) {
                Ok(_) => result.created += 1,
                Err(e) => result.errors.push(format!("{}: {}", task.id, e)),
            }
        }
    }
    
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::work::{Priority, IssueType};
    
    #[test]
    fn test_task_to_properties() {
        let task = Task {
            id: "lm-1234".to_string(),
            title: "Test task".to_string(),
            description: Some("A test description".to_string()),
            status: Status::Ready,
            priority: Priority::High,
            issue_type: IssueType::Bug,
            agent: Some("claude-code".to_string()),
            labels: vec!["agency".to_string(), "bug".to_string()],
            parent: None,
            evidence: None,
            actual_cost_usd: Some(0.15),
            repo: Some("create-something".to_string()),
            close_reason: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        let props = task_to_properties(&task);
        
        // Check title
        assert_eq!(
            props["Title"]["title"][0]["text"]["content"],
            "Test task"
        );
        
        // Check Loom ID
        assert_eq!(
            props["Loom ID"]["rich_text"][0]["text"]["content"],
            "lm-1234"
        );
        
        // Check status
        assert_eq!(
            props["Status"]["select"]["name"],
            "ready"
        );
        
        // Check priority
        assert_eq!(
            props["Priority"]["select"]["name"],
            "high"
        );
        
        // Check type
        assert_eq!(
            props["Type"]["select"]["name"],
            "bug"
        );
        
        // Check labels
        assert_eq!(props["Labels"]["multi_select"].as_array().unwrap().len(), 2);
        
        // Check agent
        assert_eq!(
            props["Agent"]["select"]["name"],
            "claude-code"
        );
        
        // Check cost
        assert_eq!(props["Cost (USD)"]["number"], 0.15);
    }
}
