
import { useState } from "react";
import { Copy, Check, WrapText, Download, Clock, Database, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ResponsePanelProps {
    response: any;
    loading: boolean;
}

const ResponsePanel = ({ response, loading }: ResponsePanelProps) => {
    const [copied, setCopied] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);



    // Custom logic for badge color since we might not have all variants
    const getStatusColorClass = (status: number) => {
        if (status >= 200 && status < 300) return "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20";
        if (status >= 300 && status < 400) return "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20";
        if (status >= 400 && status < 500) return "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20";
        if (status >= 500) return "bg-red-500/15 text-red-600 hover:bg-red-500/25 border-red-500/20";
        return "";
    }

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
            let cls = 'text-blue-600 dark:text-blue-400';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-purple-600 dark:text-purple-400 font-medium';
                } else {
                    cls = 'text-emerald-600 dark:text-emerald-400';
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-amber-600 dark:text-amber-400';
            } else if (/null/.test(match)) {
                cls = 'text-muted-foreground';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    };

    return (
        <div className="flex flex-col h-full bg-background no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50 backdrop-blur-sm min-h-[57px]">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Response</span>
                    {response && !response.error && (
                        <div className="flex items-center gap-3">
                            <Separator orientation="vertical" className="h-4" />
                            <Badge variant="outline" className={`font-mono font-medium border ${getStatusColorClass(response.status)}`}>
                                {response.status} {getStatusText(response.status)}
                            </Badge>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {response.time}ms</span>
                                <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> {response.size}B</span>
                            </div>
                        </div>
                    )}
                </div>

                {!loading && response && !response.error && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={handleCopy}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 text-muted-foreground hover:text-foreground ${!wordWrap ? 'text-primary' : ''}`}
                            onClick={() => setWordWrap(!wordWrap)}
                            title="Toggle word wrap"
                        >
                            <WrapText className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Download response"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-4 border-muted"></div>
                            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0 left-0"></div>
                        </div>
                        <span className="text-sm font-medium animate-pulse">Sending Request...</span>
                    </div>
                ) : response ? (
                    response.error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-lg font-semibold text-foreground">Request Failed</div>
                                <div className="text-sm text-muted-foreground max-w-md bg-muted/50 p-3 rounded-md font-mono text-xs text-left overflow-auto max-h-[200px]">
                                    {response.error}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Tabs defaultValue="body" className="h-full flex flex-col">
                            <div className="px-4 border-b bg-muted/5">
                                <TabsList className="h-auto p-0 bg-transparent justify-start gap-6 w-full">
                                    <TabsTrigger
                                        value="body"
                                        className="relative rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                                    >
                                        Body
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="headers"
                                        className="relative rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                                    >
                                        Headers
                                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] bg-muted text-muted-foreground">{Object.keys(response.headers || {}).length}</Badge>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="body" className="flex-1 p-0 m-0 border-0 overflow-hidden relative">
                                <ScrollArea className="h-full w-full">
                                    <div className="p-4">
                                        <pre
                                            className={`text-sm font-mono leading-relaxed ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}
                                            dangerouslySetInnerHTML={{
                                                __html: syntaxHighlight(formatJSON(response.body))
                                            }}
                                        />
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="headers" className="flex-1 p-0 m-0 border-0 overflow-hidden">
                                <ScrollArea className="h-full w-full">
                                    <div className="p-4">
                                        {response.headers && Object.keys(response.headers).length > 0 ? (
                                            <div className="border rounded-md overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                                        <tr>
                                                            <th className="px-4 py-2 w-1/3">Key</th>
                                                            <th className="px-4 py-2">Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {Object.entries(response.headers).map(([key, value]) => (
                                                            <tr key={key} className="hover:bg-muted/30">
                                                                <td className="px-4 py-2 font-medium text-foreground border-r">{key}</td>
                                                                <td className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">{String(value)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
                                                <WifiOff className="h-8 w-8 opacity-50" />
                                                <span className="text-sm">No headers available</span>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4 opacity-50">
                        <div className="bg-muted rounded-full p-4">
                            <Clock className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-lg font-semibold">No Response Yet</div>
                            <div className="text-sm text-muted-foreground">Send a request to fetch data</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResponsePanel;
