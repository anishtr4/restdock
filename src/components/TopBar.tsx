import { useState, useEffect, useRef } from "react";
import { Search, Bell, Settings as SettingsIcon, ChevronRight, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collection, RequestData } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EnvironmentManager } from "./EnvironmentManager";
import { useEnvironments } from "@/hooks/useEnvironments"; // Ensure hook is available

interface TopBarProps {
    onSettingsClick?: () => void;
    collections: Collection[];
    onSelectRequest: (req: RequestData) => void;
    isBento?: boolean;
    hasUpdateAvailable?: boolean;
}

export function TopBar({ onSettingsClick, collections, onSelectRequest, isBento = false, hasUpdateAvailable = false }: TopBarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<{ request: RequestData, path: string }[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Environments
    const { environments, activeEnvironment, activateEnvironment } = useEnvironments();
    const [isEnvManagerOpen, setIsEnvManagerOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
            (item.request.url || "").toLowerCase().includes(searchQuery.toLowerCase())
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

    // Global keyboard shortcut - Ctrl+K or Cmd+K
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setIsFocused(true);
            }
        };
        document.addEventListener("keydown", handleGlobalKeyDown);
        return () => document.removeEventListener("keydown", handleGlobalKeyDown);
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
                <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-[7px] shadow-sm" />
                <span className="font-semibold text-[15px] tracking-tight text-foreground/90">RestDock</span>
            </div>

            {/* Center Section: Search Bar */}
            <div className="flex-1 max-w-xl px-4" ref={wrapperRef}>
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search endpoints (Ctrl+K)"
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
                        <div className="absolute top-9 left-0 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-[400px]">
                            {suggestions.length > 0 ? (
                                <ScrollArea className="max-h-[360px]">
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
                {/* Environment Selector */}
                <div className="flex items-center mr-2">
                    <Select
                        value={activeEnvironment?.id || "no-env"}
                        onValueChange={(val) => {
                            if (val === "manage") {
                                setIsEnvManagerOpen(true);
                            } else if (val === "no-env") {
                                activateEnvironment(null);
                            } else {
                                activateEnvironment(val);
                            }
                        }}
                    >
                        <SelectTrigger className="h-8 w-[140px] text-xs bg-muted/40 border-transparent focus:ring-0 gap-1 px-2">
                            <Layers className="w-3 h-3 text-muted-foreground" />
                            <SelectValue placeholder="No Environment" />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="no-env" className="text-xs">No Environment</SelectItem>
                            {environments.map(env => (
                                <SelectItem key={env.id} value={env.id} className="text-xs">
                                    {env.name}
                                </SelectItem>
                            ))}
                            <div className="h-px bg-border my-1" />
                            <div
                                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsEnvManagerOpen(true);
                                }}
                            >
                                <SettingsIcon className="mr-2 h-3 w-3" />
                                Manage Environments
                            </div>
                        </SelectContent>
                    </Select>
                </div>

                <EnvironmentManager isOpen={isEnvManagerOpen} onClose={() => setIsEnvManagerOpen(false)} />

                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onSettingsClick}>
                    <SettingsIcon className="h-4 w-4" />
                </Button>

                <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
                            <Bell className="h-4 w-4" />
                            {hasUpdateAvailable && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="border-b px-4 py-3">
                            <h4 className="font-semibold text-sm">Notifications</h4>
                        </div>
                        <div className="max-h-[300px] overflow-auto">
                            {hasUpdateAvailable ? (
                                <div className="px-4 py-3 hover:bg-accent cursor-pointer transition-colors border-b">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm mb-1">Update Available</div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                A new version of RestDock is available. Click to view details.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-4 py-8 text-center">
                                    <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">No notifications</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
