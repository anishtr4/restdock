import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, History as HistoryIcon, Server } from "lucide-react";
import RequestPanel from "./components/RequestPanel";
import ResponsePanel from "./components/ResponsePanel";
import SettingsView, { AppSettings } from "./components/SettingsView";
import MockServerView from "./components/MockServerView";
import Explorer from "./components/Explorer";
import { dbService } from "./services/db";
import { ScrollableTabs } from "./components/ScrollableTabs";
import { TopBar } from "./components/TopBar";
import { THEMES, ALL_THEME_KEYS } from "@/lib/themes";
import { listen } from "@tauri-apps/api/event";

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
  type?: 'request';
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
  theme: 'system',
  themeId: 'rust',
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
  const [globalVariables, setGlobalVariables] = useState<{ key: string; value: string; enabled: boolean; description?: string }[]>([]);

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

  const [mockLogs, setMockLogs] = useState<string[]>([]);

  // Global Mock Log Listener
  useEffect(() => {
    console.log("Setting up global mock-request listener");
    const unlistenPromise = listen("mock-request", (event: any) => {
      console.log("Global Mock Request Event received:", event);
      setMockLogs(prev => [event.payload, ...prev].slice(0, 50));
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  // Apply Settings Effect
  useEffect(() => {
    let effectiveTheme = settings.theme;
    if (effectiveTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check if data-theme is still needed for other libraries, keep it for safety but primary is class
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.body.style.zoom = `${settings.zoomLevel}%`;

    // Apply Theme Preset Variables
    const activeTheme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];

    // Cleanup old theme overrides
    ALL_THEME_KEYS.forEach(key => {
      document.documentElement.style.removeProperty(key);
    });

    // Merge base variables with mode-specific overrides
    const themeVariables = {
      ...activeTheme.variables,
      ...(effectiveTheme === 'dark' ? activeTheme.darkVariables : activeTheme.lightVariables)
    };

    // Apply new theme overrides
    Object.entries(themeVariables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

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

      } catch (e) {
        console.error("Failed to init DB:", e);
      }
    };
    initDb();
  }, []);

  // Initialize active request for the first tab
  useEffect(() => {
    if (!activeRequest && tabs.length > 0) {
      const blankRequest: RequestData = {
        id: `r-${Date.now()}`,
        name: "Untitled Request",
        method: "GET",
        url: "",
        headers: [],
        params: []
      };
      setActiveRequest(blankRequest);
    }
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

  const handleSaveGlobalVariables = async (vars: { key: string; value: string; enabled: boolean; description?: string }[]) => {
    setGlobalVariables(vars);
    await dbService.saveGlobalVariables(vars);
  };

  // --- CRUD Handlers for Explorer ---

  const handleCreateCollection = async () => {
    try {
      const newCol: Collection = {
        id: `c-${Date.now()}`,
        name: "New Collection",
        type: 'collection',
        items: [],
        variables: []
      };
      await dbService.createCollection(newCol);
      const updated = await dbService.getCollections();
      setCollections(updated);
      setExpandedCollections(prev => new Set(prev).add(newCol.id));
      return newCol.id;
    } catch (error) {
      console.error("Failed to create collection:", error);
      alert("Failed to create collection. Check console for details.");
    }
  };

  const handleDuplicateCollection = async (id: string) => {
    try {
      const originalCol = collections.find(c => c.id === id);
      if (!originalCol) return;

      const newColId = `c-${Date.now()}`;

      // Deep copy helper with ID regeneration
      const deepCloneItems = (items: (RequestData | Folder)[], newCollectionId: string): (RequestData | Folder)[] => {
        return items.map(item => {
          const newItemId = item.type === 'folder'
            ? `f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            : `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          if ('type' in item && item.type === 'folder') {
            return {
              ...item,
              id: newItemId,
              items: deepCloneItems(item.items, newCollectionId)
            };
          } else {
            return {
              ...item,
              id: newItemId,
            } as RequestData;
          }
        });
      };

      const newItems = deepCloneItems(originalCol.items, newColId);

      const newCol: Collection = {
        ...originalCol,
        id: newColId,
        name: `${originalCol.name} (Copy)`,
        items: newItems
      };

      // 1. Create Collection
      await dbService.createCollection(newCol);

      // 2. Recursively Save Items
      const saveItemsRecursively = async (items: (RequestData | Folder)[], collectionId: string, parentId: string | null) => {
        for (const item of items) {
          if ('type' in item && item.type === 'folder') {
            // Save folder
            const folderAsReq = {
              ...item,
              method: 'GET', url: '', headers: [], params: [] // minimal dummy data for folder storage
            } as unknown as RequestData;

            await dbService.saveRequest(folderAsReq, collectionId, parentId, 'folder');
            await saveItemsRecursively(item.items, collectionId, item.id);
          } else {
            // Save Request
            await dbService.saveRequest(item as RequestData, collectionId, parentId, 'request');
          }
        }
      };

      await saveItemsRecursively(newItems, newColId, null);

      const updated = await dbService.getCollections();
      setCollections(updated);
      setExpandedCollections(prev => new Set(prev).add(newColId));
    } catch (error) {
      console.error("Failed to duplicate collection:", error);
      alert("Failed to duplicate collection. Check console for details.");
    }
  };

  const handleCreateRequest = async (parentId: string) => {
    let collectionId = collections.find(c => c.id === parentId)?.id;
    if (!collectionId) {
      const findColId = (items: (RequestData | Folder)[], targetId: string): boolean => {
        for (const item of items) {
          if (item.id === targetId) return true;
          if ('type' in item && item.type === 'folder') {
            if (findColId(item.items, targetId)) return true;
          }
        }
        return false;
      };
      collectionId = collections.find(c => findColId(c.items, parentId))?.id;
    }

    if (!collectionId) return;

    const newReq: RequestData = {
      id: `r-${Date.now()}`,
      name: "New Request",
      method: "GET",
      url: "",
      headers: [],
      params: []
    };
    await dbService.saveRequest(newReq, collectionId, parentId === collectionId ? null : parentId, 'request');
    const updated = await dbService.getCollections();
    setCollections(updated);

    // Auto-expand parent
    if (parentId === collectionId) {
      setExpandedCollections(prev => new Set(prev).add(collectionId!));
    } else {
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }

    handleSelectRequest(newReq);
    return newReq.id;
  };

  const handleCreateFolder = async (parentId: string) => {
    let collectionId = collections.find(c => c.id === parentId)?.id;
    if (!collectionId) {
      const findColId = (items: (RequestData | Folder)[], targetId: string): boolean => {
        for (const item of items) {
          if (item.id === targetId) return true;
          if ('type' in item && item.type === 'folder') {
            if (findColId(item.items, targetId)) return true;
          }
        }
        return false;
      };
      collectionId = collections.find(c => findColId(c.items, parentId))?.id;
    }

    if (!collectionId) return;

    const newFolder: Folder = {
      id: `f-${Date.now()}`,
      name: "New Folder",
      type: 'folder',
      items: []
    };

    const folderAsReq = {
      ...newFolder,
      method: "GET", url: "", headers: [], params: []
    } as unknown as RequestData;

    await dbService.saveRequest(folderAsReq, collectionId, parentId === collectionId ? null : parentId, 'folder');
    const updated = await dbService.getCollections();
    setCollections(updated);

    // Auto-expand parent and the new folder
    if (parentId === collectionId) {
      setExpandedCollections(prev => new Set(prev).add(collectionId!));
    } else {
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }
    setExpandedFolders(prev => new Set(prev).add(newFolder.id));
    return newFolder.id;
  };

  const handleRenameCollection = async (id: string, name: string) => {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    await dbService.updateCollection({ ...col, name });
    const updated = await dbService.getCollections();
    setCollections(updated);
  };

  const handleRenameRequest = async (id: string, name: string) => {
    let collectionId: string | undefined;
    const findItemContext = (items: (RequestData | Folder)[], targetId: string, currentParentId: string | null): { item: RequestData | Folder, parentId: string | null } | null => {
      for (const item of items) {
        if (item.id === targetId) return { item, parentId: currentParentId };
        if ('type' in item && item.type === 'folder') {
          const found = findItemContext(item.items, targetId, item.id);
          if (found) return found;
        }
      }
      return null;
    };

    let context: { item: RequestData | Folder, parentId: string | null } | null = null;
    for (const col of collections) {
      context = findItemContext(col.items, id, col.id);
      const found = findItemContext(col.items, id, null);
      if (found) {
        collectionId = col.id;
        context = found;
        break;
      }
    }

    if (!context || !collectionId) return;

    await dbService.saveRequest({ ...context.item as RequestData, name }, collectionId, context.parentId, 'request');
    const updated = await dbService.getCollections();
    setCollections(updated);
  };

  const handleRenameFolder = async (id: string, name: string) => {
    let collectionId: string | undefined;
    const findItemContext = (items: (RequestData | Folder)[], targetId: string, currentParentId: string | null): { item: RequestData | Folder, parentId: string | null } | null => {
      for (const item of items) {
        if (item.id === targetId) return { item, parentId: currentParentId };
        if ('type' in item && item.type === 'folder') {
          const found = findItemContext(item.items, targetId, item.id);
          if (found) return found;
        }
      }
      return null;
    };

    let context: { item: RequestData | Folder, parentId: string | null } | null = null;
    for (const col of collections) {
      const found = findItemContext(col.items, id, null);
      if (found) {
        collectionId = col.id;
        context = found;
        break;
      }
    }

    if (!context || !collectionId) return;

    const folderAsReq = { ...context.item, name, method: 'GET', url: '', headers: [], params: [] } as unknown as RequestData;
    await dbService.saveRequest(folderAsReq, collectionId, context.parentId, 'folder');
    const updated = await dbService.getCollections();
    setCollections(updated);
  };

  const handleDeleteCollection = async (id: string) => {
    await dbService.deleteCollection(id);
    const updated = await dbService.getCollections();
    setCollections(updated);
    setExpandedCollections(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDeleteRequest = async (id: string) => {
    await dbService.deleteRequest(id);
    const updated = await dbService.getCollections();
    setCollections(updated);
    const tab = tabs.find(t => t.requestId === id);
    if (tab) handleCloseTab(tab.id);
  };

  const handleDeleteFolder = async (id: string) => {
    await dbService.deleteRequest(id);
    const updated = await dbService.getCollections();
    setCollections(updated);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdateCollectionVariables = async (id: string, vars: any[]) => {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    await dbService.updateCollection({ ...col, variables: vars });
    const updated = await dbService.getCollections();
    setCollections(updated);
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



  const activeTheme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];
  const isBento = activeTheme.layout === 'bento';

  return (
    <div
      className={`h-screen w-full flex flex-col overflow-hidden bg-background text-foreground transition-all duration-300 ${isBento ? 'p-3 gap-3' : 'border border-border'}`}
      style={{
        backgroundImage: activeTheme.variables['--app-bg'] || 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* TopBar - Floating in Bento, Structured in Classic */}
      <div
        className={`${isBento ? 'rounded-xl border bg-background/70 backdrop-blur-xl shadow-sm z-50 relative' : 'border-b z-20 relative'}`}
        style={!isBento ? { backgroundColor: 'var(--topbar-bg, var(--background))', color: 'var(--topbar-fg, var(--foreground))' } : {}}
      >
        <TopBar
          onSettingsClick={() => setActiveView("settings")}
          collections={collections}
          onSelectRequest={handleAddTab}
          isBento={isBento}
        />
      </div>

      <div className={`flex-1 flex overflow-hidden ${isBento ? 'gap-3' : ''}`}>
        {/* Activity Bar */}
        <div
          className={`w-14 flex flex-col items-center py-2 gap-4 ${isBento ? 'rounded-xl border bg-background/70 backdrop-blur-xl shadow-sm' : 'border-r z-10 relative'}`}
          style={!isBento ? { backgroundColor: 'var(--activity-bg, var(--muted))', color: 'var(--activity-fg, var(--muted-foreground))' } : {}}
        >
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
        </div>

        {/* Sidebar */}
        {(activeView === "collections" || activeView === "history") && (
          <div
            className={`w-64 flex flex-col ${isBento ? 'rounded-xl border bg-background/70 backdrop-blur-xl shadow-sm overflow-hidden' : 'border-r relative'}`}
            style={!isBento ? { backgroundColor: 'var(--sidebar-bg, var(--background))', color: 'var(--sidebar-fg, var(--foreground))' } : {}}
          >
            {activeView === "collections" ? (
              <Explorer
                collections={collections}
                expandedCollections={expandedCollections}
                onToggleCollection={toggleCollection}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onSelectRequest={handleSelectRequest}
                onCreateCollection={handleCreateCollection}
                onDuplicateCollection={handleDuplicateCollection}
                onCreateRequest={handleCreateRequest}
                onCreateFolder={handleCreateFolder}
                onRenameCollection={handleRenameCollection}
                onRenameFolder={handleRenameFolder}
                onRenameRequest={handleRenameRequest}
                onDeleteCollection={handleDeleteCollection}
                onDeleteRequest={handleDeleteRequest}
                onDeleteFolder={handleDeleteFolder}
                onUpdateCollectionVariables={handleUpdateCollectionVariables}
              />
            ) : (
              <>
                <div className="p-3 border-b flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                    History
                  </h2>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {history.map((entry) => (
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
              </>
            )}
          </div>
        )}

        {/* Main Content */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${isBento ? 'rounded-xl border bg-background/70 backdrop-blur-xl shadow-sm overflow-hidden' : ''}`}
          style={!isBento ? { backgroundColor: 'var(--content-bg, transparent)' } : {}}
        >
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
              <MockServerView
                logs={mockLogs}
                setLogs={setMockLogs}
              />
            </div>
          )}

          {(activeView === "collections" || activeView === "history") && (
            <>
              {/* Tab Bar */}
              <ScrollableTabs
                tabs={tabs}
                activeTabId={activeTabId}
                onTabSelect={setActiveTabId}
                onTabClose={handleCloseTab}
                onTabAdd={() => handleAddTab()}
              />

              {/* Request/Response Area */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 border-b overflow-hidden flex flex-col">
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
                      settings={settings}
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
    </div>
  );
}

export default App;
