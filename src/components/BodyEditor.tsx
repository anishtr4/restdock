import { useState } from "react";
import { ChevronDown } from "lucide-react";
import KeyValueEditor from "./KeyValueEditor";
// import "./BodyEditor.css"; // Temporarily disabled during Tailwind migration

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
    // Use props directly - default to 'none' if not provided
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

        // Set cursor position after variable
        setTimeout(() => {
            const newCursorPos = lastBraceIndex + `{{${varKey}}}`.length;
            textareaRef.setSelectionRange(newCursorPos, newCursorPos);
            textareaRef.focus();
        }, 0);
    };

    return (
        <div className="body-editor">
            <div className="body-type-selector">
                <div className="select-wrapper">
                    <select
                        value={currentBody.type}
                        onChange={(e) => handleTypeChange(e.target.value as BodyData['type'])}
                    >
                        <option value="none">None</option>
                        <option value="json">JSON</option>
                        <option value="raw">Raw</option>
                        <option value="formdata">Form Data</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                </div>
            </div>

            {currentBody.type === 'none' && (
                <div className="body-empty">
                    <p>This request does not have a body.</p>
                </div>
            )}

            {currentBody.type === 'json' && (
                <div className="body-content">
                    <div className="body-editor-container">
                        <div className="editor-toolbar">
                            <span>JSON</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                className="body-textarea json-editor"
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
                                <div className="body-autocomplete-dropdown">
                                    {autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={idx}
                                            className="body-autocomplete-item"
                                            onClick={() => insertVariable(v.key, (window as any).currentTextarea)}
                                        >
                                            <code>{`{{${v.key}}}`}</code>
                                            <span className="body-autocomplete-value">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentBody.type === 'raw' && (
                <div className="body-content">
                    <div className="body-editor-container">
                        <div className="editor-toolbar">
                            <span>Plain Text</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                className="body-textarea"
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
                                <div className="body-autocomplete-dropdown">
                                    {autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={idx}
                                            className="body-autocomplete-item"
                                            onClick={() => insertVariable(v.key, (window as any).currentTextarea)}
                                        >
                                            <code>{`{{${v.key}}}`}</code>
                                            <span className="body-autocomplete-value">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentBody.type === 'formdata' && (
                <div className="body-content">
                    <KeyValueEditor
                        items={currentBody.formdata}
                        onChange={(items) => {
                            const newBody = { ...currentBody, formdata: items };

                            onChange?.(newBody);
                        }}
                        collectionVariables={collectionVariables}
                    />
                </div>
            )}
        </div>
    );
};

export default BodyEditor;
export type { BodyData };
