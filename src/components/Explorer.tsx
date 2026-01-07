import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal, FileText, Pencil, Trash2, Settings, Copy, Library } from "lucide-react";
import { Collection, RequestData, Folder as FolderType } from "../App";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "./ConfirmDialog";
import VariablesModal from "./VariablesModal";

interface ExplorerProps {
    collections: Collection[];
    expandedCollections: Set<string>;
    onToggleCollection: (id: string) => void;
    expandedFolders: Set<string>;
    onToggleFolder: (id: string) => void;
    onSelectRequest: (req: RequestData) => void;

    // CRUD Handlers
    onCreateCollection: () => Promise<string | undefined>;
    onDuplicateCollection: (id: string) => void;
    onCreateRequest: (parentId: string) => Promise<string | undefined>;
    onCreateFolder: (parentId: string) => Promise<string | undefined>;
    onRenameCollection: (id: string, name: string) => void;
    onRenameFolder: (id: string, name: string) => void;
    onRenameRequest: (id: string, name: string) => void;
    onDeleteCollection: (id: string) => void;
    onDeleteRequest: (id: string) => void;
    onDeleteFolder: (id: string) => void;
    onUpdateCollectionVariables: (id: string, vars: any[]) => void;
}

// Helper to get method badge variant (duplicated from App.tsx, could be shared util)
const getMethodVariant = (method: string): "get" | "post" | "put" | "patch" | "delete" => {
    return method.toLowerCase() as any;
};

