import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Tab } from "../App";
// import "./TabGroup.css"; // Temporarily disabled during Tailwind migration

interface TabGroupProps {
    tabs: Tab[];
    activeTabId: string;
    onSelectTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onAddTab: () => void;
}

const TabGroup = ({ tabs, activeTabId, onSelectTab, onCloseTab, onAddTab }: TabGroupProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabsListRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const checkOverflow = () => {
        if (tabsListRef.current && containerRef.current) {
            const tabsWidth = tabsListRef.current.scrollWidth;
            const containerWidth = containerRef.current.clientWidth;

            // The threshold for showing arrows is when tabs + inline button 
            // no longer fit comfortably. 
            // We use 100px as a safe margin for the sticky actions.
            const threshold = containerWidth - 100;

            setIsOverflowing(tabsWidth > threshold);
        }
    };

    useLayoutEffect(() => {
        checkOverflow();

        const observer = new ResizeObserver(checkOverflow);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [tabs]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div
            className={`tab-group-container ${isOverflowing ? 'has-overflow' : ''}`}
            ref={containerRef}
        >
            <div className="tabs-wrapper" ref={scrollContainerRef}>
                <div className="tabs-list" ref={tabsListRef}>
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`tab ${activeTabId === tab.id ? "active" : ""}`}
                            onClick={() => onSelectTab(tab.id)}
                        >
                            <span className={`method-badge ${tab.method.toLowerCase()}`}>
                                {tab.method}
                            </span>
                            <span className="tab-name">{tab.name}</span>
                            {/* Only show close button if more than 1 tab */}
                            {tabs.length > 1 && (
                                <button
                                    className="close-tab"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCloseTab(tab.id);
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Inline plus button ONLY if NOT overflowing */}
                {!isOverflowing && (
                    <button
                        className="add-tab-btn-inline"
                        onClick={onAddTab}
                        title="New Tab"
                    >
                        <Plus size={18} />
                    </button>
                )}
            </div>

            <div className="tab-actions">
                {isOverflowing && (
                    <>
                        <button className="scroll-btn" onClick={() => scroll('left')} title="Scroll Left">
                            <ChevronLeft size={16} />
                        </button>
                        <button className="scroll-btn" onClick={() => scroll('right')} title="Scroll Right">
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
                <button
                    className="add-tab-btn-sticky"
                    onClick={onAddTab}
                    title="New Tab"
                >
                    <Plus size={18} />
                </button>
            </div>
        </div>
    );
};

export default TabGroup;
