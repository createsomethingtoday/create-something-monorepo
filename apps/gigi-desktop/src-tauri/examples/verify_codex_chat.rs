//! Real bundled Codex acceptance. Supply a new, disposable profile path; retain it for UI review.
use gigi_desktop_lib::{chat, domain};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant};

const POLL_LIMIT: Duration = Duration::from_secs(90);
const TASK_INITIAL: &str = "Confirm synthetic Friday load-in";
const TASK_APPROVED: &str = "Confirm synthetic Saturday load-in";
const TASK_REJECTED: &str = "Cancel synthetic Saturday load-in";

fn call(resources: &Path, profile: &Path, operation: &str, input: Value) -> Result<Value, String> {
    chat::dispatch(resources, profile, operation, input)
}

fn domain_call(profile: &Path, operation: &str, input: Value) -> Result<Value, String> {
    domain::dispatch(profile, operation, input)
}

fn wait_for(
    resources: &Path,
    profile: &Path,
    workspace_id: &Value,
    session_id: &Value,
    want_approval: bool,
) -> Result<Value, String> {
    let deadline = Instant::now() + POLL_LIMIT;
    loop {
        let read = call(
            resources,
            profile,
            "agent.chat.poll",
            json!({"workspaceId":workspace_id,"sessionId":session_id}),
        )?;
        let state = read["state"].as_str().unwrap_or("invalid");
        let approvals = read["approvals"]
            .as_array()
            .ok_or("Chat poll returned no approval list")?;
        if want_approval && !approvals.is_empty() {
            return Ok(read);
        }
        if !want_approval && state == "idle" && approvals.is_empty() {
            return Ok(read);
        }
        if matches!(state, "failed" | "interrupted" | "invalid") {
            return Err(format!(
                "Chat turn ended in {state}; inspect the retained synthetic profile"
            ));
        }
        if state == "idle" && want_approval {
            return Err("Chat finished the proposed write without surfacing approval".into());
        }
        if Instant::now() >= deadline {
            return Err("Chat did not reach the expected state within 90 seconds".into());
        }
        thread::sleep(Duration::from_millis(700));
    }
}

fn approval_id(read: &Value, task_id: &Value, new_title: &str) -> Result<String, String> {
    let approvals = read["approvals"].as_array().ok_or("No approvals array")?;
    if approvals.len() != 1 {
        return Err("Expected one scoped approval".into());
    }
    let approval = &approvals[0];
    let detail = approval["detail"]
        .as_str()
        .ok_or("Approval detail absent")?;
    let arguments: Value =
        serde_json::from_str(detail).map_err(|_| "Approval detail is not JSON")?;
    if arguments["entity"] != "tasks"
        || arguments["id"] != *task_id
        || arguments["title"] != new_title
    {
        return Err("Approval did not target the exact synthetic task rename".into());
    }
    approval["id"]
        .as_str()
        .map(str::to_owned)
        .ok_or("Approval ID absent".into())
}

fn read_task(profile: &Path, workspace_id: &Value, task_id: &Value) -> Result<Value, String> {
    domain_call(
        profile,
        "records.get",
        json!({"workspaceId":workspace_id,"entity":"tasks","id":task_id,"detail":"full"}),
    )
}

