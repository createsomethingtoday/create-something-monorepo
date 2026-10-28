//! Metadata-only MCP calls. Large image bytes never enter model context.
use serde_json::{json, Value};
use std::path::Path;
const TOOLS:[(&str,&str,bool,&str);6]=[
 ("gigi_media_import_prepare","media.importPrepare",false,"Prepare one exact local JPEG/PNG import slot for fifteen minutes. Copy only the user-authorized image to its returned path. Does not generate an image, attach artwork or upload anything. Reuse requestId for identical preparation."),
 ("gigi_media_import","media.import",false,"Validate and atomically copy one static JPEG/PNG into the private SQLite workspace and attach it to an exact gig, schedule or music entry. Use a prepared slotRequestId and reviewed SHA-256, or mode picker for human native selection. Paths, URLs and binary/base64 arguments are forbidden. Use the latest coverRevision as expectedRevision. Stable requestId recovers exact retries; unknown picker outcomes must not open a new picker automatically. Nothing is uploaded."),
 ("gigi_media_get","media.get",true,"Read one workspace-owned image's immutable digest, dimensions and provenance. Returns metadata only, never image bytes or original filesystem paths."),
 ("gigi_media_list","media.list",true,"List twenty existing local image assets for reuse. Continue only with the returned nextOffset. Returns metadata, never image bytes."),
 ("gigi_media_attach","media.attach",false,"Reuse an existing workspace image as the cover of a gig, schedule or music entry. Supply accessible alt text and the latest coverRevision. assetId null removes the cover. requestId is stable for an identical retry. Does not change the source file, generate artwork, upload or publish."),
 ("gigi_media_operation_status","media.operationStatus",true,"Read an import or attachment completion receipt by original requestId and operation. Unknown is not proof of failure; inspect the target before another mutation. Never replays writes or opens a picker."),
];
pub fn handles(name: &str) -> bool {
    TOOLS.iter().any(|t| t.0 == name)
}
pub fn catalog() -> Vec<Value> {
    TOOLS.iter().map(|(name,op,read,description)|{
 let(required,optional):(&[&str],&[&str])=match *op{
  "media.importPrepare"=>(&["workspaceId","requestId","format"],&[]),
  "media.import"=>(&["workspaceId","requestId","entity","id","expectedRevision","alt","provenance"],&["mode","slotRequestId","expectedSha256"]),
  "media.get"=>(&["workspaceId","assetId"],&[]),"media.list"=>(&["workspaceId"],&["offset"]),
  "media.attach"=>(&["workspaceId","requestId","entity","id","expectedRevision","assetId"],&["alt"]),
  _=>(&["workspaceId","requestId","operation"],&[])};
 let properties:serde_json::Map<String,Value>=required.iter().chain(optional).map(|key|((*key).into(),match *key{
  "entity"=>json!({"type":"string","enum":["gigs","schedule","music"]}),
  "format"=>json!({"type":"string","enum":["png","jpeg"]}),"mode"=>json!({"type":"string","enum":["picker"]}),
  "operation"=>json!({"type":"string","enum":["import","attach"]}),
  "expectedRevision"|"offset"=>json!({"type":"integer","minimum":0,"maximum":100000}),
  "assetId" if *op=="media.attach"=>json!({"type":["string","null"],"format":"uuid"}),
  "provenance"=>json!({"type":"object","additionalProperties":false,"required":["origin","purpose","rights"],"properties":{"origin":{"type":"string","enum":["supplied","generated"]},"purpose":{"type":"string","enum":["artwork","illustration","official_flyer"]},"rights":{"type":"string","enum":["unknown","owned","licensed","permission"]},"sourceUrl":{"type":"string","maxLength":1000},"creator":{"type":"string","maxLength":1000},"generator":{"type":"string","maxLength":1000},"prompt":{"type":"string","maxLength":2000}}}),
  "alt"=>json!({"type":"string","minLength":1,"maxLength":500}),
  "expectedSha256"=>json!({"type":"string","pattern":"^[a-f0-9]{64}$"}),
  _=>json!({"type":"string","format":"uuid"})})).collect();
 json!({"name":name,"description":description,"inputSchema":{"type":"object","additionalProperties":false,"properties":properties,"required":required},"annotations":{"readOnlyHint":read,"destructiveHint":false,"openWorldHint":false}})
 }).collect()
}
pub fn dispatch(root: &Path, name: &str, input: Value) -> Result<Value, String> {
    let op = TOOLS
        .iter()
        .find(|t| t.0 == name)
        .map(|t| t.1)
        .ok_or("Unknown image tool")?;
    crate::artwork::dispatch(root, op, input)
}
