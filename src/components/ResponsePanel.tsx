import { useState } from "react";
import { Copy, Check, WrapText, Download } from "lucide-react";
// import "./ResponsePanel.css"; // Temporarily disabled during Tailwind migration

interface ResponsePanelProps {
    response: any;
    loading: boolean;
}

const ResponsePanel = ({ response, loading }: ResponsePanelProps) => {
    const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
    const [copied, setCopied] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);

    const getStatusClass = (status: number) => {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 300 && status < 400) return 'redirect';
        if (status >= 400 && status < 500) return 'client-error';
        if (status >= 500) return 'server-error';
        return 'neutral';
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
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    };

    return (
        <div className="response-panel">
            {/* Single unified header bar */}
            <div className="response-unified-header">
                <div className="response-title-status">
                    <h3>Response</h3>
                    {response && !response.error && (
                        <>
                            <span className={`compact-status ${getStatusClass(response.status)}`}>
                                {response.status} {getStatusText(response.status)}
                            </span>
                            <span className="compact-meta">{response.time}ms</span>
                            <span className="compact-meta">{response.size}B</span>
                        </>
                    )}
                </div>

                {!loading && response && !response.error && (
                    <div className="response-actions">
                        <button
                            className="action-btn"
                            onClick={handleCopy}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button
                            className="action-btn"
                            onClick={() => setWordWrap(!wordWrap)}
                            title="Toggle word wrap"
                        >
                            <WrapText size={14} />
                        </button>
                        <button
                            className="action-btn"
                            title="Download response"
                        >
                            <Download size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs - only show when we have a response */}
            {!loading && response && !response.error && (
                <div className="response-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`}
                        onClick={() => setActiveTab('body')}
                    >
                        Body
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('headers')}
                    >
                        Headers
                    </button>
                </div>
            )}

            {/* Content area */}
            <div className="response-content">
                {loading ? (
                    <div className="center-state">
                        <div className="spinner"></div>
                        <span>Sending Request...</span>
                    </div>
                ) : response ? (
                    response.error ? (
                        <div className="center-state error-state">
                            <div className="error-icon">⚠️</div>
                            <div className="error-title">Request Failed</div>
                            <div className="error-message">{response.error}</div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'body' && (
                                <div className={`json-content ${wordWrap ? 'wrap' : 'nowrap'}`}>
                                    <pre
                                        className="json-code"
                                        dangerouslySetInnerHTML={{
                                            __html: syntaxHighlight(formatJSON(response.body))
                                        }}
                                    />
                                </div>
                            )}
                            {activeTab === 'headers' && (
                                <div className="headers-content">
                                    {response.headers && Object.keys(response.headers).length > 0 ? (
                                        Object.entries(response.headers).map(([key, value]) => (
                                            <div key={key} className="header-item">
                                                <span className="header-key">{key}</span>
                                                <span className="header-value">{String(value)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="center-state">
                                            <span>No headers available</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <div className="center-state">
                        <div className="empty-icon">📡</div>
                        <span className="empty-title">No Response Yet</span>
                        <span className="empty-subtitle">Send a request to see the response here</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResponsePanel;
