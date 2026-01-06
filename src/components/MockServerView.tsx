import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, Square, Plus, Trash2, Server, MoreVertical } from "lucide-react";
import { dbService } from "../services/db";
import "./MockServerView.css"; // Temporarily disabled during Tailwind migration

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

// Helper to get status text from code
const getStatusText = (code: number): string => {
    const statusTexts: Record<number, string> = {
        200: 'OK', 201: 'Created', 204: 'No Content',
        400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
        500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
    };
    return statusTexts[code] || '';
};


export default function MockServerView() {
    // State
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<any>(null);
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [activeEditorTab, setActiveEditorTab] = useState<'params' | 'auth' | 'headers' | 'body'>('body');
    const [showLogs, setShowLogs] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [serverMenuOpen, setServerMenuOpen] = useState<string | null>(null);

    // Modal state for rename/delete/create dialogs
    const [renameModal, setRenameModal] = useState<{ server: any; name: string } | null>(null);
    const [deleteModal, setDeleteModal] = useState<any | null>(null);
    const [createModal, setCreateModal] = useState<{ name: string } | null>(null);

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    // Keep track of which servers are running locally in UI if needed, 
    // but better to rely on DB status + async check. 
    // For now, we assume DB 'status' field is source of truth + visual.

    // Initial Load
    useEffect(() => {
        loadServers();
    }, []);

    // Load Mocks when Server Selected
    useEffect(() => {
        if (selectedServer) {
            loadRoutes(selectedServer.id);
        } else {
            setRoutes([]);
            setSelectedRoute(null);
        }
    }, [selectedServer]);

    // Logs Listener
    useEffect(() => {
        const unlisten = listen("mock-request", (event: any) => {
            setLogs(prev => [event.payload, ...prev].slice(0, 50));
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    // Default server for first-time users (only one)
    const DEFAULT_SERVER = {
        id: 'default-server',
        name: 'Default Server',
        port: 3001,
        status: 'stopped'
    };

    const DEFAULT_ROUTES: any[] = [
        {
            id: 'default-route-1',
            server_id: 'default-server',
            method: 'GET',
            path: '/api/hello',
            status_code: 200,
            delay_ms: 0,
            response_body: '{"message": "Hello from Mock Server!"}',
            response_headers: [{ Key: 'Content-Type', Value: 'application/json' }],
            enabled: true
        }
    ];

    const loadServers = async () => {
        try {
            const s = await dbService.getMockServers();
            if (s && s.length > 0) {
                setServers(s);
                if (!selectedServer) setSelectedServer(s[0]);
            } else {
                // Create default server for first-time users
                console.log("No servers found, creating default server");
                await dbService.saveMockServer(DEFAULT_SERVER);
                // Save default route too
                await dbService.saveMock(DEFAULT_ROUTES[0]);
                setServers([DEFAULT_SERVER]);
                setSelectedServer(DEFAULT_SERVER);
            }
        } catch (err) {
            console.error("Failed to load servers:", err);
            setServers([DEFAULT_SERVER]);
            setSelectedServer(DEFAULT_SERVER);
        }
    };

    const loadRoutes = async (serverId: string) => {
        try {
            const r = await dbService.getMocksByServer(serverId);
            if (r && r.length > 0) {
                setRoutes(r);
            } else if (serverId === 'default-server') {
                // Provide default routes for first-time users
                setRoutes(DEFAULT_ROUTES);
            } else {
                setRoutes([]);
            }
        } catch (err) {
            console.error("Failed to load routes:", err);
            setRoutes([]);
        }
    };

    const handleStartStop = async (server: any) => {
        if (server.status === "running") {
            try {
                // Pass server_id to stop the specific server
                await invoke("stop_mock_server", { serverId: server.id });
                // Update local state immediately
                const updatedServer = { ...server, status: "stopped" };
                setSelectedServer(updatedServer);
                setServers(prev => prev.map(s => s.id === server.id ? updatedServer : s));
                // Try to persist (may fail for sample data)
                try { await dbService.saveMockServer(updatedServer); } catch (e) { console.log("Using sample data, skip DB save"); }
                console.log(`✅ Stopped ${server.name} on port ${server.port}`);
            } catch (e) {
                console.error("Failed to stop server:", e);
            }
        } else {
            try {
                // Ensure we have the correct routes for this server
                let serverRoutes = routes;

                // If routes aren't loaded for this server, fetch them
                if (routes.length === 0 || routes[0]?.server_id !== server.id) {
                    console.log("Routes not loaded for this server, fetching...");
                    if (server.id === 'default-server') {
                        serverRoutes = DEFAULT_ROUTES;
                    } else {
                        try {
                            serverRoutes = await dbService.getMocksByServer(server.id);
                        } catch (e) {
                            console.log("Failed to fetch routes from DB");
                        }
                    }
                }

                // Build the route objects for the backend
                const activeRoutes = serverRoutes.filter((r: any) => r.enabled).map((r: any) => ({
                    id: r.id,
                    method: r.method,
                    path: r.path,
                    status: r.status_code,
                    body: r.response_body || '{}',
                    headers: (r.response_headers || []).reduce((acc: any, curr: any) => ({ ...acc, [curr.Key]: curr.Value }), {}),
                    auth_type: r.auth_type || 'none',
                    auth_config: r.auth_config || null
                }));

                console.log(`🚀 Starting ${server.name} on port ${server.port}`);
                console.log(`📋 Routes:`, activeRoutes.map((r: any) => `${r.method} ${r.path}`));

                // Pass server_id, port, and routes to start this specific server
                await invoke("start_mock_server", {
                    serverId: server.id,
                    port: server.port,
                    routes: activeRoutes
                });

                // Update local state immediately
                const updatedServer = { ...server, status: "running" };
                setSelectedServer(updatedServer);
                setServers(prev => prev.map(s => s.id === server.id ? updatedServer : s));
                // Try to persist
                try { await dbService.saveMockServer(updatedServer); } catch (e) { console.log("Using sample data, skip DB save"); }

                console.log(`✅ ${server.name} running at http://localhost:${server.port}`);
                console.log(`   Try: curl http://localhost:${server.port}${activeRoutes[0]?.path || '/test'}`);
            } catch (e) {
                console.error("Failed to start server:", e);
                setToast({ message: `Failed to start server: ${e}`, type: 'error' });
                return;
            }
        }
    };

    const createRoute = async () => {
        if (!selectedServer) return;
        const newRoute = {
            id: `m-${Date.now()}`,
            server_id: selectedServer.id,
            method: "GET",
            path: "/new-endpoint",
            status_code: 200,
            response_body: "{}",
            response_headers: [{ Key: "Content-Type", Value: "application/json" }],
            enabled: true
        };
        await dbService.saveMock(newRoute);
        await loadRoutes(selectedServer.id);
        setSelectedRoute(newRoute);
    };

    const deleteRoute = async (id: string) => {
        await dbService.deleteMock(id);
        if (selectedRoute?.id === id) setSelectedRoute(null);
        if (selectedServer) loadRoutes(selectedServer.id);
    };

    const handleSaveRoute = async (route: any) => {
        await dbService.saveMock({
            ...route,
            response_headers: route.response_headers || []
        });
        if (selectedServer) loadRoutes(selectedServer.id);
    };

    const updateSelected = (updates: any) => {
        setSelectedRoute((prev: any) => ({ ...prev, ...updates }));
    };

    // Open create server modal
    const handleCreateServer = () => {
        setCreateModal({ name: 'New Server' });
    };

    // Actually create the server (called from modal)
    const doCreateServer = async (name: string) => {
        // Find next available port (start from 3001, skip used ports)
        const usedPorts = servers.map((s: any) => s.port);
        let nextPort = 3001;
        while (usedPorts.includes(nextPort)) {
            nextPort++;
        }

        const newServer = {
            id: `server-${Date.now()}`,
            name,
            port: nextPort,
            status: 'stopped'
        };

        try {
            await dbService.saveMockServer(newServer);
            setServers(prev => [...prev, newServer]);
            setSelectedServer(newServer);
            setToast({ message: `Server "${name}" created on port ${nextPort}`, type: 'success' });
        } catch (err) {
            console.error('Failed to create server:', err);
            setToast({ message: 'Failed to create server', type: 'error' });
        }
    };

    return (
        <div className="mock-view-container">
            {/* Left Sidebar: Server List */}
            <div className="servers-sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">MOCK SERVERS</span>
                    <button className="icon-btn-ghost" onClick={handleCreateServer}><Plus size={16} /></button>
                </div>
                <div className="server-list content-scroll">
                    {servers.map(server => (
                        <div
                            key={server.id}
                            className={`server-nav-item ${selectedServer?.id === server.id ? 'active' : ''}`}
                            onClick={() => setSelectedServer(server)}
                        >
                            <div className="server-icon"><Server size={18} /></div>
                            <div className="server-info">
                                <div className="server-name">{server.name}</div>
                                <div className={`server-status-badge ${server.status}`}>
                                    <div className={`status-dot ${server.status}`}></div>
                                    <span>{server.status === 'running' ? 'Running' : 'Stopped'}</span>
                                </div>
                            </div>
                            <button
                                className="server-menu-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setServerMenuOpen(serverMenuOpen === server.id ? null : server.id);
                                }}
                            >
                                <MoreVertical size={16} />
                            </button>
                            {serverMenuOpen === server.id && (
                                <div className="server-menu-popover">
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameModal({ server, name: server.name });
                                        setServerMenuOpen(null);
                                    }}>
                                        ✏️ Rename
                                    </button>
                                    <button onClick={async (e) => {
                                        e.stopPropagation();
                                        setServerMenuOpen(null); // Close menu first

                                        // Find next available port
                                        const usedPorts = servers.map((s: any) => s.port);
                                        let nextPort = server.port + 1;
                                        while (usedPorts.includes(nextPort)) {
                                            nextPort++;
                                        }

                                        const duplicate = {
                                            id: `srv-${Date.now()}`,
                                            name: `${server.name} (Copy)`,
                                            status: 'stopped',
                                            port: nextPort
                                        };

                                        try {
                                            console.log('Duplicating server:', duplicate);
                                            await dbService.saveMockServer(duplicate);
                                            setServers(prev => [...prev, duplicate]);
                                            setToast({ message: `Server duplicated on port ${nextPort}`, type: 'success' });
                                        } catch (err) {
                                            console.error('Failed to duplicate server:', err);
                                            setToast({ message: 'Failed to duplicate server', type: 'error' });
                                        }
                                    }}>
                                        📋 Duplicate
                                    </button>
                                    <div className="menu-divider"></div>
                                    <button className="danger" onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteModal(server);
                                        setServerMenuOpen(null);
                                    }}>
                                        🗑️ Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Dashboard Area */}
            <div className="mock-dashboard">
                {selectedServer ? (
                    <>
                        {/* Compact Dashboard Header */}
                        <div className="dashboard-header compact">
                            <div className="header-left">
                                <h1>{selectedServer.name}</h1>
                                {selectedServer.status === 'running' && <span className="status-badge running">Running</span>}
                                <span className="base-url">http://localhost:{selectedServer.port}</span>
                            </div>
                            <div className="header-right">
                                <div className="config-inline">
                                    <label>Port</label>
                                    <input
                                        type="number"
                                        value={selectedServer.port}
                                        readOnly={selectedServer.status === 'running'}
                                        onChange={e => {
                                            const newServers = servers.map(s => s.id === selectedServer.id ? { ...s, port: parseInt(e.target.value) } : s);
                                            setServers(newServers);
                                            setSelectedServer({ ...selectedServer, port: parseInt(e.target.value) });
                                        }}
                                        className="port-input-sm"
                                    />
                                </div>
                                <button
                                    className={`secondary-btn ${showLogs ? 'active' : ''}`}
                                    onClick={() => setShowLogs(!showLogs)}
                                >
                                    <Server size={14} />
                                    Logs {logs.length > 0 && <span className="log-count">{logs.length}</span>}
                                </button>
                                <button
                                    className={`primary-btn ${selectedServer.status === 'running' ? 'danger' : 'success'}`}
                                    onClick={() => handleStartStop(selectedServer)}
                                >
                                    {selectedServer.status === 'running' ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                    {selectedServer.status === 'running' ? 'Stop' : 'Start'}
                                </button>
                            </div>
                        </div>

                        {/* Logs Panel - toggleable */}
                        {showLogs && (
                            <div className="logs-panel">
                                <div className="logs-panel-header">
                                    <span>Request Logs</span>
                                    <div className="logs-actions">
                                        <button className="icon-btn-ghost" onClick={() => setLogs([])}>Clear</button>
                                        <button className="icon-btn-ghost" onClick={() => setShowLogs(false)}>×</button>
                                    </div>
                                </div>
                                <div className="logs-panel-content content-scroll">
                                    {logs.length === 0 ? (
                                        <div className="logs-empty">No requests yet. Start the server and make some requests to see logs here.</div>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className="log-entry">
                                                <span className="log-time">{new Date().toLocaleTimeString()}</span>
                                                <span className="log-message">{log}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Split Content: Endpoints & Editor */}
                        <div className="dashboard-content">
                            {/* Inner Left: Endpoints List */}
                            <div className="endpoints-list-panel">
                                <div className="panel-header">
                                    <span>Endpoints</span>
                                    <button className="icon-btn-ghost" onClick={createRoute}><Plus size={16} /></button>
                                </div>
                                <div className="endpoints-scroller content-scroll">
                                    {routes.map(route => (
                                        <div
                                            key={route.id}
                                            className={`endpoint-card ${selectedRoute?.id === route.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRoute(route)}
                                        >
                                            <div className="card-top">
                                                <span className={`method-badge-sm ${route.method.toLowerCase()}`}>{route.method}</span>
                                                <span className="endpoint-name">{route.path}</span>
                                                <MoreVertical size={14} className="more-icon" />
                                            </div>
                                            <div className="card-bottom">
                                                <span className={`status-text s-${route.status_code}`}>
                                                    {route.status_code} {getStatusText(route.status_code)}
                                                </span>
                                                <span className="dot">•</span>
                                                <span className="latency-text">{route.delay_ms || 0}ms</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Inner Right: Editor */}
                            <div className="route-editor-panel">
                                {selectedRoute ? (
                                    <>
                                        <div className="editor-top-bar">
                                            <div className="method-path-group">
                                                <div className="method-select-wrapper">
                                                    <select
                                                        value={selectedRoute.method}
                                                        onChange={e => updateSelected({ method: e.target.value })}
                                                        className="bare-select"
                                                    >
                                                        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={selectedRoute.path}
                                                    onChange={e => updateSelected({ path: e.target.value })}
                                                    className="bare-input path-input"
                                                />
                                            </div>
                                            <div className="editor-actions">
                                                <button className="icon-btn-ghost" onClick={() => deleteRoute(selectedRoute.id)}><Trash2 size={16} /></button>
                                                <button className="primary-btn sm" onClick={() => handleSaveRoute(selectedRoute)}>Save Changes</button>
                                            </div>
                                        </div>

                                        <div className="editor-settings-bar">
                                            <div className="setting-group">
                                                <label>STATUS</label>
                                                <div className="select-wrapper">
                                                    <input
                                                        type="number"
                                                        value={selectedRoute.status_code}
                                                        onChange={e => updateSelected({ status_code: parseInt(e.target.value) })}
                                                        className="bare-input"
                                                    />
                                                </div>
                                            </div>
                                            <div className="setting-group">
                                                <label>DELAY (MS)</label>
                                                <input
                                                    type="number"
                                                    value={selectedRoute.delay_ms || 0}
                                                    onChange={e => updateSelected({ delay_ms: parseInt(e.target.value) })}
                                                    className="bare-input"
                                                />
                                            </div>
                                        </div>

                                        {/* Tabs + Editor Connected Container */}
                                        <div className="editor-tabs-container">
                                            <div className="editor-tabs">
                                                <button
                                                    className={`editor-tab ${activeEditorTab === 'params' ? 'active' : ''}`}
                                                    onClick={() => setActiveEditorTab('params')}
                                                >Params</button>
                                                <button
                                                    className={`editor-tab ${activeEditorTab === 'auth' ? 'active' : ''}`}
                                                    onClick={() => setActiveEditorTab('auth')}
                                                >Authorization</button>
                                                <button
                                                    className={`editor-tab ${activeEditorTab === 'headers' ? 'active' : ''}`}
                                                    onClick={() => setActiveEditorTab('headers')}
                                                >Headers</button>
                                                <button
                                                    className={`editor-tab ${activeEditorTab === 'body' ? 'active' : ''}`}
                                                    onClick={() => setActiveEditorTab('body')}
                                                >Body</button>
                                            </div>

                                            <div className="editor-body">
                                                {/* Params Tab */}
                                                {activeEditorTab === 'params' && (
                                                    <div className="params-editor">
                                                        <p className="editor-help-text">Configure expected query parameters for this endpoint.</p>
                                                        {(selectedRoute.request_params || []).map((p: any, idx: number) => (
                                                            <div key={idx} className="header-row">
                                                                <input
                                                                    type="text"
                                                                    value={p.key || ''}
                                                                    onChange={e => {
                                                                        const newParams = [...(selectedRoute.request_params || [])];
                                                                        newParams[idx] = { ...newParams[idx], key: e.target.value };
                                                                        updateSelected({ request_params: newParams });
                                                                    }}
                                                                    placeholder="Parameter Key"
                                                                    className="header-input"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={p.value || ''}
                                                                    onChange={e => {
                                                                        const newParams = [...(selectedRoute.request_params || [])];
                                                                        newParams[idx] = { ...newParams[idx], value: e.target.value };
                                                                        updateSelected({ request_params: newParams });
                                                                    }}
                                                                    placeholder="Expected Value (optional)"
                                                                    className="header-input"
                                                                />
                                                                <button
                                                                    className="icon-btn-ghost"
                                                                    onClick={() => {
                                                                        const newParams = (selectedRoute.request_params || []).filter((_: any, i: number) => i !== idx);
                                                                        updateSelected({ request_params: newParams });
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            className="add-header-btn"
                                                            onClick={() => {
                                                                const newParams = [...(selectedRoute.request_params || []), { key: '', value: '' }];
                                                                updateSelected({ request_params: newParams });
                                                            }}
                                                        >
                                                            <Plus size={14} /> Add Parameter
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Authorization Tab */}
                                                {activeEditorTab === 'auth' && (
                                                    <div className="auth-editor">
                                                        <div className="auth-type-selector">
                                                            <label>Auth Type:</label>
                                                            <select
                                                                value={selectedRoute.auth_type || 'none'}
                                                                onChange={e => updateSelected({ auth_type: e.target.value, auth_config: null })}
                                                                className="auth-select"
                                                            >
                                                                <option value="none">No Auth</option>
                                                                <option value="basic">Basic Auth</option>
                                                                <option value="bearer">Bearer Token</option>
                                                                <option value="api_key">API Key</option>
                                                            </select>
                                                        </div>

                                                        {selectedRoute.auth_type === 'basic' && (
                                                            <div className="auth-config-panel">
                                                                <p className="editor-help-text">Requests must include Authorization header with matching Basic credentials.</p>
                                                                <div className="auth-field">
                                                                    <label>Username:</label>
                                                                    <input
                                                                        type="text"
                                                                        value={selectedRoute.auth_config?.username || ''}
                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, username: e.target.value } })}
                                                                        placeholder="expected username"
                                                                        className="header-input"
                                                                    />
                                                                </div>
                                                                <div className="auth-field">
                                                                    <label>Password:</label>
                                                                    <input
                                                                        type="text"
                                                                        value={selectedRoute.auth_config?.password || ''}
                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, password: e.target.value } })}
                                                                        placeholder="expected password"
                                                                        className="header-input"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedRoute.auth_type === 'bearer' && (
                                                            <div className="auth-config-panel">
                                                                <p className="editor-help-text">Requests must include Authorization: Bearer [token] header.</p>
                                                                <div className="auth-field">
                                                                    <label>Expected Token:</label>
                                                                    <input
                                                                        type="text"
                                                                        value={selectedRoute.auth_config?.token || ''}
                                                                        onChange={e => updateSelected({ auth_config: { token: e.target.value } })}
                                                                        placeholder="expected token value"
                                                                        className="header-input"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedRoute.auth_type === 'api_key' && (
                                                            <div className="auth-config-panel">
                                                                <p className="editor-help-text">Requests must include specified header with matching API key.</p>
                                                                <div className="auth-field">
                                                                    <label>Header Name:</label>
                                                                    <input
                                                                        type="text"
                                                                        value={selectedRoute.auth_config?.header || 'X-API-Key'}
                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, header: e.target.value } })}
                                                                        placeholder="X-API-Key"
                                                                        className="header-input"
                                                                    />
                                                                </div>
                                                                <div className="auth-field">
                                                                    <label>Expected Key:</label>
                                                                    <input
                                                                        type="text"
                                                                        value={selectedRoute.auth_config?.key || ''}
                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, key: e.target.value } })}
                                                                        placeholder="expected api key value"
                                                                        className="header-input"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedRoute.auth_type === 'none' && (
                                                            <p className="editor-help-text muted">This endpoint does not require authentication.</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Headers Tab */}
                                                {activeEditorTab === 'headers' && (
                                                    <div className="headers-editor">
                                                        {(selectedRoute.response_headers || []).map((h: any, idx: number) => (
                                                            <div key={idx} className="header-row">
                                                                <input
                                                                    type="text"
                                                                    value={h.Key || ''}
                                                                    onChange={e => {
                                                                        const newHeaders = [...(selectedRoute.response_headers || [])];
                                                                        newHeaders[idx] = { ...newHeaders[idx], Key: e.target.value };
                                                                        updateSelected({ response_headers: newHeaders });
                                                                    }}
                                                                    placeholder="Header Key"
                                                                    className="header-input"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={h.Value || ''}
                                                                    onChange={e => {
                                                                        const newHeaders = [...(selectedRoute.response_headers || [])];
                                                                        newHeaders[idx] = { ...newHeaders[idx], Value: e.target.value };
                                                                        updateSelected({ response_headers: newHeaders });
                                                                    }}
                                                                    placeholder="Header Value"
                                                                    className="header-input"
                                                                />
                                                                <button
                                                                    className="icon-btn-ghost"
                                                                    onClick={() => {
                                                                        const newHeaders = (selectedRoute.response_headers || []).filter((_: any, i: number) => i !== idx);
                                                                        updateSelected({ response_headers: newHeaders });
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            className="add-header-btn"
                                                            onClick={() => {
                                                                const newHeaders = [...(selectedRoute.response_headers || []), { Key: '', Value: '' }];
                                                                updateSelected({ response_headers: newHeaders });
                                                            }}
                                                        >
                                                            <Plus size={14} /> Add Header
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Body Tab */}
                                                {activeEditorTab === 'body' && (
                                                    <textarea
                                                        value={selectedRoute.response_body || ''}
                                                        onChange={e => updateSelected({ response_body: e.target.value })}
                                                        className="response-textarea"
                                                        spellCheck={false}
                                                        placeholder='{"message": "Hello World"}'
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-editor">
                                        Select an endpoint to edit
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-dashboard-state">
                        Select a server to view details
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)}>×</button>
                </div>
            )}

            {/* Rename Modal */}
            {renameModal && (
                <div className="modal-overlay" onClick={() => setRenameModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Rename Server</h3>
                        <input
                            type="text"
                            value={renameModal.name}
                            onChange={e => setRenameModal({ ...renameModal, name: e.target.value })}
                            autoFocus
                            className="modal-input"
                            placeholder="Server name"
                        />
                        <div className="modal-actions">
                            <button className="modal-btn secondary" onClick={() => setRenameModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="modal-btn primary"
                                onClick={async () => {
                                    if (renameModal.name && renameModal.name !== renameModal.server.name) {
                                        try {
                                            await dbService.saveMockServer({ ...renameModal.server, name: renameModal.name });
                                            const updated = { ...renameModal.server, name: renameModal.name };
                                            setServers(prev => prev.map(s => s.id === renameModal.server.id ? updated : s));
                                            if (selectedServer?.id === renameModal.server.id) setSelectedServer(updated);
                                            setToast({ message: 'Server renamed', type: 'success' });
                                        } catch (err) {
                                            setToast({ message: 'Failed to rename server', type: 'error' });
                                        }
                                    }
                                    setRenameModal(null);
                                }}
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Delete Server</h3>
                        <p>Are you sure you want to delete <strong>"{deleteModal.name}"</strong>? This cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="modal-btn secondary" onClick={() => setDeleteModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="modal-btn danger"
                                onClick={async () => {
                                    try {
                                        if (deleteModal.status === 'running') {
                                            await invoke('stop_mock_server', { serverId: deleteModal.id });
                                        }
                                        await dbService.deleteMockServer(deleteModal.id);

                                        // Remove from list and select another server if deleting active one
                                        const remaining = servers.filter(s => s.id !== deleteModal.id);
                                        setServers(remaining);

                                        if (selectedServer?.id === deleteModal.id) {
                                            // Select another server (prefer previous in list, or first available)
                                            const currentIndex = servers.findIndex(s => s.id === deleteModal.id);
                                            const nextServer = remaining[Math.max(0, currentIndex - 1)] || remaining[0] || null;
                                            setSelectedServer(nextServer);
                                        }

                                        setToast({ message: 'Server deleted', type: 'success' });
                                    } catch (err) {
                                        setToast({ message: 'Failed to delete server', type: 'error' });
                                    }
                                    setDeleteModal(null);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Server Modal */}
            {createModal && (
                <div className="modal-overlay" onClick={() => setCreateModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Create New Server</h3>
                        <input
                            type="text"
                            value={createModal.name}
                            onChange={e => setCreateModal({ ...createModal, name: e.target.value })}
                            autoFocus
                            className="modal-input"
                            placeholder="Server name"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && createModal.name.trim()) {
                                    doCreateServer(createModal.name.trim());
                                    setCreateModal(null);
                                }
                            }}
                        />
                        <div className="modal-actions">
                            <button className="modal-btn secondary" onClick={() => setCreateModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="modal-btn primary"
                                onClick={() => {
                                    if (createModal.name.trim()) {
                                        doCreateServer(createModal.name.trim());
                                        setCreateModal(null);
                                    }
                                }}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
