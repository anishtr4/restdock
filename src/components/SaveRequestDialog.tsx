import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collection } from "@/types";
import { Folder, Library } from "lucide-react";

interface SaveRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collections: Collection[];
    onSave: (name: string, collectionId: string, folderId?: string | null) => void;
    initialName?: string;
}

export function SaveRequestDialog({ open, onOpenChange, collections, onSave, initialName = "New Request" }: SaveRequestDialogProps) {
    const [name, setName] = useState(initialName);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
    const [selectedFolderId, setSelectedFolderId] = useState<string>("root");

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setName(initialName);
            if (collections.length > 0) {
                setSelectedCollectionId(collections[0].id);
            }
            setSelectedFolderId("root");
        }
    }, [open, initialName, collections]);

    // Flatten locations for tree view
    interface LocationOption {
        label: string;
        value: string; // JSON.stringify({ collectionId, folderId })
        type: 'collection' | 'folder';
        level: number;
    }

    const getAllLocations = (): LocationOption[] => {
        const options: LocationOption[] = [];

        collections.forEach(col => {
            // Add Collection
            options.push({
                label: col.name,
                value: JSON.stringify({ collectionId: col.id, folderId: null }),
                type: 'collection',
                level: 0
            });

            // Add recursive folders
            const addFolders = (items: any[], level: number) => {
                items.forEach(item => {
                    if (item.type === 'folder') {
                        options.push({
                            label: item.name,
                            value: JSON.stringify({ collectionId: col.id, folderId: item.id }),
                            type: 'folder',
                            level: level
                        });
                        addFolders(item.items, level + 1);
                    }
                });
            };
            addFolders(col.items, 1);
        });

        return options;
    };

    const locations = getAllLocations();
    const currentValue = JSON.stringify({
        collectionId: selectedCollectionId,
        folderId: selectedFolderId === "root" ? null : selectedFolderId
    });

    const handleSave = () => {
        if (!name.trim() || !selectedCollectionId) return;
        onSave(name, selectedCollectionId, selectedFolderId === "root" ? null : selectedFolderId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Save Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Request Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter request name"
                        />
                    </div>

                    <div className="space-y-2">

                        <Label>Save To</Label>
                        <Select
                            value={currentValue}
                            onValueChange={(val) => {
                                try {
                                    const parsed = JSON.parse(val);
                                    setSelectedCollectionId(parsed.collectionId);
                                    setSelectedFolderId(parsed.folderId || "root");
                                } catch (e) {
                                    console.error("Failed to parse selection", e);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectGroup>
                                    {locations.map((loc, idx) => (
                                        <SelectItem key={idx} value={loc.value}>
                                            <div className="flex items-center" style={{ marginLeft: `${loc.level * 16}px` }}>
                                                {loc.type === 'collection' ? (
                                                    <Library className="mr-2 h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className={loc.type === 'collection' ? "font-medium" : ""}>
                                                    {loc.label}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
