import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodeMirror from '@uiw/react-codemirror';
import { graphql } from 'cm6-graphql';
import { json } from '@codemirror/lang-json';
import { appEditorTheme } from "@/lib/editorTheme";

interface GraphQLEditorProps {
    query: string;
    variables: string;
    onQueryChange: (val: string) => void;
    onVariablesChange: (val: string) => void;
}

const GraphQLEditor = ({
    query,
    variables,
    onQueryChange,
    onVariablesChange
}: GraphQLEditorProps) => {
    return (
        <div className="h-full flex flex-col">
            {/* @ts-ignore - ResizablePanelGroup direction prop type issue */}
            <ResizablePanelGroup direction="vertical" className="h-full border rounded-md">
                <ResizablePanel defaultSize={70} minSize={30}>
                    <div className="h-full flex flex-col bg-background">
                        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Query</span>
                        </div>
                        <div className="flex-1 overflow-auto relative">
                            <CodeMirror
                                value={query}
                                height="100%"
                                theme={appEditorTheme}
                                extensions={[graphql()]}
                                onChange={onQueryChange}
                                className="h-full text-sm"
                                basicSetup={{
                                    lineNumbers: true,
                                    foldGutter: true,
                                    highlightActiveLine: true,
                                }}
                            />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={30} minSize={20}>
                    <div className="h-full flex flex-col bg-background">
                        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Variables (JSON)</span>
                        </div>
                        <div className="flex-1 overflow-auto relative">
                            <CodeMirror
                                value={variables}
                                height="100%"
                                theme={appEditorTheme}
                                extensions={[json()]}
                                onChange={onVariablesChange}
                                className="h-full text-sm"
                                basicSetup={{
                                    lineNumbers: true,
                                    foldGutter: true,
                                    highlightActiveLine: true,
                                }}
                            />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

export default GraphQLEditor;
