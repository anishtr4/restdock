export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestData {
    id: string;
    name: string;
    method: RequestMethod;
    url: string;
    body?: {
        type: 'none' | 'json' | 'raw' | 'formdata' | 'x-www-form-urlencoded' | 'binary';
        json?: string;
        raw?: string;
        formdata?: { key: string; value: string; type?: 'text' | 'file'; enabled: boolean }[];
        urlencoded?: { key: string; value: string; enabled: boolean }[];
        binary?: string; // Path to file or content
    } | string; // Legacy string support
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

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    themeId: string;
    zoomLevel: number;
    requestTimeout: number;
    followRedirects: boolean;
}
