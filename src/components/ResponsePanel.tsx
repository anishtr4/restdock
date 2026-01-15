import { useState } from "react";
import { Copy, WrapText, Download, Clock, Database, AlertCircle, WifiOff, XCircle, CheckCircle, Search, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// CodeMirror imports
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { appEditorTheme } from "@/lib/editorTheme";

interface ResponsePanelProps {
    response: any;
    loading: boolean;
}

const ResponsePanel = ({ response, loading }: ResponsePanelProps) => {
    const [copied, setCopied] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);
    const [viewMode, setViewMode] = useState<'source' | 'preview' | 'visualize'>('source');
    const [responseFormat, setResponseFormat] = useState("JSON");
    const [activeTab, setActiveTab] = useState("body");


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

    const formatJSON = (text: string) => {
        try {
            if (typeof text !== 'string') return JSON.stringify(text, null, 2);
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return text;
        }
    };



    return (
        <div className="flex flex-col h-full bg-background no-scrollbar">
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
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            {/* Merged Header Row: Tabs + Status Info */}
                            <div className="px-4 border-b bg-muted/5 flex items-center justify-between min-h-[40px]">
                                <TabsList className="h-auto p-0 bg-transparent justify-start gap-6">
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
                                    {response.testResults && (
                                        <TabsTrigger
                                            value="tests"
                                            className="relative rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                                        >
                                            Test Results
                                            <Badge variant="secondary" className={`ml-2 h-5 px-1.5 text-[10px] ${response.testResults.every((t: any) => t.passed) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {response.testResults.filter((t: any) => t.passed).length}/{response.testResults.length}
                                            </Badge>
                                        </TabsTrigger>
                                    )}
                                </TabsList>

                                {/* Right Side: Status Info */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={`font-mono font-medium border ${getStatusColorClass(response.status)}`}>
                                            {response.status} {getStatusText(response.status)}
                                        </Badge>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {response.time}ms</span>
                                            <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> {response.size}B</span>
                                        </div>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Download response"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>


                            <TabsContent value="body" style={{ marginTop: 0 }} className="flex-1 p-0 !mt-0 border-0 overflow-hidden relative flex flex-col data-[state=inactive]:!hidden">
                                {/* dedicated toolbar row */}
                                <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/10">
                                    <div className="flex items-center gap-2">
                                        <Select value={responseFormat} onValueChange={setResponseFormat}>
                                            <SelectTrigger className="h-7 w-[90px] text-xs bg-background border-input shadow-none focus:ring-0 gap-1 px-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="JSON" className="text-xs">JSON</SelectItem>
                                                <SelectItem value="XML" className="text-xs">XML</SelectItem>
                                                <SelectItem value="HTML" className="text-xs">HTML</SelectItem>
                                                <SelectItem value="TEXT" className="text-xs">Text</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <div className="h-4 w-px bg-border mx-1" />

                                        <Button
                                            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="h-7 px-2 text-[10px] font-medium transition-colors"
                                            onClick={() => setViewMode(viewMode === 'preview' ? 'source' : 'preview')}
                                        >
                                            Preview
                                        </Button>
                                        <Button
                                            variant={viewMode === 'visualize' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="h-7 px-2 text-[10px] font-medium transition-colors"
                                            onClick={() => setViewMode(viewMode === 'visualize' ? 'source' : 'visualize')}
                                        >
                                            Visualize
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", wordWrap && "bg-accent text-accent-foreground")}
                                            onClick={() => setWordWrap(!wordWrap)}
                                            title="Toggle Word Wrap"
                                            disabled={viewMode !== 'source'}
                                        >
                                            <WrapText className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                navigator.clipboard.writeText(typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : (response.body || ''));
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            title="Copy to Clipboard"
                                        >
                                            {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                            <Search className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto bg-background relative">
                                    {viewMode === 'source' && (
                                        <CodeMirror
                                            value={responseFormat === 'JSON' ? formatJSON(response.body) : (response.body || '')}
                                            theme={appEditorTheme}
                                            height="100%"
                                            style={{ height: '100%' }}
                                            extensions={[
                                                responseFormat === 'JSON' ? json() : [],
                                                ...(wordWrap ? [EditorView.lineWrapping] : [])
                                            ]}
                                            readOnly={true}
                                            editable={false}
                                            className="h-full text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
                                            basicSetup={{
                                                lineNumbers: true,
                                                foldGutter: true,
                                                highlightActiveLine: false,
                                            }}
                                        />
                                    )}

                                    {viewMode === 'preview' && (
                                        <div className="w-full h-full bg-white">
                                            <iframe
                                                srcDoc={typeof response.body === 'string' ? response.body : JSON.stringify(response.body)}
                                                className="w-full h-full border-none block"
                                                title="Response Preview"
                                                sandbox="allow-scripts"
                                            />
                                        </div>
                                    )}

                                    {viewMode === 'visualize' && (
                                        <div className="w-full h-full p-4 overflow-auto">
                                            {(() => {
                                                try {
                                                    const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;

                                                    // If it's an array, show a table
                                                    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
                                                        const headers = Object.keys(data[0]);
                                                        return (
                                                            <div className="border rounded-md">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead className="w-[50px]">#</TableHead>
                                                                            {headers.map(h => <TableHead key={h} className="capitalize">{h}</TableHead>)}
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {data.map((row: any, i: number) => (
                                                                            <TableRow key={i}>
                                                                                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                                                                {headers.map(h => (
                                                                                    <TableCell key={h} className="max-w-[200px] truncate text-xs font-mono">
                                                                                        {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h])}
                                                                                    </TableCell>
                                                                                ))}
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        );
                                                    }

                                                    // If plain object or other
                                                    return (
                                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                                            <div className="bg-muted p-4 rounded-full">
                                                                <FileJson className="h-8 w-8 opacity-50" />
                                                            </div>
                                                            <p className="text-sm font-medium">Visualization not available</p>
                                                            <p className="text-xs max-w-xs text-center opacity-70">
                                                                Table visualization requires a JSON Array of objects.
                                                                Switch to "JSON" view to see source.
                                                            </p>
                                                        </div>
                                                    );

                                                } catch (e) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                                            <p className="text-sm font-medium text-destructive">Invalid JSON</p>
                                                            <p className="text-xs opacity-70">Cannot visualize invalid JSON data.</p>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="headers" style={{ marginTop: 0 }} className="flex-1 p-0 !mt-0 border-0 overflow-hidden flex flex-col data-[state=inactive]:!hidden">
                                {response.headers && Object.keys(response.headers).length > 0 ? (
                                    <>
                                        {/* Static Header Row */}
                                        <div className="flex w-full text-sm font-medium text-muted-foreground bg-muted border-b border-border shadow-sm z-10 shrink-0">
                                            <div className="w-1/3 px-4 py-2 border-r border-border/50">Key</div>
                                            <div className="flex-1 px-4 py-2">Value</div>
                                        </div>

                                        {/* Scrollable Content */}
                                        <div className="flex-1 overflow-auto w-full p-0 overscroll-y-contain">
                                            <div className="flex flex-col w-full text-sm">
                                                {Object.entries(response.headers).map(([key, value]) => (
                                                    <div key={key} className="flex border-b border-border last:border-0 hover:bg-muted/30 group transition-colors">
                                                        <div className="w-1/3 px-4 py-2 font-medium text-foreground border-r border-border break-all group-hover:border-border/80">{key}</div>
                                                        <div className="flex-1 px-4 py-2 text-muted-foreground font-mono text-xs break-all">{String(value)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 p-12 text-muted-foreground gap-2">
                                        <WifiOff className="h-8 w-8 opacity-50" />
                                        <span className="text-sm">No headers available</span>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="tests" className="flex-1 p-0 m-0 border-0 overflow-hidden">
                                <ScrollArea className="h-full w-full">
                                    <div className="p-4 space-y-2">
                                        {response.testResults && response.testResults.length > 0 ? (
                                            response.testResults.map((t: any, i: number) => (
                                                <div key={i} className="flex items-start gap-3 p-3 rounded-md border bg-muted/20">
                                                    {t.passed ? (
                                                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 space-y-1">
                                                        <div className={`font-medium text-sm ${t.passed ? 'text-green-700' : 'text-destructive'}`}>
                                                            {t.name}
                                                        </div>
                                                        {!t.passed && t.error && (
                                                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded border font-mono">
                                                                {t.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                                <CheckCircle className="h-8 w-8 opacity-20" />
                                                <span className="text-sm">No tests executed</span>
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
