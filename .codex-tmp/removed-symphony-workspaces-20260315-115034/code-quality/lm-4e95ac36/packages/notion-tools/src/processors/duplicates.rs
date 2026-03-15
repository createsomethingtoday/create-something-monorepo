//! Duplicate detection for Notion pages

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use unicode_normalization::UnicodeNormalization;

/// Input page for duplicate detection
#[derive(Debug, Deserialize, Clone)]
pub struct PageForDuplicates {
    pub id: String,
    pub title: String,
    pub created_time: String,
}

/// Result of duplicate detection
#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicateResult {
    pub total_pages: usize,
    pub duplicate_groups: usize,
    pub pages_to_archive: Vec<String>,
    pub summary: String,
}

/// Find duplicate pages by title.
///
/// Input: JSON array of pages with id, title, created_time
/// Output: JSON with pages to archive based on keep_strategy
pub fn find_duplicates_impl(pages_json: &str, keep_strategy: &str) -> Result<String, String> {
    let pages: Vec<PageForDuplicates> =
        serde_json::from_str(pages_json).map_err(|e| format!("JSON parse error: {}", e))?;

    let total_pages = pages.len();

    // Normalize and group by title
    let mut groups: HashMap<String, Vec<PageForDuplicates>> = HashMap::new();

    for page in pages {
        let normalized = normalize_title(&page.title);
        groups.entry(normalized).or_default().push(page);
    }

    // Find groups with duplicates and determine which to archive
    let mut pages_to_archive: Vec<String> = Vec::new();
    let mut duplicate_groups = 0;

    for (_title, mut group) in groups {
        if group.len() > 1 {
            duplicate_groups += 1;

            // Sort by created_time
            group.sort_by(|a, b| a.created_time.cmp(&b.created_time));

            // Keep based on strategy
            let to_archive = match keep_strategy {
                "newest" => {
                    // Keep newest (last), archive rest
                    group.pop(); // Remove the one we keep
                    group
                }
                _ => {
                    // Default: keep oldest (first), archive rest
                    group.remove(0); // Remove the one we keep
                    group
                }
            };

            for page in to_archive {
                pages_to_archive.push(page.id);
            }
        }
    }

    let summary = format!(
        "Scanned {} pages. Found {} duplicate groups. {} pages to archive.",
        total_pages,
        duplicate_groups,
        pages_to_archive.len()
    );

    let result = DuplicateResult {
        total_pages,
        duplicate_groups,
        pages_to_archive,
        summary,
    };

    serde_json::to_string(&result).map_err(|e| format!("JSON serialize error: {}", e))
}

/// Normalize a title for comparison.
///
/// - Lowercase
/// - Trim whitespace
/// - Unicode NFC normalization
/// - Collapse multiple spaces
fn normalize_title(title: &str) -> String {
    let normalized: String = title
        .nfc() // Unicode normalization
        .collect::<String>()
        .to_lowercase()
        .trim()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    normalized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_duplicates_keep_oldest() {
        let input = r#"[
            {"id": "page-1", "title": "Task A", "created_time": "2024-01-01T00:00:00Z"},
            {"id": "page-2", "title": "Task A", "created_time": "2024-01-02T00:00:00Z"},
            {"id": "page-3", "title": "Task B", "created_time": "2024-01-03T00:00:00Z"}
        ]"#;

        let result = find_duplicates_impl(input, "oldest").unwrap();
        let parsed: DuplicateResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.total_pages, 3);
        assert_eq!(parsed.duplicate_groups, 1);
        assert_eq!(parsed.pages_to_archive.len(), 1);
        assert_eq!(parsed.pages_to_archive[0], "page-2"); // Newer one archived
    }

    #[test]
    fn test_find_duplicates_keep_newest() {
        let input = r#"[
            {"id": "page-1", "title": "Task A", "created_time": "2024-01-01T00:00:00Z"},
            {"id": "page-2", "title": "Task A", "created_time": "2024-01-02T00:00:00Z"}
        ]"#;

        let result = find_duplicates_impl(input, "newest").unwrap();
        let parsed: DuplicateResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.pages_to_archive.len(), 1);
        assert_eq!(parsed.pages_to_archive[0], "page-1"); // Older one archived
    }

    #[test]
    fn test_normalize_title() {
        // Case insensitive
        assert_eq!(normalize_title("Hello World"), normalize_title("hello world"));

        // Whitespace handling
        assert_eq!(
            normalize_title("  Hello   World  "),
            normalize_title("Hello World")
        );

        // Unicode normalization (é composed vs decomposed)
        assert_eq!(normalize_title("café"), normalize_title("café"));
    }

    #[test]
    fn test_no_duplicates() {
        let input = r#"[
            {"id": "page-1", "title": "Task A", "created_time": "2024-01-01T00:00:00Z"},
            {"id": "page-2", "title": "Task B", "created_time": "2024-01-02T00:00:00Z"}
        ]"#;

        let result = find_duplicates_impl(input, "oldest").unwrap();
        let parsed: DuplicateResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.duplicate_groups, 0);
        assert!(parsed.pages_to_archive.is_empty());
    }
}
