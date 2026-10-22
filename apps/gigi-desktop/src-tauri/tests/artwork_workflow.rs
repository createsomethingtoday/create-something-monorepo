use gigi_desktop_lib::{artwork, domain};
use serde_json::json;
use std::fs;

#[test]
fn imported_artwork_is_atomic_workspace_owned_and_restored_with_database() {
    let root = std::env::temp_dir().join(format!("gigi-artwork-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    let root = fs::canonicalize(root).unwrap();
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic artwork"}),
    )
    .unwrap()["id"]
        .clone();
    let gig = domain::dispatch(&root, "records.save", json!({"workspaceId":w,"entity":"gigs","title":"Synthetic event","fields":{"Date":"2026-10-24"}})).unwrap();
    let old_backup = domain::dispatch(&root, "backup.create", json!({"workspaceId":w})).unwrap();
    let request = uuid::Uuid::new_v4().to_string();
    let prepared = artwork::dispatch(
        &root,
        "media.importPrepare",
        json!({"workspaceId":w,"requestId":request,"format":"png"}),
    )
    .unwrap();
    let image = image::DynamicImage::new_rgb8(20, 30);
    image.save(prepared["path"].as_str().unwrap()).unwrap();
    let bytes = fs::read(prepared["path"].as_str().unwrap()).unwrap();
    use sha2::{Digest, Sha256};
    let digest = format!("{:x}", Sha256::digest(&bytes));
    let input = json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"slotRequestId":request,"expectedSha256":digest,"entity":"gigs","id":gig["id"],"expectedRevision":0,"alt":"Blue and green abstract artwork","provenance":{"origin":"generated","purpose":"illustration","rights":"unknown","generator":"codex-native"}});
    let receipt = artwork::dispatch(&root, "media.import", input.clone()).unwrap();
    assert_eq!(receipt["uploaded"], false);
    assert_eq!(
        artwork::dispatch(&root, "media.import", input).unwrap(),
        receipt
    );
    let asset = receipt["cover"]["assetId"].clone();
    let draft=gigi_desktop_lib::social::dispatch(&root,&root,"social.save",json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"title":"Local artwork idea","imageAssetId":asset,"imageAlt":"Abstract artwork"})).unwrap();
    assert_eq!(draft["body"]["imageAssetId"], asset);
    assert_eq!(draft["imageSnapshot"]["sha256"], digest);
    assert_eq!(draft["imageSnapshot"]["provenance"]["origin"], "generated");
    let mut edit = draft["body"].clone();
    edit["workspaceId"] = w.clone();
    edit["requestId"] = json!(uuid::Uuid::new_v4().to_string());
    edit["id"] = draft["id"].clone();
    edit["expectedRevision"] = draft["revision"].clone();
    edit["caption"] = json!("Updated local caption");
    let edited =
        gigi_desktop_lib::social_mcp::dispatch(&root, &root, "gigi_instagram_draft_update", edit)
            .unwrap();
    assert_eq!(edited["body"]["caption"], "Updated local caption");
    assert_eq!(edited["imageSnapshot"]["sha256"], digest);
    assert!(gigi_desktop_lib::social::dispatch(
        &root,
        &root,
        "social.publish",
        json!({"workspaceId":w,"id":draft["id"],"expectedRevision":2,"confirmed":true})
    )
    .unwrap_err()
    .contains("local"));
    assert!(artwork::dispatch(
        &root,
        "media.get",
        json!({"workspaceId":"foreign","assetId":asset})
    )
    .is_err());
    let backup = domain::dispatch(&root, "backup.create", json!({"workspaceId":w})).unwrap();
    artwork::dispatch(&root,"media.attach",json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"entity":"gigs","id":gig["id"],"assetId":null,"expectedRevision":1})).unwrap();
    domain::dispatch(
        &root,
        "backup.restore",
        json!({"backupId":backup["backupId"]}),
    )
    .unwrap();
    let restored = domain::dispatch(
        &root,
        "records.get",
        json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"detail":"full"}),
    )
    .unwrap();
    assert_eq!(restored["cover"]["sha256"], digest);
    assert_eq!(
        artwork::bytes(&root, w.as_str().unwrap(), asset.as_str().unwrap(), false)
            .unwrap()
            .0,
        bytes
    );
    domain::dispatch(
        &root,
        "backup.restore",
        json!({"backupId":old_backup["backupId"]}),
    )
    .unwrap();
    let restored = domain::dispatch(
        &root,
        "records.get",
        json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"detail":"full"}),
    )
    .unwrap();
    assert!(restored["cover"].is_null());
    fs::remove_dir_all(root).unwrap();
}
