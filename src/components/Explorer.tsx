import { useState, useRef, useEffect } from "react";
import { ChevronRight, FolderOpen, Folder, Plus, Trash2, Sliders } from "lucide-react";
import { Collection, RequestData, Folder as FolderType } from "../App";
import ConfirmDialog from "./ConfirmDialog";
import VariablesModal from "./VariablesModal";
// import "./Explorer.css"; // Temporarily disabled during Tailwind migration

interface ExplorerProps {
    collections: Collection[];
    onSelectRequest: (req: RequestData) => void;
    onCreateCollection: (name: string) => void;
    onCreateRequest: (parentId: string, name: string) => void;
    onCreateFolder: (parentId: string, name: string) => void;
    onDeleteCollection?: (collectionId: string) => void;
    onDeleteFolder?: (folderId: string) => void;
    onDeleteRequest?: (requestId: string) => void;
    onUpdateCollectionVariables?: (collectionId: string, variables: { key: string; value: string; enabled: boolean }[]) => void;
}

type Mode = 'request' | 'folder' | 'collection';

const Explorer = ({
    collections,
    onSelectRequest,
    onCreateCollection,
    onCreateRequest,
    onCreateFolder,
    onDeleteCollection,
    onDeleteFolder,
    onDeleteRequest,
    onUpdateCollectionVariables
}: ExplorerProps) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['c1']));
    const [editingState, setEditingState] = useState<{ parentId: string | null, mode: Mode } | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'collection' | 'folder' | 'request';
        id: string;
        name: string;
    } | null>(null);
    const [variablesModal, setVariablesModal] = useState<{
        isOpen: boolean;
        collectionId: string;
        collectionName: string;
    } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingState) {
            inputRef.current?.focus();
        }
    }, [editingState]);

    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExpandAndEdit = (id: string, mode: Mode) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
        setEditingState({ parentId: id, mode });
    };

    const handleConfirm = () => {
        if (!inputValue.trim() || !editingState) {
            setEditingState(null);
            setInputValue("");
            return;
        }

        if (editingState.mode === 'collection') {
            onCreateCollection(inputValue);
        } else if (editingState.mode === 'folder' && editingState.parentId) {
            onCreateFolder(editingState.parentId, inputValue);
            const pid = editingState.parentId;
            setExpandedIds(prev => {
                const next = new Set(prev);
                next.add(pid);
                return next;
            });
        } else if (editingState.mode === 'request' && editingState.parentId) {
            onCreateRequest(editingState.parentId, inputValue);
            const pid = editingState.parentId;
            setExpandedIds(prev => {
                const next = new Set(prev);
                next.add(pid);
                return next;
            });
        }

        setEditingState(null);
        setInputValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') {
            setEditingState(null);
            setInputValue("");
        }
    };

    const handleDelete = (e: React.MouseEvent, type: 'collection' | 'folder' | 'request', id: string, name: string) => {
        e.stopPropagation();
        setConfirmDialog({ isOpen: true, type, id, name });
    };

    const confirmDelete = () => {
        if (!confirmDialog) return;

        const { type, id } = confirmDialog;
        if (type === 'collection' && onDeleteCollection) {
            onDeleteCollection(id);
        } else if (type === 'folder' && onDeleteFolder) {
            onDeleteFolder(id);
        } else if (type === 'request' && onDeleteRequest) {
            onDeleteRequest(id);
        }

        setConfirmDialog(null);
    };

    const renderItems = (items: (RequestData | FolderType)[], parentId: string, depth: number = 0) => {
        const elements = items.map(item => {
            const isFolder = 'type' in item && item.type === 'folder';

            if (isFolder) {
                const folder = item as FolderType;
                const isExpanded = expandedIds.has(folder.id);
                return (
                    <div key={folder.id} className={`folder-item ${isExpanded ? 'expanded' : ''}`}>
                        <div className="item-header" onClick={() => toggleExpand(folder.id)}>
                            <ChevronRight size={14} className={`chevron ${isExpanded ? 'rotated' : ''}`} />
                            <Folder size={14} className="folder-icon" />
                            <span className="item-name">{folder.name}</span>
                            <div className="item-actions">
                                <div className="action-icon-wrapper" onClick={(e) => { e.stopPropagation(); setEditingState({ parentId: folder.id, mode: 'request' }); }}>
                                    <Plus size={14} className="action-icon" />
                                </div>
                                <div className="action-icon-wrapper" onClick={(e) => { e.stopPropagation(); setEditingState({ parentId: folder.id, mode: 'folder' }); }}>
                                    <Folder size={14} className="action-icon" />
                                </div>
                                <div className="action-icon-wrapper delete-btn" onClick={(e) => handleDelete(e, 'folder', folder.id, folder.name)}>
                                    <Trash2 size={14} className="action-icon" />
                                </div>
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="item-children">
                                {renderItems(folder.items, folder.id, depth + 1)}
                            </div>
                        )}
                    </div>
                );
            } else {
                const req = item as RequestData;
                return (
                    <div key={req.id} className="request-item" onClick={() => onSelectRequest(req)}>
                        <div className="item-header">
                            <span className={`method-label ${req.method.toLowerCase()}`}>{req.method}</span>
                            <span className="item-name">{req.name}</span>
                            <div className="item-actions">
                                <div className="action-icon-wrapper delete-btn" onClick={(e) => handleDelete(e, 'request', req.id, req.name)}>
                                    <Trash2 size={14} className="action-icon" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
        });

        // Add inline input
        if (editingState && editingState.parentId === parentId) {
            elements.push(
                <div key="inline-input" className="item-header editing">
                    {editingState.mode === 'request' ? (
                        <span className="method-label get">GET</span>
                    ) : (
                        <Folder size={14} className="folder-icon" />
                    )}
                    <input
                        ref={inputRef}
                        className="inline-edit-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleConfirm}
                        placeholder={`New ${editingState.mode}...`}
                    />
                </div>
            );
        }

        return elements;
    };

    return (
        <aside className="explorer">
            <div className="explorer-header">
                <span className="header-title">COLLECTIONS</span>
                <div className="header-actions">
                    <button className="add-btn" onClick={() => setEditingState({ parentId: null, mode: 'collection' })}>
                        <Plus size={14} />
                        <span>New</span>
                    </button>
                </div>
            </div>

            <div className="explorer-content">
                {collections.map(col => {
                    const isExpanded = expandedIds.has(col.id);
                    return (
                        <div key={col.id} className={`collection-item ${isExpanded ? 'expanded' : ''}`}>
                            <div className="item-header" onClick={() => toggleExpand(col.id)}>
                                <ChevronRight size={14} className={`chevron ${isExpanded ? 'rotated' : ''}`} />
                                <FolderOpen size={16} className="collection-icon" />
                                <span className="item-name">{col.name}</span>
                                <div className="item-actions">
                                    <div className="action-icon-wrapper" onClick={(e) => { e.stopPropagation(); setEditingState({ parentId: col.id, mode: 'request' }); }}>
                                        <Plus size={14} className="action-icon" />
                                    </div>
                                    <div className="action-icon-wrapper" onClick={(e) => { e.stopPropagation(); setEditingState({ parentId: col.id, mode: 'folder' }); }}>
                                        <Folder size={14} className="action-icon" />
                                    </div>
                                    <div className="action-icon-wrapper" onClick={(e) => { e.stopPropagation(); setVariablesModal({ isOpen: true, collectionId: col.id, collectionName: col.name }); }} title="Variables">
                                        <Sliders size={14} className="action-icon" />
                                    </div>
                                    <div className="action-icon-wrapper delete-btn" onClick={(e) => handleDelete(e, 'collection', col.id, col.name)}>
                                        <Trash2 size={14} className="action-icon" />
                                    </div>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="item-children">
                                    {renderItems(col.items, col.id)}
                                </div>
                            )}
                        </div>
                    );
                })}

                {editingState && editingState.mode === 'collection' && !editingState.parentId && (
                    <div className="collection-item editing">
                        <div className="item-header">
                            <ChevronRight size={14} className="chevron rotated" />
                            <FolderOpen size={16} className="collection-icon" />
                            <input
                                ref={inputRef}
                                className="inline-edit-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleConfirm}
                                placeholder="New Collection..."
                            />
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={confirmDialog?.isOpen || false}
                title="Confirm Deletion"
                message={`Are you sure you want to delete "${confirmDialog?.name}"? This action cannot be undone.`}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog(null)}
            />

            {variablesModal && (
                <VariablesModal
                    isOpen={variablesModal.isOpen}
                    collectionName={variablesModal.collectionName}
                    variables={collections.find(c => c.id === variablesModal.collectionId)?.variables || []}
                    onSave={(variables) => {
                        if (onUpdateCollectionVariables) {
                            onUpdateCollectionVariables(variablesModal.collectionId, variables);
                        }
                        setVariablesModal(null);
                    }}
                    onClose={() => setVariablesModal(null)}
                />
            )}
        </aside>
    );
};

export default Explorer;