fn run(resources: &Path, profile: &Path) -> Result<Value, String> {
    let workspace = domain_call(
        profile,
        "workspace.create",
        json!({"name":"Codex native acceptance"}),
    )?;
    let workspace_id = &workspace["id"];
    domain_call(
        profile,
        "records.save",
        json!({"workspaceId":workspace_id,"entity":"profile","title":"Synthetic operator","fields":{"Currency":"USD"}}),
    )?;
    let gig = domain_call(
        profile,
        "records.save",
        json!({"workspaceId":workspace_id,"entity":"gigs","title":"Synthetic Friday jazz set","fields":{"Fee":45000,"Status":"Confirmed"}}),
    )?;
    let contact = domain_call(
        profile,
        "records.save",
        json!({"workspaceId":workspace_id,"entity":"contacts","title":"Synthetic Casey Booker"}),
    )?;
    let task = domain_call(
        profile,
        "records.save",
        json!({"workspaceId":workspace_id,"entity":"tasks","title":TASK_INITIAL,"fields":{"Status":"Open","Priority":"High"}}),
    )?;
    domain_call(
        profile,
        "relations.link",
        json!({"workspaceId":workspace_id,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"contacts","toId":contact["id"],"role":"Booked Through"}),
    )?;
    domain_call(
        profile,
        "relations.link",
        json!({"workspaceId":workspace_id,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"tasks","toId":task["id"],"role":"Tasks"}),
    )?;
    let status = call(resources, profile, "agent.chat.status", json!({}))?;
    if status["available"] != true || status["authenticated"] != true {
        return Err(format!(
            "Installed Codex is unavailable or not signed in: {}",
            status["reason"].as_str().unwrap_or("unknown")
        ));
    }

    let started = call(
        resources,
        profile,
        "agent.chat.start",
        json!({
            "workspaceId":workspace_id,
            "record":{"entity":"gigs","id":gig["id"],"title":gig["title"]},
            "message":format!("Read only: for the selected synthetic Friday jazz set, report its fee as a dollar amount with two decimal places, booking contact name, and linked task title. Use GiGi tools. The gig ID is {}. Do not change any record.",gig["id"].as_str().unwrap_or(""))
        }),
    )?;
    let session_id = &started["sessionId"];
    if session_id.as_str().is_none() {
        return Err("Chat start returned no session ID".into());
    }
    let first = wait_for(resources, profile, workspace_id, session_id, false)?;
    let assistant_text = first["messages"]
        .as_array()
        .ok_or("Chat returned no messages")?
        .iter()
        .filter(|message| message["role"] == "assistant")
        .filter_map(|message| message["text"].as_str())
        .collect::<Vec<_>>()
        .join("\n");
    if !(assistant_text.contains("$450.00")
        && assistant_text.contains("Casey")
        && assistant_text.contains(TASK_INITIAL))
    {
        return Err("Read turn did not report the seeded fee, contact, and linked task".into());
    }

    call(
        resources,
        profile,
        "agent.chat.send",
        json!({"workspaceId":workspace_id,"sessionId":session_id,
        "message":format!("Rename only task ID {} from '{}' to '{}'. Keep all fields and relations. Wait for my approval before making the write.",task["id"],TASK_INITIAL,TASK_APPROVED)}),
    )?;
    let approving = wait_for(resources, profile, workspace_id, session_id, true)?;
    let first_approval = approval_id(&approving, &task["id"], TASK_APPROVED)?;
    if read_task(profile, workspace_id, &task["id"])?["title"] != TASK_INITIAL {
        return Err("Task changed before approval".into());
    }
    call(
        resources,
        profile,
        "agent.chat.approve",
        json!({"workspaceId":workspace_id,"sessionId":session_id,"approvalId":first_approval,"decision":"approve"}),
    )?;
    wait_for(resources, profile, workspace_id, session_id, false)?;
    let approved = read_task(profile, workspace_id, &task["id"])?;
    if approved["title"] != TASK_APPROVED
        || approved["fields"]["Status"] != "Open"
        || approved["fields"]["Priority"] != "High"
    {
        return Err("Approved rename lost the task title or retained fields".into());
    }

    call(
        resources,
        profile,
        "agent.chat.send",
        json!({"workspaceId":workspace_id,"sessionId":session_id,
        "message":format!("Propose renaming only task ID {} from '{}' to '{}'. Wait for approval; I will reject this proposal.",task["id"],TASK_APPROVED,TASK_REJECTED)}),
    )?;
    let rejecting = wait_for(resources, profile, workspace_id, session_id, true)?;
    let second_approval = approval_id(&rejecting, &task["id"], TASK_REJECTED)?;
    call(
        resources,
        profile,
        "agent.chat.approve",
        json!({"workspaceId":workspace_id,"sessionId":session_id,"approvalId":second_approval,"decision":"reject"}),
    )?;
    wait_for(resources, profile, workspace_id, session_id, false)?;
    let rejected = read_task(profile, workspace_id, &task["id"])?;
    if rejected["title"] != TASK_APPROVED {
        return Err("Rejected rename changed the task".into());
    }

    let gig_readback = domain_call(
        profile,
        "records.get",
        json!({"workspaceId":workspace_id,"entity":"gigs","id":gig["id"],"detail":"full"}),
    )?;
    if gig_readback["fields"]["Fee"] != 45000
        || !gig_readback["relations"]
            .to_string()
            .contains("Synthetic Casey Booker")
        || !gig_readback["relations"]
            .to_string()
            .contains(TASK_APPROVED)
    {
        return Err("Gig fee or linked contact/task did not survive the chat writes".into());
    }

    chat::cancel_all();
    let output = std::process::Command::new(std::env::current_exe().map_err(|e| e.to_string())?)
        .arg("--resume")
        .arg(resources)
        .arg(profile)
        .arg(workspace_id.as_str().ok_or("Workspace id invalid")?)
        .arg(session_id.as_str().ok_or("Session id invalid")?)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!(
            "Fresh-process resume failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let resumed: Value = serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    if resumed["messages"]
        .as_array()
        .is_none_or(|messages| messages.len() < 3)
    {
        return Err("Chat did not resume the retained conversation after companion restart".into());
    }
    Ok(json!({
        "passed":true,"profile":profile,"workspaceId":workspace_id,"sessionId":session_id,
        "gigId":gig["id"],"contactId":contact["id"],"taskId":task["id"],
        "checks":["installed ChatGPT authentication","read selected gig fee/contact/task","approval before exact task rename","retained fields and relations","rejected rename unchanged","conversation retained after companion restart"],
        "turns":3,"readAnswer":assistant_text,"resumedMessages":resumed["messages"].as_array().map_or(0,Vec::len)
    }))
}

fn main() -> Result<(), String> {
    let mut args = std::env::args_os().skip(1);
    let first = args.next().ok_or("Pass resources directory or --resume")?;
    if first == "--resume" {
        let resources = PathBuf::from(args.next().ok_or("Resume resources missing")?);
        let profile = PathBuf::from(args.next().ok_or("Resume profile missing")?);
        let workspace = args
            .next()
            .ok_or("Resume workspace missing")?
            .into_string()
            .map_err(|_| "Workspace invalid")?;
        let session = args
            .next()
            .ok_or("Resume session missing")?
            .into_string()
            .map_err(|_| "Session invalid")?;
        if args.next().is_some()
            || !resources.is_absolute()
            || !profile.is_absolute()
            || !profile.is_dir()
        {
            return Err("Invalid resume invocation".into());
        }
        let result = call(
            &resources,
            &profile,
            "agent.chat.read",
            json!({"workspaceId":workspace,"sessionId":session}),
        );
        chat::cancel_all();
        println!("{}", result?);
        return Ok(());
    }
    let resources = PathBuf::from(first)
        .canonicalize()
        .map_err(|e| format!("Resources directory unavailable: {e}"))?;
    let profile = PathBuf::from(
        args.next()
            .ok_or("Pass a new absolute acceptance profile path")?,
    );
    if args.next().is_some() || !profile.is_absolute() || profile.exists() {
        return Err("Profile path must be a new absolute path and must not already exist".into());
    }
    for relative in ["gigi-codex", "gigi-mcp", "agent/gigi/skills/gigi/SKILL.md"] {
        if !resources.join(relative).is_file() {
            return Err(format!("Missing bundled resource: {relative}"));
        }
    }
    fs::create_dir(&profile).map_err(|e| format!("Could not create acceptance profile: {e}"))?;
    let result = run(&resources, &profile);
    chat::cancel_all();
    match result {
        Ok(receipt) => {
            let path = profile.join("codex-chat-acceptance.json");
            fs::write(
                &path,
                serde_json::to_vec_pretty(&receipt).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            println!("{}", receipt);
            Ok(())
        }
        Err(error) => Err(format!(
            "{error}. Synthetic profile retained at {} for inspection",
            profile.display()
        )),
    }
}
