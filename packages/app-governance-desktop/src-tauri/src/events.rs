//! Presence event -> native notification filtering.
//!
//! Only high-signal actions produce notifications; everything else
//! (cursor moves, heartbeats, presence joins) is dropped.

use serde_json::Value;

/// Actions that warrant a native notification.
const HIGH_SIGNAL_ACTIONS: [&str; 5] = [
    "flag_misalignment",
    "create_finding",
    "queue_notification",
    "drift_notifications",
    "doc_changed",
];

/// A notification derived from a presence event.
#[derive(Debug, PartialEq, Eq)]
pub struct EventNotification {
    pub title: String,
    pub body: String,
}

/// Parse a raw presence WebSocket text frame and decide whether it should
/// notify. Returns `None` for non-JSON frames, low-signal actions, or
/// frames without a recognizable action.
pub fn notification_for_event(raw: &str) -> Option<EventNotification> {
    let value: Value = serde_json::from_str(raw).ok()?;
    notification_for_value(&value)
}

fn notification_for_value(value: &Value) -> Option<EventNotification> {
    let action = ["action", "type", "event"]
        .iter()
        .find_map(|k| value.get(*k).and_then(Value::as_str))?;

    if !HIGH_SIGNAL_ACTIONS.contains(&action) {
        return None;
    }

    let operator = ["operator", "user", "actor", "name", "from"]
        .iter()
        .find_map(|k| value.get(*k).and_then(Value::as_str))
        .unwrap_or("someone");

    let mut body = format!("{operator} — {action}");
    if let Some(id) = finding_id(value) {
        body.push_str(&format!(" (finding #{id})"));
    }

    Some(EventNotification {
        title: "App Governance".to_string(),
        body,
    })
}

/// Best-effort extraction of a finding id from common payload shapes.
fn finding_id(value: &Value) -> Option<String> {
    let direct = ["finding_id", "findingId"]
        .iter()
        .find_map(|k| value.get(*k));
    let nested = ["finding", "detail", "data", "payload"]
        .iter()
        .find_map(|k| {
            let inner = value.get(*k)?;
            inner
                .get("finding_id")
                .or_else(|| inner.get("findingId"))
                .or_else(|| inner.get("id"))
        });

    let id = direct.or(nested)?;
    match id {
        Value::Number(n) => Some(n.to_string()),
        Value::String(s) if !s.is_empty() => Some(s.clone()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn high_signal_action_notifies_with_finding_id() {
        let raw = r#"{"action":"flag_misalignment","operator":"pablo","finding_id":12}"#;
        let n = notification_for_event(raw).expect("should notify");
        assert_eq!(n.title, "App Governance");
        assert_eq!(n.body, "pablo — flag_misalignment (finding #12)");
    }

    #[test]
    fn low_signal_action_is_dropped() {
        assert!(notification_for_event(r#"{"action":"cursor_move","operator":"pablo"}"#).is_none());
        assert!(notification_for_event(r#"{"action":"heartbeat"}"#).is_none());
        assert!(notification_for_event(r#"{"action":"presence_join","user":"eric"}"#).is_none());
    }

    #[test]
    fn all_high_signal_actions_notify() {
        for action in super::HIGH_SIGNAL_ACTIONS {
            let raw = format!(r#"{{"action":"{action}","operator":"micah"}}"#);
            let n = notification_for_event(&raw).expect(action);
            assert_eq!(n.body, format!("micah — {action}"));
        }
    }

    #[test]
    fn alternate_field_names_are_recognized() {
        let raw = r#"{"type":"doc_changed","user":"natalia"}"#;
        let n = notification_for_event(raw).expect("should notify");
        assert_eq!(n.body, "natalia — doc_changed");
    }

    #[test]
    fn nested_finding_id_is_extracted() {
        let raw = r#"{"event":"create_finding","actor":"eric","finding":{"id":"F-7"}}"#;
        let n = notification_for_event(raw).expect("should notify");
        assert_eq!(n.body, "eric — create_finding (finding #F-7)");
    }

    #[test]
    fn missing_operator_falls_back() {
        let raw = r#"{"action":"queue_notification"}"#;
        let n = notification_for_event(raw).expect("should notify");
        assert_eq!(n.body, "someone — queue_notification");
    }

    #[test]
    fn garbage_frames_are_dropped() {
        assert!(notification_for_event("not json").is_none());
        assert!(notification_for_event("{}").is_none());
        assert!(notification_for_event(r#"{"action":42}"#).is_none());
        assert!(notification_for_event(r#"[1,2,3]"#).is_none());
    }
}
