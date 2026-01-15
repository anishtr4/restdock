import Database from '@tauri-apps/plugin-sql';
import { Collection, Environment, RequestData, HistoryEntry } from '../types';

class DatabaseService {
    db: Database | null = null;
    private initPromise: Promise<void> | null = null;

    async init() {
        this.db = await Database.load('sqlite:tauri-rest.db');
        await this.initTables();
    }

    // Ensure DB is initialized before any operation
    private async ensureInit(): Promise<Database> {
        if (this.db) return this.db;

        // Prevent multiple simultaneous init calls
        if (!this.initPromise) {
            this.initPromise = this.init();
        }
        await this.initPromise;

        if (!this.db) throw new Error("Failed to initialize database");
        return this.db;
    }

    async initTables() {
        if (!this.db) return;

        // Collections


        // Requests
        // We treat folders as requests with type='folder' for simplicity in referencing, or strict parent_id
        // But aligning with the current App.tsx structure:
        // For SQL, simpler to robustly link everything.
        // Let's use a 'nodes' table or similar, or just separate requests with a parent_id.

        // For now, let's stick to the implementation plan schema.
        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          parent_id TEXT,
          variables TEXT,
          created_at INTEGER,
          description TEXT
        );
      `);

        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS variables (
          id TEXT PRIMARY KEY,
          collection_id TEXT NOT NULL,
          name TEXT NOT NULL,
          value TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
        );
      `);

        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          collection_id TEXT NOT NULL,
          name TEXT NOT NULL,
          method TEXT,
          url TEXT,
          body TEXT,
          headers TEXT,
          params TEXT,
          auth TEXT,
          parent_id TEXT,
          type TEXT,
          created_at INTEGER,
          description TEXT,
          FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
        );
      `);

        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          method TEXT NOT NULL,
          url TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          status INTEGER,
          duration INTEGER
        );
      `);

        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS global_variables (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT 1
        );
      `);

        // Mock Servers Table
        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS mock_servers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          port INTEGER NOT NULL DEFAULT 8000,
          status TEXT DEFAULT 'stopped'
        );
      `);

        // Mocks Table (Updated with server_id and auth config)
        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS mocks (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          delay_ms INTEGER DEFAULT 0,
          response_body TEXT,
          response_headers TEXT,
          enabled BOOLEAN NOT NULL DEFAULT 1,
          auth_type TEXT DEFAULT 'none',
          auth_config TEXT,
          request_params TEXT,
          request_body_schema TEXT,
          conditions TEXT,
          FOREIGN KEY(server_id) REFERENCES mock_servers(id) ON DELETE CASCADE
        );
      `);

        // Add new columns to 'mocks' (for existing databases)
        try { await this.db.execute(`ALTER TABLE mocks ADD COLUMN auth_type TEXT DEFAULT 'none'`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE mocks ADD COLUMN auth_config TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE mocks ADD COLUMN request_params TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE mocks ADD COLUMN request_body_schema TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE mocks ADD COLUMN conditions TEXT`); } catch (e) { }

        // Add new columns to 'requests' (for existing databases)
        try { await this.db.execute(`ALTER TABLE requests ADD COLUMN params TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE requests ADD COLUMN created_at INTEGER`); } catch (e) { }

        // Add new columns to 'collections' (for existing databases)
        try { await this.db.execute(`ALTER TABLE collections ADD COLUMN created_at INTEGER`); } catch (e) { }

        // Add new columns to 'history' (for existing databases)
        try { await this.db.execute(`ALTER TABLE history ADD COLUMN duration INTEGER`); } catch (e) { }

        // Add description column
        try { await this.db.execute(`ALTER TABLE collections ADD COLUMN description TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE requests ADD COLUMN description TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE requests ADD COLUMN pre_request_script TEXT`); } catch (e) { }
        try { await this.db.execute(`ALTER TABLE requests ADD COLUMN test_script TEXT`); } catch (e) { }

        // Environments Table
        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS environments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          variables TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 0,
          created_at INTEGER
        );
      `);

        await this.db.execute(`
        CREATE TABLE IF NOT EXISTS saved_responses (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT,
            code INTEGER,
            headers TEXT, -- JSON string
            body TEXT, -- JSON or Text
            created_at INTEGER,
            FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE
        );
      `);

        // RESET STATE: Ensure no servers are marked as running on startup (since backend processes are gone)
        await this.db.execute(`UPDATE mock_servers SET status = 'stopped'`);

        // Seed Data Check - Only create default server if completely empty
        const servers: any[] = await this.db.select('SELECT * FROM mock_servers');
        if (servers.length === 0) {
            console.log("Creating default server...");
            // Create single Default Server for first-time users
            const defaultServerId = 'default-server';
            await this.db.execute(
                `INSERT INTO mock_servers (id, name, port, status) VALUES ($1, $2, $3, $4)`,
                [defaultServerId, 'Default Server', 3001, 'stopped']
            );

            // Add comprehensive sample routes for all HTTP methods and auth types
            const defaultRoutes = [
                // Basic CRUD endpoints
                {
                    id: 'route-get-hello', method: 'GET', path: '/api/hello', status_code: 200, delay_ms: 0,
                    response_body: JSON.stringify({ message: "Hello from Mock Server!" }, null, 2),
                    auth_type: 'none', auth_config: null,
                    request_params: JSON.stringify([{ key: 'lang', value: 'en' }]),
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-get-users', method: 'GET', path: '/api/users', status_code: 200, delay_ms: 100,
                    response_body: JSON.stringify({ users: [{ id: 1, name: "John Doe", email: "john@example.com" }, { id: 2, name: "Jane Smith", email: "jane@example.com" }] }, null, 2),
                    auth_type: 'none', auth_config: null,
                    request_params: JSON.stringify([
                        { key: 'page', value: '1' },
                        { key: 'limit', value: '10' },
                        { key: 'sort', value: 'name_asc' }
                    ]),
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-get-user', method: 'GET', path: '/api/users/:id', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ id: 1, name: "John Doe", email: "john@example.com", role: "admin" }, null, 2),
                    auth_type: 'none', auth_config: null,
                    request_params: JSON.stringify([{ key: 'fields', value: 'full' }]),
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-post-users', method: 'POST', path: '/api/users', status_code: 201, delay_ms: 150,
                    response_body: JSON.stringify({ id: 3, message: "User created successfully" }, null, 2),
                    auth_type: 'api_key',
                    auth_config: JSON.stringify({ header: 'X-API-Key', key: 'demo-api-key-12345' }),
                    request_params: null,
                    request_body_schema: JSON.stringify({
                        type: "object",
                        required: ["name", "email"],
                        properties: {
                            name: { type: "string" },
                            email: { type: "string", format: "email" },
                            role: { type: "string", enum: ["user", "admin"] }
                        }
                    }),
                    conditions: null
                },
                {
                    id: 'route-put-user', method: 'PUT', path: '/api/users/:id', status_code: 200, delay_ms: 100,
                    response_body: JSON.stringify({ message: "User updated successfully" }, null, 2),
                    auth_type: 'bearer',
                    auth_config: JSON.stringify({ token: 'demo-bearer-token' }),
                    request_params: JSON.stringify([
                        { key: 'notify', value: 'true' }
                    ]),
                    request_body_schema: JSON.stringify({
                        type: "object",
                        required: ["name", "email"],
                        properties: {
                            name: { type: "string" },
                            email: { type: "string" }
                        }
                    }),
                    conditions: null
                },
                {
                    id: 'route-patch-user', method: 'PATCH', path: '/api/users/:id', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "User partially updated" }, null, 2),
                    auth_type: 'bearer',
                    auth_config: JSON.stringify({ token: 'demo-bearer-token' }),
                    request_params: JSON.stringify([
                        { key: 'dry_run', value: 'true' },
                        { key: 'notify', value: 'false' }
                    ]),
                    request_body_schema: JSON.stringify({
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            role: { type: "string" }
                        }
                    }),
                    conditions: null
                },
                {
                    id: 'route-delete-user', method: 'DELETE', path: '/api/users/:id', status_code: 204, delay_ms: 100,
                    response_body: '',
                    auth_type: 'bearer',
                    auth_config: JSON.stringify({ token: 'demo-bearer-token' }),
                    request_params: JSON.stringify([{ key: 'force', value: 'true' }]),
                    request_body_schema: null,
                    conditions: null
                },

                // Authentication endpoints
                {
                    id: 'route-auth-login', method: 'POST', path: '/auth/login', status_code: 200, delay_ms: 200,
                    response_body: JSON.stringify({ token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiam9obiIsInJvbGUiOiJhZG1pbiJ9.abc123", expires_in: 3600, message: "Login successful" }, null, 2),
                    auth_type: 'none', auth_config: null,
                    request_params: JSON.stringify([{ key: 'remember_me', value: 'true' }]),
                    request_body_schema: JSON.stringify({
                        type: "object",
                        required: ["username", "password"],
                        properties: {
                            username: { type: "string" },
                            password: { type: "string" }
                        }
                    }),
                    conditions: null
                },
                {
                    id: 'route-auth-basic', method: 'GET', path: '/auth/basic-protected', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "Access granted via Basic Auth", user: "admin", permissions: ["read", "write", "delete"] }, null, 2),
                    auth_type: 'basic',
                    auth_config: JSON.stringify({ username: 'admin', password: 'password123' }),
                    request_params: null,
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-auth-bearer', method: 'GET', path: '/auth/bearer-protected', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "Access granted via Bearer Token", scope: "read:all", user: { id: 1, name: "John Doe" } }, null, 2),
                    auth_type: 'bearer',
                    auth_config: JSON.stringify({ token: 'demo-bearer-token' }),
                    request_params: JSON.stringify([{ key: 'scope', value: 'profile' }]),
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-auth-apikey', method: 'GET', path: '/auth/apikey-protected', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "Access granted via API Key", apiVersion: "v1", rateLimit: { remaining: 999, reset: "2024-12-31T23:59:59Z" } }, null, 2),
                    auth_type: 'api_key',
                    auth_config: JSON.stringify({ header: 'X-API-Key', key: 'demo-api-key-12345' }),
                    request_params: JSON.stringify([{ key: 'version', value: '1' }]),
                    request_body_schema: null,
                    conditions: null
                },

                // Error responses for testing
                {
                    id: 'route-error-401', method: 'GET', path: '/api/unauthorized', status_code: 401, delay_ms: 0,
                    response_body: JSON.stringify({ error: "Unauthorized", message: "Invalid or missing authentication" }, null, 2),
                    auth_type: 'basic',
                    auth_config: JSON.stringify({ username: 'guest', password: 'guest' }),
                    request_params: JSON.stringify([{ key: 'retry', value: 'false' }]),
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-error-404', method: 'GET', path: '/api/not-found', status_code: 404, delay_ms: 0,
                    response_body: JSON.stringify({ error: "Not Found", message: "Resource not found" }, null, 2),
                    auth_type: 'none', auth_config: null,
                    request_params: JSON.stringify([{ key: 'id', value: '999' }]),
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-error-500', method: 'GET', path: '/api/server-error', status_code: 500, delay_ms: 0,
                    response_body: JSON.stringify({ error: "Internal Server Error", message: "Something went wrong" }, null, 2),
                    auth_type: 'none', auth_config: null,
                    request_params: JSON.stringify([{ key: 'trace', value: 'true' }]),
                    request_body_schema: null,
                    conditions: null
                },

                // Advanced Authentication Endpoints
                {
                    id: 'route-auth-digest', method: 'GET', path: '/auth/digest-protected', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "Access granted via Digest Auth", user: "admin", realm: "Protected Area" }, null, 2),
                    auth_type: 'digest',
                    auth_config: JSON.stringify({
                        username: 'admin',
                        password: 'secret123',
                        realm: 'Protected Area',
                        nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
                        algorithm: 'MD5',
                        qop: 'auth'
                    }),
                    request_params: null,
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-auth-oauth1', method: 'GET', path: '/auth/oauth1-protected', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "Access granted via OAuth 1.0", user: "oauth_user", oauth_version: "1.0" }, null, 2),
                    auth_type: 'oauth1',
                    auth_config: JSON.stringify({
                        consumer_key: 'demo-consumer-key',
                        consumer_secret: 'demo-consumer-secret',
                        token: 'demo-access-token',
                        token_secret: 'demo-token-secret'
                    }),
                    request_params: null,
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-auth-aws', method: 'GET', path: '/auth/aws-protected', status_code: 200, delay_ms: 75,
                    response_body: JSON.stringify({ message: "Access granted via AWS Signature", region: "us-east-1", service: "execute-api" }, null, 2),
                    auth_type: 'aws',
                    auth_config: JSON.stringify({
                        access_key: 'AKIAIOSFODNN7EXAMPLE',
                        secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        region: 'us-east-1',
                        service: 'execute-api'
                    }),
                    request_params: null,
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-auth-hawk', method: 'GET', path: '/auth/hawk-protected', status_code: 200, delay_ms: 50,
                    response_body: JSON.stringify({ message: "Access granted via Hawk Auth", algorithm: "sha256", timestamp_verified: true }, null, 2),
                    auth_type: 'hawk',
                    auth_config: JSON.stringify({
                        auth_id: 'demo-hawk-id',
                        auth_key: 'demo-hawk-secret-key',
                        hawk_algorithm: 'sha256'
                    }),
                    request_params: null,
                    request_body_schema: null,
                    conditions: null
                },
                {
                    id: 'route-get-svg', method: 'GET', path: '/api/image.svg', status_code: 200, delay_ms: 0,
                    response_body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><circle cx="100" cy="100" r="80" fill="#ff0000"/><text x="100" y="100" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">SVG Demo</text></svg>',
                    response_headers: JSON.stringify([{ Key: "Content-Type", Value: "image/svg+xml" }]),
                    auth_type: 'none', auth_config: null,
                    request_params: null,
                    request_body_schema: null,
                    conditions: null
                },
            ];

            for (const route of defaultRoutes) {
                await this.saveMock({
                    id: route.id,
                    server_id: defaultServerId,
                    method: route.method,
                    path: route.path,
                    status_code: route.status_code,
                    delay_ms: route.delay_ms,
                    response_body: route.response_body,
                    response_headers: (route as any).response_headers || JSON.stringify([{ Key: "Content-Type", Value: "application/json" }]),
                    enabled: true,
                    auth_type: route.auth_type,
                    auth_config: route.auth_config,
                    request_params: route.request_params,
                    request_body_schema: route.request_body_schema,
                    conditions: route.conditions
                });
            }
        }

        // Seed Default Collections if empty
        const collections: any[] = await this.db.select('SELECT * FROM collections LIMIT 1');
        if (collections.length === 0) {
            console.log("Creating default collection...");
            const now = Date.now();

            // Create default collection with global variables
            await this.db.execute(
                `INSERT INTO collections (id, name, type, parent_id, variables) VALUES (?, ?, ?, ?, ?)`,
                ['default-collection', 'Sample API Collection', 'collection', null, null]
            );

            // Add collection-level variables
            const defaultVariables = [
                { id: 'var-1', collection_id: 'default-collection', name: 'base_url', value: 'http://localhost:3001', enabled: true },
                { id: 'var-2', collection_id: 'default-collection', name: 'api_key', value: 'demo-api-key-12345', enabled: true },
                { id: 'var-3', collection_id: 'default-collection', name: 'bearer_token', value: 'demo-bearer-token', enabled: true },
                { id: 'var-4', collection_id: 'default-collection', name: 'user_id', value: '1', enabled: true },
            ];

            for (const v of defaultVariables) {
                await this.db.execute(
                    `INSERT INTO variables (id, collection_id, name, value, enabled) VALUES (?, ?, ?, ?, ?)`,
                    [v.id, v.collection_id, v.name, v.value, v.enabled ? 1 : 0]
                );
            }

            // Add sample requests mirroring Default Routes
            const sampleRequests = [
                // 1. GET /api/hello
                {
                    id: 'req-hello', name: 'GET Hello (Params)', method: 'GET',
                    url: '{{base_url}}/api/hello',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/json' }]),
                    params: JSON.stringify([{ key: 'lang', value: 'en', enabled: true }]),
                    body: ''
                },
                // 2. GET /api/users
                {
                    id: 'req-list-users', name: 'List Users (Params)', method: 'GET',
                    url: '{{base_url}}/api/users',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/json' }]),
                    params: JSON.stringify([
                        { key: 'page', value: '1', enabled: true },
                        { key: 'limit', value: '10', enabled: true },
                        { key: 'sort', value: 'name_asc', enabled: true }
                    ]),
                    body: ''
                },
                // 3. GET /api/users/:id
                {
                    id: 'req-get-user', name: 'Get User (ID)', method: 'GET',
                    url: '{{base_url}}/api/users/{{user_id}}',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/json' }]),
                    params: JSON.stringify([{ key: 'fields', value: 'full', enabled: true }]),
                    body: ''
                },
                // 4. POST /api/users (API Key Auth)
                {
                    id: 'req-create-user', name: 'Create User (API Key)', method: 'POST',
                    url: '{{base_url}}/api/users',
                    headers: JSON.stringify([
                        { key: 'Content-Type', value: 'application/json' }
                    ]),
                    auth: JSON.stringify({ type: 'apiKey', apiKey: { key: 'X-API-Key', value: '{{api_key}}', addTo: 'header' } }),
                    params: '[]',
                    body: JSON.stringify({ name: 'New User', email: 'newuser@example.com', role: 'user' }, null, 2)
                },
                // 5. PUT /api/users/:id (Bearer Auth)
                {
                    id: 'req-update-user', name: 'Update User (Bearer)', method: 'PUT',
                    url: '{{base_url}}/api/users/{{user_id}}',
                    headers: JSON.stringify([
                        { key: 'Content-Type', value: 'application/json' }
                    ]),
                    auth: JSON.stringify({ type: 'bearer', bearer: { token: '{{bearer_token}}' } }),
                    params: JSON.stringify([{ key: 'notify', value: 'true', enabled: true }]),
                    body: JSON.stringify({ name: 'Updated User', email: 'updated@example.com' }, null, 2)
                },
                // 6. PATCH /api/users/:id (Bearer Auth)
                {
                    id: 'req-patch-user', name: 'Patch User (Bearer)', method: 'PATCH',
                    url: '{{base_url}}/api/users/{{user_id}}',
                    headers: JSON.stringify([
                        { key: 'Content-Type', value: 'application/json' }
                    ]),
                    auth: JSON.stringify({ type: 'bearer', bearer: { token: '{{bearer_token}}' } }),
                    params: JSON.stringify([
                        { key: 'dry_run', value: 'true', enabled: true },
                        { key: 'notify', value: 'false', enabled: true }
                    ]),
                    body: JSON.stringify({ role: 'admin' }, null, 2)
                },
                // 7. DELETE /api/users/:id (Bearer Auth)
                {
                    id: 'req-delete-user', name: 'Delete User (Bearer)', method: 'DELETE',
                    url: '{{base_url}}/api/users/{{user_id}}',
                    headers: '[]',
                    auth: JSON.stringify({ type: 'bearer', bearer: { token: '{{bearer_token}}' } }),
                    params: JSON.stringify([{ key: 'force', value: 'true', enabled: true }]),
                    body: ''
                },
                // 8. Auth Login
                {
                    id: 'req-login', name: 'Auth Login', method: 'POST',
                    url: '{{base_url}}/auth/login',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/json' }]),
                    params: JSON.stringify([{ key: 'remember_me', value: 'true', enabled: true }]),
                    body: JSON.stringify({ username: 'admin', password: 'password123' }, null, 2)
                },
                // 9. Basic Protected
                {
                    id: 'req-basic', name: 'Basic Protected', method: 'GET',
                    url: '{{base_url}}/auth/basic-protected',
                    headers: '[]',
                    auth: JSON.stringify({ type: 'basic', basic: { username: 'admin', password: 'password123' } }),
                    params: '[]',
                    body: ''
                },
                // 10. API Key Protected
                {
                    id: 'req-apikey', name: 'API Key Protected', method: 'GET',
                    url: '{{base_url}}/auth/apikey-protected',
                    headers: '[]',
                    auth: JSON.stringify({ type: 'apiKey', apiKey: { key: 'X-API-Key', value: '{{api_key}}', addTo: 'header' } }),
                    params: JSON.stringify([{ key: 'version', value: '1', enabled: true }]),
                    body: ''
                },
                // 11. Error 401
                {
                    id: 'req-401', name: 'Error 401 Unauthorized', method: 'GET',
                    url: '{{base_url}}/api/unauthorized',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/json' }]),
                    params: JSON.stringify([{ key: 'retry', value: 'false', enabled: true }]),
                    body: ''
                },
                // 12. Error 500
                {
                    id: 'req-500', name: 'Error 500 Server Error', method: 'GET',
                    url: '{{base_url}}/api/server-error',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/json' }]),
                    params: JSON.stringify([{ key: 'trace', value: 'true', enabled: true }]),
                    body: ''
                },
                // 13. Form Data Upload (multipart/form-data)
                {
                    id: 'req-upload', name: 'File Upload (Form)', method: 'POST',
                    url: '{{base_url}}/api/upload',
                    headers: '[]',
                    params: '[]',
                    body: JSON.stringify({
                        type: 'formdata',
                        formdata: [
                            { key: 'file', value: '', type: 'file', enabled: true },
                            { key: 'description', value: 'Sample file upload', type: 'text', enabled: true }
                        ]
                    })
                },
                // 14. Form Submit (application/x-www-form-urlencoded)
                {
                    id: 'req-submit', name: 'Form Submit (URL Encoded)', method: 'POST',
                    url: '{{base_url}}/api/submit',
                    headers: JSON.stringify([{ key: 'Content-Type', value: 'application/x-www-form-urlencoded' }]),
                    params: '[]',
                    body: JSON.stringify({
                        type: 'urlencoded',
                        urlencoded: [
                            { key: 'username', value: 'testuser', enabled: true },
                            { key: 'email', value: 'test@example.com', enabled: true }
                        ]
                    })
                },
                // 15. Binary Upload (application/octet-stream)
                {
                    id: 'req-binary', name: 'Binary Upload', method: 'PUT',
                    url: '{{base_url}}/api/binary',
                    headers: '[]',
                    params: '[]',
                    body: JSON.stringify({ type: 'binary', binary: '' })
                },

                // Advanced Authentication Methods
                // 16. Digest Auth
                {
                    id: 'req-digest', name: 'Digest Protected', method: 'GET',
                    url: '{{base_url}}/auth/digest-protected',
                    headers: '[]',
                    auth: JSON.stringify({
                        type: 'digest',
                        digest: {
                            username: 'admin',
                            password: 'secret123',
                            realm: 'Protected Area',
                            algorithm: 'MD5'
                        }
                    }),
                    params: '[]',
                    body: ''
                },
                // 17. OAuth 1.0
                {
                    id: 'req-oauth1', name: 'OAuth 1.0 Protected', method: 'GET',
                    url: '{{base_url}}/auth/oauth1-protected',
                    headers: '[]',
                    auth: JSON.stringify({
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'demo-consumer-key',
                            consumerSecret: 'demo-consumer-secret',
                            token: 'demo-access-token',
                            tokenSecret: 'demo-token-secret',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '',
                            nonce: ''
                        }
                    }),
                    params: '[]',
                    body: ''
                },
                // 18. AWS Signature
                {
                    id: 'req-aws', name: 'AWS Signature Protected', method: 'GET',
                    url: '{{base_url}}/auth/aws-protected',
                    headers: '[]',
                    auth: JSON.stringify({
                        type: 'aws',
                        aws: {
                            accessKey: 'AKIAIOSFODNN7EXAMPLE',
                            secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                            region: 'us-east-1',
                            service: 'execute-api'
                        }
                    }),
                    params: '[]',
                    body: ''
                },
                // 19. Hawk Auth
                {
                    id: 'req-hawk', name: 'Hawk Protected', method: 'GET',
                    url: '{{base_url}}/auth/hawk-protected',
                    headers: '[]',
                    auth: JSON.stringify({
                        type: 'hawk',
                        hawk: {
                            authId: 'demo-hawk-id',
                            authKey: 'demo-hawk-secret-key',
                            algorithm: 'sha256'
                        }
                    }),
                    params: '[]',
                    body: ''
                },
                // 20. Image Preview (SVG)
                {
                    id: 'req-svg', name: 'Image Preview (SVG)', method: 'GET',
                    url: '{{base_url}}/api/image.svg',
                    headers: '[]',
                    params: '[]',
                    body: ''
                }
            ];

            for (const req of sampleRequests) {
                await this.db.execute(
                    `INSERT INTO requests (id, collection_id, name, method, url, body, headers, params, auth, parent_id, type, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [req.id, 'default-collection', req.name, req.method, req.url, req.body, req.headers, req.params, (req as any).auth || null, null, 'request', now]
                );
            }
        }
    }

    // --- Collections ---

    async getCollections(): Promise<Collection[]> {
        if (!this.db) throw new Error("DB not initialized");

        const collections = await this.db.select<any[]>('SELECT * FROM collections ORDER BY created_at');
        const result: Collection[] = [];

        for (const col of collections) {
            const variables = await this.db.select<any[]>('SELECT * FROM variables WHERE collection_id = ?', [col.id]);

            // We need to reconstruct the tree. This is recursive and might be tricky with just flat selects.
            // For MVP of persistence, let's load all requests for a collection and build the tree in JS.
            const items = await this.db.select<any[]>('SELECT * FROM requests WHERE collection_id = ?', [col.id]);
            const examples = await this.db.select<any[]>('SELECT * FROM saved_responses WHERE request_id IN (SELECT id FROM requests WHERE collection_id = ?)', [col.id]);

            const tree = this.buildItemTree(items, examples);

            result.push({
                id: col.id,
                name: col.name,
                type: 'collection',
                items: tree,
                variables: variables.map(v => ({ key: v.name, value: v.value, enabled: !!v.enabled }))
            });
        }

        return result;
    }

    buildItemTree(items: any[], examples: any[] = []): any[] {
        const itemMap = new Map();
        const rootItems: any[] = [];

        // First pass: map and format
        items.forEach(item => {
            const formatted = {
                ...item,
                description: item.description,
                preRequestScript: item.pre_request_script,
                testScript: item.test_script,
                headers: item.headers ? JSON.parse(item.headers) : [],
                params: item.params ? JSON.parse(item.params) : [],
                auth: item.auth ? JSON.parse(item.auth) : undefined,
                items: [] // For folders
            };
            itemMap.set(item.id, formatted);
        });

        // 1.5 pass: attach examples
        examples.forEach(ex => {
            if (itemMap.has(ex.request_id)) {
                const req = itemMap.get(ex.request_id);
                if (!req.examples) req.examples = [];
                req.examples.push({
                    id: ex.id,
                    name: ex.name,
                    status: ex.status,
                    code: ex.code,
                    headers: ex.headers ? JSON.parse(ex.headers) : [],
                    body: ex.body
                });
            }
        });

        // Second pass: link parents
        itemMap.forEach(item => {
            if (item.parent_id && itemMap.has(item.parent_id)) {
                const parent = itemMap.get(item.parent_id);
                if (parent.type === 'folder' || !parent.method) { // Ensure parent is folder-like
                    parent.items.push(item);
                } else {
                    // Fallback if parent is not found or invalid, add to root (or robust error handling)
                    rootItems.push(item);
                }
            } else {
                rootItems.push(item);
            }
        });

        return rootItems;
    }

    async createCollection(collection: Collection) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute(
            'INSERT INTO collections (id, name, type, created_at, description) VALUES (?, ?, ?, ?, ?)',
            [collection.id, collection.name, 'collection', Date.now(), collection.description || null]
        );

        if (collection.variables) {
            for (const v of collection.variables) {
                await this.db.execute(
                    'INSERT INTO variables (collection_id, name, value, enabled) VALUES (?, ?, ?, ?)',
                    [collection.id, v.key, v.value, v.enabled]
                );
            }
        }
    }

    async updateCollection(collection: Collection) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute('UPDATE collections SET name = ? WHERE id = ?', [collection.name, collection.id]);

        // naive variable update: delete all and re-insert
        await this.db.execute('DELETE FROM variables WHERE collection_id = ?', [collection.id]);
        if (collection.variables) {
            for (const v of collection.variables) {
                await this.db.execute(
                    'INSERT INTO variables (collection_id, name, value, enabled) VALUES (?, ?, ?, ?)',
                    [collection.id, v.key, v.value, v.enabled]
                );
            }
        }
    }

    async deleteCollection(id: string) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute('DELETE FROM collections WHERE id = ?', [id]);
    }

    // --- Global Variables ---

    async getGlobalVariables(): Promise<{ key: string; value: string; enabled: boolean }[]> {
        if (!this.db) throw new Error("DB not initialized");
        const vars = await this.db.select<any[]>('SELECT * FROM global_variables');
        return vars.map(v => ({ key: v.key, value: v.value, enabled: !!v.enabled }));
    }

    async saveGlobalVariables(variables: { key: string; value: string; enabled: boolean }[]) {
        if (!this.db) throw new Error("DB not initialized");

        // Transaction-like replacement
        await this.db.execute('DELETE FROM global_variables');

        for (const v of variables) {
            await this.db.execute(
                'INSERT INTO global_variables (key, value, enabled) VALUES (?, ?, ?)',
                [v.key, v.value, v.enabled]
            );
        }
    }

    // --- Environments ---

    async getEnvironments(): Promise<Environment[]> {
        if (!this.db) throw new Error("DB not initialized");
        const envs = await this.db.select<any[]>('SELECT * FROM environments ORDER BY created_at');
        return envs.map(e => ({
            id: e.id,
            name: e.name,
            variables: e.variables ? JSON.parse(e.variables) : [],
            is_active: !!e.is_active
        }));
    }

    async saveEnvironment(env: Environment) {
        if (!this.db) throw new Error("DB not initialized");

        // If this one is set to active, unset others? 
        // Logic handled in setActiveEnvironment usually, but let's enforce single active here if true
        if (env.is_active) {
            await this.db.execute('UPDATE environments SET is_active = 0');
        }

        await this.db.execute(`
            INSERT INTO environments (id, name, variables, is_active, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            variables=excluded.variables,
            is_active=excluded.is_active
        `, [
            env.id,
            env.name,
            JSON.stringify(env.variables),
            env.is_active ? 1 : 0,
            Date.now() // Note: this updates created_at on edit, maybe strict creation time needed? For MVP ok.
        ]);
    }

    async deleteEnvironment(id: string) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute('DELETE FROM environments WHERE id = ?', [id]);
    }

    async setActiveEnvironment(id: string | null) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute('UPDATE environments SET is_active = 0');
        if (id) {
            await this.db.execute('UPDATE environments SET is_active = 1 WHERE id = ?', [id]);
        }
    }

    // --- Requests ---

    async saveRequest(request: RequestData, collectionId: string, parentId: string | null = null, type: 'request' | 'folder' = 'request') {
        if (!this.db) throw new Error("DB not initialized");

        const created_at = (request as any).created_at || Date.now();

        await this.db.execute(
            `INSERT OR REPLACE INTO requests (id, collection_id, name, method, url, body, headers, params, auth, parent_id, type, created_at, description, pre_request_script, test_script) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                request.id,
                collectionId,
                request.name,
                request.method || (type === 'folder' ? null : 'GET'), // Folders might not have method
                request.url || null,
                typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
                JSON.stringify(request.headers || []),
                JSON.stringify(request.params || []),
                JSON.stringify(request.auth),
                parentId,
                type,
                created_at,
                request.description || null,
                request.preRequestScript || null,
                request.testScript || null
            ]
        );

        // If examples are provided in the request object (e.g. during import), save them
        if (request.examples && request.examples.length > 0) {
            for (const ex of request.examples) {
                await this.saveResponseExample(ex, request.id);
            }
        }
    }

    async saveResponseExample(example: any, requestId: string) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute(
            `INSERT OR REPLACE INTO saved_responses (id, request_id, name, status, code, headers, body, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                example.id,
                requestId,
                example.name,
                example.status,
                example.code,
                JSON.stringify(example.headers || []),
                typeof example.body === 'string' ? example.body : JSON.stringify(example.body),
                Date.now()
            ]
        );
    }

    async deleteRequest(id: string) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute('DELETE FROM requests WHERE id = ?', [id]);
    }

    // --- History ---

    async getHistory(): Promise<HistoryEntry[]> {
        if (!this.db) throw new Error("DB not initialized");
        return await this.db.select<HistoryEntry[]>('SELECT * FROM history ORDER BY timestamp DESC LIMIT 100');
    }

    async addToHistory(entry: HistoryEntry) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute(`
      INSERT INTO history (id, method, url, status, duration, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [entry.id, entry.method, entry.url, entry.status, 0, entry.timestamp]);
    }

    async clearHistory() {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.execute('DELETE FROM history');
    }

    async resetDatabase() {
        if (!this.db) throw new Error("DB not initialized");
        const tables = ['collections', 'requests', 'variables', 'history'];
        for (const table of tables) {
            await this.db.execute(`DELETE FROM ${table}`);
        }
    }

    // --- Mocks ---

    async getMockServers(): Promise<any[]> {
        const db = await this.ensureInit();
        return await db.select("SELECT * FROM mock_servers");
    }

    async saveMockServer(server: any): Promise<void> {
        const db = await this.ensureInit();
        await db.execute(
            `INSERT INTO mock_servers (id, name, port, status) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, port=excluded.port, status=excluded.status`,
            [server.id, server.name, server.port, server.status]
        );
    }

    async getMocksByServer(serverId: string): Promise<any[]> {
        const db = await this.ensureInit();
        const mocks: any[] = await db.select("SELECT * FROM mocks WHERE server_id = ?", [serverId]);
        return mocks.map((m: any) => ({
            ...m,
            response_headers: m.response_headers ? JSON.parse(m.response_headers) : [],
            auth_config: m.auth_config ? JSON.parse(m.auth_config) : null,
            request_params: m.request_params ? JSON.parse(m.request_params) : [],
            conditions: m.conditions ? JSON.parse(m.conditions) : null,
            enabled: !!m.enabled
        }));
    }

    // Deprecated global getMocks, kept for safety but unused
    async getMocks(): Promise<any[]> {
        return [];
    }

    async saveMock(mock: any): Promise<void> {
        const db = await this.ensureInit();
        await db.execute(
            `INSERT INTO mocks (id, server_id, method, path, status_code, delay_ms, response_body, response_headers, enabled, auth_type, auth_config, request_params, request_body_schema, conditions) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         method=excluded.method, 
         path=excluded.path, 
         status_code=excluded.status_code, 
         delay_ms=excluded.delay_ms,
         response_body=excluded.response_body, 
         response_headers=excluded.response_headers, 
         enabled=excluded.enabled,
         auth_type=excluded.auth_type,
         auth_config=excluded.auth_config,
         request_params=excluded.request_params,
         request_body_schema=excluded.request_body_schema,
         conditions=excluded.conditions`,
            [
                mock.id,
                mock.server_id,
                mock.method,
                mock.path,
                mock.status_code,
                mock.delay_ms || 0,
                mock.response_body || '{}',
                typeof mock.response_headers === 'string' ? mock.response_headers : JSON.stringify(mock.response_headers || []),
                mock.enabled ? 1 : 0,
                mock.auth_type || 'none',
                mock.auth_config ? (typeof mock.auth_config === 'string' ? mock.auth_config : JSON.stringify(mock.auth_config)) : null,
                mock.request_params ? (typeof mock.request_params === 'string' ? mock.request_params : JSON.stringify(mock.request_params)) : null,
                mock.request_body_schema || null,
                mock.conditions ? (typeof mock.conditions === 'string' ? mock.conditions : JSON.stringify(mock.conditions)) : null
            ]);
    }


    async deleteMockServer(serverId: string): Promise<void> {
        const db = await this.ensureInit();
        // Delete all mocks for this server first
        await db.execute('DELETE FROM mocks WHERE server_id = ?', [serverId]);
        // Delete the server
        await db.execute('DELETE FROM mock_servers WHERE id = ?', [serverId]);
    }

    async deleteMock(id: string): Promise<void> {
        const db = await this.ensureInit();
        await db.execute('DELETE FROM mocks WHERE id = ?', [id]);
    }
}

export const dbService = new DatabaseService();