const Explorer = ({
    collections,
    expandedCollections,
    onToggleCollection,
    expandedFolders,
    onToggleFolder,
    onSelectRequest,
    onCreateCollection,
    onDuplicateCollection,
    onCreateRequest,
    onCreateFolder,
    onRenameCollection,
    onRenameFolder,
    onRenameRequest,
    onDeleteCollection,
    onDeleteRequest,
    onDeleteFolder,
    onUpdateCollectionVariables
}: ExplorerProps) => {

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const [variablesModal, setVariablesModal] = useState<{
        isOpen: boolean;
        collectionId: string;
        collectionName: string;
    } | null>(null);

    const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
    const [inlineEditingValue, setInlineEditingValue] = useState("");
    const [inlineEditingType, setInlineEditingType] = useState<'collection' | 'folder' | 'request' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inlineEditingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [inlineEditingId]);

    const handleStartInlineEdit = (id: string, name: string, type: 'collection' | 'folder' | 'request') => {
        setInlineEditingId(id);
        setInlineEditingValue(name);
        setInlineEditingType(type);
    };

    const handleSaveInline = () => {
        if (!inlineEditingId || !inlineEditingType) return;

        const trimmedValue = inlineEditingValue.trim();
        if (trimmedValue) {
            if (inlineEditingType === 'collection') onRenameCollection(inlineEditingId, trimmedValue);
            else if (inlineEditingType === 'folder') onRenameFolder(inlineEditingId, trimmedValue);
            else if (inlineEditingType === 'request') onRenameRequest(inlineEditingId, trimmedValue);
        }

        setInlineEditingId(null);
        setInlineEditingValue("");
        setInlineEditingType(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveInline();
        } else if (e.key === 'Escape') {
            setInlineEditingId(null);
            setInlineEditingValue("");
            setInlineEditingType(null);
        }
    };

    // Recursive Tree Renderer
    const renderTreeItems = (items: (RequestData | FolderType)[], level = 0) => {
        return items.map((item) => {
            if ('type' in item && item.type === 'folder') {
                const isExpanded = expandedFolders.has(item.id);
                return (
                    <div key={item.id}>
                        <ContextMenu>
                            <ContextMenuTrigger>
                                <div
                                    className="flex items-center gap-2 px-2 py-1 hover:bg-accent/60 rounded-md cursor-pointer text-sm group relative overflow-hidden"
                                    style={{ paddingLeft: `${(level + 1) * 12}px` }}
                                    onClick={(e) => { e.stopPropagation(); onToggleFolder(item.id); }}
                                >
                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                                    {isExpanded ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-500/80 fill-blue-500/10" /> : <Folder className="h-4 w-4 flex-shrink-0 text-blue-500/80 fill-blue-500/10" />}

                                    {inlineEditingId === item.id ? (
                                        <Input
                                            ref={inputRef}
                                            value={inlineEditingValue}
                                            onChange={(e) => setInlineEditingValue(e.target.value)}
                                            onBlur={handleSaveInline}
                                            onKeyDown={handleKeyDown}
                                            className="h-6 flex-1 py-0 px-1 text-[13px] bg-background focus-visible:ring-1 focus-visible:ring-primary"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="flex-1 truncate text-[13px] text-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap min-w-0">{item.name}</span>
                                    )}

                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-accent/90 via-accent/80 to-transparent pl-6 absolute right-1 h-full">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 hover:bg-accent"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const id = await onCreateRequest(item.id);
                                                    if (id) handleStartInlineEdit(id, "New Request", 'request');
                                                }}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    New Request
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const id = await onCreateFolder(item.id);
                                                    if (id) handleStartInlineEdit(id, "New Folder", 'folder');
                                                }}>
                                                    <Folder className="mr-2 h-4 w-4" />
                                                    New Folder
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive group/del"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: "Delete Folder",
                                                    message: `Are you sure you want to delete folder "${item.name}"?`,
                                                    onConfirm: () => onDeleteFolder(item.id)
                                                });
                                            }}
                                            title="Delete Folder"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover/del:text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={async () => {
                                    const id = await onCreateRequest(item.id);
                                    if (id) handleStartInlineEdit(id, "New Request", 'request');
                                }}>New Request</ContextMenuItem>
                                <ContextMenuItem onClick={async () => {
                                    const id = await onCreateFolder(item.id);
                                    if (id) handleStartInlineEdit(id, "New Folder", 'folder');
                                }}>New Folder</ContextMenuItem>
                                <ContextMenuItem onClick={() => handleStartInlineEdit(item.id, item.name, 'folder')}>
                                    Rename
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setConfirmDialog({
                                        isOpen: true,
                                        title: "Delete Folder",
                                        message: `Are you sure you want to delete folder "${item.name}"?`,
                                        onConfirm: () => onDeleteFolder(item.id)
                                    })}
                                >
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                        {isExpanded && (
                            <div className="ml-[19px] border-l border-border/40 pl-0 mt-0.5">
                                {renderTreeItems(item.items, level + 1)}
                            </div>
                        )}
                    </div>
                );
            } else {
                const request = item as RequestData;
                return (
                    <ContextMenu key={request.id}>
                        <ContextMenuTrigger>
                            <div
                                className="flex items-center gap-2 px-2 py-1 hover:bg-accent/60 rounded-md cursor-pointer text-sm group relative overflow-hidden"
                                style={{ paddingLeft: `${(level + 2) * 12}px` }}
                                onClick={(e) => { e.stopPropagation(); onSelectRequest(request); }}
                            >
                                <Badge variant={getMethodVariant(request.method)} className="text-[9px] font-bold h-4 px-1 min-w-[2.8rem] justify-center tracking-tighter uppercase border-none flex-shrink-0">
                                    {request.method}
                                </Badge>

                                {inlineEditingId === request.id ? (
                                    <Input
                                        ref={inputRef}
                                        value={inlineEditingValue}
                                        onChange={(e) => setInlineEditingValue(e.target.value)}
                                        onBlur={handleSaveInline}
                                        onKeyDown={handleKeyDown}
                                        className="h-6 flex-1 py-0 px-1 text-[13px] bg-background focus-visible:ring-1 focus-visible:ring-primary"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="truncate flex-1 text-[13px] text-foreground/70 group-hover:text-foreground transition-colors whitespace-nowrap min-w-0">{request.name}</span>
                                )}

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-accent/90 via-accent/80 to-transparent pl-6 absolute right-1 h-full">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive group/del"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDialog({
                                                isOpen: true,
                                                title: "Delete Request",
                                                message: `Are you sure you want to delete request "${request.name}"?`,
                                                onConfirm: () => onDeleteRequest(request.id)
                                            });
                                        }}
                                        title="Delete Request"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover/del:text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleStartInlineEdit(request.id, request.name, 'request')}>
                                Rename
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setConfirmDialog({
                                    isOpen: true,
                                    title: "Delete Request",
                                    message: `Are you sure you want to delete request "${request.name}"?`,
                                    onConfirm: () => onDeleteRequest(request.id)
                                })}
                            >
                                Delete
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                );
            }
        });
    };



    return (
        <div className="flex flex-col h-full bg-background/50">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-background sticky top-0 z-10 h-12">
                <h2 className="text-[11px] font-bold uppercase text-muted-foreground tracking-[0.1em] flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Explorer
                </h2>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent" onClick={async () => {
                    const id = await onCreateCollection();
                    if (id) handleStartInlineEdit(id, "New Collection", 'collection');
                }} title="New Collection">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-auto p-2 pb-10">
                {collections.map((collection) => {
                    const isExpanded = expandedCollections.has(collection.id);
                    return (
                        <div key={collection.id} className="mb-2">
                            <ContextMenu>
                                <ContextMenuTrigger>
                                    <div
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/60 rounded-md cursor-pointer font-medium text-sm group relative overflow-hidden"
                                        onClick={() => onToggleCollection(collection.id)}
                                    >
                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                                        <Library className="h-4 w-4 flex-shrink-0 text-primary/80" />

                                        {inlineEditingId === collection.id ? (
                                            <Input
                                                ref={inputRef}
                                                value={inlineEditingValue}
                                                onChange={(e) => setInlineEditingValue(e.target.value)}
                                                onBlur={handleSaveInline}
                                                onKeyDown={handleKeyDown}
                                                className="h-6 flex-1 py-0 px-1 text-[13px] bg-background focus-visible:ring-1 focus-visible:ring-primary"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className="flex-1 font-bold text-[13px] tracking-tight text-foreground/90 group-hover:text-foreground transition-colors whitespace-nowrap truncate min-w-0">{collection.name}</span>
                                        )}

                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-accent/90 via-accent/80 to-transparent pl-4 absolute right-1 h-full">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 hover:bg-accent"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const id = await onCreateRequest(collection.id);
                                                        if (id) handleStartInlineEdit(id, "New Request", 'request');
                                                    }}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        New Request
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const id = await onCreateFolder(collection.id);
                                                        if (id) handleStartInlineEdit(id, "New Folder", 'folder');
                                                    }}>
                                                        <Folder className="mr-2 h-4 w-4" />
                                                        New Folder
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>



                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 hover:bg-accent"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartInlineEdit(collection.id, collection.name, 'collection');
                                                    }}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        setVariablesModal({
                                                            isOpen: true,
                                                            collectionId: collection.id,
                                                            collectionName: collection.name
                                                        });
                                                    }}>
                                                        <Settings className="mr-2 h-4 w-4" />
                                                        Variables
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDuplicateCollection(collection.id);
                                                    }}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDialog({
                                                                isOpen: true,
                                                                title: "Delete Collection",
                                                                message: `Are you sure you want to delete collection "${collection.name}"? All requests inside will be lost.`,
                                                                onConfirm: () => onDeleteCollection(collection.id)
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={async () => {
                                        const id = await onCreateRequest(collection.id);
                                        if (id) handleStartInlineEdit(id, "New Request", 'request');
                                    }}>New Request</ContextMenuItem>
                                    <ContextMenuItem onClick={async () => {
                                        const id = await onCreateFolder(collection.id);
                                        if (id) handleStartInlineEdit(id, "New Folder", 'folder');
                                    }}>New Folder</ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleStartInlineEdit(collection.id, collection.name, 'collection')}>
                                        Rename
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => setVariablesModal({
                                        isOpen: true,
                                        collectionId: collection.id,
                                        collectionName: collection.name
                                    })}>
                                        Variables...
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => setConfirmDialog({
                                            isOpen: true,
                                            title: "Delete Collection",
                                            message: `Are you sure you want to delete collection "${collection.name}"? All requests inside will be lost.`,
                                            onConfirm: () => onDeleteCollection(collection.id)
                                        })}
                                    >
                                        Delete Collection
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>

                            {isExpanded && (
                                <div className="mt-1 animate-in fade-in-50 slide-in-from-top-1 duration-200 ml-[11px] border-l border-border/40 pl-0">
                                    {renderTreeItems(collection.items)}
                                    {collection.items.length === 0 && (
                                        <div className="pl-8 py-2 text-xs text-muted-foreground italic">
                                            Empty collection. Right click to add items.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {collections.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        No collections found down here.
                        <br />
                        <Button variant="link" onClick={onCreateCollection} className="mt-2">
                            Create your first collection
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <ConfirmDialog
                isOpen={!!confirmDialog}
                title={confirmDialog?.title || ""}
                message={confirmDialog?.message || ""}
                onConfirm={() => {
                    confirmDialog?.onConfirm();
                    setConfirmDialog(null);
                }}
                onCancel={() => setConfirmDialog(null)}
            />



            {variablesModal && (
                <VariablesModal
                    isOpen={variablesModal.isOpen}
                    collectionName={variablesModal.collectionName}
                    variables={collections.find(c => c.id === variablesModal.collectionId)?.variables || []}
                    onSave={(variables) => {
                        onUpdateCollectionVariables(variablesModal.collectionId, variables);
                        setVariablesModal(null);
                    }}
                    onClose={() => setVariablesModal(null)}
                />
            )}
        </div>
    );
};

export default Explorer;
