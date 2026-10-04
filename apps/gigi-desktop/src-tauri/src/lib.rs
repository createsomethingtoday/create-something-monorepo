pub mod domain;
pub mod source_import;
pub mod integrations;
mod agent_setup;
mod navigation;

use tauri::Manager;

#[tauri::command]
async fn dispatch(app: tauri::AppHandle, operation: String, input: serde_json::Value) -> Result<serde_json::Value, String> {
    let data_dir = match std::env::var_os("GIGI_DATA_DIR") {
        Some(path) => std::path::PathBuf::from(path),
        None => app.path().app_data_dir().map_err(|e| e.to_string())?,
    };
    let resources=app.path().resource_dir().map_err(|e|e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        if operation=="agent.status" {return agent_setup::status(&data_dir);}
        if operation=="agent.prepare" {return agent_setup::prepare(&resources,&data_dir);}
        if operation=="help.open" {return navigation::open_help(input);}
        if operation=="connections.openConsent" {return navigation::open_consent(input);}
        if operation=="context.sync" {return integrations::sync_history(&resources,&data_dir);}
        if operation=="connections.import" {
            let page=integrations::dispatch(&resources,&data_dir,&operation,input.clone())?;
            return source_import::persist_page(&data_dir,&input,page);
        }
        if operation.starts_with("context.") || operation.starts_with("connections.") || operation=="auth.login" {
            integrations::dispatch(&resources,&data_dir,&operation,input)
        } else {
            domain::dispatch(&data_dir,&operation,input)
        }
    }).await.map_err(|_|"GiGi operation interrupted".to_string())?
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![dispatch])
        .build(tauri::generate_context!())
        .expect("GiGi could not start")
        .run(|_app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                integrations::cancel_all();
            }
        });
}
