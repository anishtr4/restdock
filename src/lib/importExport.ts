import { Collection, RequestData, Folder, RequestMethod } from "@/types";
import { dbService } from "@/services/db";

// Types for Postman JSON (simplified)
interface PostmanCollection {
    info: {
        name: string;
        schema: string;
        description?: any;
    };
    item: PostmanItem[];
    variable?: any[];
    auth?: any; // Collection-level auth
}

interface PostmanItem {
    name: string;
    description?: any;
    event?: any[]; // Scripts
    item?: PostmanItem[]; // Folder has items
    request?: {
        description?: any;
        method: string;
        header: any[];
        body?: {
            mode: string;
            raw?: string;
            formdata?: any[];
            urlencoded?: any[];
            file?: any;
        };
        url: {
            raw: string;
            protocol?: string;
            host?: string[];
            path?: string[];
            query?: any[];
            variable?: any[];
        } | string; // URL can be string or object
        auth?: any;
    };
    response?: any[];
}

export const importPostmanCollection = async (jsonContent: string): Promise<Collection> => {
    let data: PostmanCollection;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        throw new Error("Invalid JSON content: " + (e instanceof Error ? e.message : String(e)));
    }

    if (!data.info) {
        throw new Error(`Invalid Postman Collection format: missing 'info' field. Found keys: ${Object.keys(data).join(', ')}`);
    }

    const collectionId = `c-${crypto.randomUUID()}`;
    const collection: Collection = {
        id: collectionId,
        name: data.info.name || "Imported Collection",
        type: 'collection',
        items: [],
        variables: data.variable?.map((v: any) => ({
            key: v.key || v.id, // Fallback to id if key is missing
            value: v.value || "", // Default to empty string if null
            enabled: !v.disabled // Postman uses disabled: true, we use enabled: boolean
        })).filter((v: any) => v.key && v.key.trim() !== '') || [], // Filter out variables without valid keys
        auth: data.auth, // Collection-level auth
        description: getDescription(data.info.description)
    };

    // Helper to extract description
    function getDescription(desc: any): string | undefined {
        if (!desc) return undefined;
        if (typeof desc === 'string') return desc;
        return desc.content;
    }

    // Helper to extract script content from event array
    function getScript(events: any[] | undefined, listen: string): string | undefined {
        if (!events || !Array.isArray(events)) return undefined;
        const event = events.find((e: any) => e.listen === listen);
        if (!event || !event.script || !event.script.exec) return undefined;
        const exec = event.script.exec;
        if (Array.isArray(exec)) return exec.join('\n');
        return String(exec);
    }

    // Helper to map Examples
    const mapExamples = (responses: any[]): any[] => {
        if (!responses || !Array.isArray(responses)) return [];
        return responses.map(res => {
            let headers: any[] = [];
            // Parse headers (similar to request headers)
            if (Array.isArray(res.header)) {
                headers = res.header.map((h: any) => ({
                    key: h.key,
                    value: h.value
                }));
            }

            return {
                id: res.id || `ex-${crypto.randomUUID()}`,
                name: res.name || 'Example',
                status: res.status || 'OK',
                code: res.code || 200,
                headers,
                body: res.body || ''
            };
        });
    };

    // Helper to map Postman items to RestDock items
    const mapItems = (items: PostmanItem[]): (RequestData | Folder)[] => {
        return items.map(item => {
            const id = `i-${crypto.randomUUID()}`;

            if (item.item) {
                // It's a Folder
                const folder: Folder = {
                    id,
                    name: item.name,
                    type: 'folder',
                    description: getDescription(item.description),
                    items: mapItems(item.item)
                };
                return folder;
            } else if (item.request) {
                // It's a Request
                let req: any = item.request;
                let url = "";
                let method = "GET";
                let headers: any[] = [];
                let body: any = undefined;
                let auth: any = undefined;
                let queryParams: any[] = [];

                if (typeof req === 'string') {
                    // Handle string request (legacy/simple format)
                    url = req;
                } else {
                    // Handle object request
                    method = (req.method || 'GET').toUpperCase();

                    // Parse URL
                    if (typeof req.url === 'string') {
                        url = req.url;
                    } else if (req.url && req.url.raw) {
                        url = req.url.raw;
                        // Parse query params from structured format
                        if (req.url.query && Array.isArray(req.url.query)) {
                            queryParams = req.url.query.map((q: any) => ({
                                key: q.key || '',
                                value: q.value || '',
                                active: !q.disabled,
                                description: q.description
                            }));
                        }
                    }

                    // Map Header
                    if (Array.isArray(req.header)) {
                        headers = req.header.map((h: any) => ({
                            key: h.key,
                            value: h.value,
                            active: !h.disabled
                        }));
                    } else if (typeof req.header === 'string') {
                        // Parse raw header string if needed, or ignore for now? 
                        // Postman sometimes has "header": "Content-Type: ...\n..."
                        // Simple parsing strategy:
                        const rawHeaders = req.header.split('\n');
                        headers = rawHeaders.map((hLine: string) => {
                            const parts = hLine.split(':');
                            if (parts.length >= 2) {
                                return {
                                    key: parts[0].trim(),
                                    value: parts.slice(1).join(':').trim(),
                                    active: true
                                };
                            }
                            return null;
                        }).filter(Boolean);
                    }

                    // Map Body
                    if (req.body) {
                        if (req.body.mode === 'raw') {
                            try {
                                JSON.parse(req.body.raw || '');
                                body = { type: 'json', json: req.body.raw };
                            } catch {
                                body = { type: 'raw', raw: req.body.raw };
                            }
                        } else if (req.body.mode === 'formdata') {
                            body = {
                                type: 'formdata',
                                formdata: req.body.formdata?.map((f: any) => ({
                                    key: f.key,
                                    value: f.value,
                                    type: f.type === 'file' ? 'file' : 'text',
                                    src: f.src,
                                    enabled: !f.disabled
                                })) || []
                            };
                        } else if (req.body.mode === 'urlencoded') {
                            body = {
                                type: 'x-www-form-urlencoded',
                                urlencoded: req.body.urlencoded?.map((f: any) => ({
                                    key: f.key,
                                    value: f.value,
                                    enabled: !f.disabled
                                })) || []
                            };
                        }
                    }

                    // Map Auth
                    if (req.auth) {
                        auth = req.auth;
                    }
                }

                const requestData: RequestData = {
                    id,
                    name: item.name,
                    method: method as RequestMethod,
                    url,
                    headers,
                    params: queryParams,
                    body,
                    auth: auth || (data.auth ? data.auth : { type: 'none' }),
                    description: getDescription((req as any).description) || getDescription(item.description),
                    preRequestScript: getScript(item.event, 'prerequest'),
                    testScript: getScript(item.event, 'test'),
                    examples: mapExamples(item.response || [])
                };

                // Map Auth details (reuse logic)
                if (requestData.auth && requestData.auth.type !== 'none') {
                    const authSource: any = requestData.auth; // Use any for Postman compatibility
                    // ... Need to simplify auth mapping logic or duplicate it slightly modified ...
                    // Let's reuse the existing mapping logic but adapted
                    if (authSource.type === 'bearer') {
                        const bearerArray = Array.isArray(authSource.bearer) ? authSource.bearer : [];
                        const token = bearerArray.find((x: any) => x.key === 'token')?.value;
                        requestData.auth = { type: 'bearer', bearer: { token } };
                    } else if (authSource.type === 'basic') {
                        const basicArray = Array.isArray(authSource.basic) ? authSource.basic : [];
                        const username = basicArray.find((x: any) => x.key === 'username')?.value;
                        const password = basicArray.find((x: any) => x.key === 'password')?.value;
                        requestData.auth = { type: 'basic', basic: { username, password } };
                    } else if (authSource.type === 'apikey') {
                        // Postman uses 'apikey' but we use 'apiKey'
                        const apikeyArray = Array.isArray(authSource.apikey) ? authSource.apikey : [];
                        const key = apikeyArray.find((x: any) => x.key === 'key')?.value;
                        const value = apikeyArray.find((x: any) => x.key === 'value')?.value;
                        const addTo = apikeyArray.find((x: any) => x.key === 'in')?.value || 'header';
                        requestData.auth = { type: 'apiKey', apiKey: { key, value, addTo } };
                    } else if (authSource.type === 'noauth') {
                        // Postman uses 'noauth' but we use 'none'
                        requestData.auth = { type: 'none' };
                    }
                }

                return requestData;
            } else {
                // Fallback for empty item
                return {
                    id,
                    name: item.name,
                    method: 'GET',
                    url: '',
                    headers: [],
                    params: []
                } as RequestData;
            }
        });
    };

    try {
        collection.items = mapItems(data.item || []);
    } catch (e) {
        throw new Error("Failed to parse collection items: " + (e instanceof Error ? e.message : String(e)));
    }

    // Save to DB
    try {
        await dbService.createCollection(collection);
    } catch (e) {
        throw new Error("Failed to save collection to database: " + (e instanceof Error ? e.message : String(e)));
    }

    // Recursive save items
    const saveRecursively = async (items: (RequestData | Folder)[], colId: string, parentId: string | null) => {
        for (const item of items) {
            if ('type' in item && item.type === 'folder') {
                // Save Folder (stored as request with folder type)
                const folderAsReq = {
                    ...item,
                    method: 'GET', url: '', headers: [], params: []
                } as unknown as RequestData;
                await dbService.saveRequest(folderAsReq, colId, parentId, 'folder');
                await saveRecursively(item.items, colId, item.id);
            } else {
                await dbService.saveRequest(item as RequestData, colId, parentId, 'request');
            }
        }
    };

    try {
        await saveRecursively(collection.items, collection.id, null);
    } catch (e) {
        throw new Error("Failed to save requests to database: " + (e instanceof Error ? e.message : String(e)));
    }

    return collection;
};

