import { Plus } from "lucide-react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VariablesTable, Variable } from "./VariablesTable";

interface VariablesModalProps {
    isOpen: boolean;
    collectionName: string;
    variables: Variable[];
    onSave: (variables: Variable[]) => void;
    onClose: () => void;
}

const VariablesModal = ({ isOpen, collectionName, variables, onSave, onClose }: VariablesModalProps) => {
    const [localVariables, setLocalVariables] = useState<Variable[]>(variables);

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

                <div className="flex-1 overflow-hidden flex flex-col bg-muted/5 p-4">
                    <div className="flex justify-end mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80 h-7"
                            onClick={() => setLocalVariables([...localVariables, { key: '', value: '', enabled: true }])}
                        >
                            <Plus size={14} className="mr-1" /> Add
                        </Button>
                    </div>
                    <VariablesTable
                        variables={localVariables}
                        onUpdate={setLocalVariables}
                        placeholder="No variables defined for this collection."
                    />
                </div>

                <DialogFooter className="p-4 border-t bg-background flex items-center justify-end w-full z-10 gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default VariablesModal;
