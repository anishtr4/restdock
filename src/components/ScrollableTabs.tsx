import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tab } from "@/types";

interface ScrollableTabsProps {
    tabs: Tab[];
    activeTabId: string;
    onTabSelect: (id: string) => void;
    onTabClose: (id: string) => void;
    onTabAdd: () => void;
}

const getMethodVariant = (method: string): "get" | "post" | "put" | "patch" | "delete" => {
    return method.toLowerCase() as any;
};

export const ScrollableTabs = ({
    tabs,
    activeTabId,
    onTabSelect,
    onTabClose,
    onTabAdd
}: ScrollableTabsProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftScroll(scrollLeft > 0);
            setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding tolerance
            setIsOverflowing(scrollWidth > clientWidth);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [tabs]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 300); // Check after scroll animation
        }
    };

    useEffect(() => {
        if (activeTabId && scrollContainerRef.current) {
            const activeTabElement = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
            if (activeTabElement) {
                activeTabElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTabId]);

    return (
        <div className="flex items-center w-full min-w-0 border-b bg-background relative pr-2">
            {showLeftScroll && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 absolute left-0 z-20 bg-background/95 backdrop-blur-sm border-r rounded-none shadow-[5px_0_10px_-5px_rgba(0,0,0,0.1)]"
                    onClick={() => scroll('left')}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            <div
                ref={scrollContainerRef}
                className="flex items-center flex-1 min-w-0 overflow-x-auto scroll-smooth gap-0.5 hide-scrollbar"
                onScroll={checkScroll}
                onWheel={(e) => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollLeft += e.deltaY;
                    }
                }}
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        data-tab-id={tab.id}
                        className={`flex items-center gap-1.5 px-2 py-1.5 border-b-2 cursor-pointer group whitespace-nowrap min-w-[100px] max-w-[160px] flex-shrink-0 text-xs ${activeTabId === tab.id
                            ? 'border-primary bg-accent'
                            : 'border-transparent hover:bg-accent/50'
                            }`}
                        onClick={() => onTabSelect(tab.id)}
                    >
                        <Badge variant={getMethodVariant(tab.method)} className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                            {tab.method}
                        </Badge>
                        <span className="text-xs truncate flex-1">{tab.name}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 flex-shrink-0 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
                {!isOverflowing && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 ml-1"
                        onClick={onTabAdd}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="flex items-center bg-background relative z-10 box-border pl-1 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)] clip-padding">
                {showRightScroll && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-background border-l rounded-none hover:bg-muted"
                        onClick={() => scroll('right')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
                {isOverflowing && (
                    <div className=" bg-background border-l">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 hover:bg-muted"
                            onClick={onTabAdd}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
