
import { useState, useEffect, useRef } from "react";
import "./App.css";
import ActivityBar from "./components/ActivityBar";
import Explorer from "./components/Explorer";
import History from "./components/History";
import TabGroup from "./components/TabGroup";
import RequestPanel from "./components/RequestPanel";
import ResponsePanel from "./components/ResponsePanel";
import ResizablePanel from "./components/ResizablePanel";
import VerticalResizablePanel from "./components/VerticalResizablePanel";
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

function App() {
  const [activeView, setActiveView] = useState("collections");

  // Collections State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [globalVariables, setGlobalVariables] = useState<{ key: string; value: string; enabled: boolean }[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Apply Settings Effect
  useEffect(() => {
    // Theme
    let effectiveTheme = settings.theme;
    if (effectiveTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);

    // Zoom
    document.body.style.zoom = `${settings.zoomLevel}%`;

    // Persist
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  // History State
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Tabs State - always start with one blank tab ready for use
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "t1", requestId: null, name: "Untitled Request", method: "GET" }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("t1");

  // Active Request Content State
  const [activeRequest, setActiveRequest] = useState<RequestData | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Cache for unsaved edits - preserves changes when switching tabs
  const tabRequestCache = useRef<Map<string, RequestData>>(new Map());
  // Ref to always have latest activeRequest (for use in useEffect with limited deps)
  const activeRequestRef = useRef<RequestData | null>(null);

  // Keep ref synced with state
  activeRequestRef.current = activeRequest;

  // Initialize DB and load data
  useEffect(() => {
    const initDb = async () => {
      try {
        await dbService.init();
        const cols = await dbService.getCollections();
        const hist = await dbService.getHistory();
        const globalVars = await dbService.getGlobalVariables();

        if (cols.length === 0) {
          // Create default Example Collection
          const colId = `c-${Date.now()}`;
          const exampleCol: Collection = {
            id: colId,
            name: "Example Collection",
            type: 'collection',
            items: [],
            variables: [
              { key: "baseUrl", value: "https://httpbin.org", enabled: true },
              { key: "token", value: "secret-token-123", enabled: true }
            ]
          };

          await dbService.createCollection(exampleCol);

          // Add requests
          const getReq: RequestData = {
            id: `r-${Date.now()}-1`,
            name: "Get User Data",
            method: "GET",
            url: "{{baseUrl}}/get",
            params: [{ key: "id", value: "123", active: true }]
          };
          await dbService.saveRequest(getReq, colId);

          const postReq: RequestData = {
            id: `r-${Date.now()}-2`,
            name: "Create Post",
            method: "POST",
            url: "{{baseUrl}}/post",
            body: JSON.stringify({ title: "foo", body: "bar", userId: 1 }, null, 2),
            headers: [{ key: "Content-Type", value: "application/json", active: true }]
          };
          await dbService.saveRequest(postReq, colId);

          const folderId = `f-${Date.now()}`;
          const authFolder: Folder = {
            id: folderId,
            name: "Auth Examples",
            type: 'folder',
            items: []
          };
          await dbService.saveRequest(authFolder as any, colId, null, 'folder');

          const authReq: RequestData = {
            id: `r-${Date.now()}-3`,
            name: "Bearer Token Test",
            method: "GET",
            url: "{{baseUrl}}/bearer",
            auth: { type: 'bearer', bearer: { token: '{{token}}' } }
          };
          await dbService.saveRequest(authReq, colId, folderId);

          const reloadedCols = await dbService.getCollections();
          setCollections(reloadedCols);
        } else {
          setCollections(cols);
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
      if (item.method && item.id === id) return item;
      if (item.items) {
        const found = findRequestById(item.items, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Sync activeRequest when activeTabId changes (but not on every collection/tabs update)
  const prevTabIdRef = useRef<string | null>(null);

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) {
      setActiveRequest(null);
      prevTabIdRef.current = null;
      return;
    }

    const prevTabId = prevTabIdRef.current;
    const tabChanged = prevTabId !== activeTabId;

    // Save current request to cache BEFORE switching (if we have one and tab is changing)
    if (tabChanged && prevTabId && activeRequestRef.current) {
      tabRequestCache.current.set(prevTabId, { ...activeRequestRef.current });
    }

    prevTabIdRef.current = activeTabId;

    if (!tabChanged) {
      // Tab didn't change - don't reset form data
      return;
    }

    // Check if we have cached edits for this tab
    const cachedRequest = tabRequestCache.current.get(activeTabId);
    if (cachedRequest) {
      setActiveRequest(cachedRequest);
    } else if (activeTab.requestId) {
      // Load from database/collections
      const found = findRequestById(collections, activeTab.requestId);
      if (found) {
        setActiveRequest({ ...found });
      }
    } else {
      // New untitled request
      setActiveRequest({
        id: activeTab.id,
        name: activeTab.name,
        method: activeTab.method,
        url: ""
      });
    }

    setResponse(activeTab.response || null);
    setLoading(!!activeTab.loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [activeTabId]); // Only depend on activeTabId - use refs for tabs/collections

  const handleAddTab = (req?: RequestData) => {
    const newId = `t-${Date.now()}`;
    const newTab: Tab = req
      ? { id: newId, requestId: req.id, name: req.name, method: req.method }
      : { id: newId, requestId: null, name: "Untitled Request", method: "GET" };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);

    // If closing last tab, create a new blank one
    if (newTabs.length === 0) {
      const newTabId = `t-${Date.now()}`;
      const blankTab: Tab = { id: newTabId, requestId: null, name: "Untitled Request", method: "GET" };
      setTabs([blankTab]);
      setActiveTabId(newTabId);
      // Clear cache for closed tab
      tabRequestCache.current.delete(tabId);
      return;
    }

    setTabs(newTabs);
    // Clear cache for closed tab
    tabRequestCache.current.delete(tabId);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const addItemToNode = (nodes: any[], targetId: string, newItem: any): any[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, items: [...(node.items || []), newItem] };
      }
      if (node.items) {
        return { ...node, items: addItemToNode(node.items, targetId, newItem) };
      }
      return node;
    });
  };

  const handleCreateCollection = async (name: string) => {
    const newCol: Collection = {
      id: `c-${Date.now()}`,
      name,
      type: 'collection',
      items: []
    };
    await dbService.createCollection(newCol);
    setCollections(prev => [...prev, newCol]);
  };

  const handleCreateRequest = async (parentId: string, name: string) => {
    const newReq: RequestData = {
      id: `r-${Date.now()}`,
      name,
      method: "GET",
      url: ""
    };

    const collectionId = collections.find(c => c.id === parentId)?.id || collections[0].id;
    await dbService.saveRequest(newReq, collectionId, parentId.startsWith('c-') ? null : parentId);

    setCollections(prev => {
      const updated = addItemToNode([...prev], parentId, newReq);
      return updated as Collection[];
    });
    handleAddTab(newReq);
  };

  const handleCreateFolder = async (parentId: string, name: string) => {
    const newFolder: Folder = {
      id: `f-${Date.now()}`,
      name,
      type: 'folder',
      items: []
    };
    const collectionId = collections.find(c => c.id === parentId)?.id || collections[0].id;

    await dbService.saveRequest(newFolder as any, collectionId, parentId.startsWith('c-') ? null : parentId, 'folder');

    setCollections(prev => {
      const updated = addItemToNode([...prev], parentId, newFolder);
      return updated as Collection[];
    });
  };

  const handleDeleteCollection = async (collectionId: string) => {
    await dbService.deleteCollection(collectionId);
    setCollections(prev => prev.filter(c => c.id !== collectionId));
  };

  const removeItemFromNode = (nodes: any[], itemId: string): any[] => {
    return nodes.map(node => {
      if (node.items) {
        const filteredItems = node.items.filter((item: any) => item.id !== itemId);
        const recursivelyFiltered = removeItemFromNode(filteredItems, itemId);
        return { ...node, items: recursivelyFiltered };
      }
      return node;
    }).filter(node => node.id !== itemId);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await dbService.deleteRequest(folderId);
    setCollections(prev => {
      const updated = removeItemFromNode([...prev], folderId);
      return updated as Collection[];
    });
  };

  const handleDeleteRequest = async (requestId: string) => {
    await dbService.deleteRequest(requestId);
    setCollections(prev => {
      const updated = removeItemFromNode([...prev], requestId);
      return updated as Collection[];
    });
    setTabs(prev => prev.filter(t => t.requestId !== requestId));
  };

  const handleUpdateCollectionVariables = async (collectionId: string, variables: { key: string; value: string; enabled: boolean }[]) => {
    const col = collections.find(c => c.id === collectionId);
    if (col) {
      const updatedCol = { ...col, variables };
      await dbService.updateCollection(updatedCol);
      setCollections(prev => prev.map(c =>
        c.id === collectionId ? updatedCol : c
      ));
    }
  };

  const getSubstitutedUrl = (url: string, collectionId?: string) => {
    let substitutedUrl = url;

    // 1. Global Variables
    globalVariables.forEach(v => {
      if (v.enabled) {
        substitutedUrl = substitutedUrl.replace(new RegExp(`{{global.${v.key}}}`, 'g'), v.value);
      }
    });

    // 2. Collection Variables
    if (collectionId) {
      const col = collections.find(c => c.id === collectionId);
      if (col && col.variables) {
        col.variables.forEach(v => {
          if (v.enabled) {
            substitutedUrl = substitutedUrl.replace(new RegExp(`{{${v.key}}}`, 'g'), v.value);
          }
        });
      }
    }

    return substitutedUrl;
  };

  const handleSaveRequest = async () => {
    if (!activeRequest) return;

    const isNewRequest = activeRequest.id.startsWith('t-');

    if (isNewRequest) {
      const targetColId = collections[0]?.id;
      if (!targetColId) return;

      const newReqId = `r-${Date.now()}`;
      const newReq = { ...activeRequest, id: newReqId };

      await dbService.saveRequest(newReq, targetColId);

      setCollections(prev => prev.map(c =>
        c.id === targetColId ? { ...c, items: [...c.items, newReq] } : c
      ));

      setActiveRequest(newReq);
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, requestId: newReqId, name: newReq.name, method: newReq.method } : t
      ));
    } else {
      const findCollectionId = (items: any[], reqId: string): string | undefined => {
        // simplified search
        for (const c of collections) {
          // We need recursive find here ideally, but for now assuming we find it
        }
        return undefined; // TODO
      };

      // Robust collection ID finding
      let targetColId = "";
      for (const col of collections) {
        // Simple flattening for checking ID existence logic reused from search would be better
        // But here let's just find where it exists.
        if (JSON.stringify(col).includes(activeRequest.id)) {
          targetColId = col.id;
          break;
        }
      }

      if (targetColId) {
        await dbService.saveRequest(activeRequest, targetColId);
      }

      const updateInNodes = (nodes: any[]): any[] => {
        return nodes.map(node => {
          if (node.id === activeRequest.id && !node.type) {
            return { ...activeRequest };
          }
          if (node.items) {
            return { ...node, items: updateInNodes(node.items) };
          }
          return node;
        });
      };

      setCollections(prev => updateInNodes([...prev]) as Collection[]);
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, name: activeRequest.name, method: activeRequest.method } : t
      ));
    }
  };

  const handleSelectRequest = (r: any) => {
    const existingTab = tabs.find(t => t.requestId === r.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      handleAddTab(r);
    }
  };

  const handleUpdateCollection = (id: string, name: string) => {
    // TODO: Implement rename collection in UI
  };

  // NEW: Save Global Variables (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (globalVariables.length > 0 && isDbReady) {
        // Only save if we have data and DB is ready.
        // Ideally we need a 'dirty' flag but saving extra times is okay if not every keystroke.
        // But wait, globalVariables changes on every keystroke.
        // We can check if it differs from DB, but easier to just debounce the DB call.
        await dbService.saveGlobalVariables(globalVariables);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [globalVariables, isDbReady]);

  const handleSaveGlobalVariables = (vars: { key: string; value: string; enabled: boolean }[]) => {
    setGlobalVariables(vars);
    // Actual save happens in useEffect
  };

  return (
    <div className="app-container">
      <ActivityBar activeView={activeView} setActiveView={setActiveView} />

      {activeView === "collections" && (
        <ResizablePanel
          defaultWidth={260}
          minWidth={200}
          maxWidth={500}
          position="left"
        >
          <Explorer
            collections={collections}
            onSelectRequest={handleSelectRequest}
            onCreateCollection={handleCreateCollection}
            onCreateRequest={handleCreateRequest}
            onCreateFolder={handleCreateFolder}
            onDeleteCollection={handleDeleteCollection}
            onDeleteFolder={handleDeleteFolder}
            onDeleteRequest={handleDeleteRequest}
            onUpdateCollectionVariables={handleUpdateCollectionVariables}
          />
        </ResizablePanel>
      )}

      {activeView === "history" && (
        <ResizablePanel
          defaultWidth={260}
          minWidth={200}
          maxWidth={500}
          position="left"
        >
          <History
            history={history}
            onSelectHistoryItem={(entry) => {
              const newRequest: RequestData = {
                id: `h-${Date.now()}`,
                name: entry.url.split('/').pop() || 'Request',
                method: entry.method as RequestMethod,
                url: entry.url,
                headers: [{ key: 'Content-Type', value: 'application/json', active: true }],
                params: [],
                body: ''
              };
              handleAddTab(newRequest);
            }}
          />
        </ResizablePanel>
      )}

      {/* NEW: Settings View */}
      {activeView === "settings" && (
        <div className="main-content">
          <SettingsView
            globalVariables={globalVariables}
            onGlobalVariablesChange={handleSaveGlobalVariables}
            settings={settings}
            onSettingsChange={setSettings}
          />
        </div>
      )}

      {/* NEW: Mock Server View */}
      {activeView === "mock_server" && (
        <div className="main-content">
          <MockServerView />
        </div>
      )}

      {(activeView === "collections" || activeView === "history") && (
        <main className="main-content">
          <TabGroup
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onAddTab={() => handleAddTab()}
          />
          <div className="workspace-split">
            <VerticalResizablePanel
              position="top"
              defaultHeight={350}
              minHeight={200}
              maxHeight={600}
            >
              <div className="request-pane-wrapper">
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
                  <div className="empty-workspace">Select a request to start</div>
                )}
              </div>
            </VerticalResizablePanel>
            <div className="response-pane-wrapper">
              <ResponsePanel response={response} loading={loading} />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