export const exportRestDock = async (): Promise<string> => {
    // Get all collections
    const collections = await dbService.getCollections();

    // Get all environments
    const environments = await dbService.getEnvironments();

    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        collections,
        environments
    };

    return JSON.stringify(exportData, null, 2);
};

export const importRestDock = async (jsonContent: string): Promise<void> => {
    let data: any;
    try {
        data = JSON.parse(jsonContent);
    } catch {
        throw new Error("Invalid JSON content");
    }

    if (!data.version || !data.collections) {
        throw new Error("Invalid or incompatible RestDock export file");
    }

    // Import Collections
    for (const col of data.collections) {
        // Regenerate IDs to avoid collision? 
        // If we import as backup restore, maybe keep IDs. 
        // If we import as "add", maybe regen.
        // For simplicity, let's keep IDs but handle upsert in DB or just fail if exists?
        // dbService.createCollection does INSERT.
        // We might need to check existence.
        // Let's assume we overwrite or add.

        // Actually, safer to regenerate IDs for import unless it's a full restore.
        // But user might want to move data.
        // Let's use logic: Try to insert, if conflict, maybe regenerate ID?
        // Or just map to new IDs always.

        // Strategy: New IDs always for imported content to match "Import" behavior.
        // If it's a "Backup Restore", maybe we should clear DB first?
        // Let's do logical import (append).

        const newColId = `c-${crypto.randomUUID()}`;
        const mapItems = (items: any[]): any[] => {
            return items.map(item => {
                const newId = item.type === 'folder' ? `f-${crypto.randomUUID()}` : `r-${crypto.randomUUID()}`;
                if (item.type === 'folder') {
                    return { ...item, id: newId, items: mapItems(item.items || []) };
                } else {
                    return { ...item, id: newId };
                }
            });
        };

        const newItems = mapItems(col.items);
        const newCollection = { ...col, id: newColId, items: newItems, name: `${col.name} (Imported)` };

        await dbService.createCollection(newCollection);

        const saveRecursively = async (items: any[], colId: string, parentId: string | null) => {
            for (const item of items) {
                if ('type' in item && item.type === 'folder') {
                    const folderAsReq = { ...item, method: 'GET', url: '', headers: [], params: [] };
                    await dbService.saveRequest(folderAsReq, colId, parentId, 'folder');
                    await saveRecursively(item.items, colId, item.id);
                } else {
                    await dbService.saveRequest(item, colId, parentId, 'request');
                }
            }
        };

        await saveRecursively(newItems, newColId, null);
    }

    // Import Environments
    if (data.environments) {
        for (const env of data.environments) {
            const newEnv = {
                ...env,
                id: crypto.randomUUID(),
                name: `${env.name} (Imported)`,
                is_active: false // Don't activate auto
            };
            await dbService.saveEnvironment(newEnv);
        }
    }
};
