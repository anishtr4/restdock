
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Square, Plus, Trash2, Server, MoreVertical, X } from "lucide-react";
import KeyValueEditor from "./KeyValueEditor";
import { dbService } from "../services/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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




interface MockServerViewProps {
    logs: string[];
    setLogs: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function MockServerView({ logs, setLogs }: MockServerViewProps) {
    // State
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<any>(null);
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
    const [activeEditorTab, setActiveEditorTab] = useState<'params' | 'auth' | 'headers' | 'body'>('body');
    const [showLogs, setShowLogs] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameName, setRenameName] = useState("");
    const [serverToRename, setServerToRename] = useState<any>(null);

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
                await invoke("stop_mock_server", { serverId: server.id });
                const updatedServer = { ...server, status: "stopped" };
                setSelectedServer(updatedServer);
                setServers(prev => prev.map(s => s.id === server.id ? updatedServer : s));
                try { await dbService.saveMockServer(updatedServer); } catch (e) { console.log("Using sample data, skip DB save"); }
            } catch (e) {
                console.error("Failed to stop server:", e);
            }
        } else {
            try {
                let serverRoutes = routes;
                if (routes.length === 0 || routes[0]?.server_id !== server.id) {
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

                await invoke("start_mock_server", {
                    serverId: server.id,
                    port: server.port,
                    routes: activeRoutes
                });

                const updatedServer = { ...server, status: "running" };
                setSelectedServer(updatedServer);
                setServers(prev => prev.map(s => s.id === server.id ? updatedServer : s));
                try { await dbService.saveMockServer(updatedServer); } catch (e) { console.log("Using sample data, skip DB save"); }
            } catch (e) {
                console.error("Failed to start server:", e);
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

    const handleCreateServer = async () => {
        const usedPorts = servers.map((s: any) => s.port);
        let nextPort = 3001;
        while (usedPorts.includes(nextPort)) {
            nextPort++;
        }

        const newServer = {
            id: `server-${Date.now()}`,
            name: "New Server",
            port: nextPort,
            status: 'stopped'
        };

        try {
            await dbService.saveMockServer(newServer);
            setServers(prev => [...prev, newServer]);
            setSelectedServer(newServer);
        } catch (err) {
            console.error('Failed to create server:', err);
        }
    };

    const handleDuplicateServer = async (server: any) => {
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
            await dbService.saveMockServer(duplicate);
            setServers(prev => [...prev, duplicate]);
        } catch (err) {
            console.error('Failed to duplicate server:', err);
        }
    };

    const deleteServer = async (id: string) => {
        try {
            await dbService.deleteMockServer(id);
            setServers(prev => prev.filter(s => s.id !== id));
            if (selectedServer?.id === id) setSelectedServer(null);
        } catch (err) {
            console.error("Failed to delete server", err);
        }
    };

    return (
        <div className="flex h-full bg-background">
            {/* Left Sidebar: Server List */}
            <div className="w-64 border-r flex flex-col bg-muted/30">
                <div className="p-3 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mock Servers</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateServer}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {servers.map(server => (
                            <div
                                key={server.id}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm group transition-colors",
                                    selectedServer?.id === server.id ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setSelectedServer(server)}
                            >
                                <Server className={cn("h-4 w-4", selectedServer?.id === server.id ? "text-primary" : "text-muted-foreground")} />
                                <div className="flex-1 truncate flex flex-col">
                                    <span className="truncate">{server.name}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={cn("h-1.5 w-1.5 rounded-full", server.status === 'running' ? "bg-green-500" : "bg-red-500")} />
                                        <span className="text-[10px] text-muted-foreground uppercase">{server.status}</span>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            setServerToRename(server);
                                            setRenameName(server.name);
                                            setRenameDialogOpen(true);
                                        }}>
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            handleDuplicateServer(server);
                                        }}>
                                            Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                            e.stopPropagation();
                                            deleteServer(server.id);
                                        }}>
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Dashboard Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedServer ? (
                    <>
                        {/* Compact Dashboard Header */}
                        <div className="border-b p-4 bg-background flex items-center justify-between shadow-sm z-10">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold tracking-tight">{selectedServer.name}</h1>
                                    <Badge variant={selectedServer.status === 'running' ? "default" : "secondary"}>
                                        {selectedServer.status === 'running' ? 'Running' : 'Stopped'}
                                    </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground font-mono">http://localhost:{selectedServer.port}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Port</Label>
                                    <Input
                                        type="number"
                                        value={selectedServer.port}
                                        readOnly={selectedServer.status === 'running'}
                                        onChange={e => {
                                            const newServers = servers.map(s => s.id === selectedServer.id ? { ...s, port: parseInt(e.target.value) } : s);
                                            setServers(newServers);
                                            setSelectedServer({ ...selectedServer, port: parseInt(e.target.value) });
                                        }}
                                        className="w-24 h-8"
                                    />
                                </div>
                                <div className="h-6 w-px bg-border mx-1" />
                                <Button
                                    variant={showLogs ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setShowLogs(!showLogs)}
                                    className="gap-2"
                                >
                                    <Server className="h-4 w-4" />
                                    Logs
                                    {logs.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{logs.length}</Badge>}
                                </Button>
                                <Button
                                    variant={selectedServer.status === 'running' ? "destructive" : "default"}
                                    size="sm"
                                    onClick={() => handleStartStop(selectedServer)}
                                    className="gap-2 min-w-[100px]"
                                >
                                    {selectedServer.status === 'running' ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                                    {selectedServer.status === 'running' ? 'Stop Server' : 'Start Server'}
                                </Button>
                            </div>
                        </div>

                        {/* Logs Panel - toggleable */}
                        {showLogs && (
                            <div className="h-48 border-b bg-muted/40 flex flex-col">
                                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/60">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Request Logs</span>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => setLogs([])}>Clear</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setShowLogs(false)}><X className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 font-mono text-xs p-2">
                                    {logs.length === 0 ? (
                                        <div className="text-muted-foreground p-2 italic">No requests yet.</div>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className="flex gap-2 py-1 border-b border-border/50 last:border-0 hover:bg-accent/20 px-2 rounded">
                                                <span className="text-muted-foreground opacity-70">[{new Date().toLocaleTimeString()}]</span>
                                                <span className="break-all">{log}</span>
                                            </div>
                                        ))
                                    )}
                                </ScrollArea>
                            </div>
                        )}

                        {/* Split Content: Endpoints & Editor */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Inner Left: Endpoints List */}
                            <div className="w-1/3 border-r flex flex-col bg-muted/10">
                                <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Endpoints</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createRoute}><Plus className="h-4 w-4" /></Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-2">
                                        {routes.map(route => (
                                            <div
                                                key={route.id}
                                                className={cn(
                                                    "border rounded-md p-3 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50",
                                                    selectedRoute?.id === route.id ? "border-primary bg-accent ring-1 ring-primary/20" : "bg-card"
                                                )}
                                                onClick={() => setSelectedRoute(route)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 uppercase",
                                                        route.method === 'GET' ? 'text-blue-500 border-blue-500/20 bg-blue-500/10' :
                                                            route.method === 'POST' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                                                                route.method === 'DELETE' ? 'text-red-500 border-red-500/20 bg-red-500/10' :
                                                                    route.method === 'PUT' ? 'text-orange-500 border-orange-500/20 bg-orange-500/10' :
                                                                        'text-purple-500 border-purple-500/20 bg-purple-500/10'
                                                    )}>
                                                        {route.method}
                                                    </Badge>

                                                </div>
                                                <div className="font-mono text-xs truncate font-medium mb-2" title={route.path}>{route.path}</div>
                                                <div className="flex items-center text-[10px] text-muted-foreground gap-2">
                                                    <span className={cn("font-medium", route.status_code >= 400 ? "text-destructive" : "text-green-600")}>
                                                        {route.status_code} {getStatusText(route.status_code)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{route.delay_ms || 0}ms delay</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Inner Right: Editor */}
                            <div className="flex-1 flex flex-col bg-background">
                                {selectedRoute ? (
                                    <>
                                        <div className="p-4 border-b space-y-4 bg-muted/5">
                                            <div className="flex gap-2">
                                                <div className="w-28">
                                                    <Select
                                                        value={selectedRoute.method}
                                                        onValueChange={val => updateSelected({ method: val })}
                                                    >
                                                        <SelectTrigger className="h-9 font-medium">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Input
                                                    type="text"
                                                    value={selectedRoute.path}
                                                    onChange={e => updateSelected({ path: e.target.value })}
                                                    className="flex-1 h-9 font-mono"
                                                    placeholder="/path/to/resource"
                                                />
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => deleteRoute(selectedRoute.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button className="h-9" onClick={() => handleSaveRoute(selectedRoute)}>Save</Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Status Code</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedRoute.status_code}
                                                        onChange={e => updateSelected({ status_code: parseInt(e.target.value) })}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Artificial Delay (ms)</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedRoute.delay_ms || 0}
                                                        onChange={e => updateSelected({ delay_ms: parseInt(e.target.value) })}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Editor Tabs */}
                                        <div className="border-b px-2">
                                            <div className="flex gap-1">
                                                {['params', 'auth', 'headers', 'body'].map(tab => (
                                                    <button
                                                        key={tab}
                                                        className={cn(
                                                            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                                            activeEditorTab === tab
                                                                ? "border-primary text-foreground"
                                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                                        )}
                                                        onClick={() => setActiveEditorTab(tab as any)}
                                                    >
                                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-auto p-4">
                                            {/* Params Tab */}
                                            {activeEditorTab === 'params' && (
                                                <div className="space-y-4">
                                                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest px-1">Query Parameters</div>
                                                    <KeyValueEditor
                                                        items={(selectedRoute.request_params || []).map((p: any) => ({
                                                            key: p.key || '',
                                                            value: p.value || '',
                                                            active: true
                                                        }))}
                                                        onChange={(items) => {
                                                            const newParams = items.map(p => ({
                                                                key: p.key,
                                                                value: p.value
                                                            }));
                                                            updateSelected({ request_params: newParams });
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Authorization Tab */}
                                            {activeEditorTab === 'auth' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4 py-2">
                                                        <Label className="w-24 flex-shrink-0 text-muted-foreground font-medium text-xs uppercase tracking-wide">Auth Type</Label>
                                                        <Select
                                                            value={selectedRoute.auth_type || 'none'}
                                                            onValueChange={val => updateSelected({ auth_type: val, auth_config: null })}
                                                        >
                                                            <SelectTrigger className="w-[200px] h-9">
                                                                <SelectValue placeholder="Select auth type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">No Auth</SelectItem>
                                                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                                                <SelectItem value="basic">Basic Auth</SelectItem>
                                                                <SelectItem value="api_key">API Key</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {selectedRoute.auth_type && selectedRoute.auth_type !== 'none' && (
                                                        <div className="w-full border rounded-md overflow-hidden bg-background shadow-sm">
                                                            <Table className="border-collapse table-fixed">
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent border-b divide-x divide-border/50 bg-muted/30">
                                                                        <TableHead className="w-[30%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Key</TableHead>
                                                                        <TableHead className="w-[40%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Value</TableHead>
                                                                        <TableHead className="w-[30%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {selectedRoute.auth_type === 'bearer' && (
                                                                        <TableRow className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                                                                            <TableCell className="p-0 align-middle bg-muted/5 w-[30%] px-3 text-xs font-medium text-muted-foreground/80">Expected Token</TableCell>
                                                                            <TableCell className="p-0 align-middle relative">
                                                                                <Input
                                                                                    value={selectedRoute.auth_config?.token || ''}
                                                                                    onChange={e => updateSelected({ auth_config: { token: e.target.value } })}
                                                                                    placeholder="e.g. secret-token-123"
                                                                                    className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40"
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="p-0 align-middle">
                                                                                <div className="px-3 text-xs italic text-muted-foreground/50">Bearer Token</div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}

                                                                    {selectedRoute.auth_type === 'basic' && (
                                                                        <>
                                                                            <TableRow className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                                                                                <TableCell className="p-0 align-middle bg-muted/5 w-[30%] px-3 text-xs font-medium text-muted-foreground/80">Username</TableCell>
                                                                                <TableCell className="p-0 align-middle relative">
                                                                                    <Input
                                                                                        value={selectedRoute.auth_config?.username || ''}
                                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, username: e.target.value } })}
                                                                                        placeholder="Username"
                                                                                        className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40"
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="p-0 align-middle"></TableCell>
                                                                            </TableRow>
                                                                            <TableRow className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                                                                                <TableCell className="p-0 align-middle bg-muted/5 w-[30%] px-3 text-xs font-medium text-muted-foreground/80">Password</TableCell>
                                                                                <TableCell className="p-0 align-middle relative">
                                                                                    <Input
                                                                                        value={selectedRoute.auth_config?.password || ''}
                                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, password: e.target.value } })}
                                                                                        placeholder="Password"
                                                                                        className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40"
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="p-0 align-middle"></TableCell>
                                                                            </TableRow>
                                                                        </>
                                                                    )}

                                                                    {selectedRoute.auth_type === 'api_key' && (
                                                                        <>
                                                                            <TableRow className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                                                                                <TableCell className="p-0 align-middle bg-muted/5 w-[30%] px-3 text-xs font-medium text-muted-foreground/80">Header Name</TableCell>
                                                                                <TableCell className="p-0 align-middle relative">
                                                                                    <Input
                                                                                        value={selectedRoute.auth_config?.header || 'X-API-Key'}
                                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, header: e.target.value } })}
                                                                                        placeholder="Header Name"
                                                                                        className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40"
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="p-0 align-middle">
                                                                                    <div className="px-3 text-xs italic text-muted-foreground/50">Header to check</div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                            <TableRow className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                                                                                <TableCell className="p-0 align-middle bg-muted/5 w-[30%] px-3 text-xs font-medium text-muted-foreground/80">Expected Key</TableCell>
                                                                                <TableCell className="p-0 align-middle relative">
                                                                                    <Input
                                                                                        value={selectedRoute.auth_config?.key || ''}
                                                                                        onChange={e => updateSelected({ auth_config: { ...selectedRoute.auth_config, key: e.target.value } })}
                                                                                        placeholder="Expected API Key"
                                                                                        className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40"
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="p-0 align-middle"></TableCell>
                                                                            </TableRow>
                                                                        </>
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    )}
                                                    {(!selectedRoute.auth_type || selectedRoute.auth_type === 'none') && (
                                                        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/5 border rounded-md border-dashed">
                                                            <p className="text-sm text-muted-foreground">
                                                                This mock route does not require any authorization.
                                                            </p>
                                                            <p className="text-xs text-muted-foreground/60 mt-1">
                                                                Select an Auth type from the dropdown above to enforce authentication.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Headers Tab */}
                                            {activeEditorTab === 'headers' && (
                                                <div className="space-y-4">
                                                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest px-1">Response Headers</div>
                                                    <KeyValueEditor
                                                        items={(selectedRoute.response_headers || []).map((h: any) => ({
                                                            key: h.Key || '',
                                                            value: h.Value || '',
                                                            active: true
                                                        }))}
                                                        onChange={(items) => {
                                                            const newHeaders = items.map(p => ({
                                                                Key: p.key,
                                                                Value: p.value
                                                            }));
                                                            updateSelected({ response_headers: newHeaders });
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Body Tab */}
                                            {activeEditorTab === 'body' && (
                                                <div className="h-full flex flex-col">
                                                    <Textarea
                                                        value={selectedRoute.response_body || ''}
                                                        onChange={e => updateSelected({ response_body: e.target.value })}
                                                        className="flex-1 font-mono text-sm leading-relaxed"
                                                        placeholder='{"message": "Response body here..."}'
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                        <div className="p-4 rounded-full bg-muted mb-4">
                                            <Server className="h-8 w-8 opacity-50" />
                                        </div>
                                        <p>Select an endpoint to edit configuration</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <p>Select a server to view details</p>
                    </div>
                )}
            </div>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Server</DialogTitle>
                        <DialogDescription>Enter a new name for this mock server.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label>Name</Label>
                        <Input
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={async () => {
                            if (serverToRename && renameName && renameName !== serverToRename.name) {
                                try {
                                    await dbService.saveMockServer({ ...serverToRename, name: renameName });
                                    const updated = { ...serverToRename, name: renameName };
                                    setServers(prev => prev.map(s => s.id === serverToRename.id ? updated : s));
                                    if (selectedServer?.id === serverToRename.id) setSelectedServer(updated);
                                } catch (err) {
                                    console.error("Failed rename", err);
                                }
                            }
                            setRenameDialogOpen(false);
                        }}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
