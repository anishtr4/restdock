import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Variable {
    key: string;
    value: string;
    enabled: boolean;
}

interface VariablesModalProps {
    isOpen: boolean;
    collectionName: string;
    variables: Variable[];
    onSave: (variables: Variable[]) => void;
    onClose: () => void;
}

const VariablesModal = ({ isOpen, collectionName, variables, onSave, onClose }: VariablesModalProps) => {
    const [localVariables, setLocalVariables] = useState<Variable[]>(variables);
    const [autocomplete, setAutocomplete] = useState<{
        active: boolean;
        variableIndex: number;
        cursorPosition: number;
        suggestions: Variable[];
    } | null>(null);

    const handleAddVariable = () => {
        setLocalVariables([...localVariables, { key: '', value: '', enabled: true }]);
    };

    const handleRemoveVariable = (index: number) => {
        setLocalVariables(localVariables.filter((_, i) => i !== index));
    };

    const handleUpdateVariable = (index: number, field: keyof Variable, value: string | boolean) => {
        const updated = [...localVariables];
        updated[index] = { ...updated[index], [field]: value };
        setLocalVariables(updated);

        // Check for {{ pattern in value field for autocomplete
        if (field === 'value' && typeof value === 'string') {
            const cursorPos = value.length;
            const textBeforeCursor = value.substring(0, cursorPos);
            const match = textBeforeCursor.match(/\{\{([^}]*)$/);

            if (match) {
                const searchTerm = match[1].toLowerCase();
                const suggestions = localVariables.filter((v, i) =>
                    i !== index &&
                    v.key.toLowerCase().includes(searchTerm) &&
                    v.enabled
                );

                if (suggestions.length > 0) {
                    setAutocomplete({
                        active: true,
                        variableIndex: index,
                        cursorPosition: cursorPos,
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

    const insertVariable = (variable: Variable) => {
        if (!autocomplete) return;

        const currentValue = localVariables[autocomplete.variableIndex].value;
        const beforeMatch = currentValue.substring(0, currentValue.lastIndexOf('{{'));
        const newValue = beforeMatch + `{{${variable.key}}}`;

        handleUpdateVariable(autocomplete.variableIndex, 'value', newValue);
        setAutocomplete(null);
    };

    const handleSave = () => {
        // Filter out empty variables
        const validVariables = localVariables.filter(v => v.key.trim() !== '');
        onSave(validVariables);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>Collection Variables</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1.5">
                        Manage variables for <span className="font-medium text-foreground">{collectionName}</span>
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
                    <div className="border-b bg-muted/50">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[50px] text-center"></TableHead>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                        </Table>
                    </div>

                    <ScrollArea className="flex-1">
                        <Table>
                            <TableBody>
                                {localVariables.map((variable, index) => (
                                    <TableRow key={index} className="hover:bg-muted/30 border-b border-border/40 group">
                                        <TableCell className="w-[50px] p-2 text-center align-middle">
                                            <Checkbox
                                                checked={variable.enabled}
                                                onCheckedChange={(checked) => handleUpdateVariable(index, 'enabled', checked === true)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 align-middle">
                                            <Input
                                                placeholder="Variable name"
                                                value={variable.key}
                                                onChange={(e) => handleUpdateVariable(index, 'key', e.target.value)}
                                                className="h-8 bg-transparent border-transparent focus:bg-background focus:border-input transition-colors shadow-none"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 align-middle relative">
                                            <Input
                                                placeholder="Value"
                                                value={variable.value}
                                                onChange={(e) => handleUpdateVariable(index, 'value', e.target.value)}
                                                className="h-8 bg-transparent border-transparent focus:bg-background focus:border-input transition-colors shadow-none"
                                            />
                                            {/* Autocomplete Dropdown */}
                                            {autocomplete && autocomplete.active && autocomplete.variableIndex === index && (
                                                <div className="absolute top-full left-2 right-2 z-50 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-40 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                                                    {autocomplete.suggestions.map((s, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm group"
                                                            onClick={() => insertVariable(s)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded border font-mono text-primary group-hover:border-primary/30">{`{{${s.key}}}`}</code>
                                                                <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">{s.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="w-[50px] p-2 text-center align-middle">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveVariable(index)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={15} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {localVariables.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-32">
                                            No variables defined. <br />
                                            <span
                                                className="text-primary hover:underline cursor-pointer"
                                                onClick={handleAddVariable}
                                            >
                                                Add a new variable
                                            </span> to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 border-t bg-background flex items-center justify-between sm:justify-between w-full z-10">
                    <Button variant="outline" onClick={handleAddVariable} className="gap-2">
                        <Plus size={16} />
                        Add Variable
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default VariablesModal;
