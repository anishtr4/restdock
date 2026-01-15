import { useState, useEffect, useRef, lazy, Suspense } from "react";
import "./App.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, History as HistoryIcon, Server, Plus, GripVertical } from "lucide-react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { dbService } from "./services/db";
import { ScrollableTabs } from "./components/ScrollableTabs";
import { TopBar } from "./components/TopBar";
import { THEMES, ALL_THEME_KEYS } from "@/lib/themes";
import { listen } from "@tauri-apps/api/event";

import { LoadingFallback } from "./components/LoadingFallback";
import { PanelSkeleton } from "./components/PanelSkeleton";
import { UpdateChecker } from "./components/UpdateChecker";
import { importPostmanCollection, importRestDock, exportRestDock } from "@/lib/importExport";

// Lazy load heavy components
const RequestPanel = lazy(() => import("./components/RequestPanel"));
const ResponsePanel = lazy(() => import("./components/ResponsePanel"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const MockServerView = lazy(() => import("./components/MockServerView"));
const Explorer = lazy(() => import("./components/Explorer"));

// Import types
import { AppSettings, RequestData, Collection, Folder, Tab, HistoryEntry, RequestMethod } from "@/types";
import { SaveRequestDialog } from "./components/SaveRequestDialog";

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  themeId: 'standard',
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
  const [hasRunningMockServer, setHasRunningMockServer] = useState(false);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);

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

  const [isAppReady, setIsAppReady] = useState(false);

  // Initialize DB
  useEffect(() => {
    const initDb = async () => {
      // ... (keep existing init logic)
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
            items: [
              {
                id: `r-${Date.now()}-1`,
                type: 'request',
                name: "Get Users (Visualize)",
                method: "GET",
                url: "{{base_url}}/api/users",
                headers: [],
                params: [],
                body: { type: 'none' }
              },
              {
                id: `r-${Date.now()}-2`,
                type: 'request',
                name: "Preview HTML",
                method: "GET",
                url: "{{base_url}}/api/preview",
                headers: [],
                params: [],
                body: { type: 'none' }
              }
            ],
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

        // Small delay to ensure minimal splash time and smoother transition
        setTimeout(() => setIsAppReady(true), 500);

      } catch (e) {
        console.error("Failed to init DB:", e);
        setIsAppReady(true); // Proceed anyway to show UI (maybe error state)
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

  // Sync activeRequest when switching tabs
  useEffect(() => {
    if (!activeTabId || tabs.length === 0) {
      return;
    }

    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    // Check if we have a cached request for this tab
    const cachedRequest = tabRequestCache.current.get(activeTabId);
    if (cachedRequest) {
      setActiveRequest(cachedRequest);
      return;
    }

    // If tab has a requestId, load from collection
    if (activeTab.requestId) {
      for (const col of collections) {
        const found = findRequestById(col.items, activeTab.requestId);
        if (found) {
          setActiveRequest(found);
          tabRequestCache.current.set(activeTabId, found);
          return;
        }
      }
    }

    // Otherwise create a blank request for this tab
    const blankRequest: RequestData = {
      id: `r-${Date.now()}`,
      name: activeTab.name || "Untitled Request",
      method: activeTab.method || "GET",
      url: "",
      headers: [],
      params: []
    };
    setActiveRequest(blankRequest);
    tabRequestCache.current.set(activeTabId, blankRequest);
  }, [activeTabId, tabs, collections]);

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
    // If a request is provided, check if it's already open in a tab
    if (request) {
      const existingTab = tabs.find(t => t.requestId === request.id);
      if (existingTab) {
        // Switch to existing tab instead of creating a new one
        setActiveTabId(existingTab.id);
        return;
      }
    }

    const newTabId = `t${Date.now()}`;
    const newTab: Tab = request
      ? { id: newTabId, requestId: request.id, name: request.name, method: request.method }
      : { id: newTabId, requestId: null, name: "Untitled Request", method: "GET" };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);

    if (request) {
      setActiveRequest(request);
      tabRequestCache.current.set(newTabId, request);
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
      tabRequestCache.current.set(newTabId, blankRequest);
      setResponse(null);
    }
  };

  const handleCloseTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);

    setTabs(newTabs);

    // If closing the active tab, select another or clear
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else {
        setActiveTabId('');
        setActiveRequest(null);
        setResponse(null);
      }
    }

    tabRequestCache.current.delete(tabId);
  };

  const handleSelectRequest = (request: RequestData) => {
    handleAddTab(request);
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

  // --- Import/Export Handlers ---

  const handleImportPostman = async (jsonContent: string) => {
    try {
      await importPostmanCollection(jsonContent);
      // Refresh
      const updated = await dbService.getCollections();
      setCollections(updated);
      alert("Postman Collection imported successfully!");
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      alert("Failed to import Postman Collection: " + errorMsg);
    }
  };

  const handleImportRestDock = async (jsonContent: string) => {
    try {
      await importRestDock(jsonContent);
      const updatedCols = await dbService.getCollections();
      setCollections(updatedCols);
      alert("Helper: Data imported. You may need to restart or refresh to see all changes.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to restore data: " + (e as any).message);
    }
  };

  const handleExportRestDock = async () => {
    try {
      const json = await exportRestDock();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restdock_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export data.");
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

  const [saveDialogState, setSaveDialogState] = useState<{ open: boolean; requestName?: string }>({ open: false });

  const handleSaveRequest = async (request: RequestData) => {
    // If request has collection context (and not virtual "New Request"), save directly
    let collectionId: string | undefined;
    let parentId: string | null = null;

    const findItem = (items: (RequestData | Folder)[], targetId: string, _pId: string | null): boolean => {
      for (const item of items) {
        if (item.id === targetId) {
          // simplified check
          return true;
        }
        if ('type' in item && item.type === 'folder') {
          if (findItem(item.items, targetId, item.id)) {
            parentId = item.id;
            return true;
          }
        }
      }
      return false;
    };

    // Robust context lookup
    for (const col of collections) {
      if (findItem(col.items, request.id, null)) {
        collectionId = col.id;
        break;
      }
    }

    // Check if it's a "real" saved request in the DB
    if (collectionId) {
      await dbService.saveRequest(request, collectionId, parentId, 'request');
      const updated = await dbService.getCollections();
      setCollections(updated);

      // Update tab
      setTabs(prev => prev.map(t => t.requestId === request.id ? { ...t, name: request.name, method: request.method } : t));
      return;
    }

    // If we are here, it's a new request that needs a destination
    setActiveRequest(request); // key: ensure we are saving the current one
    setSaveDialogState({ open: true, requestName: request.name });
  };

  const handleDialogSave = async (name: string, collectionId: string, folderId?: string | null) => {
    if (!activeRequest) return;

    const newReq = { ...activeRequest, name, id: `r-${Date.now()}` };
    await dbService.saveRequest(newReq, collectionId, folderId || null, 'request');

    const updated = await dbService.getCollections();
    setCollections(updated);

    // Update the active tab to point to the new saved request
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, requestId: newReq.id, name: newReq.name, method: newReq.method } : t));

    // Select the new request
    setActiveRequest(newReq);
    setSaveDialogState({ open: false });
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

  if (!isAppReady) {
    return <LoadingFallback />;
  }


  return (
    <div
      className={`h-screen w-full flex flex-col overflow-hidden text-foreground animate-fade-in transition-all duration-300 relative ${isBento ? 'p-3 gap-3' : 'border border-border'}`}
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      {/* Animated Background Orbs Layer */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(15 70% 50% / 0.12) 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
          }}
        />
        {/* Large rust orb - top right */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{
            background: 'hsl(15 90% 50% / 0.2)',
            top: '-10%',
            right: '10%',
            animation: 'float 8s ease-in-out infinite'
          }}
        />
        {/* Medium orb - center */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{
            background: 'hsl(12 85% 48% / 0.15)',
            top: '40%',
            left: '50%',
            animation: 'float 10s ease-in-out infinite reverse'
          }}
        />
        {/* Small orb - bottom left */}
        <div
          className="absolute w-[250px] h-[250px] rounded-full blur-[60px]"
          style={{
            background: 'hsl(18 90% 52% / 0.12)',
            bottom: '10%',
            left: '20%',
            animation: 'float 12s ease-in-out infinite'
          }}
        />
        {/* Small orb - bottom right */}
        <div
          className="absolute w-[200px] h-[200px] rounded-full blur-[50px]"
          style={{
            background: 'hsl(10 85% 45% / 0.1)',
            bottom: '20%',
            right: '25%',
            animation: 'float 9s ease-in-out infinite reverse'
          }}
        />
      </div>

      {/* TopBar - Floating in Bento, Structured in Classic */}
      <div
        className={`${isBento ? 'rounded-xl glass-panel shadow-lg z-50 relative' : 'border-b z-20 relative'}`}
        style={!isBento ? { backgroundColor: 'var(--topbar-bg, var(--background))', color: 'var(--topbar-fg, var(--foreground))' } : {}}
      >
        <TopBar
          onSettingsClick={() => setActiveView("settings")}
          collections={collections}
          onSelectRequest={handleAddTab}
          isBento={isBento}
          hasUpdateAvailable={hasUpdateAvailable}
        />
      </div>

      <div className={`flex-1 flex overflow-hidden ${isBento ? 'gap-3' : ''}`}>
        {/* Activity Bar */}
        <div
          className={`w-14 flex flex-col items-center py-2 gap-4 ${isBento ? 'rounded-xl glass-panel shadow-lg' : 'border-r z-10 relative'}`}
          style={!isBento ? { backgroundColor: 'var(--activity-bg, var(--muted))', color: 'var(--activity-fg, var(--muted-foreground))' } : {}}
        >
          <Button
            variant={activeView === "collections" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("collections")}
            className="h-10 w-10"
            title="Collections"
          >
            <FolderKanban className="h-5 w-5" />
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
            className="h-10 w-10 relative"
            title="Mock Server"
          >
            <Server className="h-5 w-5" />
            {/* Green status dot - only shown when at least one server is running */}
            {hasRunningMockServer && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-background animate-pulse" />
            )}
          </Button>
          <div className="flex-1" />
        </div>

        {/* Resizable Layout: Sidebar + Main Content */}
        <Group orientation="horizontal" id="app-layout">
          {(activeView === "collections" || activeView === "history") && (
            <>
              <Panel defaultSize="20" minSize={250} maxSize="40" className={`flex flex-col ${isBento ? 'rounded-xl glass-panel shadow-lg overflow-hidden' : 'border-r relative'}`}
                style={!isBento ? { backgroundColor: 'var(--sidebar-bg, var(--background))', color: 'var(--sidebar-fg, var(--foreground))' } : {}}
              >
                {activeView === "collections" ? (
                  <Suspense fallback={<PanelSkeleton />}>
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
                      onImportPostman={handleImportPostman}
                    />
                  </Suspense>
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
              </Panel>
              <Separator className="w-1 bg-border/40 hover:bg-primary/50 transition-colors flex items-center justify-center group cursor-col-resize z-10 focus:outline-none">
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Separator>
            </>
          )}

          {/* Main Content */}
          <Panel minSize={300} className={`flex flex-col min-w-0 ${isBento ? 'rounded-xl glass-panel shadow-lg overflow-hidden' : ''}`}
            style={!isBento ? { backgroundColor: 'var(--content-bg, transparent)' } : {}}
          >
            {activeView === "settings" && (
              <div className="flex-1 overflow-auto">
                <Suspense fallback={<PanelSkeleton />}>
                  <SettingsView
                    globalVariables={globalVariables}
                    onGlobalVariablesChange={handleSaveGlobalVariables}
                    settings={settings}
                    onSettingsChange={setSettings}
                    onImportPostman={handleImportPostman}
                    onImportRestDock={handleImportRestDock}
                    onExportRestDock={handleExportRestDock}
                  />
                </Suspense>
              </div>
            )}

            {activeView === "mock_server" && (
              <div className="flex-1 overflow-auto">
                <Suspense fallback={<PanelSkeleton />}>
                  <MockServerView
                    logs={mockLogs}
                    setLogs={setMockLogs}
                    onServerStatusChange={setHasRunningMockServer}
                  />
                </Suspense>
              </div>
            )}

            {(activeView === "collections" || activeView === "history") && (
              <>
                {tabs.length > 0 ? (
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
                        <Suspense fallback={<PanelSkeleton />}>
                          {activeRequest ? (
                            <RequestPanel
                              request={activeRequest}
                              setRequest={(newRequest: RequestData | null) => {
                                setActiveRequest(newRequest);
                                if (newRequest && activeTabId) {
                                  tabRequestCache.current.set(activeTabId, newRequest);
                                }
                              }}
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
                              globalVariables={globalVariables || []}
                              collectionVariables={collections[0]?.variables || []}
                              settings={settings}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Select a request to start
                            </div>
                          )}
                        </Suspense>
                      </div>
                      <div className="h-80 overflow-auto">
                        <Suspense fallback={<PanelSkeleton />}>
                          <ResponsePanel response={response} loading={loading} />
                        </Suspense>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Empty State - No tabs open */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-48 h-48 rounded-full bg-muted/30 flex items-center justify-center mb-8">
                      <svg className="w-24 h-24 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 20l9-5-9-5-9 5 9 5z" />
                        <path d="M12 12l9-5-9-5-9 5 9 5z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">No requests open</h2>
                    <p className="text-muted-foreground mb-6">Create a new request to get started</p>
                    <Button
                      onClick={() => handleAddTab()}
                      className="gap-2"
                      size="lg"
                    >
                      <Plus className="w-5 h-5" />
                      New Request
                    </Button>
                  </div>
                )}
              </>
            )}
          </Panel>
        </Group>
      </div>
      <SaveRequestDialog
        open={saveDialogState.open}
        onOpenChange={(open) => setSaveDialogState(prev => ({ ...prev, open }))}
        collections={collections}
        onSave={handleDialogSave}
        initialName={saveDialogState.requestName}
      />
      <UpdateChecker onUpdateAvailable={setHasUpdateAvailable} />
    </div>
  );
}

export default App;
