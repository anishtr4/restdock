import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Check, X } from "lucide-react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { appEditorTheme } from "@/lib/editorTheme";
import { generateCode, SUPPORTED_LANGUAGES, CodeLanguage } from "@/lib/codeGenerator";
import { RequestData } from "@/types";

interface CodeSnippetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: RequestData;
}

export const CodeSnippetDialog = ({
    open,
    onOpenChange,
    request
}: CodeSnippetDialogProps) => {
    const [language, setLanguage] = useState<CodeLanguage>('curl');
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open && request) {
            setCode(generateCode(request, language));
        }
    }, [open, request, language]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code', err);
        }
    };

    const getExtensions = () => {
        switch (language) {
            case 'javascript':
            case 'nodejs':
                return [javascript()];
            case 'python':
                return [python()];
            case 'go':
                return [go()];
            case 'curl':
            default:
                return [StreamLanguage.define(shell)];
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 bg-background overflow-hidden border-border/40 [&>button]:hidden">
                <DialogHeader className="px-6 py-4 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0 h-16 shrink-0 z-10">
                    <DialogTitle className="text-lg font-semibold tracking-tight">Generate Code</DialogTitle>
                    <div className="flex items-center gap-3">
                        <Select value={language} onValueChange={(v) => setLanguage(v as CodeLanguage)}>
                            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                                <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <SelectItem key={lang.id} value={lang.id} className="text-xs">
                                        {lang.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="default" size="sm" onClick={handleCopy} className="h-8 w-8 p-0" title="Copy to Clipboard">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Close">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-muted/10 relative">
                    <CodeMirror
                        value={code}
                        height="100%"
                        theme={appEditorTheme}
                        extensions={getExtensions()}
                        readOnly={true}
                        editable={false}
                        className="h-full text-sm"
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: false,
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
