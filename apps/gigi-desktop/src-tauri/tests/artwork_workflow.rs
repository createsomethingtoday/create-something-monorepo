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

#[test]
fn larger_artwork_backup_and_restore_preserve_bytes_without_per_page_stalls() {
    let root = std::env::temp_dir().join(format!("gigi-artwork-backup-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&root).unwrap();
    let root = std::fs::canonicalize(root).unwrap();
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic artwork backup"}),
    )
    .unwrap()["id"]
        .clone();
    let gig = domain::dispatch(
        &root,
        "records.save",
        json!({"workspaceId":w,"entity":"gigs","title":"Synthetic backup target"}),
    )
    .unwrap();
    let mut images = Vec::new();
    for revision in 0..2 {
        let mut image = image::RgbImage::new(2048, 1000);
        let mut state = 123456789_u32 + revision;
        for p in image.pixels_mut() {
            for c in p.0.iter_mut() {
                state ^= state << 13;
                state ^= state >> 17;
                state ^= state << 5;
                *c = state as u8;
            }
        }
        let path = root.join(format!("synthetic-noise-{revision}.png"));
        image.save(&path).unwrap();
        let original = fs::read(&path).unwrap();
        assert!(original.len() > 5_000_000 && original.len() < 8 * 1024 * 1024);
        let saved=gigi_desktop_lib::artwork::import_with_picker(&root,json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"mode":"picker","entity":"gigs","id":gig["id"],"expectedRevision":revision,"alt":"Deterministic synthetic noise for backup testing","provenance":{"origin":"supplied","purpose":"artwork","rights":"unknown"}}),||Some(path)).unwrap();
        images.push((
            saved["cover"]["assetId"].as_str().unwrap().to_string(),
            original,
        ));
    }
    let started = std::time::Instant::now();
    let backup = domain::dispatch(&root, "backup.create", json!({"workspaceId":w})).unwrap();
    gigi_desktop_lib::artwork::dispatch(&root,"media.attach",json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"entity":"gigs","id":gig["id"],"expectedRevision":2,"assetId":null})).unwrap();
    let restored = domain::dispatch(
        &root,
        "backup.restore",
        json!({"backupId":backup["backupId"]}),
    )
    .unwrap();
    assert!(restored["safetyBackupId"].is_string());
    for (id, original) in images {
        assert_eq!(
            gigi_desktop_lib::artwork::bytes(&root, w.as_str().unwrap(), &id, false)
                .unwrap()
                .0,
            original
        );
    }
    let elapsed = started.elapsed();
    eprintln!("Synthetic 12 MiB artwork backup + safety backup + restore: {elapsed:?}");
    assert!(
        elapsed < std::time::Duration::from_secs(30),
        "large artwork recovery must not pause per five SQLite pages: {elapsed:?}"
    );
    let record = domain::dispatch(
        &root,
        "records.get",
        json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"detail":"full"}),
    )
    .unwrap();
    assert_eq!(record["coverRevision"], 2);
    assert!(!record["cover"].is_null());
    fs::remove_dir_all(root).unwrap();
}
