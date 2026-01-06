import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import KeyValueEditor from "./KeyValueEditor";

interface BodyData {
    type: 'none' | 'json' | 'raw' | 'formdata';
    json?: string;
    raw?: string;
    formdata?: { key: string; value: string; enabled: boolean }[];
}

interface BodyEditorProps {
    body?: BodyData;
    onChange?: (body: BodyData) => void;
    collectionVariables?: { key: string; value: string; enabled: boolean }[];
}

const BodyEditor = ({
    body,
    onChange,
    collectionVariables = []
}: BodyEditorProps) => {
    const currentBody: BodyData = body || { type: 'none' };

    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
    } | null>(null);

    const handleTypeChange = (type: BodyData['type']) => {
        const newBody: BodyData = { type };

        if (type === 'json') {
            newBody.json = '{\n  \n}';
        } else if (type === 'raw') {
            newBody.raw = '';
        } else if (type === 'formdata') {
            newBody.formdata = [{ key: '', value: '', enabled: true }];
        }

        onChange?.(newBody);
    };

    const handleContentChange = (value: string) => {
        const newBody = { ...currentBody };

        if (currentBody.type === 'json') {
            newBody.json = value;
        } else if (currentBody.type === 'raw') {
            newBody.raw = value;
        }

        onChange?.(newBody);

        // Check for {{ pattern for autocomplete
        const match = value.match(/\{\{([^}]*)$/);
        if (match && collectionVariables.length > 0) {
            const searchTerm = match[1].toLowerCase();
            const suggestions = collectionVariables.filter(v =>
                v.enabled && v.key.toLowerCase().includes(searchTerm)
            );

            if (suggestions.length > 0) {
                setAutocomplete({
                    show: true,
                    suggestions,
                    cursorPosition: value.length
                });
            } else {
                setAutocomplete(null);
            }
        } else {
            setAutocomplete(null);
        }
    };

    const insertVariable = (varKey: string, textareaRef: HTMLTextAreaElement | null) => {
        if (!textareaRef) return;

        const currentValue = currentBody.type === 'json' ? (currentBody.json || '') : (currentBody.raw || '');
        const cursorPos = textareaRef.selectionStart;
        const beforeCursor = currentValue.substring(0, cursorPos);
        const afterCursor = currentValue.substring(cursorPos);

        const lastBraceIndex = beforeCursor.lastIndexOf('{{');
        const newValue = beforeCursor.substring(0, lastBraceIndex) + `{{${varKey}}}` + afterCursor;

        handleContentChange(newValue);
        setAutocomplete(null);

        setTimeout(() => {
            const newCursorPos = lastBraceIndex + `{{${varKey}}}`.length;
            textareaRef.setSelectionRange(newCursorPos, newCursorPos);
            textareaRef.focus();
        }, 0);
    };

    return (
        <div className="space-y-4">
            {/* Body Type Selector */}
            <div className="space-y-2">
                <Label>Body Type</Label>
                <Select value={currentBody.type} onValueChange={(value) => handleTypeChange(value as BodyData['type'])}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select body type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="formdata">Form Data</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Content Area */}
            {currentBody.type === 'none' && (
                <div className="text-sm text-muted-foreground py-4">
                    This request does not have a body.
                </div>
            )}

            {currentBody.type === 'json' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                        <span className="text-xs font-medium text-muted-foreground uppercase">JSON</span>
                    </div>
                    <div className="relative">
                        <textarea
                            className="w-full h-64 px-3 py-2 font-mono text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            placeholder='{\n  "key": "value"\n}'
                            value={currentBody.json || ''}
                            onChange={(e) => handleContentChange(e.target.value)}
                            spellCheck={false}
                            ref={(ref) => {
                                if (ref && autocomplete?.show) {
                                    (window as any).currentTextarea = ref;
                                }
                            }}
                        />
                        {autocomplete && autocomplete.show && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                {autocomplete.suggestions.map((v, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                        onClick={() => insertVariable(v.key, (window as any).currentTextarea)}
                                    >
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                        <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {currentBody.type === 'raw' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Plain Text</span>
                    </div>
                    <div className="relative">
                        <textarea
                            className="w-full h-64 px-3 py-2 font-mono text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            placeholder="Enter raw text..."
                            value={currentBody.raw || ''}
                            onChange={(e) => handleContentChange(e.target.value)}
                            ref={(ref) => {
                                if (ref && autocomplete?.show) {
                                    (window as any).currentTextarea = ref;
                                }
                            }}
                        />
                        {autocomplete && autocomplete.show && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                {autocomplete.suggestions.map((v, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                        onClick={() => insertVariable(v.key, (window as any).currentTextarea)}
                                    >
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                        <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {currentBody.type === 'formdata' && (
                <KeyValueEditor
                    items={currentBody.formdata}
                    onChange={(items) => {
                        const newBody = { ...currentBody, formdata: items };
                        onChange?.(newBody);
                    }}
                    collectionVariables={collectionVariables}
                />
            )}
        </div>
    );
};

export default BodyEditor;
export type { BodyData };
