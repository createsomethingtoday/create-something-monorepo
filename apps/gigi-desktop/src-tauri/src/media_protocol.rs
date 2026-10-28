//! Indexed local media only. Every range read revalidates workspace ownership and file identity.
use std::{path::Path,io::{Read,Seek,SeekFrom},fs::File};
use tauri::http::{Request,Response,StatusCode};
fn failure(status:StatusCode)->Response<Vec<u8>>{Response::builder().status(status).header("Cache-Control","no-store").body(Vec::new()).unwrap()}
fn bounds(range:Option<&str>,size:u64)->Option<(u64,u64)>{
 if size==0{return None;}
 let (start,end)=if let Some(raw)=range {
  let raw=raw.strip_prefix("bytes=")?;if raw.contains(','){return None;}
  let (a,b)=raw.split_once('-')?;
  if a.is_empty(){let suffix=b.parse::<u64>().ok()?;if suffix==0{return None;}(size.saturating_sub(suffix),size-1)}
  else{(a.parse::<u64>().ok()?,if b.is_empty(){size-1}else{b.parse::<u64>().ok()?})}
 }else{(0,size-1)};
 if start>=size||end<start{return None;}Some((start,end.min(size-1).min(start.saturating_add(8*1024*1024-1))))
}
pub fn respond(root:Option<&Path>,request:Request<Vec<u8>>)->Response<Vec<u8>>{
 if request.method()!="GET"&&request.method()!="HEAD"{return failure(StatusCode::METHOD_NOT_ALLOWED);}
 let Some(root)=root else{return failure(StatusCode::NOT_FOUND)};
 let Ok(url)=tauri::Url::parse(&request.uri().to_string())else{return failure(StatusCode::BAD_REQUEST)};
 let parts:Vec<_>=url.path().trim_start_matches('/').split('/').collect();
 if parts.len()!=2||url.query().is_some()||url.fragment().is_some(){return failure(StatusCode::BAD_REQUEST);}
 // GiGi workspace and item IDs are UUIDs. Reject encoded separators and arbitrary paths.
 if parts.iter().any(|id|uuid::Uuid::parse_str(id).is_err()){return failure(StatusCode::BAD_REQUEST);}
 let Ok(item)=crate::music::dispatch(root,"music.preview",serde_json::json!({"workspaceId":parts[0],"id":parts[1]}))else{return failure(StatusCode::NOT_FOUND)};
 let Some(path)=item.get("path").and_then(serde_json::Value::as_str)else{return failure(StatusCode::NOT_FOUND)};
 let Ok(mut file)=File::open(path)else{return failure(StatusCode::NOT_FOUND)};
 let Ok(meta)=file.metadata()else{return failure(StatusCode::NOT_FOUND)};
 // Validate again after open to detect a replaced original between selection and this read.
 if crate::music::dispatch(root,"music.preview",serde_json::json!({"workspaceId":parts[0],"id":parts[1]})).is_err(){return failure(StatusCode::NOT_FOUND);}
 #[cfg(unix)] {
  use std::os::unix::fs::MetadataExt;
  let Ok(current)=std::fs::metadata(path)else{return failure(StatusCode::NOT_FOUND)};
  if current.dev()!=meta.dev()||current.ino()!=meta.ino()||current.len()!=meta.len()||current.mtime()!=meta.mtime()||current.mtime_nsec()!=meta.mtime_nsec(){return failure(StatusCode::NOT_FOUND);}
 }
 let size=meta.len();let range=request.headers().get("Range").and_then(|h|h.to_str().ok());
 let Some((start,end))=bounds(range,size)else{return failure(StatusCode::RANGE_NOT_SATISFIABLE)};
 let mut body=Vec::new();if request.method()!="HEAD"&&(file.seek(SeekFrom::Start(start)).is_err()||file.take(end-start+1).read_to_end(&mut body).is_err()){return failure(StatusCode::NOT_FOUND);}
 let ext=Path::new(path).extension().and_then(|x|x.to_str()).unwrap_or("").to_ascii_lowercase();
 let mime=match ext.as_str(){"mp4"|"m4v"=>"video/mp4","mov"=>"video/quicktime","webm"=>"video/webm","mp3"=>"audio/mpeg","wav"|"wave"=>"audio/wav","aif"|"aiff"=>"audio/aiff","flac"=>"audio/flac","m4a"=>"audio/mp4","aac"=>"audio/aac","ogg"=>"audio/ogg",_=>return failure(StatusCode::UNSUPPORTED_MEDIA_TYPE)};
 let partial=range.is_some()||end+1<size;
 let mut response=Response::builder().status(if partial{206}else{200}).header("Content-Type",mime).header("Accept-Ranges","bytes").header("Cache-Control","no-store").header("Content-Length",(end-start+1).to_string());
 if partial{response=response.header("Content-Range",format!("bytes {start}-{end}/{size}"));}
 response.body(body).unwrap()
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn bounded_ranges_support_seeking_and_reject_invalid(){assert_eq!(bounds(Some("bytes=100-200"),1000),Some((100,200)));assert_eq!(bounds(Some("bytes=-20"),100),Some((80,99)));assert_eq!(bounds(None,20_000_000),Some((0,8*1024*1024-1)));assert_eq!(bounds(Some("bytes=999-"),100),None);assert_eq!(bounds(Some("bytes=0-1,4-5"),100),None);}
}
