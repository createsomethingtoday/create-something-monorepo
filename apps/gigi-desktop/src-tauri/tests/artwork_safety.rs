use gigi_desktop_lib::{artwork, domain};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf};
fn setup() -> (PathBuf, Value, Value) {
    let root = std::env::temp_dir().join(format!("gigi-image-safety-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    let root = fs::canonicalize(root).unwrap();
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic safety"}),
    )
    .unwrap()["id"]
        .clone();
    let gig = domain::dispatch(
        &root,
        "records.save",
        json!({"workspaceId":w,"entity":"gigs","title":"Synthetic"}),
    )
    .unwrap();
    (root, w, gig)
}
fn input(w: &Value, gig: &Value) -> Value {
    json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"mode":"picker","entity":"gigs","id":gig["id"],"expectedRevision":0,"alt":"Synthetic test image","provenance":{"origin":"supplied","purpose":"artwork","rights":"unknown"}})
}
#[test]
fn dangerous_inputs_fail_without_assets_or_second_picker() {
    let (root, w, gig) = setup();
    let path = root.join("safe.png");
    image::DynamicImage::new_rgb8(2, 3).save(&path).unwrap();
    for extra in [
        json!({"path":"/private/image.png"}),
        json!({"url":"https://example.test/image.png"}),
        json!({"bytes":"AAAA"}),
    ] {
        let mut request = input(&w, &gig);
        request
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        assert!(artwork::import_with_picker(&root, request, || panic!(
            "unsafe arguments must not open picker"
        ))
        .is_err());
    }
    let linked = root.join("linked.png");
    std::os::unix::fs::symlink(&path, &linked).unwrap();
    let request = input(&w, &gig);
    assert!(artwork::import_with_picker(&root, request.clone(), || Some(linked)).is_err());
    assert!(artwork::import_with_picker(&root, request, || panic!(
        "an uncertain import must not reopen the picker"
    ))
    .is_err());
    let bad = root.join("bad.jpg");
    fs::write(&bad, b"not an image").unwrap();
    assert!(artwork::import_with_picker(&root, input(&w, &gig), || Some(bad)).is_err());
    let huge = root.join("huge.png");
    image::DynamicImage::new_rgb8(8193, 1).save(&huge).unwrap();
    assert!(artwork::import_with_picker(&root, input(&w, &gig), || Some(huge)).is_err());
    let large = root.join("large.png");
    fs::File::create(&large)
        .unwrap()
        .set_len(8 * 1024 * 1024 + 1)
        .unwrap();
    assert!(artwork::import_with_picker(&root, input(&w, &gig), || Some(large)).is_err());
    let mut generated = input(&w, &gig);
    generated["provenance"] = json!({"origin":"generated","purpose":"official_flyer","rights":"unknown","generator":"codex-native","sourceUrl":"https://example.test/flyer"});
    assert!(artwork::import_with_picker(&root, generated, || panic!()).is_err());
    let mut stale = input(&w, &gig);
    stale["expectedRevision"] = json!(9);
    assert!(artwork::import_with_picker(&root, stale, || Some(path)).is_err());
    assert_eq!(
        artwork::dispatch(&root, "media.list", json!({"workspaceId":w})).unwrap()["count"],
        0
    );
    fs::remove_dir_all(root).unwrap();
}
#[test]
fn slot_hash_scope_and_expiry_are_enforced() {
    let (root, w, gig) = setup();
    let slot = uuid::Uuid::new_v4().to_string();
    let prepared = artwork::dispatch(
        &root,
        "media.importPrepare",
        json!({"workspaceId":w,"requestId":slot,"format":"png"}),
    )
    .unwrap();
    let path = prepared["path"].as_str().unwrap();
    image::DynamicImage::new_rgb8(2, 2).save(path).unwrap();
    let mut request = input(&w, &gig);
    request.as_object_mut().unwrap().remove("mode");
    request["slotRequestId"] = json!(slot);
    request["expectedSha256"] = json!("0".repeat(64));
    assert!(artwork::dispatch(&root, "media.import", request.clone())
        .unwrap_err()
        .contains("SHA-256"));
    request["expectedSha256"] = json!(format!("{:x}", Sha256::digest(fs::read(path).unwrap())));
    let mut wrong = request.clone();
    wrong["workspaceId"] = json!(uuid::Uuid::new_v4().to_string());
    assert!(artwork::dispatch(&root, "media.import", wrong).is_err());
    let db = rusqlite::Connection::open(root.join("gigi.sqlite")).unwrap();
    db.execute("UPDATE image_import_slots SET expires_at=1", [])
        .unwrap();
    assert!(artwork::dispatch(&root, "media.import", request)
        .unwrap_err()
        .contains("expired"));
    artwork::dispatch(
        &root,
        "media.importPrepare",
        json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"format":"png"}),
    )
    .unwrap();
    assert!(!std::path::Path::new(path).exists());
    assert_eq!(
        artwork::dispatch(&root, "media.list", json!({"workspaceId":w})).unwrap()["count"],
        0
    );
    drop(db);
    fs::remove_dir_all(root).unwrap();
}
#[test]
fn true_legacy_backup_restores_and_recreates_only_empty_image_store() {
    let (root, w, gig) = setup();
    let backup = domain::dispatch(&root, "backup.create", json!({"workspaceId":w})).unwrap();
    let file = root
        .join("backups")
        .join(format!("{}.sqlite", backup["backupId"].as_str().unwrap()));
    let db = rusqlite::Connection::open(file).unwrap();
    db.execute_batch("DROP TABLE image_covers;DROP TABLE image_assets;DROP TABLE image_import_slots;DROP TABLE image_import_claims;").unwrap();
    drop(db);
    domain::dispatch(
        &root,
        "backup.restore",
        json!({"backupId":backup["backupId"]}),
    )
    .unwrap();
    let record = domain::dispatch(
        &root,
        "records.get",
        json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"detail":"full"}),
    )
    .unwrap();
    assert_eq!(record["title"], "Synthetic");
    assert!(record["cover"].is_null());
    assert_eq!(record["coverRevision"], 0);
    assert_eq!(
        artwork::dispatch(&root, "media.list", json!({"workspaceId":w})).unwrap()["count"],
        0
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn workspace_quotas_reuse_and_unused_removal_are_atomic() {
    let (root, w, gig) = setup();
    let path = root.join("quota.png");
    image::DynamicImage::new_rgb8(2, 3).save(&path).unwrap();
    let original = fs::read(&path).unwrap();
    let first = artwork::import_with_picker(&root, input(&w, &gig), || Some(path.clone())).unwrap();
    let asset = first["cover"]["assetId"].as_str().unwrap();
    let db = rusqlite::Connection::open(root.join("gigi.sqlite")).unwrap();
    for n in 1..100 {
        db.execute("INSERT INTO image_assets SELECT workspace_id,?1,?2,mime,width,height,original,thumbnail,metadata_json FROM image_assets WHERE id=?3", rusqlite::params![uuid::Uuid::new_v4().to_string(),format!("synthetic-quota-{n}"),asset]).unwrap();
    }
    let mut reuse = input(&w, &gig);
    reuse["expectedRevision"] = json!(1);
    let reused = artwork::import_with_picker(&root, reuse, || Some(path.clone())).unwrap();
    assert_eq!(reused["cover"]["assetId"], asset);
    assert_eq!(
        artwork::dispatch(&root, "media.list", json!({"workspaceId":w})).unwrap()["count"],
        100
    );
    let other = root.join("other.png");
    image::DynamicImage::new_rgb8(3, 4).save(&other).unwrap();
    let mut incoming = input(&w, &gig);
    incoming["expectedRevision"] = json!(2);
    assert!(
        artwork::import_with_picker(&root, incoming, || Some(other.clone()))
            .unwrap_err()
            .contains("storage limit")
    );
    assert_eq!(
        domain::dispatch(
            &root,
            "records.get",
            json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"detail":"full"})
        )
        .unwrap()["coverRevision"],
        2
    );
    db.execute("DELETE FROM image_assets WHERE id<>?1", [asset])
        .unwrap();
    artwork::dispatch(&root,"media.attach",json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"entity":"gigs","id":gig["id"],"assetId":null,"expectedRevision":2})).unwrap();
    // Fill the byte budget synthetically; no large or hostile image is decoded.
    db.execute(
        "UPDATE image_assets SET original=zeroblob(134217728-length(thumbnail)) WHERE id=?1",
        [asset],
    )
    .unwrap();
    let mut incoming = input(&w, &gig);
    incoming["expectedRevision"] = json!(3);
    assert!(
        artwork::import_with_picker(&root, incoming, || Some(other.clone()))
            .unwrap_err()
            .contains("storage limit")
    );
    artwork::dispatch(
        &root,
        "media.removeUnused",
        json!({"workspaceId":w,"assetId":asset}),
    )
    .unwrap();
    let mut incoming = input(&w, &gig);
    incoming["expectedRevision"] = json!(3);
    assert!(artwork::import_with_picker(&root, incoming, || Some(other)).is_ok());
    assert_eq!(fs::read(path).unwrap(), original);
    assert!(artwork::bytes(&root, w.as_str().unwrap(), asset, false).is_err());
    drop(db);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn jpeg_orientation_is_applied_to_preview_and_animated_png_is_rejected() {
    let (root, w, gig) = setup();
    let jpeg = root.join("orientation.jpg");
    let mut bytes = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgb8(20, 10)
        .write_to(&mut bytes, image::ImageFormat::Jpeg)
        .unwrap();
    // JPEG APP1: EXIF little-endian Orientation=6 (rotate 90 degrees).
    let exif = [
        b'E', b'x', b'i', b'f', 0, 0, b'I', b'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0,
        0, 6, 0, 0, 0, 0, 0, 0, 0,
    ];
    let mut original = bytes.into_inner();
    let mut segment = vec![0xff, 0xe1, 0, 34];
    segment.extend_from_slice(&exif);
    original.splice(2..2, segment);
    fs::write(&jpeg, &original).unwrap();
    let saved = artwork::import_with_picker(&root, input(&w, &gig), || Some(jpeg)).unwrap();
    assert_eq!(saved["cover"]["width"], 10);
    assert_eq!(saved["cover"]["height"], 20);
    let id = saved["cover"]["assetId"].as_str().unwrap();
    assert_eq!(
        artwork::bytes(&root, w.as_str().unwrap(), id, false)
            .unwrap()
            .0,
        original
    );
    let thumb = artwork::bytes(&root, w.as_str().unwrap(), id, true)
        .unwrap()
        .0;
    let decoded = image::load_from_memory(&thumb).unwrap();
    assert_eq!((decoded.width(), decoded.height()), (10, 20));
    let png = root.join("animated.png");
    image::DynamicImage::new_rgb8(2, 3).save(&png).unwrap();
    let mut animated = fs::read(&png).unwrap();
    // acTL chunk declares one animation frame, before IDAT. Static input only.
    animated.splice(
        33..33,
        [
            0, 0, 0, 8, b'a', b'c', b'T', b'L', 0, 0, 0, 1, 0, 0, 0, 0, 0xb4, 0x2d, 0xe9, 0xa0,
        ],
    );
    fs::write(&png, animated).unwrap();
    let mut request = input(&w, &gig);
    request["expectedRevision"] = json!(1);
    assert!(artwork::import_with_picker(&root, request, || Some(png))
        .unwrap_err()
        .contains("Animated PNG"));
    assert_eq!(
        artwork::dispatch(&root, "media.list", json!({"workspaceId":w})).unwrap()["count"],
        1
    );
    fs::remove_dir_all(root).unwrap();
}
