import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import KeyValueEditor from "./KeyValueEditor";
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from "@/components/ui/button";

// CodeMirror imports
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from "@codemirror/view";
import { appEditorTheme } from "@/lib/editorTheme";
import GraphQLEditor from "./GraphQLEditor";
import { BodyData } from "@/types";

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

    const handleTypeChange = (type: BodyData['type']) => {
        let newBody: BodyData;

        // Helper to safely get existing values if they exist in the union
        const getExisting = <K extends keyof any>(key: K): any => {
            // @ts-ignore
            return currentBody[key];
        }

        if (type === 'json') {
            newBody = { type, json: getExisting('json') ?? '{\n  \n}' };
        } else if (type === 'graphql') {
            newBody = {
                type: 'graphql',
                graphql: getExisting('graphql') ?? {
                    query: 'query {\n  \n}',
                    variables: '{}'
                }
            };
        } else if (type === 'raw') {
            newBody = { type, raw: getExisting('raw') ?? '' };
        } else if (type === 'formdata') {
            newBody = { type, formdata: getExisting('formdata') ?? [{ key: '', value: '', type: 'text', enabled: true }] };
        } else if (type === 'x-www-form-urlencoded') {
            newBody = { type, urlencoded: getExisting('urlencoded') ?? [{ key: '', value: '', enabled: true }] };
        } else if (type === 'binary') {
            newBody = { type, binary: getExisting('binary') ?? '' };
        } else {
            newBody = { type };
        }

        onChange?.(newBody);
    };

    const handleContentChange = (value: string) => {
        if (currentBody.type === 'json') {
            onChange?.({ ...currentBody, json: value });
        } else if (currentBody.type === 'raw') {
            onChange?.({ ...currentBody, raw: value });
        }
    };

    const formatJSON = () => {
        if (currentBody.type === 'json' && currentBody.json) {
            try {
                const parsed = JSON.parse(currentBody.json);
                const formatted = JSON.stringify(parsed, null, 2);
                handleContentChange(formatted);
            } catch (e) {
                // Invalid JSON, ignore
            }
        }
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
            <div className="flex items-center justify-between pb-2 border-b">
                {/* Body Type Selector */}
                <div className="overflow-x-auto no-scrollbar">
                    <RadioGroup
                        value={currentBody.type}
                        onValueChange={(value) => handleTypeChange(value as BodyData['type'])}
                        className="flex flex-row items-center gap-6"
                    >
                        {[
                            { value: 'none', label: 'None' },
                            { value: 'json', label: 'JSON' },
                            { value: 'graphql', label: 'GraphQL' },
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

                {currentBody.type === 'json' && (
                    <Button variant="ghost" size="sm" onClick={formatJSON} className="h-7 text-xs">
                        Format JSON
                    </Button>
                )}
            </div>

            {/* Content Area */}
            {currentBody.type === 'none' && (
                <div className="text-sm text-muted-foreground italic px-1">
                    This request does not include a body payload.
                </div>
            )}

            {currentBody.type === 'json' && (
                <div className="relative border rounded-md shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
                    <CodeMirror
                        value={currentBody.json || ''}
                        height="100%"
                        style={{ height: '100%' }}
                        theme={appEditorTheme}
                        extensions={[
                            json(),
                            EditorView.theme({ "&": { height: "100%" } })
                        ]}
                        onChange={handleContentChange}
                        className="absolute inset-0 text-sm"
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            autocompletion: true, // TODO: Enhance with custom variables source
                        }}
                    />
                </div>
            )}

            {currentBody.type === 'graphql' && (
                <GraphQLEditor
                    query={currentBody.graphql?.query || ''}
                    variables={currentBody.graphql?.variables || ''}
                    onQueryChange={(val) => {
                        const newBody = { ...currentBody, graphql: { ...currentBody.graphql!, query: val } };
                        onChange?.(newBody);
                    }}
                    onVariablesChange={(val) => {
                        const newBody = { ...currentBody, graphql: { ...currentBody.graphql!, variables: val } };
                        onChange?.(newBody);
                    }}
                />
            )}

            {currentBody.type === 'raw' && (
                <div className="relative border rounded-md shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
                    <CodeMirror
                        value={currentBody.raw || ''}
                        height="100%"
                        style={{ height: '100%' }}
                        theme={appEditorTheme}
                        onChange={handleContentChange}
                        extensions={[EditorView.theme({ "&": { height: "100%" } })]}
                        className="absolute inset-0 text-sm"
                    />
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
                <div className="flex-1 flex flex-col gap-4 p-4 border rounded-md justify-center items-center bg-muted/10 min-h-0">
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
