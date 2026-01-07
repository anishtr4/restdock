
import { useState } from "react";
import { Send, Save, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { RequestMethod, RequestData } from "../App";
import KeyValueEditor from "./KeyValueEditor";
import AuthorizationPanel from "./AuthorizationPanel";
import BodyEditor from "./BodyEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { AppSettings } from "./SettingsView";

interface RequestPanelProps {
    request: RequestData;
    setRequest: (req: RequestData) => void;
    setResponse: (res: any) => void;
    setLoading: (loading: boolean) => void;
    onSave: (request: RequestData) => void;
    onHistoryAdd?: (entry: { method: string; url: string; status?: number }) => void;
    collectionVariables?: { key: string; value: string; enabled: boolean }[];
    settings?: AppSettings;
}

const RequestPanel = ({
    request,
    setRequest,
    setResponse,
    setLoading,
    onSave,
    onHistoryAdd,
    collectionVariables = [],
    settings
}: RequestPanelProps) => {
    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
        replacementStartIndex: number;
        replacementEndIndex: number;
    } | null>(null);
    const [activeTab, setActiveTab] = useState('params');
    const methods: RequestMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        setIsSending(true);
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
                body: finalBody,
                timeout: settings?.requestTimeout,
                follow_redirects: settings?.followRedirects
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
            setIsSending(false);
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

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'text-blue-500';
            case 'POST': return 'text-green-500';
            case 'PUT': return 'text-orange-500';
            case 'DELETE': return 'text-red-500';
            case 'PATCH': return 'text-purple-500';
            default: return 'text-foreground';
        }
    }

    return (
        <div className="flex flex-col h-full bg-background no-scrollbar">
            {/* Request Bar */}
            <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
                {/* Method Select */}
                <div className="w-[120px] flex-shrink-0">
                    <Select value={request.method} onValueChange={(val) => updateMethod(val as RequestMethod)}>
                        <SelectTrigger className={cn("font-bold tracking-tight", getMethodColor(request.method))}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {methods.map((m) => (
                                <SelectItem key={m} value={m} className={cn("font-medium", getMethodColor(m))}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* URL Input */}
                <div className="relative flex-1">
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="https://api.example.com/v1/..."
                            value={request.url}
                            onChange={(e) => updateUrl(e.target.value, e.target.selectionStart || 0)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            className="font-mono text-sm pr-20"
                        />
                        {request.url.includes("{{") && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-muted text-muted-foreground font-normal">VAR</Badge>
                            </div>
                        )}
                    </div>

                    {autocomplete && autocomplete.show && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-xl z-50 max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-b">Select Variable</div>
                            {autocomplete.suggestions.map((v, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm group transition-colors"
                                    onClick={() => insertVariable(v.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded border font-mono text-primary group-hover:border-primary/30">{`{{${v.key}}}`}</code>
                                        <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">{v.value}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">Enter to select</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <Button
                    onClick={handleSend}
                    disabled={isSending}
                    className="w-24 bg-primary hover:bg-primary/90 font-semibold shadow-sm"
                >
                    {isSending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Run
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            Run
                        </>
                    )}
                </Button>
                <Button variant="secondary" className="w-24 border" onClick={() => onSave(request)}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                </Button>
            </div>

            {/* Tabs Header & Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="px-4 pt-2 border-b bg-background/50 backdrop-blur-sm">
                    <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6">
                        {['params', 'auth', 'headers', 'body'].map(tab => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="relative rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto bg-muted/5 min-h-0">
                    <TabsContent value="params" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <KeyValueEditor
                                items={request.params || []}
                                onChange={(newParams: any[]) => setRequest({ ...request, params: newParams })}
                                collectionVariables={collectionVariables}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="headers" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <KeyValueEditor
                                items={request.headers || []}
                                onChange={(newHeaders: any[]) => setRequest({ ...request, headers: newHeaders })}
                                collectionVariables={collectionVariables}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="auth" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <AuthorizationPanel
                                auth={request.auth}
                                onChange={(newAuth: any) => setRequest({ ...request, auth: newAuth })}
                                collectionVariables={collectionVariables}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="body" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <BodyEditor
                                body={getBodyData()}
                                onChange={handleBodyChange}
                                collectionVariables={collectionVariables}
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default RequestPanel;
