import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Send, Save, Loader2, Code2 } from 'lucide-react';
import { CodeSnippetDialog } from "./CodeSnippetDialog";
import { signAWS, signHawk, signOAuth1, calculateDigestHeader } from "@/lib/authHelpers";
import ScriptEditor from "./ScriptEditor";
import { invoke } from "@tauri-apps/api/core";
import { RequestMethod, RequestData } from "@/types";
import KeyValueEditor from "./KeyValueEditor";
import AuthorizationPanel from "./AuthorizationPanel";
import BodyEditor from "./BodyEditor";
import { ScriptRunner, ScriptContext } from "@/services/ScriptRunner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useEffect } from "react";
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

import { AppSettings } from "@/types";

interface RequestPanelProps {
    request: RequestData;
    setRequest: (req: RequestData) => void;
    setResponse: (res: any) => void;
    setLoading: (loading: boolean) => void;
    onSave: (request: RequestData) => void;
    onHistoryAdd?: (entry: { method: string; url: string; status?: number }) => void;
    globalVariables?: { key: string; value: string; enabled: boolean }[];
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
    globalVariables = [],
    collectionVariables = [],
    settings
}: RequestPanelProps) => {
    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
        replacementStartIndex: number;
        replacementEndIndex: number;
        selectedIndex: number;
        rect: { top: number; left: number; width: number };
    } | null>(null);

    const urlInputWrapperRef = useRef<HTMLDivElement>(null);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close autocomplete
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autocomplete && autocomplete.show && autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setAutocomplete(null);
            }
        };

        if (autocomplete && autocomplete.show) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [autocomplete]);
    const [showCodeDialog, setShowCodeDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('params');
    const methods: RequestMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const [isSending, setIsSending] = useState(false);

    // Environment Variables
    const { activeEnvironment, updateEnvironment } = useEnvironments();

    const getEffectiveVariables = () => {
        // Postman precedence: Global < Collection < Environment
        // Build a Map where later additions override earlier ones
        const varMap = new Map<string, { key: string; value: string; enabled: boolean }>();

        // 1. Add Global vars (lowest priority)
        globalVariables.forEach(v => {
            if (v.key && v.enabled) varMap.set(v.key, v);
        });

        // 2. Add Collection vars (override global)
        collectionVariables.forEach(v => {
            if (v.key && v.enabled) varMap.set(v.key, v);
        });

        // 3. Add Environment vars (highest priority, override both)
        if (activeEnvironment && activeEnvironment.variables) {
            activeEnvironment.variables.forEach(v => {
                if (v.key && v.enabled) {
                    varMap.set(v.key, v);
                }
            });
        }

        return Array.from(varMap.values());
    };

    const effectiveVariables = getEffectiveVariables();

    // Hover tooltip state for URL field
    const [urlTooltip, setUrlTooltip] = useState<{
        show: boolean;
        x: number;
        y: number;
        content: string;
        variableName?: string;
    } | null>(null);

    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoveredVariableRef = useRef<HTMLSpanElement | null>(null);

    // Variable picker dropdown state
    const [variablePicker, setVariablePicker] = useState<{
        show: boolean;
        x: number;
        y: number;
        currentVariable: string;
    } | null>(null);

    // Helper to resolve variables in text
    const resolveVariable = (text: string) => {
        if (!text || !text.includes('{{')) return text;
        return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const v = effectiveVariables.find(cv => cv.key === key && cv.enabled);
            return v ? v.value : `{{${key}}}`;
        });
    };

    const handleUrlMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setUrlTooltip(null);
        }, 100);
    };

    const handleTooltipMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };


    const handleSend = async () => {
        setIsSending(true);
        setLoading(true);
        setResponse(null);
        try {
            // 0. Context Setup for Scripts
            let currentEnvVars: Record<string, string> = {};
            if (activeEnvironment && activeEnvironment.variables) {
                activeEnvironment.variables.forEach(v => {
                    if (v.enabled) currentEnvVars[v.key] = v.value;
                });
            }

            let currentGlobalVars: Record<string, string> = {};
            globalVariables.forEach(v => {
                if (v.enabled) currentGlobalVars[v.key] = v.value;
            });

            // 1. Run Pre-request Script
            if (request.preRequestScript && request.preRequestScript.trim() !== '') {
                const context: ScriptContext = {
                    environment: currentEnvVars,
                    globals: currentGlobalVars,
                    request: request
                };

                try {
                    const result = await ScriptRunner.execute(request.preRequestScript, context);

                    // Update Environment if changed
                    if (activeEnvironment) {
                        const newVariables = Object.entries(result.environment).map(([k, v]) => ({
                            key: k,
                            value: v,
                            enabled: true
                        }));
                        if (JSON.stringify(currentEnvVars) !== JSON.stringify(result.environment)) {
                            await updateEnvironment({ ...activeEnvironment, variables: newVariables });
                            currentEnvVars = result.environment; // Update local reference for substitution
                        }
                    }
                } catch (e) {
                    console.error("Pre-request script error:", e);
                }
            }

            // Helper to use LATEST vars (including script updates)
            const getVar = (key: string) => {
                if (key in currentEnvVars) return currentEnvVars[key];
                const colVar = collectionVariables.find(v => v.key === key && v.enabled);
                if (colVar) return colVar.value;
                if (key in currentGlobalVars) return currentGlobalVars[key];
                return "";
            };

            const subVars = (text: string): string => {
                if (!text) return text;
                return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => getVar(key) || `{{${key}}}`);
            };

            // 2. Prepare Params and Append to URL
            let finalUrl = request.url;
            if (request.params && request.params.length > 0) {
                const activeParams = request.params.filter(p => p.active && p.key);
                if (activeParams.length > 0) {
                    const separator = finalUrl.includes('?') ? '&' : '?';
                    const queryString = activeParams.map(p => `${encodeURIComponent(subVars(p.key))}=${encodeURIComponent(subVars(p.value))}`).join('&');
                    finalUrl += separator + queryString;
                }
            }
            finalUrl = subVars(finalUrl);

            // 3. Prepare Headers (Merge Manual + Auth)
            const headersMap: Record<string, string> = {};

            // Manual Headers
            if (request.headers) {
                request.headers.forEach(h => {
                    if (h.active && h.key) {
                        headersMap[h.key] = subVars(h.value);
                    }
                });
            }

            // Auth Headers
            if (request.auth && request.auth.type !== 'none') {
                const auth = request.auth;
                if (auth.type === 'bearer' && auth.bearer?.token) {
                    headersMap['Authorization'] = `Bearer ${subVars(auth.bearer.token)}`;
                } else if (auth.type === 'basic' && auth.basic?.username) {
                    const user = subVars(auth.basic.username);
                    const pass = subVars(auth.basic.password || '');
                    headersMap['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
                } else if (auth.type === 'apiKey' && auth.apiKey?.key && auth.apiKey?.value) {
                    const key = subVars(auth.apiKey.key);
                    const val = subVars(auth.apiKey.value);
                    if (auth.apiKey.addTo === 'header') {
                        headersMap[key] = val;
                    } else {
                        const separator = finalUrl.includes('?') ? '&' : '?';
                        finalUrl += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
                    }
                } else if (auth.type === 'oauth2' && auth.oauth2?.accessToken) {
                    // Support both manual and auto flows if accessToken is present
                    const token = subVars(auth.oauth2.accessToken);
                    const prefix = subVars(auth.oauth2.tokenType || 'Bearer');
                    if (auth.oauth2.addTokenTo === 'header') {
                        headersMap['Authorization'] = `${prefix} ${token}`;
                    }
                } else if (auth.type === 'aws' && auth.aws) {
                    // AWS v4 Signing
                    const awsAuth = {
                        accessKey: subVars(auth.aws.accessKey),
                        secretKey: subVars(auth.aws.secretKey),
                        region: subVars(auth.aws.region),
                        service: subVars(auth.aws.service),
                        sessionToken: subVars(auth.aws.sessionToken || '')
                    };

                    // We need body for signing, pre-calculate it if possible, else empty string for GET
                    let bodyForSign = '';
                    if (request.body && typeof request.body !== 'string' && request.body.type === 'json') {
                        bodyForSign = subVars(request.body.json);
                    } else if (request.body && typeof request.body !== 'string' && request.body.type === 'raw') {
                        bodyForSign = subVars(request.body.raw);
                    }

                    try {
                        const signedHeaders = signAWS(request.method, finalUrl, headersMap, bodyForSign, awsAuth);
                        Object.assign(headersMap, signedHeaders);
                    } catch (e) {
                        console.error("AWS Sign Error", e);
                    }
                } else if (auth.type === 'hawk' && auth.hawk) {
                    try {
                        const hawkAuth = {
                            authId: subVars(auth.hawk.authId),
                            authKey: subVars(auth.hawk.authKey),
                            algorithm: auth.hawk.algorithm,
                            app: subVars(auth.hawk.app || '')
                        };
                        const header = signHawk(request.method, finalUrl, hawkAuth);
                        headersMap['Authorization'] = header;
                    } catch (e) { console.error("Hawk Sign Error", e); }
                } else if (auth.type === 'digest' && auth.digest) {
                    try {
                        const digestAuth = {
                            username: subVars(auth.digest.username),
                            password: subVars(auth.digest.password),
                            realm: subVars(auth.digest.realm || ''),
                            nonce: subVars(auth.digest.nonce || ''),
                            algorithm: auth.digest.algorithm,
                            qop: auth.digest.qop,
                            opaque: subVars(auth.digest.opaque || ''),
                            cnonce: auth.digest.cnonce
                        };
                        const header = calculateDigestHeader(request.method, finalUrl, digestAuth);
                        if (header) headersMap['Authorization'] = header;
                    } catch (e) { console.error("Digest Sign Error", e); }
                } else if (auth.type === 'oauth1' && auth.oauth1) {
                    try {
                        const oauth1Auth = {
                            consumerKey: subVars(auth.oauth1.consumerKey),
                            consumerSecret: subVars(auth.oauth1.consumerSecret),
                            token: subVars(auth.oauth1.token),
                            tokenSecret: subVars(auth.oauth1.tokenSecret),
                            signatureMethod: auth.oauth1.signatureMethod,
                            addParamsToHeader: auth.oauth1.addParamsToHeader
                        };
                        // Extract query params from URL for signing
                        const urlObj = new URL(finalUrl);
                        const queryParams: Record<string, string> = {};
                        urlObj.searchParams.forEach((v, k) => queryParams[k] = v);

                        const header = signOAuth1(request.method, finalUrl, queryParams, oauth1Auth);
                        headersMap['Authorization'] = header;
                    } catch (e) { console.error("OAuth1 Sign Error", e); }
                }
            }

            // 4. Prepare Body
            let finalBody: any = undefined;
            if (request.body) {
                if (typeof request.body === 'string') {
                    finalBody = subVars(request.body);
                } else {
                    finalBody = { ...request.body };
                    if (finalBody.type === 'json' && finalBody.json) {
                        finalBody.json = subVars(finalBody.json);
                    } else if (finalBody.type === 'raw' && finalBody.raw) {
                        finalBody.raw = subVars(finalBody.raw);
                    } else if (finalBody.type === 'formdata' && finalBody.formdata) {
                        finalBody.formdata = finalBody.formdata.map((f: any) => ({
                            ...f,
                            key: subVars(f.key),
                            value: subVars(f.value),
                            type: f.type
                        }));
                    } else if (finalBody.type === 'x-www-form-urlencoded' && finalBody.urlencoded) {
                        finalBody.urlencoded = finalBody.urlencoded.map((f: any) => ({
                            ...f,
                            key: subVars(f.key),
                            value: subVars(f.value)
                        }));
                    } else if (finalBody.type === 'binary' && finalBody.binary) {
                        finalBody.binary = subVars(finalBody.binary);
                    } else if (finalBody.type === 'graphql' && finalBody.graphql) {
                        // Transform GraphQL to standard JSON request
                        const query = subVars(finalBody.graphql.query || '');
                        const variablesStr = subVars(finalBody.graphql.variables || '{}');
                        let variables = {};
                        try {
                            variables = JSON.parse(variablesStr);
                        } catch (e) {
                            console.warn("Invalid GraphQL variables, sending as is or empty");
                        }

                        // Mutate finalBody to be a JSON request
                        finalBody.type = 'json';
                        finalBody.json = JSON.stringify({ query, variables });

                        // Ensure Content-Type is set
                        headersMap['Content-Type'] = 'application/json';
                    }
                }
            }

            // Serialize body
            let bodyString: string | undefined = undefined;
            if (finalBody) {
                if (typeof finalBody === 'string') {
                    bodyString = finalBody;
                } else {
                    bodyString = JSON.stringify(finalBody);
                }
            }

            const res: any = await invoke("make_request", {
                method: request.method,
                url: finalUrl,
                headers: headersMap,
                body: bodyString,
                timeout: settings?.requestTimeout,
                follow_redirects: settings?.followRedirects
            });

            // 5. Run Test Script
            let testResults: any[] = [];
            if (request.testScript && request.testScript.trim() !== '') {
                const context: ScriptContext = {
                    environment: currentEnvVars,
                    globals: currentGlobalVars,
                    request: request,
                    response: res
                };
                try {
                    const result = await ScriptRunner.execute(request.testScript, context);
                    testResults = result.tests;
                    // Update Environment from Tests locally and persist
                    if (activeEnvironment && JSON.stringify(currentEnvVars) !== JSON.stringify(result.environment)) {
                        const newVariables = Object.entries(result.environment).map(([k, v]) => ({
                            key: k,
                            value: v,
                            enabled: true
                        }));
                        await updateEnvironment({ ...activeEnvironment, variables: newVariables });
                    }
                } catch (e) {
                    console.error("Test script error:", e);
                    testResults.push({ name: "Execution Error", passed: false, error: String(e) });
                }
            }

            setResponse({ ...res, testResults });

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
                const remainder = afterCursor.substring(extraChars.length);
                let closingOffset = 0;
                if (remainder.startsWith('}}')) closingOffset = 2;
                else if (remainder.startsWith('}')) closingOffset = 1;

                const suggestions = effectiveVariables.filter(v =>
                    v.enabled && v.key.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (suggestions.length > 0) {
                    setAutocomplete({
                        show: true,
                        suggestions,
                        cursorPosition: cursorPosition, // keep track if needed, though mostly visual
                        replacementStartIndex: lastOpen,

                        replacementEndIndex: cursorPosition + extraChars.length + closingOffset,
                        selectedIndex: 0,
                        rect: urlInputWrapperRef.current ? (() => {
                            const r = urlInputWrapperRef.current.getBoundingClientRect();
                            return { top: r.bottom, left: r.left, width: r.width };
                        })() : { top: 0, left: 0, width: 300 }
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
    // substituteVariables moved up and updated to use effectiveVariables
    const updateMethod = (method: RequestMethod) => setRequest({ ...request, method });

    // Helper to adapt string body to BodyData
    // Helper to adapt string body to BodyData
    const getBodyData = (): any => {
        if (!request.body) return { type: 'none' };

        // If body is already an object with type, return it directly
        if (typeof request.body === 'object' && request.body.type) {
            return request.body;
        }

        if (typeof request.body === 'string') {
            try {
                const parsed = JSON.parse(request.body);

                // Check if this is a structured body object with a type field
                if (parsed && typeof parsed === 'object' && parsed.type) {
                    // It's a stored body with type info (binary, formdata, urlencoded, etc.)
                    return parsed;
                }

                // Otherwise it's plain JSON content
                return { type: 'json', json: request.body };
            } catch {
                // Not valid JSON, treat as raw text
                return { type: 'raw', raw: request.body };
            }
        }

        return request.body;
    };

    const handleBodyChange = (bodyData: any) => {
        setRequest({ ...request, body: bodyData });
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

    const loadExample = (exampleId: string) => {
        const example = request.examples?.find(e => e.id === exampleId);
        if (example) {
            setResponse({
                status: example.code,
                statusText: example.status,
                headers: example.headers.reduce((acc: any, h) => ({ ...acc, [h.key]: h.value }), {}),
                body: example.body,
                time: 0,
                size: example.body ? example.body.length : 0,
                testResults: [] // Examples don't usually have test results saved?
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-background no-scrollbar">
            {/* Request Bar */}
            <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
                {/* Method Select */}
                <div className="w-[105px] flex-shrink-0">
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
                    <div className="relative" ref={urlInputWrapperRef}>
                        {/* Variable Highlight Layer */}
                        {request.url.includes('{{') && (
                            <div className="absolute inset-0 px-3 flex items-center text-sm font-mono whitespace-pre overflow-hidden z-20 pointer-events-none">
                                {request.url.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                                    if (part.match(/^\{\{[^}]+\}\}$/)) {
                                        return (
                                            <span
                                                key={i}
                                                className="text-primary font-medium cursor-pointer hover:text-primary/80 transition-colors pointer-events-auto"
                                                onMouseEnter={(e) => {
                                                    // Clear any pending hide timeout
                                                    if (hoverTimeoutRef.current) {
                                                        clearTimeout(hoverTimeoutRef.current);
                                                        hoverTimeoutRef.current = null;
                                                    }

                                                    // Store reference to this span for positioning dropdown later
                                                    hoveredVariableRef.current = e.currentTarget as HTMLSpanElement;

                                                    const spanRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const resolved = resolveVariable(part);
                                                    setUrlTooltip({
                                                        show: true,
                                                        x: spanRect.left,
                                                        y: spanRect.bottom + 1,
                                                        content: resolved,
                                                        variableName: part
                                                    });
                                                }}
                                                onMouseLeave={handleUrlMouseLeave}
                                            >
                                                {part}
                                            </span>
                                        );
                                    }
                                    return <span key={i}>{part}</span>;
                                })}
                            </div>
                        )}
                        {/* Render non-variable text when variables present */}
                        {request.url.includes('{{') && (
                            <div className="absolute inset-0 px-3 flex items-center text-sm font-mono whitespace-pre overflow-hidden z-5 pointer-events-none">
                                {request.url.split(/(\{\{[^}]+\}\})/).map((part, i) => (
                                    part.match(/^\{\{[^}]+\}\}$/)
                                        ? <span key={i} style={{ visibility: 'hidden' }}>{part}</span>
                                        : <span key={i}>{part}</span>
                                ))}
                            </div>
                        )}
                        <Input
                            type="text"
                            placeholder="https://api.example.com/v1/..."
                            value={request.url}
                            onChange={(e) => updateUrl(e.target.value, e.target.selectionStart || 0)}
                            onKeyDown={(e) => {
                                if (autocomplete && autocomplete.show) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setAutocomplete(prev => prev ? ({
                                            ...prev,
                                            selectedIndex: Math.min(prev.suggestions.length - 1, prev.selectedIndex + 1)
                                        }) : null);
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setAutocomplete(prev => prev ? ({
                                            ...prev,
                                            selectedIndex: Math.max(0, prev.selectedIndex - 1)
                                        }) : null);
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (autocomplete.suggestions[autocomplete.selectedIndex]) {
                                            insertVariable(autocomplete.suggestions[autocomplete.selectedIndex].key);
                                        }
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setAutocomplete(null);
                                    }
                                } else {
                                    if (e.key === "Enter") handleSend();
                                }
                            }}
                            className="font-mono text-sm pr-20 relative z-10"
                            style={{
                                color: request.url.includes('{{') ? 'transparent' : 'inherit',
                                caretColor: 'hsl(var(--foreground))'
                            }}
                        />
                        {request.url.includes("{{") && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                                <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-muted text-muted-foreground font-normal">VAR</Badge>
                            </div>
                        )}
                    </div>



                    {autocomplete && autocomplete.show && autocomplete.rect && createPortal(
                        <div
                            ref={autocompleteRef}
                            className="fixed z-[9999] bg-popover border border-border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[300px]"
                            style={{
                                top: autocomplete.rect.top + 4, // slight offset
                                left: autocomplete.rect.left,
                                width: Math.max(300, autocomplete.rect.width)
                            }}
                        >
                            {/* Header */}
                            <div className="px-3 py-2 border-b bg-muted/30">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Select Variable</div>
                            </div>

                            {/* List */}
                            <div className="max-h-64 overflow-y-auto">
                                {autocomplete.suggestions.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                        No variables available
                                    </div>
                                ) : (
                                    autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={v.key}
                                            ref={(el) => {
                                                if (idx === autocomplete.selectedIndex && el) {
                                                    el.scrollIntoView({ block: 'nearest' });
                                                }
                                            }}
                                            className={cn(
                                                "px-3 py-2 cursor-pointer border-b border-border/30 last:border-0 transition-colors",
                                                idx === autocomplete.selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                                            )}
                                            onClick={() => insertVariable(v.key)}
                                        >
                                            <div className="font-mono text-xs font-semibold text-primary mb-0.5">
                                                {`{{${v.key}}}`}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {v.value || <span className="italic">Empty</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 border-t bg-muted/20">
                                <div className="text-[10px] text-muted-foreground text-center">
                                    Press Enter to insert
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                {/* Action Buttons */}
                <Button
                    onClick={handleSend}
                    disabled={isSending}
                    className="px-6 bg-primary hover:bg-primary/90 font-semibold shadow-sm"
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
            </div>

            {/* Tabs Header & Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="px-4 pt-2 border-b bg-background/50 backdrop-blur-sm">
                    <TabsList className="w-full justify-between h-auto p-0 bg-transparent">
                        <div className="flex gap-6">
                            {['params', 'auth', 'headers', 'body', 'scripts'].map(tab => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="relative rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </TabsTrigger>
                            ))}
                        </div>

                        {/* Secondary Actions moved to Tabs Header */}
                        <div className="flex items-center gap-2 pb-1">
                            {request.examples && request.examples.length > 0 && (
                                <Select onValueChange={loadExample}>
                                    <SelectTrigger className="h-7 px-2 text-xs border-dashed text-muted-foreground w-auto min-w-[80px]">
                                        <span className="hidden sm:inline">Examples</span>
                                        <span className="sm:hidden">Ex</span>
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        {request.examples.map((ex) => (
                                            <SelectItem key={ex.id} value={ex.id}>
                                                <span className="flex items-center gap-2">
                                                    <Badge variant={ex.code >= 200 && ex.code < 300 ? "outline" : "destructive"} className="text-[10px] px-1 py-0 h-4">
                                                        {ex.code}
                                                    </Badge>
                                                    <span className="truncate max-w-[100px]">{ex.name}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary" onClick={() => setShowCodeDialog(true)} title="Generate Code">
                                <Code2 className="mr-1.5 h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Code</span>
                            </Button>

                            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary" onClick={() => onSave(request)}>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                Save
                            </Button>
                        </div>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto bg-muted/5 min-h-0">
                    <TabsContent value="params" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <KeyValueEditor
                                items={request.params || []}
                                onChange={(newParams: any[]) => setRequest({ ...request, params: newParams })}
                                collectionVariables={effectiveVariables}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="headers" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <KeyValueEditor
                                items={request.headers || []}
                                onChange={(newHeaders: any[]) => setRequest({ ...request, headers: newHeaders })}
                                collectionVariables={effectiveVariables}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="auth" className="bg-transparent m-0 h-full border-0 p-0">
                        <AuthorizationPanel
                            auth={request.auth}
                            onChange={(newAuth: any) => setRequest({ ...request, auth: newAuth })}
                            collectionVariables={effectiveVariables}
                        />
                    </TabsContent>

                    <TabsContent value="body" className="bg-transparent p-4 m-0 h-full border-0">
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <BodyEditor
                                body={getBodyData()}
                                onChange={handleBodyChange}
                                collectionVariables={effectiveVariables}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="scripts" className="h-full m-0 p-0 border-0">
                        <ScriptEditor
                            preRequestScript={request.preRequestScript}
                            testScript={request.testScript}
                            onChange={(type, value) => {
                                if (type === 'pre-request') {
                                    setRequest({ ...request, preRequestScript: value });
                                } else {
                                    setRequest({ ...request, testScript: value });
                                }
                            }}
                        />
                    </TabsContent>
                </div>
            </Tabs>

            {/* URL Tooltip Portal */}
            {
                urlTooltip && urlTooltip.show && createPortal(
                    <div
                        className="fixed z-[10000] pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            left: urlTooltip.x,
                            top: urlTooltip.y + 1,
                        }}
                    >
                        {/* Tooltip content */}
                        <div
                            className="relative px-4 py-3 text-xs bg-popover text-popover-foreground border rounded-md shadow-xl"
                            style={{
                                minWidth: '200px',
                                maxWidth: '400px',
                            }}
                            onMouseEnter={handleTooltipMouseEnter}
                            onMouseLeave={handleUrlMouseLeave}
                        >
                            {/* Variable Name */}
                            <div className="font-mono text-sm font-semibold text-primary mb-2">
                                {urlTooltip.variableName}
                            </div>

                            {/* Resolved Value */}
                            <div className="mb-3">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Value</div>
                                <div className="font-mono text-xs text-foreground bg-muted/30 px-2 py-1.5 rounded border border-border/50" style={{ wordBreak: 'break-all' }}>
                                    {urlTooltip.content}
                                </div>
                            </div>

                            {/* Action Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] w-full font-medium"
                                onClick={() => {
                                    // Use the original variable span position
                                    if (hoveredVariableRef.current) {
                                        const varRect = hoveredVariableRef.current.getBoundingClientRect();
                                        setVariablePicker({
                                            show: true,
                                            x: varRect.left,
                                            y: varRect.bottom + 2,
                                            currentVariable: urlTooltip.variableName || ''
                                        });
                                    }
                                    setUrlTooltip(null);
                                }}
                            >
                                Change Variable
                            </Button>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Variable Picker Dropdown Portal */}
            {
                variablePicker && variablePicker.show && createPortal(
                    <div
                        className="fixed z-[10001] pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                        style={{
                            left: variablePicker.x,
                            top: variablePicker.y,
                        }}
                        onMouseLeave={() => setVariablePicker(null)}
                    >
                        <div className="bg-popover border rounded-md shadow-xl overflow-hidden" style={{ minWidth: '240px', maxWidth: '320px' }}>
                            {/* Header */}
                            <div className="px-3 py-2 border-b bg-muted/30">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Select Variable</div>
                            </div>

                            {/* Variable List */}
                            <div className="max-h-64 overflow-y-auto">
                                {effectiveVariables.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                        No variables available
                                    </div>
                                ) : (
                                    effectiveVariables.map((variable) => (
                                        <div
                                            key={variable.key}
                                            className="px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border/30 last:border-0 transition-colors"
                                            onClick={() => {
                                                // Replace the variable in URL
                                                const newUrl = request.url.replace(
                                                    variablePicker.currentVariable,
                                                    `{{${variable.key}}}`
                                                );
                                                setRequest({ ...request, url: newUrl });
                                                setVariablePicker(null);
                                            }}
                                        >
                                            <div className="font-mono text-xs font-semibold text-primary mb-0.5">
                                                {`{{${variable.key}}}`}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {variable.value || <span className="italic">Empty</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 border-t bg-muted/20">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] w-full font-medium"
                                    onClick={() => setVariablePicker(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {showCodeDialog && (
                <CodeSnippetDialog
                    open={showCodeDialog}
                    onOpenChange={setShowCodeDialog}
                    request={request}
                />
            )}
        </div >
    );
};

export default RequestPanel;
