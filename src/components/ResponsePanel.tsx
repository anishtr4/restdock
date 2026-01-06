import { useState } from "react";
import { Copy, Check, WrapText, Download } from "lucide-react";

interface ResponsePanelProps {
    response: any;
    loading: boolean;
}

const ResponsePanel = ({ response, loading }: ResponsePanelProps) => {
    const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
    const [copied, setCopied] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);

    const getStatusClass = (status: number) => {
        if (status >= 200 && status < 300) return 'text-emerald-600 bg-emerald-50';
        if (status >= 300 && status < 400) return 'text-blue-600 bg-blue-50';
        if (status >= 400 && status < 500) return 'text-amber-600 bg-amber-50';
        if (status >= 500) return 'text-red-600 bg-red-50';
        return 'text-gray-600 bg-gray-50';
    };

    const getStatusText = (status: number) => {
        const statusTexts: { [key: number]: string } = {
            200: 'OK', 201: 'Created', 204: 'No Content',
            301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
            400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
            500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
        };
        return statusTexts[status] || '';
    };

    const handleCopy = () => {
        if (response && response.body) {
            navigator.clipboard.writeText(response.body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatJSON = (text: string) => {
        try {
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return text;
        }
    };

    const syntaxHighlight = (json: string) => {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'text-blue-600';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-purple-600 font-medium';
                } else {
                    cls = 'text-emerald-600';
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-amber-600';
            } else if (/null/.test(match)) {
                cls = 'text-gray-500';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">Response</h3>
                    {response && !response.error && (
                        <>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(response.status)}`}>
                                {response.status} {getStatusText(response.status)}
                            </span>
                            <span className="text-xs text-muted-foreground">{response.time}ms</span>
                            <span className="text-xs text-muted-foreground">{response.size}B</span>
                        </>
                    )}
                </div>

                {!loading && response && !response.error && (
                    <div className="flex items-center gap-1">
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
                            onClick={handleCopy}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
                            onClick={() => setWordWrap(!wordWrap)}
                            title="Toggle word wrap"
                        >
                            <WrapText className="h-4 w-4" />
                        </button>
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
                            title="Download response"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            {!loading && response && !response.error && (
                <div className="flex border-b">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'body'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        onClick={() => setActiveTab('body')}
                    >
                        Body
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'headers'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        onClick={() => setActiveTab('headers')}
                    >
                        Headers
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Sending Request...</span>
                    </div>
                ) : response ? (
                    response.error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                            <div className="text-4xl">⚠️</div>
                            <div className="text-lg font-semibold text-destructive">Request Failed</div>
                            <div className="text-sm text-muted-foreground max-w-md">{response.error}</div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'body' && (
                                <div className="p-4">
                                    <pre
                                        className={`text-sm font-mono ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}
                                        dangerouslySetInnerHTML={{
                                            __html: syntaxHighlight(formatJSON(response.body))
                                        }}
                                    />
                                </div>
                            )}
                            {activeTab === 'headers' && (
                                <div className="p-4">
                                    {response.headers && Object.keys(response.headers).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(response.headers).map(([key, value]) => (
                                                <div key={key} className="flex gap-4 text-sm">
                                                    <span className="font-medium text-foreground min-w-[200px]">{key}</span>
                                                    <span className="text-muted-foreground">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <span className="text-sm">No headers available</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                        <div className="text-4xl">📡</div>
                        <span className="text-lg font-semibold">No Response Yet</span>
                        <span className="text-sm text-muted-foreground">Send a request to see the response here</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResponsePanel;
