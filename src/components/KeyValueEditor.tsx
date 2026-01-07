import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KeyValue {
    key: string;
    value: string;
    active: boolean;
    type?: 'text' | 'file';
    description?: string;
}

interface KeyValueEditorProps {
    items?: KeyValue[];
    onChange?: (items: KeyValue[]) => void;
    collectionVariables?: { key: string; value: string; enabled: boolean }[];
    enableTypes?: boolean;
    onFileSelect?: (index: number) => void;
}

const DEFAULT_ITEMS: KeyValue[] = [{ key: '', value: '', active: true }];

const KeyValueEditor = ({
    items = DEFAULT_ITEMS,
    onChange,
    collectionVariables = [],
    enableTypes = false,
    onFileSelect
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
        const lastOpenIndex = currentValue.lastIndexOf('{{');
        if (lastOpenIndex === -1) return;

        const beforeMatch = currentValue.substring(0, lastOpenIndex);
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
        <div className="w-full border rounded-md overflow-hidden bg-background shadow-sm">
            <Table className="border-collapse table-fixed">
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b divide-x divide-border/50">
                        <TableHead className="w-[38px] px-0 text-center font-medium text-muted-foreground/70">
                            <div className="flex items-center justify-center h-full text-[10px]">#</div>
                        </TableHead>
                        <TableHead className="w-[30%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Key</TableHead>
                        {enableTypes && (
                            <TableHead className="w-[15%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Type</TableHead>
                        )}
                        <TableHead className="w-[35%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Value</TableHead>
                        <TableHead className="w-[30%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
                        <TableHead className="w-[42px] px-0 text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-muted/80 text-muted-foreground"
                                onClick={handleAdd}
                                title="Add Row"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentItems.map((item: KeyValue, index: number) => (
                        <TableRow key={index} className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                            <TableCell className="p-0 text-center align-middle bg-muted/5 w-[38px]">
                                <div className="flex items-center justify-center w-full h-full">
                                    <Checkbox
                                        checked={item.active}
                                        onCheckedChange={(checked) => handleUpdate(index, 'active', checked as boolean)}
                                        className="h-4 w-4 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="p-0 align-middle">
                                <Input
                                    placeholder="Key"
                                    value={item.key}
                                    onChange={(e) => handleUpdate(index, 'key', e.target.value)}
                                    className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm font-medium transition-all placeholder:text-muted-foreground/40"
                                />
                            </TableCell>
                            {enableTypes && (
                                <TableCell className="p-0 align-middle">
                                    <Select
                                        value={item.type || 'text'}
                                        onValueChange={(val) => handleUpdate(index, 'type', val as any)}
                                    >
                                        <SelectTrigger className="h-9 w-full bg-transparent border-none focus:ring-0 focus:ring-offset-0 rounded-none px-3 text-xs font-medium text-muted-foreground shadow-none">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="file">File</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            )}
                            <TableCell className="p-0 align-middle relative">

                                {item.type === 'file' ? (
                                    <div className="flex h-9 w-full items-center px-1">
                                        <Input
                                            placeholder="Select file..."
                                            value={item.value}
                                            readOnly
                                            className="h-7 flex-1 bg-muted/20 border-transparent text-xs px-2 shadow-none focus-visible:ring-0"
                                        />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => onFileSelect?.(index)}
                                            className="h-7 ml-1 px-2 text-xs"
                                        >
                                            Browse
                                        </Button>
                                    </div>
                                ) : (
                                    <Input
                                        placeholder="Value"
                                        value={item.value}
                                        onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                                        className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40"
                                    />
                                )}
                                {autocomplete && autocomplete.show && autocomplete.rowIndex === index && (
                                    <div className="absolute top-full left-0 right-0 mt-0 bg-popover border border-border rounded-b-md shadow-xl z-50 max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter bg-muted/30 border-b">Variables</div>
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between px-3 py-1.5 hover:bg-accent cursor-pointer text-sm group/item transition-colors"
                                                onClick={() => insertVariable(index, v.key)}
                                            >
                                                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border font-mono text-primary group-hover/item:border-primary/30 transition-colors shrink-0">{`{{${v.key}}}`}</code>
                                                <span className="text-muted-foreground text-[10px] ml-2 truncate group-hover/item:text-foreground transition-colors text-right">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="p-0 align-middle">
                                <Input
                                    placeholder="Description"
                                    value={item.description || ''}
                                    onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                                    className="h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm text-muted-foreground/60 focus:text-foreground transition-all italic font-light placeholder:text-muted-foreground/40"
                                />
                            </TableCell>
                            <TableCell className="p-0 text-center align-middle w-[42px]">
                                <div className="flex items-center justify-center w-full h-full">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemove(index)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {currentItems.length === 0 && (
                <div className="p-6 text-center text-muted-foreground/60 text-xs bg-muted/5 italic">
                    No items configured. <span className="text-primary cursor-pointer hover:underline font-semibold not-italic" onClick={handleAdd}>Add one</span>.
                </div>
            )}
        </div>
    );
};

export default KeyValueEditor;
