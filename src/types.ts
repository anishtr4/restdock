export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface FormDataItem {
    key: string;
    value: string;
    type?: 'text' | 'file';
    enabled: boolean;
}

export interface UrlEncodedItem {
    key: string;
    value: string;
    enabled: boolean;
}

export type BodyData = {
    type: 'none';
} | {
    type: 'json';
    json: string;
} | {
    type: 'raw';
    raw: string;
} | {
    type: 'formdata';
    formdata: FormDataItem[];
} | {
    type: 'x-www-form-urlencoded';
    urlencoded: UrlEncodedItem[];
} | {
    type: 'binary';
    binary: string; // File path
} | {
    type: 'graphql';
    graphql: {
        query: string;
        variables: string; // JSON string
    };
};

// Auth Types
export interface AuthData {
    type: 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'digest' | 'oauth1' | 'aws' | 'hawk';
    bearer?: { token: string };
    basic?: { username: string; password: string };
    apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
    digest?: { username: string; password: string; realm?: string; nonce?: string; algorithm?: string; qop?: string; opaque?: string; cnonce?: string };
    oauth1?: { consumerKey: string; consumerSecret: string; token: string; tokenSecret: string; signatureMethod: string; timestamp?: string; nonce?: string; realm?: string; addParamsToHeader?: boolean };
    aws?: { accessKey: string; secretKey: string; region: string; service: string; sessionToken?: string };
    hawk?: { authId: string; authKey: string; algorithm: string; ext?: string; app?: string; dlg?: string; timestamp?: string; nonce?: string };
    oauth2?: {
        // Manual
        accessToken: string;
        tokenType: string;
        addTokenTo: 'header';
        // Auto Flow
        grantType: 'authorization_code' | 'client_credentials' | 'implicit';
        authUrl?: string;
        accessTokenUrl?: string;
        clientId?: string;
        clientSecret?: string;
        scope?: string;
        redirectUri?: string;
        state?: string;
    };
}

export interface RequestData {
    id: string;
    name: string;
    method: RequestMethod;
    url: string;
    body?: BodyData | string; // Legacy string support
    headers?: { key: string; value: string; active: boolean; description?: string }[];
    params?: { key: string; value: string; active: boolean; description?: string }[];
    auth?: AuthData;
    description?: string;
    preRequestScript?: string;
    testScript?: string;
    type?: 'request';
    examples?: SavedResponse[];
}

export interface SavedResponse {
    id: string;
    name: string;
    status: string;
    code: number;
    headers: { key: string; value: string }[];
    body: string;
}

export interface Folder {
    id: string;
    name: string;
    type: 'folder';
    description?: string;
    items: (RequestData | Folder)[];
}

export interface Collection {
    id: string;
    name: string;
    type: 'collection';
    items: (RequestData | Folder)[];
    variables?: { key: string; value: string; enabled: boolean }[];
    auth?: any; // Collection-level auth that can be inherited
    description?: string;
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

export interface Environment {
    id: string;
    name: string;
    variables: { key: string; value: string; enabled: boolean; description?: string }[];
    is_active: boolean;
}
