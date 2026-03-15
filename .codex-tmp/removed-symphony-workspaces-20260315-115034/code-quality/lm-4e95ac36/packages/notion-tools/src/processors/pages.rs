//! Page processing and simplification

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Input page from Notion API
#[derive(Debug, Deserialize)]
pub struct NotionPage {
    pub id: String,
    pub created_time: String,
    pub last_edited_time: String,
    #[serde(default)]
    pub url: String,
    pub properties: Value,
}

/// Simplified page output for agent processing
#[derive(Debug, Serialize, Deserialize)]
pub struct SimplifiedPage {
    pub id: String,
    pub title: String,
    pub title_property_name: String,
    pub created_time: String,
    pub last_edited_time: String,
    pub url: String,
}

/// Simplify Notion pages for agent consumption.
///
/// Input: JSON array of Notion page objects
/// Output: JSON array of simplified pages with extracted titles
pub fn simplify_pages_impl(pages_json: &str) -> Result<String, String> {
    let pages: Vec<NotionPage> =
        serde_json::from_str(pages_json).map_err(|e| format!("JSON parse error: {}", e))?;

    let simplified: Vec<SimplifiedPage> = pages
        .into_iter()
        .map(|page| {
            let (title, title_property_name) = extract_title(&page.properties);
            SimplifiedPage {
                id: page.id,
                title,
                title_property_name,
                created_time: page.created_time,
                last_edited_time: page.last_edited_time,
                url: page.url,
            }
        })
        .collect();

    serde_json::to_string(&simplified).map_err(|e| format!("JSON serialize error: {}", e))
}

/// Extract title from page properties.
///
/// Searches for the property with type "title" and extracts the plain text.
fn extract_title(properties: &Value) -> (String, String) {
    if let Value::Object(props) = properties {
        for (name, value) in props {
            if let Value::Object(prop) = value {
                if prop.get("type") == Some(&Value::String("title".to_string())) {
                    if let Some(Value::Array(title_array)) = prop.get("title") {
                        let title: String = title_array
                            .iter()
                            .filter_map(|t| {
                                t.get("plain_text")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string())
                            })
                            .collect::<Vec<_>>()
                            .join("");
                        return (title, name.clone());
                    }
                }
            }
        }
    }
    (String::new(), String::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simplify_pages() {
        let input = r#"[
            {
                "id": "page-1",
                "created_time": "2024-01-01T00:00:00.000Z",
                "last_edited_time": "2024-01-02T00:00:00.000Z",
                "url": "https://notion.so/page-1",
                "properties": {
                    "Name": {
                        "type": "title",
                        "title": [
                            {"plain_text": "My "},
                            {"plain_text": "Task"}
                        ]
                    }
                }
            }
        ]"#;

        let result = simplify_pages_impl(input).unwrap();
        let pages: Vec<SimplifiedPage> = serde_json::from_str(&result).unwrap();

        assert_eq!(pages.len(), 1);
        assert_eq!(pages[0].id, "page-1");
        assert_eq!(pages[0].title, "My Task");
        assert_eq!(pages[0].title_property_name, "Name");
    }

    #[test]
    fn test_extract_title_empty() {
        let props = serde_json::json!({});
        let (title, name) = extract_title(&props);
        assert!(title.is_empty());
        assert!(name.is_empty());
    }
}
