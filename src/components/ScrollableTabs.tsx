import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tab } from "../App";

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
                    className="h-8 w-8 absolute left-0 z-10 bg-background/80 backdrop-blur-sm border-r rounded-none"
                    onClick={() => scroll('left')}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            <div
                ref={scrollContainerRef}
                className="flex items-center flex-1 min-w-0 overflow-x-auto thin-scrollbar scroll-smooth px-2 gap-1"
                onScroll={checkScroll}
                onWheel={(e) => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollLeft += e.deltaY;
                    }
                }}
                style={{
                    scrollbarWidth: 'none',  /* Firefox */
                    msOverflowStyle: 'none'  /* IE and Edge */
                }}
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        data-tab-id={tab.id}
                        className={`flex items-center gap-2 px-3 py-2 border-b-2 cursor-pointer group whitespace-nowrap min-w-[120px] max-w-[200px] flex-shrink-0 ${activeTabId === tab.id
                            ? 'border-primary bg-accent'
                            : 'border-transparent hover:bg-accent'
                            }`}
                        onClick={() => onTabSelect(tab.id)}
                    >
                        <Badge variant={getMethodVariant(tab.method)} className="text-xs px-1.5 py-0 flex-shrink-0">
                            {tab.method}
                        </Badge>
                        <span className="text-sm truncate flex-1">{tab.name}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 flex-shrink-0"
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

            <div className="flex items-center bg-background">
                {showRightScroll && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-background border-l rounded-none"
                        onClick={() => scroll('right')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
                {isOverflowing && (
                    <div className="pl-1 bg-background border-l">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
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
