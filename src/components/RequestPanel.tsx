
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
        <div className="request-panel">
            <div className="request-bar-container">
                <div className="request-bar-wrapper">
                    <div className={`method-select-wrapper ${request.method.toLowerCase()}`}>
                        <select
                            className="method-select"
                            value={request.method}
                            onChange={(e) => updateMethod(e.target.value as RequestMethod)}
                        >
                            {methods.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="select-chevron" />
                    </div>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type="text"
                            className="url-input"
                            placeholder="Enter request URL"
                            value={request.url}
                            onChange={(e) => updateUrl(e.target.value, e.target.selectionStart || 0)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />
                        {autocomplete && autocomplete.show && (
                            <div className="url-autocomplete-dropdown">
                                {autocomplete.suggestions.map((v, idx) => (
                                    <div
                                        key={idx}
                                        className="url-autocomplete-item"
                                        onClick={() => insertVariable(v.key)}
                                    >
                                        <code>{`{{${v.key}}}`}</code>
                                        <span className="autocomplete-value">{v.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="action-buttons">
                    <button className="send-btn" onClick={handleSend}>
                        <Send size={16} />
                        <span>Run</span>
                    </button>
                    <button className="save-btn" onClick={onSave}>
                        <Save size={16} />
                        <span>Save</span>
                    </button>
                </div>
            </div>

            <div className="request-tabs-header">
                <div
                    className={`tab-item ${activeTab === 'params' ? 'active' : ''}`}
                    onClick={() => setActiveTab('params')}
                >
                    Params
                </div>
                <div
                    className={`tab-item ${activeTab === 'auth' ? 'active' : ''}`}
                    onClick={() => setActiveTab('auth')}
                >
                    Authorization
                </div>
                <div
                    className={`tab-item ${activeTab === 'headers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('headers')}
                >
                    Headers
                </div>
                <div
                    className={`tab-item ${activeTab === 'body' ? 'active' : ''}`}
                    onClick={() => setActiveTab('body')}
                >
                    Body
                </div>
            </div>

            <div className="request-tabs-content">
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
