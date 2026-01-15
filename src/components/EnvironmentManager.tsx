import { Plus, Trash2, Check, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VariablesTable, Variable } from "./VariablesTable";
import { useEnvironments } from "@/hooks/useEnvironments";
import { cn } from "@/lib/utils";

interface EnvironmentManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EnvironmentManager = ({ isOpen, onClose }: EnvironmentManagerProps) => {
    const {
        environments,
        addEnvironment,
        updateEnvironment,
        deleteEnvironment,
        activateEnvironment
    } = useEnvironments();

    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [localVariables, setLocalVariables] = useState<Variable[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newEnvName, setNewEnvName] = useState("");

    // Initialize selection
    useEffect(() => {
        if (isOpen && environments.length > 0 && !selectedEnvId) {
            // Select active or first
            const active = environments.find(e => e.is_active);
            handleSelectEnv(active ? active.id : environments[0].id);
        } else if (isOpen && environments.length === 0) {
            setSelectedEnvId(null);
        }
    }, [isOpen, environments]);

    const handleSelectEnv = (id: string) => {
        if (isDirty) {
            if (!confirm("You have unsaved changes. Discard them?")) return;
        }
        const env = environments.find(e => e.id === id);
        if (env) {
            setSelectedEnvId(id);
            setLocalVariables(env.variables);
            setIsDirty(false);
        }
    };

    const handleVariablesUpdate = (updated: Variable[]) => {
        setLocalVariables(updated);
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!selectedEnvId) return;
        const env = environments.find(e => e.id === selectedEnvId);
        if (!env) return;

        // Filter empty keys
        const validVars = localVariables.filter(v => v.key.trim() !== '');

        await updateEnvironment({
            ...env,
            variables: validVars
        });
        setIsDirty(false);
    };

    const handleCreateStart = () => {
        setIsCreating(true);
        setNewEnvName("");
    };

    const handleCreateSubmit = async () => {
        if (!newEnvName.trim()) {
            setIsCreating(false);
            return;
        }
        const newEnv = await addEnvironment(newEnvName);
        setIsCreating(false);
        handleSelectEnv(newEnv.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCreateSubmit();
        if (e.key === 'Escape') setIsCreating(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Delete this environment?")) {
            await deleteEnvironment(id);
            if (selectedEnvId === id) {
                setSelectedEnvId(null);
                setLocalVariables([]);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[85vh] h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5" />
                        Manage Environments
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar List */}
                    <div className="w-64 border-r bg-muted/10 flex flex-col">
                        <div className="p-2 border-b">
                            <Button onClick={handleCreateStart} className="w-full justify-start" variant="outline" size="sm">
                                <Plus size={16} className="mr-2" /> New Environment
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {isCreating && (
                                <div className="p-2">
                                    <input
                                        autoFocus
                                        className="w-full px-2 py-1 text-sm border rounded bg-background"
                                        placeholder="Environment Name"
                                        value={newEnvName}
                                        onChange={(e) => setNewEnvName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={() => setIsCreating(false)} // Optional: cancel on blur or save? strict consistent with ESC is safer
                                    />
                                </div>
                            )}
                            {environments.map(env => (
                                <div
                                    key={env.id}
                                    onClick={() => handleSelectEnv(env.id)}
                                    className={cn(
                                        "px-3 py-2 flex items-center justify-between cursor-pointer group transition-colors",
                                        selectedEnvId === env.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", env.is_active ? "bg-green-500" : "bg-transparent border border-muted-foreground")} />
                                        <span className="truncate text-sm font-medium">{env.name}</span>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!env.is_active && (
                                            <Button
                                                variant="ghost" size="icon" className="h-6 w-6"
                                                title="Set Active"
                                                onClick={(e) => { e.stopPropagation(); activateEnvironment(env.id); }}
                                            >
                                                <Check size={12} className="text-muted-foreground hover:text-green-500" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                                            onClick={(e) => handleDelete(env.id, e)}
                                        >
                                            <Trash2 size={12} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col bg-background">
                        {selectedEnvId ? (
                            <>
                                <div className="p-4 border-b flex justify-between items-center bg-muted/5">
                                    <div className="flex flex-col">
                                        <h3 className="font-semibold text-lg">
                                            {environments.find(e => e.id === selectedEnvId)?.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {environments.find(e => e.id === selectedEnvId)?.is_active ? "Currently Active Environment" : "Inactive Environment"}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={isDirty ? "default" : "outline"}
                                            onClick={handleSave}
                                            disabled={!isDirty}
                                            size="sm"
                                        >
                                            {isDirty ? "Save Changes" : "Saved"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 p-4 overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-medium">Variables</h4>
                                        <Button
                                            variant="ghost" size="sm"
                                            onClick={() => setLocalVariables([...localVariables, { key: '', value: '', enabled: true }])}
                                            className="text-primary hover:text-primary/80 px-2 h-7"
                                        >
                                            <Plus size={14} className="mr-1" /> Add
                                        </Button>
                                    </div>
                                    <VariablesTable
                                        variables={localVariables}
                                        onUpdate={handleVariablesUpdate}
                                        placeholder="No variables in this environment. Add one to get started."
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                Select an environment to edit
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
