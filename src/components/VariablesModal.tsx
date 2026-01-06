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
    // Autocomplete state preserved but implementation simplified for this modal context if needed
    // For now, we'll keep the logic but adapt the UI
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
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Collection Variables</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Manage variables for <span className="font-medium text-foreground">{collectionName}</span>
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {localVariables.map((variable, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Checkbox
                                            checked={variable.enabled}
                                            onCheckedChange={(checked) => handleUpdateVariable(index, 'enabled', checked === true)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            placeholder="Variable name"
                                            value={variable.key}
                                            onChange={(e) => handleUpdateVariable(index, 'key', e.target.value)}
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell className="relative">
                                        <Input
                                            placeholder="Value"
                                            value={variable.value}
                                            onChange={(e) => handleUpdateVariable(index, 'value', e.target.value)}
                                            className="h-8"
                                        />
                                        {/* Simple Autocomplete Dropdown */}
                                        {autocomplete && autocomplete.active && autocomplete.variableIndex === index && (
                                            <div className="absolute top-full left-0 z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-40 overflow-auto">
                                                {autocomplete.suggestions.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                                        onClick={() => insertVariable(s)}
                                                    >
                                                        <span className="font-medium text-primary">{s.key}</span>
                                                        <span className="ml-2 text-muted-foreground text-xs">{s.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveVariable(index)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {localVariables.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No variables defined. Click "Add Variable" to create one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                    <Button variant="outline" onClick={handleAddVariable}>
                        <Plus size={16} className="mr-2" />
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
