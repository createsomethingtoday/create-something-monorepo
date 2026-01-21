//! Loom Daemon
//!
//! Tokio-based coordination via Unix socket.
//! Provides RPC interface for agents and coordinates dispatch.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::net::{UnixListener, UnixStream};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::work::{WorkStore, CreateTask, Status};
use crate::dispatch::{Dispatcher, DispatchConfig};

#[derive(Error, Debug)]
pub enum DaemonError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Work store error: {0}")]
    Work(#[from] crate::work::WorkError),
    
    #[error("Dispatch error: {0}")]
    Dispatch(#[from] crate::dispatch::DispatchError),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Daemon already running")]
    AlreadyRunning,
    
    #[error("Daemon not running")]
    NotRunning,
}

/// RPC Request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "cmd", rename_all = "snake_case")]
pub enum Request {
    /// List ready tasks
    Ready,
    /// List all tasks
    List { status: Option<String> },
    /// Get a specific task
    Get { id: String },
    /// Create a new task
    Create { title: String, description: Option<String>, labels: Vec<String>, parent: Option<String> },
    /// Claim a task
    Claim { id: String, agent: String },
    /// Complete a task
    Complete { id: String, evidence: Option<String> },
    /// Cancel a task
    Cancel { id: String },
    /// Spawn a sub-task
    Spawn { parent: String, title: String },
    /// Add dependency
    Block { task_id: String, depends_on: String },
    /// Get summary
    Summary,
    /// Dispatch a task
    Dispatch { id: String, agent: Option<String> },
    /// Health check
    Ping,
    /// Shutdown daemon
    Shutdown,
}

/// RPC Response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum Response {
    Ok { data: serde_json::Value },
    Error { message: String },
}

impl Response {
    pub fn ok<T: Serialize>(data: T) -> Self {
        Response::Ok {
            data: serde_json::to_value(data).unwrap_or(serde_json::Value::Null),
        }
    }
    
    pub fn error(message: impl Into<String>) -> Self {
        Response::Error {
            message: message.into(),
        }
    }
}

/// Daemon state
pub struct DaemonState {
    store: WorkStore,
    dispatcher: Option<Dispatcher>,
    shutdown: bool,
}

impl DaemonState {
    fn new(store: WorkStore, dispatcher: Option<Dispatcher>) -> Self {
        Self {
            store,
            dispatcher,
            shutdown: false,
        }
    }
}

/// The Loom daemon
pub struct Daemon {
    root: PathBuf,
    socket_path: PathBuf,
    state: Arc<Mutex<DaemonState>>,
}

impl Daemon {
    /// Create a new daemon for a Loom directory
    pub fn new(root: impl AsRef<Path>) -> Result<Self, DaemonError> {
        let root = root.as_ref().to_path_buf();
        let socket_path = root.join("run.sock");
        let db_path = root.join("work.db");
        
        let store = WorkStore::open(&db_path)?;
        
        // Try to load dispatcher config
        let dispatch_path = root.join("dispatch.toml");
        let dispatcher = if dispatch_path.exists() {
            DispatchConfig::from_file(&dispatch_path)
                .map(Dispatcher::new)
                .ok()
        } else {
            None
        };
        
        let state = Arc::new(Mutex::new(DaemonState::new(store, dispatcher)));
        
        Ok(Self {
            root,
            socket_path,
            state,
        })
    }
    
    /// Check if daemon is already running
    pub fn is_running(&self) -> bool {
        self.socket_path.exists()
    }
    
    /// Get the socket path
    pub fn socket_path(&self) -> &Path {
        &self.socket_path
    }
    
    /// Run the daemon
    pub async fn run(&self) -> Result<(), DaemonError> {
        // Remove stale socket if exists
        if self.socket_path.exists() {
            std::fs::remove_file(&self.socket_path)?;
        }
        
        // Create listener
        let listener = UnixListener::bind(&self.socket_path)?;
        
        // Write PID file
        let pid_path = self.root.join("daemon.pid");
        std::fs::write(&pid_path, std::process::id().to_string())?;
        
        eprintln!("Loom daemon started on {}", self.socket_path.display());
        
        loop {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((stream, _)) => {
                            let state = self.state.clone();
                            tokio::spawn(async move {
                                if let Err(e) = handle_connection(stream, state).await {
                                    eprintln!("Connection error: {}", e);
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("Accept error: {}", e);
                        }
                    }
                }
                _ = tokio::signal::ctrl_c() => {
                    eprintln!("Shutting down...");
                    break;
                }
            }
            
            // Check for shutdown flag
            let should_shutdown = {
                let state = self.state.lock().await;
                state.shutdown
            };
            
            if should_shutdown {
                break;
            }
        }
        
        // Cleanup
        if self.socket_path.exists() {
            std::fs::remove_file(&self.socket_path)?;
        }
        if pid_path.exists() {
            std::fs::remove_file(&pid_path)?;
        }
        
        Ok(())
    }
}

/// Handle a single connection
async fn handle_connection(stream: UnixStream, state: Arc<Mutex<DaemonState>>) -> Result<(), DaemonError> {
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut line = String::new();
    
    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line).await?;
        
        if bytes_read == 0 {
            break; // Connection closed
        }
        
        let request: Request = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                let response = Response::error(format!("Invalid request: {}", e));
                let json = serde_json::to_string(&response)? + "\n";
                writer.write_all(json.as_bytes()).await?;
                continue;
            }
        };
        
        let response = handle_request(request, &state).await;
        let json = serde_json::to_string(&response)? + "\n";
        writer.write_all(json.as_bytes()).await?;
    }
    
    Ok(())
}

