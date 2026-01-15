import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
        field: keyof KeyValue;
        suggestions: typeof collectionVariables;
        rect?: { top: number; left: number; width: number };
        selectionStart?: number;
        selectionEnd?: number;
        targetVariable?: string;
        selectedIndex: number;
    } | null>(null);

    const autocompleteRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close autocomplete
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autocomplete && autocomplete.show && autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                // Check if the click is on the "Change Variable" button (tooltip), which spawns this.
                // But usually that click happens, opens this, and propagation stops or order matters.
                // If we click "Change Variable", that sets autocomplete state.
                // This effect runs. 
                // If we click "somewhere else", we want to close.
                setAutocomplete(null);
            }
        };

        if (autocomplete && autocomplete.show) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [autocomplete]);

    const [hoverTooltip, setHoverTooltip] = useState<{
        show: boolean;
        x: number;
        y: number;
        content: string;
        rowIndex: number;
        field: keyof KeyValue;
        variableName?: string;
    } | null>(null);

    // Helper to resolve variables
    const resolveVariable = (text: string) => {
        if (!text || !text.includes('{{')) return text;
        return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const v = collectionVariables.find(cv => cv.key === key && cv.enabled);
            return v ? v.value : `{{${key}}}`; // Return original if not found
        });
    };

    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hoveredVariableRef = useRef<{ element: HTMLElement; variableName: string } | null>(null);

    const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const wrapper = input.parentElement;
        // Find the backdrop div (it's the one with z-0)
        const backdrop = wrapper?.querySelector('div[aria-hidden="true"]');
        if (backdrop) {
            backdrop.scrollLeft = input.scrollLeft;
        }
    };

    const getVariableAtPosition = (e: React.MouseEvent, text: string) => {
        if (!text.includes('{{')) return null;

        const input = e.target as HTMLInputElement;
        const rect = input.getBoundingClientRect();
        const cursorX = e.clientX - rect.left + input.scrollLeft;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const computedStyle = window.getComputedStyle(input);
        ctx.font = computedStyle.font || '14px monospace';

        const tokens = text.split(/(\{\{[^}]+\}\})/g);
        // Start after left padding (px-3 = 12px)
        let currentX = 12;

        for (const token of tokens) {
            if (!token) continue;

            const width = ctx.measureText(token).width;

            // Check if cursor is within this token's width
            if (cursorX >= currentX && cursorX <= currentX + width) {
                if (token.match(/^\{\{[^}]+\}\}$/)) {
                    return {
                        token: token,
                        startX: currentX,
                        width: width,
                        inputRect: rect,
                        scrollLeft: input.scrollLeft
                    };
                }
                return null;
            }
            currentX += width;
        }
        return null;
    };

    const handleMouseMove = (e: React.MouseEvent, text: string, rowIndex: number, field: keyof KeyValue) => {
        if (autocomplete && autocomplete.show) return;

        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        const match = getVariableAtPosition(e, text);

        if (!match) {
            if (hoverTooltip) {
                handleMouseLeave();
            }
            return;
        }

        const { token, startX, inputRect, scrollLeft } = match;
        const resolved = resolveVariable(token);

        // Store reference for positioning dropdown later
        hoveredVariableRef.current = {
            element: e.currentTarget as HTMLElement,
            variableName: token
        };

        // Stable position calculation: relative to input + token offset - scroll
        const tooltipX = inputRect.left + startX - scrollLeft;
        const tooltipY = inputRect.bottom;

        // Optimization: if already showing tooltip for the same variable, don't update
        if (hoverTooltip && hoverTooltip.variableName === token) {
            return;
        }

        setHoverTooltip({
            show: true,
            x: tooltipX,
            y: tooltipY + 2,
            content: resolved,
            variableName: token,
            rowIndex,
            field
        });
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoverTooltip(null);
        }, 100); // 100ms delay - snappy but allows bridging
    };

    const handleTooltipMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const openAutocompleteFromTooltip = () => {
        if (!hoverTooltip) return;
        const { rowIndex, field } = hoverTooltip;

        // Close tooltip immediately
        setHoverTooltip(null);
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        if (collectionVariables.length > 0) {
            setAutocomplete({
                show: true,
                rowIndex,
                field,
                suggestions: collectionVariables,
                rect: { top: hoverTooltip.y, left: hoverTooltip.x, width: 200 },
                targetVariable: hoverTooltip.variableName, // Pass the variable being replaced
                selectedIndex: 0
            });
        }
    };

    const handleUpdate = (index: number, field: keyof KeyValue, value: string | boolean, target?: HTMLElement | EventTarget | null) => {
        const updated = [...currentItems];
        updated[index] = { ...updated[index], [field]: value };
        onChange?.(updated);

        if ((field === 'key' || field === 'value') && typeof value === 'string') {
            const match = value.match(/\{\{([^}]*)$/);
            if (match && collectionVariables.length > 0) {
                const searchTerm = match[1].toLowerCase();
                const suggestions = collectionVariables.filter(v =>
                    v.enabled && v.key.toLowerCase().includes(searchTerm)
                );

                if (suggestions.length > 0) {
                    let rect = undefined;
                    if (target && (target as HTMLElement).getBoundingClientRect) {
                        const r = (target as HTMLElement).getBoundingClientRect();
                        rect = { top: r.bottom, left: r.left, width: r.width };
                    }

                    setAutocomplete({
                        show: true,
                        rowIndex: index,
                        field: field,
                        suggestions,
                        rect,
                        selectedIndex: 0
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
        if (!autocomplete) return;
        const field = autocomplete.field;
        const currentValue = currentItems[rowIndex][field] as string;

        let newValue = currentValue;

        if (autocomplete.targetVariable) {
            // Precise replacement of the specific variable token
            // We need to be careful if the same variable appears multiple times.
            // Ideally we'd have the exact index, but for now replacing the LAST instance or just the string is a heuristic.
            // Better: use the one we hovered? We don't have its index in hoverTooltip yet, just text.
            // Let's assume replace FIRST occurrence if we don't have index? Or replace ALL?
            // Usually valid to replace ALL occurrences of a specific variable if user intends to swap it.
            // But let's try to be safer: simple string replace (first occurrence) logic might be shaky if duplicates exist.
            // Given existing logic was 'lastIndexOf', let's prioritize the target variable.

            // NOTE: We know 'targetVariable' is the full '{{var}}' string
            if (currentValue.includes(autocomplete.targetVariable)) {
                // Determine which instance to replace?
                // For safety/simplicity now: Replace ALL instances of this variable?
                // No, replace the one we clicked. But we don't have the index.
                // Fallback: Replace the string.
                newValue = currentValue.replace(autocomplete.targetVariable, `{{${varKey}}}`);
            }
        } else {
            // Typing mode (fallback)
            const lastOpenIndex = currentValue.lastIndexOf('{{');
            if (lastOpenIndex !== -1) {
                const beforeMatch = currentValue.substring(0, lastOpenIndex);
                newValue = beforeMatch + `{{${varKey}}}`;
            }
        }

        handleUpdate(rowIndex, field, newValue);
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
                                <div className="relative w-full h-9 group/input-wrapper">
                                    {/* Badge Layer */}
                                    <div
                                        className="absolute inset-0 px-3 flex items-center text-sm font-medium whitespace-pre overflow-hidden scrollbar-hide z-0"
                                        aria-hidden="true"
                                    >
                                        {item.key.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                                            if (part.match(/^\{\{[^}]+\}\}$/)) {

                                                return (
                                                    <span
                                                        key={i}
                                                        className="text-primary font-medium cursor-pointer hover:text-primary/80 transition-colors"
                                                    >
                                                        {part}
                                                    </span>
                                                );
                                            }
                                            return <span key={i} style={{ visibility: 'hidden' }} className="pointer-events-none">{part}</span>;
                                        })}
                                    </div>

                                    <Input
                                        placeholder="Key"
                                        value={item.key}
                                        onChange={(e) => handleUpdate(index, 'key', e.target.value, e.target)}
                                        onScroll={handleScroll}
                                        onMouseMove={(e) => handleMouseMove(e, item.key, index, 'key')}
                                        onMouseLeave={handleMouseLeave}
                                        className="absolute inset-0 h-full w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm font-medium transition-all placeholder:text-muted-foreground/40 z-10"
                                        style={{
                                            color: item.key.includes('{{') ? 'transparent' : 'inherit',
                                            caretColor: 'hsl(var(--foreground))'
                                        }}
                                        onKeyDown={(e) => {
                                            if (autocomplete && autocomplete.show && autocomplete.rowIndex === index && autocomplete.field === 'key') {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setAutocomplete(prev => prev ? ({ ...prev, selectedIndex: Math.min(prev.suggestions.length - 1, prev.selectedIndex + 1) }) : null);
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setAutocomplete(prev => prev ? ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }) : null);
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (autocomplete.suggestions[autocomplete.selectedIndex]) {
                                                        insertVariable(index, autocomplete.suggestions[autocomplete.selectedIndex].key);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setAutocomplete(null);
                                                }
                                            }
                                        }}
                                    />
                                    {/* Re-render plain text for transparency fallback */}
                                    {item.key.includes('{{') && (
                                        <div className="absolute inset-0 px-3 flex items-center text-sm font-medium whitespace-pre pointer-events-none overflow-hidden z-0">
                                            {item.key.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                                                if (part.match(/^\{\{[^}]+\}\}$/)) {
                                                    return <span key={i} style={{ visibility: 'hidden' }}>{part}</span>;
                                                }
                                                return <span key={i} className="text-foreground">{part}</span>;
                                            })}
                                        </div>
                                    )}
                                </div>
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
                            <TableCell className="p-0 align-middle relative group/cell">
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
                                    <div className="relative w-full h-9 group/input-wrapper">
                                        {/* Badge Layer - Renders styled badges behind the input */}
                                        <div
                                            className="absolute inset-0 px-3 flex items-center text-sm font-medium whitespace-pre overflow-hidden scrollbar-hide z-0"
                                            aria-hidden="true"
                                        >
                                            {/* Render ONLY the badges in correct position. Normal text is transparent in this layer. */}
                                            {item.value.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                                                if (part.match(/^\{\{[^}]+\}\}$/)) {
                                                    const resolved = resolveVariable(part);
                                                    return (
                                                        <span
                                                            key={i}
                                                            className="text-primary font-medium cursor-pointer hover:text-primary/80 transition-colors"
                                                            onMouseEnter={(e) => {

                                                                if (autocomplete && autocomplete.show) return;

                                                                const badgeRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                setHoverTooltip({
                                                                    show: true,
                                                                    x: badgeRect.left,
                                                                    y: badgeRect.bottom + 2,
                                                                    content: resolved,
                                                                    rowIndex: index,
                                                                    field: 'value'
                                                                });
                                                            }}
                                                            onMouseLeave={handleMouseLeave}
                                                        >
                                                            {part}
                                                        </span>
                                                    );
                                                }
                                                return <span key={i} style={{ visibility: 'hidden' }} className="pointer-events-none">{part}</span>;
                                            })}
                                        </div>

                                        <Input
                                            placeholder="Value"
                                            value={item.value}
                                            onChange={(e) => handleUpdate(index, 'value', e.target.value, e.target)}
                                            onScroll={handleScroll}
                                            onMouseMove={(e) => handleMouseMove(e, item.value, index, 'value')}
                                            onMouseLeave={handleMouseLeave}
                                            className="absolute inset-0 h-full w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40 z-10"
                                            style={{
                                                // Make variable text transparent so badge shows through
                                                // This is tricky: we can't easily make partial text transparent.
                                                // Solution: Mix-blend-mode or just render badges *over* if input has background?
                                                // If input is transparent, badges behind show.
                                                // But input text covers them.
                                                // Let's try: text color is standard. 
                                                // Badges are BEHIND. We rely on the badge background color to obscure? No, text is on top.
                                                // Valid solution: Syntax Highlighter approach -> Input color: transparent, caret-color: black.
                                                color: item.value.includes('{{') ? 'transparent' : 'inherit',
                                                caretColor: 'hsl(var(--foreground))'
                                            }}
                                            onKeyDown={(e) => {
                                                if (autocomplete && autocomplete.show && autocomplete.rowIndex === index && autocomplete.field === 'value') {
                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setAutocomplete(prev => prev ? ({ ...prev, selectedIndex: Math.min(prev.suggestions.length - 1, prev.selectedIndex + 1) }) : null);
                                                    } else if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        setAutocomplete(prev => prev ? ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }) : null);
                                                    } else if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (autocomplete.suggestions[autocomplete.selectedIndex]) {
                                                            insertVariable(index, autocomplete.suggestions[autocomplete.selectedIndex].key);
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        e.preventDefault();
                                                        setAutocomplete(null);
                                                    }
                                                }
                                            }}
                                        />
                                        {/* Re-render plain text for the user to see non-variable parts when Input is transparent */}
                                        {item.value.includes('{{') && (
                                            <div className="absolute inset-0 px-3 flex items-center text-sm font-medium whitespace-pre pointer-events-none overflow-hidden z-0">
                                                {item.value.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                                                    if (part.match(/^\{\{[^}]+\}\}$/)) {
                                                        // Variable part: Render nothing/hidden here, the Badge layer above handles it? 
                                                        // Actually, let's do it all in one Backdrop layer.
                                                        // But we need the Badge on TOP of the empty space left by transparent text?
                                                        return <span key={i} style={{ visibility: 'hidden' }}>{part}</span>;
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                })}
                                            </div>
                                        )}
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

            {/* Hover Tooltip Portal */}
            {hoverTooltip && hoverTooltip.show && createPortal(
                <div
                    className="fixed z-[10000] pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: hoverTooltip.x,
                        top: hoverTooltip.y,
                    }}
                >
                    {/* Tooltip content */}
                    <div
                        className="relative px-4 py-3 text-xs bg-popover text-popover-foreground border rounded-md shadow-xl"
                        style={{
                            minWidth: '200px',
                            maxWidth: '400px',
                        }}
                        onMouseEnter={handleTooltipMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Variable Name */}
                        <div className="font-mono text-sm font-semibold text-primary mb-2">
                            {hoverTooltip.variableName}
                        </div>

                        {/* Resolved Value */}
                        <div className="mb-3">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Value</div>
                            <div className="font-mono text-xs text-foreground bg-muted/30 px-2 py-1.5 rounded border border-border/50" style={{ wordBreak: 'break-all' }}>
                                {hoverTooltip.content}
                            </div>
                        </div>

                        {/* Action Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] w-full font-medium"
                            onClick={openAutocompleteFromTooltip}
                        >
                            Change Variable
                        </Button>
                    </div>
                </div>,
                document.body
            )}



            {/* Autocomplete Portal (Fixed Position - Portaled to Body) */}
            {autocomplete && autocomplete.show && autocomplete.rect && createPortal(
                <div
                    ref={autocompleteRef}
                    className="fixed z-[9999] pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                    style={{
                        top: autocomplete.rect.top,
                        left: autocomplete.rect.left,
                    }}
                    onMouseLeave={() => setAutocomplete(null)}
                >
                    <div className="bg-popover border rounded-md shadow-xl overflow-hidden" style={{ minWidth: '240px', maxWidth: '320px' }}>
                        {/* Header */}
                        <div className="px-3 py-2 border-b bg-muted/30">
                            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Select Variable</div>
                        </div>

                        {/* List */}
                        <div className="max-h-64 overflow-y-auto">
                            {autocomplete.suggestions.length === 0 ? (
                                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    No variables available
                                </div>
                            ) : (
                                autocomplete.suggestions.map((v, idx) => (
                                    <div
                                        key={v.key}
                                        ref={(el) => {
                                            if (idx === autocomplete.selectedIndex && el) {
                                                el.scrollIntoView({ block: 'nearest' });
                                            }
                                        }}
                                        className={`px-3 py-2 cursor-pointer border-b border-border/30 last:border-0 transition-colors ${idx === autocomplete.selectedIndex ? "bg-muted" : "hover:bg-muted/50"}`}
                                        onClick={() => insertVariable(autocomplete.rowIndex, v.key)}
                                    >
                                        <div className="font-mono text-xs font-semibold text-primary mb-0.5">
                                            {`{{${v.key}}}`}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground truncate">
                                            {v.value || <span className="italic">Empty</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 border-t bg-muted/20">
                            <div className="text-[10px] text-muted-foreground text-center">
                                Select a variable to insert
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default KeyValueEditor;
