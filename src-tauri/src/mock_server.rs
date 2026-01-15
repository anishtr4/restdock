use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::net::TcpListener;
use tokio::sync::oneshot;
use warp::Filter;
use tauri::{State, Window, Emitter};
use hmac::{Hmac, Mac};
use sha2::{Sha256, Digest};

// Auth Configuration - supports all auth types
#[derive(Debug, Clone, PartialEq, serde::Deserialize, serde::Serialize, Default)]
pub struct AuthConfig {
    // Basic & Digest
    pub username: Option<String>,
    pub password: Option<String>,
    
    // Bearer & OAuth2
    pub token: Option<String>,
    
    // API Key
    pub header: Option<String>,
    pub key: Option<String>,
    
    // Digest specific
    pub realm: Option<String>,
    pub nonce: Option<String>,
    pub algorithm: Option<String>,
    pub qop: Option<String>,
    pub opaque: Option<String>,
    
    // OAuth1 specific
    pub consumer_key: Option<String>,
    pub consumer_secret: Option<String>,
    pub token_secret: Option<String>,
    
    // AWS specific
    pub access_key: Option<String>,
    pub secret_key: Option<String>,
    pub region: Option<String>,
    pub service: Option<String>,
    
    // Hawk specific
    pub auth_id: Option<String>,
    pub auth_key: Option<String>,
    pub hawk_algorithm: Option<String>,
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

// Helper function to validate auth headers - supports ALL auth types
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
        "basic" => validate_basic_auth(auth_config, req_headers),
        "bearer" => validate_bearer_auth(auth_config, req_headers),
        "api_key" => validate_api_key_auth(auth_config, req_headers),
        "digest" => validate_digest_auth(auth_config, req_headers),
        "oauth1" => validate_oauth1_auth(auth_config, req_headers),
        "oauth2" => validate_oauth2_auth(auth_config, req_headers),
        "aws" => validate_aws_auth(auth_config, req_headers),
        "hawk" => validate_hawk_auth(auth_config, req_headers),
        _ => true
    }
}

fn validate_basic_auth(config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    let auth_header = headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    if !auth_header.starts_with("Basic ") {
        return false;
    }
    
    let encoded = &auth_header[6..];
    let decoded = match base64_decode(encoded) {
        Some(d) => d,
        None => return false,
    };
    
    let expected_username = config.username.as_deref().unwrap_or("");
    let expected_password = config.password.as_deref().unwrap_or("");
    let expected = format!("{}:{}", expected_username, expected_password);
    
    decoded == expected
}

fn validate_bearer_auth(config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    let auth_header = headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    if !auth_header.starts_with("Bearer ") {
        return false;
    }
    
    let token = &auth_header[7..];
    let expected_token = config.token.as_deref().unwrap_or("");
    
    token == expected_token
}

fn validate_api_key_auth(config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    let header_name = config.header.as_deref().unwrap_or("X-API-Key");
    let expected_key = config.key.as_deref().unwrap_or("");
    
    let actual_key = headers.get(header_name)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    actual_key == expected_key
}

fn validate_digest_auth(_config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    // Simplified Digest validation - just check if Authorization header with Digest is present
    // Full Digest auth requires challenge-response which is complex for mock server
    let auth_header = headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    auth_header.starts_with("Digest ")
}

fn validate_oauth1_auth(_config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    // Simplified OAuth1 validation - check for OAuth Authorization header
    // Full OAuth1 signature validation is complex and not needed for mock
    let auth_header = headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    auth_header.starts_with("OAuth ")
}

fn validate_oauth2_auth(config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    // OAuth2 typically uses Bearer token
    validate_bearer_auth(config, headers)
}

fn validate_aws_auth(_config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    // Simplified AWS validation - check for AWS4-HMAC-SHA256 Authorization header
    // Full AWS signature validation is very complex
    let auth_header = headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    auth_header.starts_with("AWS4-HMAC-SHA256")
}

fn validate_hawk_auth(_config: &AuthConfig, headers: &warp::http::HeaderMap) -> bool {
    // Simplified Hawk validation - check for Hawk Authorization header
    let auth_header = headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    auth_header.starts_with("Hawk ")
}

// Simple base64 decode helper
fn base64_decode(input: &str) -> Option<String> {
    use base64::{Engine as _, engine::general_purpose};
    
    match general_purpose::STANDARD.decode(input) {
        Ok(bytes) => String::from_utf8(bytes).ok(),
        Err(_) => None
    }
}