/// Handle a single request
async fn handle_request(request: Request, state: &Arc<Mutex<DaemonState>>) -> Response {
    let mut state = state.lock().await;
    
    match request {
        Request::Ping => {
            Response::ok("pong")
        }
        
        Request::Shutdown => {
            state.shutdown = true;
            Response::ok("shutting down")
        }
        
        Request::Ready => {
            match state.store.ready() {
                Ok(tasks) => Response::ok(tasks),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::List { status } => {
            let result = if let Some(s) = status {
                if let Some(status) = Status::from_str(&s) {
                    state.store.list_by_status(status)
                } else {
                    return Response::error(format!("Invalid status: {}", s));
                }
            } else {
                state.store.list_all()
            };
            
            match result {
                Ok(tasks) => Response::ok(tasks),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Get { id } => {
            match state.store.get(&id) {
                Ok(Some(task)) => Response::ok(task),
                Ok(None) => Response::error(format!("Task not found: {}", id)),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Create { title, description, labels, parent } => {
            match state.store.create(CreateTask {
                title,
                description,
                labels,
                parent,
                ..Default::default()
            }) {
                Ok(task) => Response::ok(task),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Claim { id, agent } => {
            match state.store.claim(&id, &agent) {
                Ok(task) => Response::ok(task),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Complete { id, evidence } => {
            match state.store.complete(&id, evidence.as_deref()) {
                Ok(unblocked) => {
                    let msg = if unblocked.is_empty() {
                        "completed".to_string()
                    } else {
                        format!("completed (unblocked: {})", unblocked.join(", "))
                    };
                    Response::ok(msg)
                }
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Cancel { id } => {
            match state.store.cancel(&id) {
                Ok(()) => Response::ok("cancelled"),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Spawn { parent, title } => {
            match state.store.create(CreateTask {
                title,
                parent: Some(parent),
                ..Default::default()
            }) {
                Ok(task) => Response::ok(task),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Block { task_id, depends_on } => {
            match state.store.add_dependency(&task_id, &depends_on) {
                Ok(()) => Response::ok("blocked"),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Summary => {
            match state.store.summary() {
                Ok(summary) => Response::ok(summary),
                Err(e) => Response::error(e.to_string()),
            }
        }
        
        Request::Dispatch { id, agent } => {
            // Get the task first
            let task = match state.store.get(&id) {
                Ok(Some(t)) => t,
                Ok(None) => return Response::error(format!("Task not found: {}", id)),
                Err(e) => return Response::error(e.to_string()),
            };
            
            // Check if we have a dispatcher
            let dispatcher = match state.dispatcher.as_mut() {
                Some(d) => d,
                None => return Response::error("No dispatcher configured"),
            };
            
            // Route to agent
            let agent_name = match agent {
                Some(name) => name,
                None => match dispatcher.route(&task) {
                    Ok(name) => name.to_string(),
                    Err(e) => return Response::error(e.to_string()),
                },
            };
            
            Response::ok(serde_json::json!({
                "task_id": id,
                "agent": agent_name,
                "status": "dispatched"
            }))
        }
    }
}

/// Client for communicating with daemon
pub struct DaemonClient {
    socket_path: PathBuf,
}

impl DaemonClient {
    pub fn new(socket_path: impl AsRef<Path>) -> Self {
        Self {
            socket_path: socket_path.as_ref().to_path_buf(),
        }
    }
    
    /// Check if daemon is running
    pub fn is_running(&self) -> bool {
        self.socket_path.exists()
    }
    
    /// Send a request to the daemon
    pub async fn request(&self, request: Request) -> Result<Response, DaemonError> {
        let stream = UnixStream::connect(&self.socket_path).await?;
        let (reader, mut writer) = stream.into_split();
        
        // Send request
        let json = serde_json::to_string(&request)? + "\n";
        writer.write_all(json.as_bytes()).await?;
        
        // Read response
        let mut reader = BufReader::new(reader);
        let mut line = String::new();
        reader.read_line(&mut line).await?;
        
        let response: Response = serde_json::from_str(&line)?;
        Ok(response)
    }
    
    /// Convenience methods
    pub async fn ready(&self) -> Result<Response, DaemonError> {
        self.request(Request::Ready).await
    }
    
    pub async fn create(&self, title: String) -> Result<Response, DaemonError> {
        self.request(Request::Create {
            title,
            description: None,
            labels: vec![],
            parent: None,
        }).await
    }
    
    pub async fn claim(&self, id: String, agent: String) -> Result<Response, DaemonError> {
        self.request(Request::Claim { id, agent }).await
    }
    
    pub async fn complete(&self, id: String, evidence: Option<String>) -> Result<Response, DaemonError> {
        self.request(Request::Complete { id, evidence }).await
    }
    
    pub async fn ping(&self) -> Result<bool, DaemonError> {
        match self.request(Request::Ping).await {
            Ok(Response::Ok { .. }) => Ok(true),
            _ => Ok(false),
        }
    }
    
    pub async fn shutdown(&self) -> Result<(), DaemonError> {
        self.request(Request::Shutdown).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_request_serialization() {
        let req = Request::Create {
            title: "Test".to_string(),
            description: None,
            labels: vec!["foo".to_string()],
            parent: None,
        };
        
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("create"));
        assert!(json.contains("Test"));
    }
    
    #[test]
    fn test_response_serialization() {
        let resp = Response::ok("hello");
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("ok"));
        assert!(json.contains("hello"));
    }
}
