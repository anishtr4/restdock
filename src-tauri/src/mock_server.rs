use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::net::TcpListener;
use tokio::sync::oneshot;
use warp::Filter;
use tauri::{State, Window, Emitter};

// Auth Configuration
#[derive(Debug, Clone, PartialEq, serde::Deserialize, serde::Serialize, Default)]
pub struct AuthConfig {
    pub username: Option<String>,
    pub password: Option<String>,
    pub token: Option<String>,
    pub header: Option<String>,
    pub key: Option<String>,
}

// Route Definitions
#[derive(Debug, Clone, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct MockRoute {
    pub id: String,
    pub method: String,
    pub path: String,
    pub status: u16,
    pub body: String,
    pub headers: Option<HashMap<String, String>>,
    #[serde(default)]
    pub auth_type: Option<String>,
    #[serde(default)]
    pub auth_config: Option<AuthConfig>,
}

// Info about a running server instance
struct RunningServer {
    shutdown_tx: oneshot::Sender<()>,
    port: u16,
}

// Server State to hold multiple active servers
pub struct MockServerState {
    // Map of server_id -> running server info
    pub servers: Arc<Mutex<HashMap<String, RunningServer>>>,
}

impl MockServerState {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn start_mock_server(
    server_id: String,
    port: u16,
    routes: Vec<MockRoute>,
    state: State<'_, MockServerState>,
    window: Window,
) -> Result<String, String> {
    // 1. Stop this specific server if already running
    stop_mock_server_by_id(server_id.clone(), state.clone()).await?;

    // 2. Check if port is available
    let addr = format!("127.0.0.1:{}", port);
    match TcpListener::bind(&addr) {
        Ok(listener) => {
            // Port is available, drop the listener immediately so warp can bind
            drop(listener);
        }
        Err(e) => {
            return Err(format!("Port {} is already in use: {}", port, e));
        }
    }

    // 3. Store routes in Arc for the filter
    let routes_arc = Arc::new(routes);
    let window_arc = Arc::new(window);
    let server_id_clone = server_id.clone();

    // 4. Define Filter
    let routes_for_filter = routes_arc.clone();
    let window_for_filter = window_arc.clone();
    let sid_for_log = server_id.clone();

    let api = warp::any()
        .and(warp::method())
        .and(warp::path::full())
        .and(warp::header::headers_cloned())
        .and(warp::body::bytes())
        .map(move |method: warp::http::Method, path: warp::path::FullPath, req_headers: warp::http::HeaderMap, _body: warp::hyper::body::Bytes| {
            let path_str = path.as_str();
            let method_str = method.as_str();
            
            // Log to Frontend
            let log_msg = format!("[{}:{}] {} {}", sid_for_log, port, method_str, path_str);
            let _ = window_for_filter.emit("mock-request", log_msg);

            // Find matching route
            let matched = routes_for_filter.iter().find(|r| {
                if !r.method.eq_ignore_ascii_case(method_str) {
                    return false;
                }

                // Check for dynamic path match
                let route_parts: Vec<&str> = r.path.split('/').filter(|s| !s.is_empty()).collect();
                let req_parts: Vec<&str> = path_str.split('/').filter(|s| !s.is_empty()).collect();

                if route_parts.len() != req_parts.len() {
                    return false;
                }

                route_parts.iter().zip(req_parts.iter()).all(|(route_part, req_part)| {
                    route_part.starts_with(':') || route_part == req_part // Match param or exact string
                })
            });

            if let Some(route) = matched {
                // Check auth validation
                let auth_valid = validate_auth(&route, &req_headers);
                
                if !auth_valid {
                    return warp::http::Response::builder()
                        .status(401)
                        .header("Access-Control-Allow-Origin", "*")
                        .header("Content-Type", "application/json")
                        .body(r#"{"error": "Unauthorized", "message": "Invalid or missing authentication"}"#.to_string())
                        .unwrap();
                }

                let mut resp = warp::http::Response::builder()
                    .status(route.status);
                
                if let Some(headers) = &route.headers {
                    for (k, v) in headers {
                        resp = resp.header(k, v);
                    }
                }
                
                // Allow CORS for local dev
                resp = resp.header("Access-Control-Allow-Origin", "*");
                resp = resp.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
                resp = resp.header("Access-Control-Allow-Headers", "*");

                resp.body(route.body.clone()).unwrap_or_else(|_| warp::http::Response::new("Error building response".into()))
            } else {
                warp::http::Response::builder()
                    .status(404)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(format!("Mock route not found: {} {}", method_str, path_str))
                    .unwrap()
            }
        });

    // 4. Create shutdown channel
    let (tx, rx) = oneshot::channel();

    // 5. Store the running server
    {
        let mut servers = state.servers.lock().map_err(|e| e.to_string())?;
        servers.insert(server_id.clone(), RunningServer { shutdown_tx: tx, port });
    }

    // 6. Spawn the server
    tokio::spawn(async move {
        let (_addr, server) = warp::serve(api)
            .bind_with_graceful_shutdown(([127, 0, 0, 1], port), async {
                rx.await.ok();
            });
        server.await;
    });

    Ok(format!("Server {} started on port {}", server_id_clone, port))
}

// Stop a specific server by ID
async fn stop_mock_server_by_id(server_id: String, state: State<'_, MockServerState>) -> Result<String, String> {
    let mut servers = state.servers.lock().map_err(|e| e.to_string())?;
    if let Some(server) = servers.remove(&server_id) {
        let _ = server.shutdown_tx.send(());
        Ok(format!("Server {} stopped", server_id))
    } else {
        Ok(format!("Server {} was not running", server_id))
    }
}

#[tauri::command]
pub async fn stop_mock_server(
    server_id: String,
    state: State<'_, MockServerState>,
) -> Result<String, String> {
    stop_mock_server_by_id(server_id, state).await
}

// Stop ALL running servers
#[tauri::command]
pub async fn stop_all_mock_servers(state: State<'_, MockServerState>) -> Result<String, String> {
    let mut servers = state.servers.lock().map_err(|e| e.to_string())?;
    let count = servers.len();
    for (_id, server) in servers.drain() {
        let _ = server.shutdown_tx.send(());
    }
    Ok(format!("Stopped {} servers", count))
}

// Get list of running server IDs
#[tauri::command]
pub async fn get_running_servers(state: State<'_, MockServerState>) -> Result<Vec<String>, String> {
    let servers = state.servers.lock().map_err(|e| e.to_string())?;
    Ok(servers.keys().cloned().collect())
}

// Helper function to validate auth headers
fn validate_auth(route: &MockRoute, req_headers: &warp::http::HeaderMap) -> bool {
    let auth_type = route.auth_type.as_deref().unwrap_or("none");
    
    if auth_type == "none" {
        return true;
    }
    
    let auth_config = match &route.auth_config {
        Some(config) => config,
        None => return true, // No config means no validation
    };
    
    match auth_type {
        "basic" => {
            // Check Authorization: Basic base64(username:password)
            let auth_header = req_headers.get("authorization")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            
            if !auth_header.starts_with("Basic ") {
                return false;
            }
            
            let encoded = &auth_header[6..]; // Remove "Basic " prefix
            let decoded = match base64_decode(encoded) {
                Some(d) => d,
                None => return false,
            };
            
            let expected_username = auth_config.username.as_deref().unwrap_or("");
            let expected_password = auth_config.password.as_deref().unwrap_or("");
            let expected = format!("{}:{}", expected_username, expected_password);
            
            decoded == expected
        }
        "bearer" => {
            // Check Authorization: Bearer token
            let auth_header = req_headers.get("authorization")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            
            if !auth_header.starts_with("Bearer ") {
                return false;
            }
            
            let token = &auth_header[7..]; // Remove "Bearer " prefix
            let expected_token = auth_config.token.as_deref().unwrap_or("");
            
            token == expected_token
        }
        "api_key" => {
            // Check custom header with expected value
            let header_name = auth_config.header.as_deref().unwrap_or("X-API-Key");
            let expected_key = auth_config.key.as_deref().unwrap_or("");
            
            let actual_key = req_headers.get(header_name)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            
            actual_key == expected_key
        }
        _ => true
    }
}

// Simple base64 decode helper
fn base64_decode(input: &str) -> Option<String> {
    use std::str;
    
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    let input = input.trim_end_matches('=');
    let mut bytes = Vec::new();
    let mut buffer: u32 = 0;
    let mut bits_collected = 0;
    
    for c in input.chars() {
        let val = ALPHABET.iter().position(|&x| x == c as u8);
        match val {
            Some(v) => {
                buffer = (buffer << 6) | (v as u32);
                bits_collected += 6;
                if bits_collected >= 8 {
                    bits_collected -= 8;
                    bytes.push((buffer >> bits_collected) as u8);
                    buffer &= (1 << bits_collected) - 1;
                }
            }
            None => return None,
        }
    }
    
    String::from_utf8(bytes).ok()
}
