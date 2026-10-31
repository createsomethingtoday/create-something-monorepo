//! macOS notifications are a delivery surface for persisted attention, never an action authority.
use chrono::{Local, Timelike};
use libloading::Library;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::ffi::{c_char, CStr, CString};
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};

type Initialize = unsafe extern "C" fn(extern "C" fn(*const c_char)) -> i32;
type Status = unsafe extern "C" fn() -> i32;
type Send = unsafe extern "C" fn(*const c_char, *const c_char, *const c_char, *const c_char) -> i32;
type Remove = unsafe extern "C" fn(*const c_char) -> i32;
struct Native { _library: Library, status: Status, request: Status, active: Status, send: Send, remove: Remove }
static NATIVE: OnceLock<Result<Native,String>> = OnceLock::new();
static APP: OnceLock<tauri::AppHandle> = OnceLock::new();
static OPEN_ROUTE: Mutex<Option<Route>> = Mutex::new(None);

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Route { workspace_id:String, id:String, revision:String }
fn valid_identifier(value:&str)->bool { !value.is_empty() && value.len()<=128 && value.bytes().all(|c|c.is_ascii_alphanumeric()||b":_.-".contains(&c)) }
fn route(value:Value)->Result<Route,String> {
    let route:Route=serde_json::from_value(value).map_err(|_|"Invalid notification route")?;
    if uuid::Uuid::parse_str(&route.workspace_id).is_err() || !valid_identifier(&route.id) || !valid_identifier(&route.revision) {return Err("Invalid notification route".into());}
    Ok(route)
}
fn request_id(route:&Route)->String {format!("gigi.attention.{}.{}.{}",route.workspace_id,route.id,route.revision)}
fn text(value:&str,max:usize)->String {
    let mut bytes=0;value.chars().filter(|c|!c.is_control()).take_while(|c|{bytes+=c.len_utf8();bytes<=max}).collect()
}
fn payload(item:&Value,settings:&Value,wid:&str)->Result<(Route,String,String),String> {
    let route=route(json!({"workspaceId":wid,"id":item["id"],"revision":item["revision"]}))?;
    if !matches!(item["kind"].as_str(),Some("reminder"|"approval"|"completion"|"recovery")) {return Err("Invalid notification kind".into());}
    let detailed=settings["detailedPreviews"].as_bool()==Some(true);
    let (title,body)=if detailed {
        (text(item["title"].as_str().unwrap_or("GiGi needs your attention"),80),text(item["body"].as_str().unwrap_or("Open GiGi to review this item."),240))
    } else {("GiGi needs your attention".into(),"Open your private workspace to review an update.".into())};
    Ok((route,title,body))
}
fn clock(wid:&str)->Value {let now=Local::now();json!({"workspaceId":wid,"today":now.format("%Y-%m-%d").to_string(),"now":now.timestamp_millis(),"localHour":now.hour()})}
fn permission(code:i32)->Value {
    match code {
        0=>json!({"permission":"prompt","alertsEnabled":false}),
        1=>json!({"permission":"denied","alertsEnabled":false}),
        2=>json!({"permission":"granted","alertsEnabled":true}),
        4=>json!({"permission":"granted","alertsEnabled":false}),
        _=>json!({"permission":"unavailable","alertsEnabled":false}),
    }
}
extern "C" fn clicked(pointer:*const c_char) {
    if pointer.is_null() {return;}
    // Swift only calls this with its own NUL-terminated validated route during this call.
    let raw=unsafe {CStr::from_ptr(pointer)}.to_bytes();
    if raw.len()>1024 {return;}
    let Ok(value)=serde_json::from_slice(raw) else {return;};
    let Ok(route)=route(value) else {return;};
    *OPEN_ROUTE.lock().unwrap_or_else(|e|e.into_inner())=Some(route.clone());
    if let Some(app)=APP.get() {
        // Navigation only. The frontend re-reads the item/revision before opening it.
        if let Some(window)=app.get_webview_window("main") {let _=window.show();let _=window.unminimize();let _=window.set_focus();}
        let _=app.emit("gigi-attention-open",&route);
    }
}
pub fn initialize(app:&tauri::AppHandle,resources:&Path)->Result<(),String> {
    let _=APP.set(app.clone());
    native(resources).map(|_|())
}
fn native(resources:&Path)->Result<&'static Native,String> {
    NATIVE.get_or_init(|| {
        let path=resources.join("libgigi_notifications.dylib");
        if !path.is_absolute() || !path.is_file() {return Err("The native notification companion is missing. Reinstall the complete GiGi app.".into());}
        // Only the fixed, signed resource bundled with this app is loaded. No user/plugin paths.
        unsafe {
            let library=Library::new(path).map_err(|_|"The native notification companion could not be loaded.")?;
            let initialize=*library.get::<Initialize>(b"gigi_notifications_initialize\0").map_err(|_|"Invalid notification companion")?;
            let status=*library.get::<Status>(b"gigi_notifications_status\0").map_err(|_|"Invalid notification companion")?;
            let request=*library.get::<Status>(b"gigi_notifications_request\0").map_err(|_|"Invalid notification companion")?;
            let send=*library.get::<Send>(b"gigi_notifications_send\0").map_err(|_|"Invalid notification companion")?;
            let active=*library.get::<Status>(b"gigi_notifications_is_active\0").map_err(|_|"Invalid notification companion")?;
            let remove=*library.get::<Remove>(b"gigi_notifications_remove\0").map_err(|_|"Invalid notification companion")?;
            if initialize(clicked)!=1 {return Err("Could not initialize native notifications".into());}
            Ok(Native{_library:library,status,request,active,send,remove})
        }
    }).as_ref().map_err(Clone::clone)
}
fn prune(native:&Native,root:&Path,wid:&str)->Result<(),String> {
    let data=crate::attention::dispatch(root,"attention.list",clock(wid))?;
    let enabled=data["settings"]["enabled"].as_bool()==Some(true);
    let identifiers:Vec<String>=data["items"].as_array().into_iter().flatten().filter(|item|enabled && item["unread"].as_bool()==Some(true)).filter_map(|item|{
        route(json!({"workspaceId":wid,"id":item["id"],"revision":item["revision"]})).ok().map(|r|request_id(&r))
    }).collect();
    let encoded=CString::new(serde_json::to_string(&json!({"workspaceId":wid,"identifiers":identifiers})).map_err(|_|"Invalid notification state")?).map_err(|_|"Invalid notification state")?;
    if unsafe{(native.remove)(encoded.as_ptr())}!=1 {return Err("Could not reconcile native notifications".into());}
    Ok(())
}
pub fn dispatch(_app:&tauri::AppHandle,root:&Path,resources:&Path,op:&str,input:Value)->Result<Value,String> {
    match op {
        "notifications.takeOpen"=>{
            let wid=input["workspaceId"].as_str().ok_or("Select a workspace first")?;
            crate::attention::dispatch(root,"attention.settings",json!({"workspaceId":wid}))?;
            let mut pending=OPEN_ROUTE.lock().unwrap_or_else(|e|e.into_inner());
            let item=if pending.as_ref().is_some_and(|r|r.workspace_id==wid){pending.take()}else{None};
            Ok(json!({"item":item}))
        },
        "notifications.status"=>Ok(permission(unsafe{(native(resources)?.status)()})),
        // Invoked only by an explicit settings action. Starting GiGi never asks for permission.
        "notifications.request"=>Ok(permission(unsafe{(native(resources)?.request)()})),
        "notifications.openSettings"=>{
            let status=std::process::Command::new("/usr/bin/open").arg("x-apple.systempreferences:com.apple.Notifications-Settings.extension").status().map_err(|_|"Could not open macOS notification settings")?;
            if !status.success(){return Err("Could not open macOS notification settings".into());}
            Ok(json!({"opened":true}))
        },
        "notifications.send"=>{
            let wid=input["workspaceId"].as_str().ok_or("Select a workspace first")?;
            if uuid::Uuid::parse_str(wid).is_err(){return Err("Invalid workspace".into());}
            let native=native(resources)?;
            prune(native,root,wid)?;
            let state=permission(unsafe{(native.status)()});
            if state["alertsEnabled"]!=true {return Ok(json!({"submitted":false,"reason":"permission","permission":state["permission"],"alertsEnabled":false}));}
            if unsafe{(native.active)()}==1 {return Ok(json!({"submitted":false,"reason":"foreground"}));}
            let input=clock(wid);
            let claim=crate::attention::dispatch(root,"attention.claimDelivery",input)?;
            let item=&claim["item"];
            if item.is_null(){return Ok(json!({"submitted":false,"reason":"no_eligible_item"}));}
            let (route,title,body)=payload(item,&claim["settings"],wid)?;
            let encode=|value:String|CString::new(value).map_err(|_|"Invalid notification payload");
            let identifier=encode(request_id(&route))?;let title=encode(title)?;let body=encode(body)?;
            let serialized=encode(serde_json::to_string(&route).map_err(|_|"Invalid notification route")?)?;
            let code=unsafe{(native.send)(identifier.as_ptr(),title.as_ptr(),body.as_ptr(),serialized.as_ptr())};
            let outcome=if code==1 {"submitted"}else{"failed"};
            crate::attention::dispatch(root,"attention.recordDelivery",json!({"workspaceId":wid,"id":route.id,"revision":route.revision,"deliveryToken":item["deliveryToken"],"outcome":outcome}))?;
            // 'submitted' means the OS accepted the request, never that a person saw it.
            Ok(json!({"submitted":code==1,"reason":if code==1{"submitted"}else if code== -2{"outcome_unknown"}else{"native_delivery_failed"},"permission":state["permission"]}))
        },
        _=>Err("Unknown notification operation".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const WID:&str="c3e912ce-6016-47c6-8fe8-41eff652b37d";
    #[test]fn private_preview_never_leaks_record_text(){
        let item=json!({"id":"item-1","revision":"rev-1","kind":"approval","title":"Confidential gig","body":"Customer address"});
        let (route,title,body)=payload(&item,&json!({"detailedPreviews":false}),WID).unwrap();
        assert_eq!(title,"GiGi needs your attention");assert!(!body.contains("Customer"));assert_eq!(route.workspace_id,WID);
        let (_,title,body)=payload(&item,&json!({"detailedPreviews":true}),WID).unwrap();assert_eq!(title,"Confidential gig");assert_eq!(body,"Customer address");
    }
    #[test]fn route_rejects_unknown_fields_wrong_workspace_or_oversize(){
        for value in [json!({"workspaceId":"other","id":"item","revision":"1"}),json!({"workspaceId":WID,"id":"x".repeat(129),"revision":"1"}),json!({"workspaceId":WID,"id":"item","revision":"1","approve":true}),json!({"workspaceId":WID,"id":"../secret","revision":"1"})]{assert!(route(value).is_err());}
    }
    #[test]fn permission_denial_is_preserved(){assert_eq!(permission(1)["permission"],"denied");assert_eq!(permission(1)["alertsEnabled"],false);assert_eq!(permission(4)["alertsEnabled"],false);assert_eq!(permission(-1)["permission"],"unavailable");}
    #[test]fn preview_limits_preserve_unicode_boundaries(){assert_eq!(text("🎵".repeat(100).as_str(),80).len(),80);assert_eq!(text("a\nb",80),"ab");}
    #[test]fn model_actions_cannot_become_notifications(){assert!(payload(&json!({"id":"a","revision":"b","kind":"execute_tool"}),&json!({}),WID).is_err());}
    #[test]fn notification_click_waits_for_ready_webview_and_never_approves(){
        let root=std::env::temp_dir().join(format!("gigi-route-test-{}",uuid::Uuid::new_v4()));
        let wid=crate::domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic route"})).unwrap()["id"].as_str().unwrap().to_owned();
        let raw=CString::new(json!({"workspaceId":wid,"id":"source-1","revision":"revision-1"}).to_string()).unwrap();
        clicked(raw.as_ptr());
        let mut pending=OPEN_ROUTE.lock().unwrap_or_else(|e|e.into_inner());
        assert_eq!(pending.as_ref().unwrap().workspace_id,wid);
        assert_eq!(pending.take().unwrap().id,"source-1");assert!(pending.is_none());drop(pending);
        assert_eq!(crate::domain::dispatch(&root,"records.list",json!({"workspaceId":wid,"entity":"tasks"})).unwrap()["count"],0);
        std::fs::remove_dir_all(root).unwrap();
    }

}
