import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import KeyValueEditor from "./KeyValueEditor";
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from "@/components/ui/button";

interface BodyData {
    type: 'none' | 'json' | 'raw' | 'formdata' | 'x-www-form-urlencoded' | 'binary';
    json?: string;
    raw?: string;
    formdata?: { key: string; value: string; enabled: boolean }[];
    urlencoded?: { key: string; value: string; enabled: boolean }[];
    binary?: string;
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
        } else if (type === 'x-www-form-urlencoded') {
            newBody.urlencoded = [{ key: '', value: '', enabled: true }];
        } else if (type === 'binary') {
            newBody.binary = '';
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

    const handleFilePick = async (onPick: (path: string) => void) => {
        try {
            const selected = await open({
                multiple: false,
                directory: false,
            });
            if (selected && typeof selected === 'string') {
                onPick(selected);
            }
        } catch (err) {
            console.error("Failed to open file dialog:", err);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Body Type Selector */}
            <div className="pb-2 overflow-x-auto no-scrollbar">
                <RadioGroup
                    value={currentBody.type}
                    onValueChange={(value) => handleTypeChange(value as BodyData['type'])}
                    className="flex flex-row items-center gap-6"
                >
                    {[
                        { value: 'none', label: 'None' },
                        { value: 'json', label: 'JSON' },
                        { value: 'raw', label: 'Raw' },
                        { value: 'formdata', label: 'Form Data' },
                        { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
                        { value: 'binary', label: 'Binary' },
                    ].map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value} id={`body-${opt.value}`} />
                            <Label htmlFor={`body-${opt.value}`} className="cursor-pointer font-normal text-muted-foreground aria-checked:text-foreground aria-checked:font-medium">
                                {opt.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Content Area */}
            {currentBody.type === 'none' && (
                <div className="text-sm text-muted-foreground italic px-1">
                    This request does not include a body payload.
                </div>
            )}

            {currentBody.type === 'json' && (
                <div className="relative border rounded-md shadow-sm bg-background flex-1 flex flex-col min-h-0">
                    <textarea
                        className="w-full flex-1 p-4 font-mono text-sm bg-transparent border-0 focus:outline-none resize-none no-scrollbar"
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
            )}

            {currentBody.type === 'raw' && (
                <div className="relative border rounded-md shadow-sm bg-background flex-1 flex flex-col min-h-0">
                    <textarea
                        className="w-full flex-1 p-4 font-mono text-sm bg-transparent border-0 focus:outline-none resize-none no-scrollbar"
                        placeholder="Enter raw text here..."
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
            )}

            {currentBody.type === 'formdata' && (
                <KeyValueEditor
                    items={currentBody.formdata?.map(i => ({ ...i, active: i.enabled, description: '' })) || []}
                    onChange={(items) => {
                        const newFormdata = items.map(i => ({ key: i.key, value: i.value, type: i.type, enabled: i.active }));
                        const newBody = { ...currentBody, formdata: newFormdata };
                        onChange?.(newBody);
                    }}
                    collectionVariables={collectionVariables}
                    enableTypes={true} // Enable type selection (Text/File)
                    onFileSelect={(index) => {
                        handleFilePick((path) => {
                            const items = currentBody.formdata ? [...currentBody.formdata] : [];
                            if (items[index]) {
                                items[index] = { ...items[index], value: path };
                                const newBody = { ...currentBody, formdata: items };
                                onChange?.(newBody);
                            }
                        });
                    }}
                />
            )}

            {currentBody.type === 'x-www-form-urlencoded' && (
                <KeyValueEditor
                    items={currentBody.urlencoded?.map(i => ({ ...i, active: i.enabled, description: '' })) || []}
                    onChange={(items) => {
                        const newUrlEncoded = items.map(i => ({ key: i.key, value: i.value, enabled: i.active }));
                        const newBody = { ...currentBody, urlencoded: newUrlEncoded };
                        onChange?.(newBody);
                    }}
                    collectionVariables={collectionVariables}
                />
            )}

            {currentBody.type === 'binary' && (
                <div className="flex flex-col gap-4 p-4 border rounded-md min-h-[200px] justify-center items-center bg-muted/10">
                    <div className="w-full max-w-md space-y-2">
                        <Label>File Path</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="/path/to/file"
                                value={currentBody.binary || ''}
                                onChange={(e) => {
                                    const newBody = { ...currentBody, binary: e.target.value };
                                    onChange?.(newBody);
                                }}
                                className="flex-1"
                            />
                            <Button variant="outline" onClick={() => handleFilePick((path) => {
                                const newBody = { ...currentBody, binary: path };
                                onChange?.(newBody);
                            })}>
                                Browse
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Enter the absolute path to the file you want to upload.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BodyEditor;
export type { BodyData };
