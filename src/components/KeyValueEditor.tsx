import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
    const currentItems = items.length > 0 ? items : DEFAULT_ITEMS;

    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        rowIndex: number;
        suggestions: typeof collectionVariables;
    } | null>(null);

    const handleUpdate = (index: number, field: keyof KeyValue, value: string | boolean) => {
        const updated = [...currentItems];
        updated[index] = { ...updated[index], [field]: value };
        onChange?.(updated);

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
        <div className="w-full">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-2 px-2 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                <div></div>
                <div>Key</div>
                <div>Value</div>
                <div>Description</div>
                <div className="flex justify-center">
                    <button
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent"
                        onClick={handleAdd}
                        title="Add Row"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Rows */}
            <div className="divide-y">
                {currentItems.map((item: KeyValue, index: number) => (
                    <div key={index} className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-2 px-2 py-2 hover:bg-accent/50">
                        {/* Checkbox */}
                        <div className="flex items-center justify-center">
                            <Checkbox
                                checked={item.active}
                                onCheckedChange={(checked) => handleUpdate(index, 'active', checked as boolean)}
                            />
                        </div>

                        {/* Key Input */}
                        <div>
                            <input
                                type="text"
                                placeholder="Key"
                                value={item.key}
                                onChange={(e) => handleUpdate(index, 'key', e.target.value)}
                                className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>

                        {/* Value Input with Autocomplete */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Value"
                                value={item.value}
                                onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                                className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {autocomplete && autocomplete.show && autocomplete.rowIndex === index && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                    {autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                            onClick={() => insertVariable(index, v.key)}
                                        >
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                            <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description Input */}
                        <div>
                            <input
                                type="text"
                                placeholder="Description"
                                value={item.description || ''}
                                onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                                className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>

                        {/* Delete Button */}
                        <div className="flex items-center justify-center">
                            <button
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleRemove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KeyValueEditor;
