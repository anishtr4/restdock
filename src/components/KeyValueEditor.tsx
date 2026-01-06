import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
// import "./KeyValueEditor.css"; // Temporarily disabled during Tailwind migration

interface KeyValue {
    key: string;
    value: string;
    active: boolean;
    description?: string;
}

interface KeyValueEditorProps {
    items?: KeyValue[];
    onChange?: (items: KeyValue[]) => void;
    collectionVariables?: { key: string; value: string; enabled: boolean }[];
}

const DEFAULT_ITEMS: KeyValue[] = [{ key: '', value: '', active: true }];

const KeyValueEditor = ({
    items = DEFAULT_ITEMS,
    onChange,
    collectionVariables = []
}: KeyValueEditorProps) => {
    // Use props directly for items - no local state needed for this data
    // Local state is only for autocomplete/UI interactions
    const currentItems = items.length > 0 ? items : DEFAULT_ITEMS;

    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        rowIndex: number;
        suggestions: typeof collectionVariables;
    } | null>(null);

    const handleUpdate = (index: number, field: keyof KeyValue, value: string | boolean) => {
        const updated = [...currentItems];
        updated[index] = { ...updated[index], [field]: value };
        onChange?.(updated); // Notify parent immediately

        // Check for {{ pattern in value field
        if (field === 'value' && typeof value === 'string') {
            const match = value.match(/\{\{([^}]*)$/);
            if (match && collectionVariables.length > 0) {
                const searchTerm = match[1].toLowerCase();
                const suggestions = collectionVariables.filter(v =>
                    v.enabled && v.key.toLowerCase().includes(searchTerm)
                );

                if (suggestions.length > 0) {
                    setAutocomplete({
                        show: true,
                        rowIndex: index,
                        suggestions
                    });
                } else {
                    setAutocomplete(null);
                }
            } else {
                setAutocomplete(null);
            }
        }
    };

    const insertVariable = (rowIndex: number, varKey: string) => {
        const currentValue = currentItems[rowIndex].value;
        const beforeMatch = currentValue.substring(0, currentValue.lastIndexOf('{{'));
        const newValue = beforeMatch + `{{${varKey}}}`;
        handleUpdate(rowIndex, 'value', newValue);
        setAutocomplete(null);
    };

    const handleAdd = () => {
        const updated = [...currentItems, { key: '', value: '', active: true }];
        onChange?.(updated);
    };

    const handleRemove = (index: number) => {
        const updated = currentItems.filter((_: KeyValue, i: number) => i !== index);
        onChange?.(updated);
    };

    return (
        <div className="kv-editor">
            <div className="kv-table">
                <div className="kv-header">
                    <div className="kv-col-check"></div>
                    <div className="kv-col-key">KEY</div>
                    <div className="kv-col-value">VALUE</div>
                    <div className="kv-col-desc">DESCRIPTION</div>
                    <div className="kv-col-actions">
                        <button className="kv-header-add-btn" onClick={handleAdd} title="Add Row">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {currentItems.map((item: KeyValue, index: number) => (
                    <div key={index} className="kv-row">
                        <div className="kv-col-check">
                            <input
                                type="checkbox"
                                checked={item.active}
                                onChange={(e) => handleUpdate(index, 'active', e.target.checked)}
                            />
                        </div>
                        <div className="kv-col-key">
                            <input
                                type="text"
                                placeholder="Key"
                                value={item.key}
                                onChange={(e) => handleUpdate(index, 'key', e.target.value)}
                            />
                        </div>
                        <div className="kv-col-value" style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Value"
                                value={item.value}
                                onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                            />
                            {autocomplete && autocomplete.show && autocomplete.rowIndex === index && (
                                <div className="kv-autocomplete-dropdown">
                                    {autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={idx}
                                            className="kv-autocomplete-item"
                                            onClick={() => insertVariable(index, v.key)}
                                        >
                                            <code>{`{{${v.key}}}`}</code>
                                            <span className="kv-autocomplete-value">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="kv-col-desc">
                            <input
                                type="text"
                                placeholder="Description"
                                value={item.description || ''}
                                onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                            />
                        </div>
                        <div className="kv-col-actions">
                            <button
                                className="kv-delete-btn"
                                onClick={() => handleRemove(index)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KeyValueEditor;
