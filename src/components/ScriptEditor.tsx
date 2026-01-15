import { useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { appEditorTheme } from "@/lib/editorTheme";
import { cn } from "@/lib/utils";

interface ScriptEditorProps {
    preRequestScript?: string;
    testScript?: string;
    onChange: (type: 'pre-request' | 'tests', value: string) => void;
}

const ScriptEditor = ({ preRequestScript = '', testScript = '', onChange }: ScriptEditorProps) => {
    const [activeTab, setActiveTab] = useState<'pre-request' | 'tests'>('pre-request');

    const sections = [
        {
            id: 'pre-request' as const,
            label: 'Pre-request',
            hasContent: !!preRequestScript.trim(),
            description: 'Scripts to run before the request is sent'
        },
        {
            id: 'tests' as const,
            label: 'Post-response',
            hasContent: !!testScript.trim(),
            description: 'Scripts to run after the response is received'
        }
    ];

    return (
        <div className="flex w-full h-full bg-background">
            {/* Sidebar */}
            <div className="w-48 flex-shrink-0 border-r bg-muted/5 flex flex-col">
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Execution Order
                </div>
                <div className="flex-1 space-y-0.5 px-2">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveTab(section.id)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center justify-between group relative overflow-hidden",
                                activeTab === section.id
                                    ? "bg-muted text-foreground font-medium shadow-sm lg:border-l-[3px] lg:border-l-primary lg:rounded-l-none lg:bg-gradient-to-r lg:from-primary/5 lg:to-transparent"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <span className="relative z-10">{section.label}</span>
                            {section.hasContent && (
                                <div className={cn(
                                    "h-1.5 w-1.5 rounded-full ring-2 ring-background transition-colors",
                                    activeTab === section.id ? "bg-primary" : "bg-muted-foreground/40 group-hover:bg-primary/70"
                                )} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 h-full relative flex flex-col min-w-0">
                {/* Header / Info Bar */}
                <div className="h-9 border-b flex items-center px-4 bg-muted/5 flex-shrink-0">
                    <p className="text-xs text-muted-foreground truncate">
                        {sections.find(s => s.id === activeTab)?.description}
                    </p>
                </div>

                <div className="flex-1 relative">
                    <CodeMirror
                        value={activeTab === 'pre-request' ? preRequestScript : testScript}
                        height="100%"
                        className="h-full w-full absolute inset-0 text-sm"
                        extensions={[javascript()]}
                        theme={appEditorTheme}
                        onChange={(val) => onChange(activeTab, val)}
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            autocompletion: true,
                            bracketMatching: true,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ScriptEditor;
