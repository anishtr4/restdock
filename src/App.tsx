import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  History as HistoryIcon,
  Settings,
  Server,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen
} from "lucide-react";
import RequestPanel from "./components/RequestPanel";
import ResponsePanel from "./components/ResponsePanel";
import SettingsView, { AppSettings } from "./components/SettingsView";
import MockServerView from "./components/MockServerView";
import { dbService } from "./services/db";

export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestData {
  id: string;
  name: string;
  method: RequestMethod;
  url: string;
  body?: string;
  headers?: { key: string; value: string; active: boolean; description?: string }[];
  params?: { key: string; value: string; active: boolean; description?: string }[];
  auth?: any;
}

export interface Folder {
  id: string;
  name: string;
  type: 'folder';
  items: (RequestData | Folder)[];
}

export interface Collection {
  id: string;
  name: string;
  type: 'collection';
  items: (RequestData | Folder)[];
  variables?: { key: string; value: string; enabled: boolean }[];
}

export interface Tab {
  id: string;
  requestId: string | null;
  name: string;
  method: RequestMethod;
  response?: any;
  loading?: boolean;
}

export interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  timestamp: number;
  status?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  zoomLevel: 100,
  requestTimeout: 10000,
  followRedirects: true
};

// Helper to get method badge variant
const getMethodVariant = (method: string): "get" | "post" | "put" | "patch" | "delete" => {
  return method.toLowerCase() as any;
};

