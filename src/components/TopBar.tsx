import { useState, useEffect, useRef } from "react";
import { Search, Bell, Settings as SettingsIcon, Cpu, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collection, RequestData } from "../App";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TopBarProps {
    onSettingsClick?: () => void;
    collections: Collection[];
    onSelectRequest: (req: RequestData) => void;
    isBento?: boolean;
}

export function TopBar({ onSettingsClick, collections, onSelectRequest, isBento = false }: TopBarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<{ request: RequestData, path: string }[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Flatten logic
    const getAllRequests = (items: any[], pathPrefix: string): { request: RequestData, path: string }[] => {
        let results: { request: RequestData, path: string }[] = [];
        items.forEach(item => {
            if (item.type === 'folder') {
                results = results.concat(getAllRequests(item.items, `${pathPrefix} / ${item.name}`));
            } else {
                results.push({ request: item as RequestData, path: pathPrefix });
            }
        });
        return results;
    };

    // Filter suggestions
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            return;
        }

        const allRequests = collections.flatMap(c => getAllRequests(c.items, c.name));

        const filtered = allRequests.filter(item =>
            item.request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.request.url.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10); // Limit to 10

        setSuggestions(filtered);
        setSelectedIndex(0); // Reset selection on new search
    }, [searchQuery, collections]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!suggestions.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const selected = suggestions[selectedIndex];
            if (selected) {
                onSelectRequest(selected.request);
                setSearchQuery("");
                setIsFocused(false);
            }
        } else if (e.key === "Escape") {
            setIsFocused(false);
        }
    };

    // Helpers
    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'text-sky-500';
            case 'POST': return 'text-emerald-500';
            case 'PUT': return 'text-amber-500';
            case 'DELETE': return 'text-rose-500';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <div className={cn("h-12 flex items-center px-4 justify-between select-none z-50 relative", !isBento && "border-b bg-background")}>
            {/* Left Section: Logo */}
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#d97706] rounded flex items-center justify-center shadow-[0_0_10px_rgba(217,119,6,0.2)]">
                    <Cpu className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="font-bold text-sm tracking-tight text-primary">RustMan</span>
            </div>

            {/* Center Section: Search Bar */}
            <div className="flex-1 max-w-xl px-4" ref={wrapperRef}>
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search endpoints (Ctrl+P)"
                        className="w-full h-8 pl-9 pr-12 bg-muted/40 border-transparent focus:bg-background focus:border-primary transition-all rounded-md text-xs relative z-20"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsFocused(true);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-20">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono bg-background/50 border-muted-foreground/20 text-muted-foreground pointer-events-none">
                            ⌘K
                        </Badge>
                    </div>

                    {/* Suggestions Dropdown */}
                    {isFocused && (searchQuery || suggestions.length > 0) && (
                        <div className="absolute top-9 left-0 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                            {suggestions.length > 0 ? (
                                <ScrollArea className="max-h-[300px]">
                                    <div className="p-1">
                                        {suggestions.map((item, index) => (
                                            <div
                                                key={item.request.id}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer group/item transition-colors",
                                                    index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                                                )}
                                                onClick={() => {
                                                    onSelectRequest(item.request);
                                                    setSearchQuery("");
                                                    setIsFocused(false);
                                                }}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                <span className={`text-[10px] font-bold w-10 text-right ${getMethodColor(item.request.method)}`}>
                                                    {item.request.method}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{item.request.name}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                                        <span>{item.path}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className={cn(
                                                    "h-3 w-3 text-muted-foreground transition-opacity",
                                                    index === selectedIndex ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
                                                )} />
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : searchQuery ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    No results found for "{searchQuery}"
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    Type to search requests...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onSettingsClick}>
                    <SettingsIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
