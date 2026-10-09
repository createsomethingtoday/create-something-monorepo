fn main() {
    if std::env::args().nth(1).as_deref() == Some("--draw-build-info") {
        println!("{}", serde_json::json!({
            "schema": "create-something/draw-build-info@1",
            "sourceSha": env!("DRAW_BUILD_SOURCE_SHA"),
            "sourceClean": env!("DRAW_BUILD_SOURCE_CLEAN") == "true",
        }));
        return;
    }
    create_something_draw_native_lib::run()
}
