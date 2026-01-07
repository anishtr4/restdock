use std::collections::HashMap;
use std::time::Instant;
use serde::Serialize;

#[derive(Serialize)]
struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
    time: u128,
    size: usize,
}

#[tauri::command]
async fn make_request(method: String, url: String, headers: Option<HashMap<String, String>>, body: Option<String>, timeout: Option<u64>, follow_redirects: Option<bool>) -> Result<HttpResponse, String> {
    let mut client_builder = reqwest::Client::builder();

    if let Some(t) = timeout {
        client_builder = client_builder.timeout(std::time::Duration::from_millis(t));
    }

    if let Some(follow) = follow_redirects {
        if !follow {
            client_builder = client_builder.redirect(reqwest::redirect::Policy::none());
        }
        // reqwest follows redirects by default, so we only need to explicitly disable if false
        // or we could set a policy. Default is 10 redirects.
    }

    let client = client_builder.build().map_err(|e| e.to_string())?;
    let start = Instant::now();

    let method = method.to_uppercase();
    let mut request_builder = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    if let Some(h) = headers {
        for (k, v) in h {
            request_builder = request_builder.header(k, v);
        }
    }

    if let Some(b) = body {
        request_builder = request_builder.body(b);
    }

    let response = request_builder.send().await.map_err(|e| e.to_string())?;
    let duration = start.elapsed().as_millis();
    let status = response.status().as_u16();

    let mut resp_headers = HashMap::new();
    for (name, value) in response.headers() {
        resp_headers.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
    }

    let text = response.text().await.map_err(|e| e.to_string())?;
    let size = text.len();

    Ok(HttpResponse {
        status,
        headers: resp_headers,
        body: text,
        time: duration,
        size,
    })
}

mod mock_server;
use mock_server::MockServerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(MockServerState::new())
        .invoke_handler(tauri::generate_handler![
            make_request, 
            mock_server::start_mock_server, 
            mock_server::stop_mock_server,
            mock_server::stop_all_mock_servers,
            mock_server::get_running_servers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

