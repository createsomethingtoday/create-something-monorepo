//! MCP tool definitions and implementations

use crate::processors::{duplicates, pages, schema};
use serde_json::Value;

/// Get all available tool definitions
pub fn get_tool_definitions() -> Vec<super::ToolDefinition> {
    vec![
        super::ToolDefinition {
            name: "notion_analyze_schema".to_string(),
            description: "Analyze a Notion database schema and return formatted property information including types and options for select/status fields.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "properties_json": {
                        "type": "string",
                        "description": "JSON string of Notion database properties object"
                    }
                },
                "required": ["properties_json"]
            }),
        },
        super::ToolDefinition {
            name: "notion_find_duplicates".to_string(),
            description: "Find duplicate pages in a Notion database by title. Returns page IDs that should be archived.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "pages_json": {
                        "type": "string",
                        "description": "JSON array of pages with id, title, and created_time fields"
                    },
                    "keep_strategy": {
                        "type": "string",
                        "enum": ["oldest", "newest"],
                        "description": "Which duplicate to keep: 'oldest' or 'newest'"
                    }
                },
                "required": ["pages_json"]
            }),
        },
        super::ToolDefinition {
            name: "notion_simplify_pages".to_string(),
            description: "Simplify Notion page objects by extracting titles and key metadata for easier processing.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "pages_json": {
                        "type": "string",
                        "description": "JSON array of Notion page objects"
                    }
                },
                "required": ["pages_json"]
            }),
        },
        super::ToolDefinition {
            name: "notion_suggest_cleanup".to_string(),
            description: "Analyze pages and suggest cleanup actions including duplicate removal and incomplete entry detection.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "pages_json": {
                        "type": "string",
                        "description": "JSON array of Notion page objects to analyze"
                    },
                    "schema_json": {
                        "type": "string",
                        "description": "JSON object of database properties (optional, for deeper analysis)"
                    }
                },
                "required": ["pages_json"]
            }),
        },
    ]
}

/// Call a tool by name with arguments
pub fn call_tool(name: &str, arguments: Value) -> Result<String, String> {
    match name {
        "notion_analyze_schema" => {
            let props_json = arguments
                .get("properties_json")
                .and_then(|v| v.as_str())
                .ok_or("Missing properties_json argument")?;
            schema::format_schema_impl(props_json)
        }
        "notion_find_duplicates" => {
            let pages_json = arguments
                .get("pages_json")
                .and_then(|v| v.as_str())
                .ok_or("Missing pages_json argument")?;
            let keep_strategy = arguments
                .get("keep_strategy")
                .and_then(|v| v.as_str())
                .unwrap_or("oldest");
            duplicates::find_duplicates_impl(pages_json, keep_strategy)
        }
        "notion_simplify_pages" => {
            let pages_json = arguments
                .get("pages_json")
                .and_then(|v| v.as_str())
                .ok_or("Missing pages_json argument")?;
            pages::simplify_pages_impl(pages_json)
        }
        "notion_suggest_cleanup" => {
            let pages_json = arguments
                .get("pages_json")
                .and_then(|v| v.as_str())
                .ok_or("Missing pages_json argument")?;

            // Analyze pages for cleanup suggestions
            suggest_cleanup(pages_json)
        }
        _ => Err(format!("Unknown tool: {}", name)),
    }
}

/// Analyze pages and suggest cleanup actions
fn suggest_cleanup(pages_json: &str) -> Result<String, String> {
    // First, find duplicates
    let dup_result = duplicates::find_duplicates_impl(pages_json, "oldest")?;
    let dup_data: duplicates::DuplicateResult =
        serde_json::from_str(&dup_result).map_err(|e| e.to_string())?;

    // Parse pages to find issues
    let pages: Vec<duplicates::PageForDuplicates> =
        serde_json::from_str(pages_json).map_err(|e| format!("JSON parse error: {}", e))?;

    // Find pages with empty titles
    let empty_titles: Vec<&str> = pages
        .iter()
        .filter(|p| p.title.trim().is_empty())
        .map(|p| p.id.as_str())
        .collect();

    // Build suggestions
    let mut suggestions: Vec<String> = Vec::new();

    if !dup_data.pages_to_archive.is_empty() {
        suggestions.push(format!(
            "Archive {} duplicate pages: {:?}",
            dup_data.pages_to_archive.len(),
            dup_data.pages_to_archive
        ));
    }

    if !empty_titles.is_empty() {
        suggestions.push(format!(
            "Review {} pages with empty titles: {:?}",
            empty_titles.len(),
            empty_titles
        ));
    }

    if suggestions.is_empty() {
        suggestions.push("No cleanup actions needed. Database looks clean!".to_string());
    }

    let result = serde_json::json!({
        "total_pages": pages.len(),
        "duplicate_count": dup_data.pages_to_archive.len(),
        "empty_title_count": empty_titles.len(),
        "suggestions": suggestions
    });

    serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
}
