CREATE TABLE IF NOT EXISTS global_variables (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS collection_variables (
    collection_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, key)
);

CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    variables TEXT NOT NULL, -- JSON string
    is_active BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT, -- JSON string
    body TEXT, -- JSON string
    auth TEXT, -- JSON string
    params TEXT, -- JSON string
    parent_id TEXT, -- For nested folders
    type TEXT DEFAULT 'request', -- 'folder' or 'request'
    description TEXT,
    pre_request_script TEXT,
    test_script TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_responses (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    code INTEGER,
    headers TEXT, -- JSON string
    body TEXT, -- JSON or Text
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    status INTEGER
);
