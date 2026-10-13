fn main() {
    if std::env::args().nth(1).as_deref() == Some("--draw-build-info") {
        println!("{}", serde_json::json!({
            "schema": "create-something/draw-build-info@1",
            "sourceSha": env!("DRAW_BUILD_SOURCE_SHA"),
            "sourceClean": env!("DRAW_BUILD_SOURCE_CLEAN") == "true",
        }));
        return;
    }
    if std::env::args().nth(1).as_deref() == Some("--draw-transport-check") {
        let result = create_something_draw_native_lib::verify_local_transport();
        let ok = result.is_ok();
        println!("{}", serde_json::json!({
            "schema": "create-something/draw-transport-check@1",
            "ok": result.is_ok(),
            "sourceSha": env!("DRAW_BUILD_SOURCE_SHA"),
            "sourceClean": env!("DRAW_BUILD_SOURCE_CLEAN") == "true",
            "syntheticOnly": true,
            "profileLoaded": false,
            "grantCreated": false,
            "delayedFirstByte": result.is_ok(),
            "fragmentedFrame": result.is_ok(),
            "error": result.err(),
        }));
        if !ok { std::process::exit(1); }
        return;
    }
    create_something_draw_native_lib::run()
}