function App() {
  const [activeView, setActiveView] = useState("collections");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [globalVariables, setGlobalVariables] = useState<{ key: string; value: string; enabled: boolean }[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "t1", requestId: null, name: "Untitled Request", method: "GET" }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("t1");
  const [activeRequest, setActiveRequest] = useState<RequestData | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const tabRequestCache = useRef<Map<string, RequestData>>(new Map());
  const activeRequestRef = useRef<RequestData | null>(null);
  activeRequestRef.current = activeRequest;

  // Apply Settings Effect
  useEffect(() => {
    let effectiveTheme = settings.theme;
    if (effectiveTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.body.style.zoom = `${settings.zoomLevel}%`;
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  // Initialize DB
  useEffect(() => {
    const initDb = async () => {
      try {
        await dbService.init();
        const cols = await dbService.getCollections();
        const hist = await dbService.getHistory();
        const globalVars = await dbService.getGlobalVariables();

        if (cols.length === 0) {
          const colId = `c-${Date.now()}`;
          const exampleCol: Collection = {
            id: colId,
            name: "Sample Collection",
            type: 'collection',
            items: [],
            variables: [
              { key: "base_url", value: "http://localhost:3001", enabled: true }
            ]
          };
          await dbService.createCollection(exampleCol);
          const reloadedCols = await dbService.getCollections();
          setCollections(reloadedCols);
          setExpandedCollections(new Set([colId]));
        } else {
          setCollections(cols);
          setExpandedCollections(new Set(cols.map(c => c.id)));
        }

        setHistory(hist);
        setGlobalVariables(globalVars);
        setIsDbReady(true);
      } catch (e) {
        console.error("Failed to init DB:", e);
      }
    };
    initDb();
  }, []);

  // Recursive search helper
  const findRequestById = (items: any[], id: string): RequestData | undefined => {
    for (const item of items) {
      if (item.type === 'folder') {
        const found = findRequestById(item.items, id);
        if (found) return found;
      } else if (item.id === id) {
        return item;
      }
    }
  };

  // Tab management
  const handleAddTab = (request?: RequestData) => {
    const newTabId = `t${Date.now()}`;
    const newTab: Tab = request
      ? { id: newTabId, requestId: request.id, name: request.name, method: request.method }
      : { id: newTabId, requestId: null, name: "Untitled Request", method: "GET" };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);

    if (request) {
      setActiveRequest(request);
      setResponse(null);
    } else {
      const blankRequest: RequestData = {
        id: `r-${Date.now()}`,
        name: "Untitled Request",
        method: "GET",
        url: "",
        headers: [],
        params: []
      };
      setActiveRequest(blankRequest);
      setResponse(null);
    }
  };

  const handleCloseTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);

    if (newTabs.length === 0) {
      handleAddTab();
      return;
    }

    setTabs(newTabs);

    if (activeTabId === tabId) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }

    tabRequestCache.current.delete(tabId);
  };

  const handleSelectRequest = (request: RequestData) => {
    handleAddTab(request);
  };

  const handleSaveRequest = async (request: RequestData) => {
    if (!collections[0]) return;
    await dbService.saveRequest(request, collections[0].id);
    const updated = await dbService.getCollections();
    setCollections(updated);
  };

  const handleSaveGlobalVariables = async (vars: { key: string; value: string; enabled: boolean }[]) => {
    await dbService.saveGlobalVariables(vars);
    setGlobalVariables(vars);
  };

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Render tree items recursively
  const renderTreeItems = (items: (RequestData | Folder)[], level = 0) => {
    return items.map((item) => {
      if ('type' in item && item.type === 'folder') {
        const isExpanded = expandedFolders.has(item.id);
        return (
          <div key={item.id} style={{ marginLeft: `${level * 12}px` }}>
            <div
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer text-sm"
              onClick={() => toggleFolder(item.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              <span>{item.name}</span>
            </div>
            {isExpanded && renderTreeItems(item.items, level + 1)}
          </div>
        );
      } else {
        const request = item as RequestData;
        return (
  \u003cdiv
  key = { request.id }
  className = "flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer text-sm"
  style = {{ marginLeft: `${(level + 1) * 12}px` }
}
onClick = {() => handleSelectRequest(request)}
          >
            <Badge variant={getMethodVariant(request.method)} className="text-xs px-2">
              {request.method}
            </Badge>
            <span className="truncate">{request.name}</span>
          </div >
        );
      }
    });
  };

return (
  <div className="flex h-screen bg-background">
    {/* Activity Bar */}
    <div className="w-12 bg-muted border-r flex flex-col items-center py-2 gap-2">
      <Button
        variant={activeView === "collections" ? "default" : "ghost"}
        size="icon"
        onClick={() => setActiveView("collections")}
        className="h-10 w-10"
      >
        <FileText className="h-5 w-5" />
      </Button>
      <Button
        variant={activeView === "history" ? "default" : "ghost"}
        size="icon"
        onClick={() => setActiveView("history")}
        className="h-10 w-10"
      >
        <HistoryIcon className="h-5 w-5" />
      </Button>
      <Button
        variant={activeView === "mock_server" ? "default" : "ghost"}
        size="icon"
        onClick={() => setActiveView("mock_server")}
        className="h-10 w-10"
      >
        <Server className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <Button
        variant={activeView === "settings" ? "default" : "ghost"}
        size="icon"
        onClick={() => setActiveView("settings")}
        className="h-10 w-10"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </div>

    {/* Sidebar */}
    {(activeView === "collections" || activeView === "history") && (
      <div className="w-64 bg-background border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            {activeView === "collections" ? "Explorer" : "History"}
          </h2>
          {activeView === "collections" && (
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-2">
          {activeView === "collections" && collections.map((collection) => {
            const isExpanded = expandedCollections.has(collection.id);
            return (
              <div key={collection.id} className="mb-2">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer font-medium text-sm"
                  onClick={() => toggleCollection(collection.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{collection.name}</span>
                </div>
                {isExpanded && (
                  <div className="mt-1">
                    {renderTreeItems(collection.items)}
                  </div>
                )}
              </div>
            );
          })}
          {activeView === "history" && history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer text-sm"
              onClick={() => {
                const newRequest: RequestData = {
                  id: `h-${Date.now()}`,
                  name: entry.url.split('/').pop() || 'Request',
                  method: entry.method as RequestMethod,
                  url: entry.url,
                  headers: [],
                  params: []
                };
                handleAddTab(newRequest);
              }}
            >
              <Badge variant={getMethodVariant(entry.method)} className="text-xs px-2">
                {entry.method}
              </Badge>
              <span className="truncate flex-1">{entry.url}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      {activeView === "settings" && (
        <div className="flex-1 overflow-auto">
          <SettingsView
            globalVariables={globalVariables}
            onGlobalVariablesChange={handleSaveGlobalVariables}
            settings={settings}
            onSettingsChange={setSettings}
          />
        </div>
      )}

      {activeView === "mock_server" && (
        <div className="flex-1 overflow-auto">
          <MockServerView />
        </div>
      )}

      {(activeView === "collections" || activeView === "history") && (
        <>
          {/* Tab Bar */}
          <div className="border-b bg-background flex items-center px-2 gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-2 border-b-2 cursor-pointer group ${activeTabId === tab.id
                  ? 'border-primary bg-accent'
                  : 'border-transparent hover:bg-accent'
                  }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <Badge variant={getMethodVariant(tab.method)} className="text-xs px-1.5 py-0">
                  {tab.method}
                </Badge>
                <span className="text-sm">{tab.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleAddTab()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Request/Response Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-b overflow-auto">
              {activeRequest ? (
                <RequestPanel
                  request={activeRequest}
                  setRequest={setActiveRequest}
                  setResponse={(newResponse: any) => {
                    setResponse(newResponse);
                    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, response: newResponse } : t));
                  }}
                  setLoading={(isLoading: boolean) => {
                    setLoading(isLoading);
                    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: isLoading } : t));
                  }}
                  onSave={handleSaveRequest}
                  onHistoryAdd={async (entry: any) => {
                    const newEntry = {
                      id: `h-${Date.now()}`,
                      method: entry.method,
                      url: entry.url,
                      timestamp: Date.now(),
                      status: entry.status
                    };
                    await dbService.addToHistory(newEntry);
                    setHistory(prev => [newEntry, ...prev]);
                  }}
                  collectionVariables={collections[0]?.variables || []}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a request to start
                </div>
              )}
            </div>
            <div className="h-80 overflow-auto">
              <ResponsePanel response={response} loading={loading} />
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);
}

export default App;
