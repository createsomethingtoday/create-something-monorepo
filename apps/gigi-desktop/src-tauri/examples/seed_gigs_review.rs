//! Disposable native UI acceptance profile. Refuses an existing path.
use gigi_desktop_lib::domain::dispatch;
use serde_json::json;
fn main() {
    let root = std::path::PathBuf::from(
        std::env::args()
            .nth(1)
            .expect("new absolute synthetic profile path"),
    );
    assert!(
        root.is_absolute() && !root.exists(),
        "Refusing an existing or relative profile"
    );
    let wid = dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic Gigs acceptance"}),
    )
    .unwrap()["id"]
        .clone();
    dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"profile","title":"Synthetic owner","fields":{"Currency":"USD"}})).unwrap();
    let today = chrono::Local::now().date_naive();
    for index in 0..57 {
        let date = (today + chrono::Duration::days(index as i64 - 5)).to_string();
        let title = if index == 56 {
            "Synthetic café needle — beyond page one".into()
        } else {
            format!(
                "Synthetic {} {}",
                if index % 2 == 0 { "show" } else { "crew shift" },
                index + 1
            )
        };
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":format!("synthetic-gig-{index:02}"),"title":title,"fields":{"Date":date,"Status":if index%3==0{"Open"}else{"Confirmed"},"Type":if index%2==0{"Live show"}else{"Crew shift"},"Call Time":"18:30","Set Time":"20:00"}})).unwrap();
    }
    for (id, date) in [
        ("synthetic-undated", None),
        ("synthetic-invalid", Some("2026-02-30")),
    ] {
        let fields = date.map(|v| json!({"Date":v})).unwrap_or_else(|| json!({}));
        dispatch(
            &root,
            "records.save",
            json!({"workspaceId":wid,"entity":"gigs","id":id,"title":id,"fields":fields}),
        )
        .unwrap();
    }
    println!(
        "{}",
        json!({"workspaceId":wid,"syntheticGigs":59,"profile":root})
    );
}
