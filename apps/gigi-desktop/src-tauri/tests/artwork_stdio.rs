//! Real MCP process acceptance with deterministic image bytes. No generation or accounts.
use gigi_desktop_lib::domain;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
};
#[test]
fn image_import_attach_and_local_draft_roundtrip_use_real_stdio() {
    let root = std::env::temp_dir().join(format!("gigi-image-stdio-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    let root = fs::canonicalize(root).unwrap();
    let workspace = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic artwork process"}),
    )
    .unwrap();
    let wid = &workspace["id"];
    let gig=domain::dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Synthetic image target","fields":{"Date":"2026-10-24"}})).unwrap();
    let mut child = Command::new(env!("CARGO_BIN_EXE_gigi-mcp"))
        .env("GIGI_DATA_DIR", &root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    let mut sequence = 0;
    let mut rpc = |method: &str, params: Value| {
        sequence += 1;
        writeln!(
            input,
            "{}",
            json!({"jsonrpc":"2.0","id":sequence,"method":method,"params":params})
        )
        .unwrap();
        input.flush().unwrap();
        let mut line = String::new();
        output.read_line(&mut line).unwrap();
        let value: Value = serde_json::from_str(&line).unwrap();
        assert_eq!(value["id"], sequence);
        value["result"].clone()
    };
    let catalog = rpc("tools/list", json!({}));
    let connected=rpc("tools/call",json!({"name":"gigi_connection_check","arguments":{"workspaceId":wid}}))["structuredContent"].clone();
    assert_eq!(connected["workspace"]["id"],*wid);
    assert_eq!(connected["serverInfo"]["version"],env!("CARGO_PKG_VERSION"));
    assert_eq!(connected["scope"],"this_mcp_connection");
    assert_eq!(connected["mediaTools"].as_array().unwrap().len(),6);
    let agenda=rpc("tools/call",json!({"name":"gigi_agenda_list","arguments":{"workspaceId":wid,"today":"2026-10-22","timeZone":"UTC","recordKind":"unclassified","limit":1}}))["structuredContent"].clone();
    assert_eq!(agenda["items"][0]["id"],gig["id"]);
    for name in [
        "gigi_media_import_prepare",
        "gigi_media_import",
        "gigi_media_get",
        "gigi_media_attach",
        "gigi_media_operation_status",
    ] {
        assert!(catalog["tools"]
            .as_array()
            .unwrap()
            .iter()
            .any(|t| t["name"] == name));
    }
    let slot = uuid::Uuid::new_v4().to_string();
    let prepared = rpc(
        "tools/call",
        json!({"name":"gigi_media_import_prepare","arguments":{"workspaceId":wid,"requestId":slot,"format":"png"}}),
    );
    assert_eq!(prepared["isError"], false);
    let path = prepared["structuredContent"]["path"].as_str().unwrap();
    image::DynamicImage::new_rgb8(24, 32).save(path).unwrap();
    let digest = format!("{:x}", Sha256::digest(fs::read(path).unwrap()));
    let request = uuid::Uuid::new_v4().to_string();
    let arguments = json!({"workspaceId":wid,"requestId":request,"slotRequestId":slot,"expectedSha256":digest,"entity":"gigs","id":gig["id"],"expectedRevision":0,"alt":"Synthetic abstract image","provenance":{"origin":"generated","purpose":"illustration","rights":"unknown","generator":"mock-native-generation"}});
    let imported = rpc(
        "tools/call",
        json!({"name":"gigi_media_import","arguments":arguments}),
    );
    assert_eq!(imported["isError"], false);
    let cover = &imported["structuredContent"]["cover"];
    let receipt = rpc(
        "tools/call",
        json!({"name":"gigi_media_operation_status","arguments":{"workspaceId":wid,"requestId":request,"operation":"import"}}),
    );
    assert_eq!(receipt["structuredContent"]["state"], "completed");
    let read = rpc(
        "tools/call",
        json!({"name":"gigi_records_get","arguments":{"workspaceId":wid,"entity":"gigs","id":gig["id"],"detail":"full"}}),
    );
    assert_eq!(read["structuredContent"]["cover"]["sha256"], digest);
    assert_eq!(
        read["structuredContent"]["cover"]["assetId"],
        cover["assetId"]
    );
    let rejected = rpc(
        "tools/call",
        json!({"name":"gigi_media_import","arguments":{"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"path":"/private"}}),
    );
    assert_eq!(rejected["isError"], true);
    let created = rpc(
        "tools/call",
        json!({"name":"gigi_instagram_draft_create","arguments":{"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"title":"Synthetic draft","caption":"Local only","imageAssetId":cover["assetId"],"imageAlt":"Synthetic abstract image"}}),
    );
    assert_eq!(created["isError"], false);
    let draft = &created["structuredContent"];
    assert_eq!(draft["mediaState"], "local_preview_only");
    assert_eq!(draft["imageSnapshot"]["sha256"], digest);
    let mut editable = draft["body"].clone();
    editable["workspaceId"] = wid.clone();
    editable["requestId"] = json!(uuid::Uuid::new_v4().to_string());
    editable["id"] = draft["id"].clone();
    editable["expectedRevision"] = draft["revision"].clone();
    editable["caption"] = json!("New local caption");
    let updated = rpc(
        "tools/call",
        json!({"name":"gigi_instagram_draft_update","arguments":editable}),
    );
    assert_eq!(updated["isError"], false);
    assert_eq!(
        updated["structuredContent"]["imageSnapshot"],
        draft["imageSnapshot"]
    );
    assert!(gigi_desktop_lib::artwork::dispatch(
        &root,
        "media.removeUnused",
        json!({"workspaceId":wid,"assetId":cover["assetId"]})
    )
    .is_err());
    drop(input);
    assert!(child.wait().unwrap().success());
    fs::remove_dir_all(root).unwrap();
}
