use std::path::Path;
use tauri::http::{Request, Response, StatusCode};
pub fn respond(root: Option<&Path>, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let fail = |status| {
        Response::builder()
            .status(status)
            .header("Cache-Control", "no-store")
            .body(Vec::new())
            .unwrap()
    };
    if request.method() != "GET" && request.method() != "HEAD" {
        return fail(StatusCode::METHOD_NOT_ALLOWED);
    }
    let Some(root) = root else {
        return fail(StatusCode::NOT_FOUND);
    };
    let Ok(url) = tauri::Url::parse(&request.uri().to_string()) else {
        return fail(StatusCode::BAD_REQUEST);
    };
    let parts: Vec<_> = url.path().trim_start_matches('/').split('/').collect();
    if parts.len() != 3
        || url.host_str() != Some("localhost")
        || url.query().is_some()
        || url.fragment().is_some()
        || !["thumbnail", "original"].contains(&parts[2])
    {
        return fail(StatusCode::BAD_REQUEST);
    }
    match crate::artwork::bytes(root, parts[0], parts[1], parts[2] == "thumbnail") {
        Ok((bytes, mime)) => Response::builder()
            .status(200)
            .header("Content-Type", mime)
            .header("Content-Length", bytes.len().to_string())
            .header("Cache-Control", "no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(if request.method() == "HEAD" {
                Vec::new()
            } else {
                bytes
            })
            .unwrap(),
        Err(_) => fail(StatusCode::NOT_FOUND),
    }
}
