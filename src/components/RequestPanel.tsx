
import { useState } from "react";
import { ChevronDown, Send, Save } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { RequestMethod, RequestData } from "../App";
// import "./RequestPanel.css"; // Temporarily disabled during Tailwind migration
import KeyValueEditor from "./KeyValueEditor";
import AuthorizationPanel, { AuthData } from "./AuthorizationPanel";
import BodyEditor from "./BodyEditor";

interface RequestPanelProps {
    request: RequestData;
    setRequest: (req: RequestData) => void;
    setResponse: (res: any) => void;
    setLoading: (loading: boolean) => void;
    onSave: () => void;
    onHistoryAdd?: (entry: { method: string; url: string; status?: number }) => void;
    collectionVariables?: { key: string; value: string; enabled: boolean }[];
}

const RequestPanel = ({
    request,
    setRequest,
    setResponse,
    setLoading,
    onSave,
    onHistoryAdd,
    collectionVariables = []
}: RequestPanelProps) => {
    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
        replacementStartIndex: number;
        replacementEndIndex: number;
    } | null>(null);
    const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'headers' | 'body'>('params');
    const methods: RequestMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

    const handleSend = async () => {
        setLoading(true);
        setResponse(null);
        try {
            // 1. Prepare Params and Append to URL
            let finalUrl = request.url;
            if (request.params && request.params.length > 0) {
                const activeParams = request.params.filter(p => p.active && p.key);
                if (activeParams.length > 0) {
                    const separator = finalUrl.includes('?') ? '&' : '?';
                    const queryString = activeParams.map(p => `${encodeURIComponent(substituteVariables(p.key))}=${encodeURIComponent(substituteVariables(p.value))}`).join('&');
                    finalUrl += separator + queryString;
                }
            }
            finalUrl = substituteVariables(finalUrl);

            // 2. Prepare Headers (Merge Manual + Auth)
            const headersMap: Record<string, string> = {};

            // Manual Headers
            if (request.headers) {
                request.headers.forEach(h => {
                    if (h.active && h.key) {
                        headersMap[h.key] = substituteVariables(h.value);
                    }
                });
            }

            // Auth Headers
            if (request.auth && request.auth.type !== 'none') {
                const auth = request.auth;
                if (auth.type === 'bearer' && auth.bearer?.token) {
                    headersMap['Authorization'] = `Bearer ${substituteVariables(auth.bearer.token)}`;
                } else if (auth.type === 'basic' && auth.basic?.username) {
                    const user = substituteVariables(auth.basic.username);
                    const pass = substituteVariables(auth.basic.password || '');
                    headersMap['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
                } else if (auth.type === 'apiKey' && auth.apiKey?.key && auth.apiKey?.value) {
                    const key = substituteVariables(auth.apiKey.key);
                    const val = substituteVariables(auth.apiKey.value);
                    if (auth.apiKey.addTo === 'header') {
                        headersMap[key] = val;
                    } else {
                        // Add to Query Params if specified (logic duplicative of params above but okay for now)
                        const separator = finalUrl.includes('?') ? '&' : '?';
                        finalUrl += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
                    }
                }
            }

            // 3. Prepare Body
            const finalBody = request.body ? substituteVariables(request.body) : undefined;

            const res = await invoke("make_request", {
                method: request.method,
                url: finalUrl,
                headers: headersMap,
                body: finalBody
            });
            setResponse(res);

            // Add to history
            if (onHistoryAdd) {
                onHistoryAdd({
                    method: request.method,
                    url: request.url,
                    status: (res as any)?.status
                });
            }
        } catch (err: any) {
            setResponse({ error: err.toString() });
        } finally {
            setLoading(false);
        }
    };

    const updateUrl = (url: string, cursorPosition: number) => {
        setRequest({ ...request, url });

        const beforeCursor = url.slice(0, cursorPosition);
        const lastOpen = beforeCursor.lastIndexOf('{{');

        if (lastOpen !== -1) {
            // Ensure we aren't outside the variable (e.g. {{foo}} | )
            const contentAfterOpen = beforeCursor.slice(lastOpen + 2);
            if (!contentAfterOpen.includes('}}')) {
                // We are inside a variable block
                const searchTerm = contentAfterOpen; // potentially filter to valid chars only if needed

                // Check what's after the cursor to define the full replacement range
                const afterCursor = url.slice(cursorPosition);
                // Greedy match for rest of variable name
                const matchAfter = afterCursor.match(/^([\w\-\d\.]*)/);
                const extraChars = matchAfter ? matchAfter[0] : "";

                // Check if closing brackets exist immediately after the variable name
                const hasClosing = afterCursor.substring(extraChars.length).startsWith('}}');
                const closingOffset = hasClosing ? 2 : 0;

                const suggestions = collectionVariables.filter(v =>
                    v.enabled && v.key.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (suggestions.length > 0) {
                    setAutocomplete({
                        show: true,
                        suggestions,
                        cursorPosition: cursorPosition, // keep track if needed, though mostly visual
                        replacementStartIndex: lastOpen,
                        replacementEndIndex: cursorPosition + extraChars.length + closingOffset
                    });
                    return;
                }
            }
        }
        setAutocomplete(null);
    };

    const insertVariable = (varKey: string) => {
        if (!autocomplete) return;
        const { replacementStartIndex, replacementEndIndex } = autocomplete;
        const newUrl = request.url.substring(0, replacementStartIndex) +
            `{{${varKey}}}` +
            request.url.substring(replacementEndIndex);
        setRequest({ ...request, url: newUrl });
        setAutocomplete(null);
    };
    const substituteVariables = (text: string): string => {
        let result = text;
        collectionVariables.forEach(v => {
            if (v.enabled) {
                const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
                result = result.replace(regex, v.value);
            }
        });
        return result;
    };
    const updateMethod = (method: RequestMethod) => setRequest({ ...request, method });

    // Helper to adapt string body to BodyData
    const getBodyData = (): any => {
        if (!request.body) return { type: 'none' };
        try {
            JSON.parse(request.body);
            return { type: 'json', json: request.body };
        } catch {
            return { type: 'raw', raw: request.body };
        }
    };

    const handleBodyChange = (bodyData: any) => {
        let newBodyStr = '';
        if (bodyData.type === 'json') newBodyStr = bodyData.json || '';
        else if (bodyData.type === 'raw') newBodyStr = bodyData.raw || '';
        setRequest({ ...request, body: newBodyStr });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Request Bar */}
            <div className="flex items-center gap-2 p-4 border-b bg-background">
                {/* Method Select */}
                <div className="relative">
                    <select
                        className="h-9 px-3 pr-8 rounded-md border border-input bg-background text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                        value={request.method}
                        onChange={(e) => updateMethod(e.target.value as RequestMethod)}
                    >
                        {methods.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                </div>

                {/* URL Input */}
                <div className="relative flex-1">
                    <input
                        type="text"
                        className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Enter request URL"
                        value={request.url}
                        onChange={(e) => updateUrl(e.target.value, e.target.selectionStart || 0)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    {autocomplete && autocomplete.show && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-60 overflow-auto">
                            {autocomplete.suggestions.map((v, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                    onClick={() => insertVariable(v.key)}
                                >
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                    <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <button
                    className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                    onClick={handleSend}
                >
                    <Send className="h-4 w-4" />
                    <span>Run</span>
                </button>
                <button
                    className="h-9 px-4 border border-input bg-background rounded-md text-sm font-medium hover:bg-accent flex items-center gap-2"
                    onClick={onSave}
                >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                </button>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b bg-background">
                <div
                    className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${activeTab === 'params'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setActiveTab('params')}
                >
                    Params
                </div>
                <div
                    className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${activeTab === 'auth'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setActiveTab('auth')}
                >
                    Authorization
                </div>
                <div
                    className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${activeTab === 'headers'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setActiveTab('headers')}
                >
                    Headers
                </div>
                <div
                    className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${activeTab === 'body'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setActiveTab('body')}
                >
                    Body
                </div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-auto p-4">
                {activeTab === 'params' && (
                    <KeyValueEditor
                        items={request.params || []}
                        onChange={(newParams: any[]) => setRequest({ ...request, params: newParams })}
                        collectionVariables={collectionVariables}
                    />
                )}
                {activeTab === 'headers' && (
                    <KeyValueEditor
                        items={request.headers || []}
                        onChange={(newHeaders: any[]) => setRequest({ ...request, headers: newHeaders })}
                        collectionVariables={collectionVariables}
                    />
                )}
                {activeTab === 'auth' && (
                    <AuthorizationPanel
                        auth={request.auth}
                        onChange={(newAuth: any) => setRequest({ ...request, auth: newAuth })}
                        collectionVariables={collectionVariables}
                    />
                )}
                {activeTab === 'body' && (
                    <BodyEditor
                        body={getBodyData()}
                        onChange={handleBodyChange}
                        collectionVariables={collectionVariables}
                    />
                )}
            </div>
        </div>
    );
};

export default RequestPanel;
