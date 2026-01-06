import { X, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
// import "./VariablesModal.css"; // Temporarily disabled during Tailwind migration

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

    if (!isOpen) return null;

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
        <div className="variables-overlay" onClick={onClose}>
            <div className="variables-modal" onClick={(e) => e.stopPropagation()}>
                <div className="variables-header">
                    <div>
                        <h3>Collection Variables</h3>
                        <p className="collection-name">{collectionName}</p>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="variables-body">
                    <div className="variables-table">
                        <div className="table-header">
                            <div className="col-checkbox"></div>
                            <div className="col-key">Key</div>
                            <div className="col-value">Value</div>
                            <div className="col-actions"></div>
                        </div>

                        <div className="table-body">
                            {localVariables.map((variable, index) => (
                                <div key={index} className="table-row">
                                    <div className="col-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={variable.enabled}
                                            onChange={(e) => handleUpdateVariable(index, 'enabled', e.target.checked)}
                                        />
                                    </div>
                                    <div className="col-key">
                                        <input
                                            type="text"
                                            placeholder="Variable name"
                                            value={variable.key}
                                            onChange={(e) => handleUpdateVariable(index, 'key', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-value">
                                        <input
                                            type="text"
                                            placeholder="Value"
                                            value={variable.value}
                                            onChange={(e) => handleUpdateVariable(index, 'value', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-actions">
                                        <button
                                            className="delete-var-btn"
                                            onClick={() => handleRemoveVariable(index)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="add-variable-btn" onClick={handleAddVariable}>
                        <Plus size={16} />
                        <span>Add Variable</span>
                    </button>
                </div>

                <div className="variables-footer">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="save-btn" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariablesModal;
