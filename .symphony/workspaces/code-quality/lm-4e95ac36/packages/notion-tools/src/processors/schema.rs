//! Schema formatting for Notion databases

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Notion property types we care about
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum PropertyValue {
    #[serde(rename = "title")]
    Title { id: String },
    #[serde(rename = "rich_text")]
    RichText { id: String },
    #[serde(rename = "number")]
    Number { id: String },
    #[serde(rename = "select")]
    Select { id: String, select: SelectConfig },
    #[serde(rename = "multi_select")]
    MultiSelect { id: String, multi_select: SelectConfig },
    #[serde(rename = "status")]
    Status { id: String, status: StatusConfig },
    #[serde(rename = "date")]
    Date { id: String },
    #[serde(rename = "checkbox")]
    Checkbox { id: String },
    #[serde(rename = "url")]
    Url { id: String },
    #[serde(rename = "email")]
    Email { id: String },
    #[serde(rename = "phone_number")]
    PhoneNumber { id: String },
    #[serde(rename = "formula")]
    Formula { id: String },
    #[serde(rename = "relation")]
    Relation { id: String },
    #[serde(rename = "rollup")]
    Rollup { id: String },
    #[serde(rename = "people")]
    People { id: String },
    #[serde(rename = "files")]
    Files { id: String },
    #[serde(rename = "created_time")]
    CreatedTime { id: String },
    #[serde(rename = "created_by")]
    CreatedBy { id: String },
    #[serde(rename = "last_edited_time")]
    LastEditedTime { id: String },
    #[serde(rename = "last_edited_by")]
    LastEditedBy { id: String },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
pub struct SelectConfig {
    pub options: Vec<SelectOption>,
}

#[derive(Debug, Deserialize)]
pub struct StatusConfig {
    pub options: Vec<SelectOption>,
    #[serde(default)]
    pub groups: Vec<StatusGroup>,
}

#[derive(Debug, Deserialize)]
pub struct SelectOption {
    pub name: String,
    #[serde(default)]
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct StatusGroup {
    pub name: String,
    #[serde(default)]
    pub option_ids: Vec<String>,
}

/// Output format for schema
#[derive(Debug, Serialize, Deserialize)]
pub struct FormattedSchema {
    pub properties: Vec<FormattedProperty>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FormattedProperty {
    pub name: String,
    #[serde(rename = "type")]
    pub prop_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
}

/// Format database properties into a structured schema.
///
/// Input: JSON object of Notion database properties
/// Output: JSON array of formatted properties with options extracted
pub fn format_schema_impl(properties_json: &str) -> Result<String, String> {
    let properties: HashMap<String, PropertyValue> =
        serde_json::from_str(properties_json).map_err(|e| format!("JSON parse error: {}", e))?;

    let mut formatted: Vec<FormattedProperty> = properties
        .into_iter()
        .map(|(name, prop)| {
            let (prop_type, options) = match prop {
                PropertyValue::Title { .. } => ("title".to_string(), None),
                PropertyValue::RichText { .. } => ("rich_text".to_string(), None),
                PropertyValue::Number { .. } => ("number".to_string(), None),
                PropertyValue::Select { select, .. } => {
                    let opts: Vec<String> = select.options.into_iter().map(|o| o.name).collect();
                    ("select".to_string(), Some(opts))
                }
                PropertyValue::MultiSelect { multi_select, .. } => {
                    let opts: Vec<String> =
                        multi_select.options.into_iter().map(|o| o.name).collect();
                    ("multi_select".to_string(), Some(opts))
                }
                PropertyValue::Status { status, .. } => {
                    let opts: Vec<String> = status.options.into_iter().map(|o| o.name).collect();
                    ("status".to_string(), Some(opts))
                }
                PropertyValue::Date { .. } => ("date".to_string(), None),
                PropertyValue::Checkbox { .. } => ("checkbox".to_string(), None),
                PropertyValue::Url { .. } => ("url".to_string(), None),
                PropertyValue::Email { .. } => ("email".to_string(), None),
                PropertyValue::PhoneNumber { .. } => ("phone_number".to_string(), None),
                PropertyValue::Formula { .. } => ("formula".to_string(), None),
                PropertyValue::Relation { .. } => ("relation".to_string(), None),
                PropertyValue::Rollup { .. } => ("rollup".to_string(), None),
                PropertyValue::People { .. } => ("people".to_string(), None),
                PropertyValue::Files { .. } => ("files".to_string(), None),
                PropertyValue::CreatedTime { .. } => ("created_time".to_string(), None),
                PropertyValue::CreatedBy { .. } => ("created_by".to_string(), None),
                PropertyValue::LastEditedTime { .. } => ("last_edited_time".to_string(), None),
                PropertyValue::LastEditedBy { .. } => ("last_edited_by".to_string(), None),
                PropertyValue::Unknown => ("unknown".to_string(), None),
            };

            FormattedProperty {
                name,
                prop_type,
                options,
            }
        })
        .collect();

    // Sort by name for consistent output
    formatted.sort_by(|a, b| a.name.cmp(&b.name));

    serde_json::to_string(&FormattedSchema {
        properties: formatted,
    })
    .map_err(|e| format!("JSON serialize error: {}", e))
}

/// Format schema as human-readable string for LLM context
pub fn format_schema_as_text(properties_json: &str) -> Result<String, String> {
    let properties: HashMap<String, PropertyValue> =
        serde_json::from_str(properties_json).map_err(|e| format!("JSON parse error: {}", e))?;

    let mut lines: Vec<String> = properties
        .into_iter()
        .map(|(name, prop)| {
            let (prop_type, options) = match prop {
                PropertyValue::Select { select, .. } => {
                    let opts: Vec<String> = select.options.into_iter().map(|o| o.name).collect();
                    ("select", Some(opts))
                }
                PropertyValue::MultiSelect { multi_select, .. } => {
                    let opts: Vec<String> =
                        multi_select.options.into_iter().map(|o| o.name).collect();
                    ("multi_select", Some(opts))
                }
                PropertyValue::Status { status, .. } => {
                    let opts: Vec<String> = status.options.into_iter().map(|o| o.name).collect();
                    ("status", Some(opts))
                }
                PropertyValue::Title { .. } => ("title", None),
                PropertyValue::RichText { .. } => ("rich_text", None),
                PropertyValue::Number { .. } => ("number", None),
                PropertyValue::Date { .. } => ("date", None),
                PropertyValue::Checkbox { .. } => ("checkbox", None),
                PropertyValue::Url { .. } => ("url", None),
                PropertyValue::Email { .. } => ("email", None),
                PropertyValue::PhoneNumber { .. } => ("phone_number", None),
                PropertyValue::Formula { .. } => ("formula", None),
                PropertyValue::Relation { .. } => ("relation", None),
                PropertyValue::Rollup { .. } => ("rollup", None),
                PropertyValue::People { .. } => ("people", None),
                PropertyValue::Files { .. } => ("files", None),
                PropertyValue::CreatedTime { .. } => ("created_time", None),
                PropertyValue::CreatedBy { .. } => ("created_by", None),
                PropertyValue::LastEditedTime { .. } => ("last_edited_time", None),
                PropertyValue::LastEditedBy { .. } => ("last_edited_by", None),
                PropertyValue::Unknown => ("unknown", None),
            };

            match options {
                Some(opts) => format!("  - {} ({}) [options: {}]", name, prop_type, opts.join(", ")),
                None => format!("  - {} ({})", name, prop_type),
            }
        })
        .collect();

    lines.sort();
    Ok(lines.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_schema_with_select() {
        let input = r#"{
            "Status": {
                "id": "abc",
                "type": "status",
                "status": {
                    "options": [
                        {"name": "Not started", "color": "default"},
                        {"name": "In progress", "color": "blue"},
                        {"name": "Done", "color": "green"}
                    ],
                    "groups": []
                }
            },
            "Title": {
                "id": "title",
                "type": "title"
            }
        }"#;

        let result = format_schema_impl(input).unwrap();
        let parsed: FormattedSchema = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.properties.len(), 2);

        let status = parsed.properties.iter().find(|p| p.name == "Status").unwrap();
        assert_eq!(status.prop_type, "status");
        assert!(status.options.is_some());
        let opts = status.options.as_ref().unwrap();
        assert!(opts.contains(&"Done".to_string()));
    }
}
