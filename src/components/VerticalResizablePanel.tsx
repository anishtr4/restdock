import { useState, useRef, useEffect, ReactNode } from "react";
// import "./VerticalResizablePanel.css"; // Temporarily disabled during Tailwind migration

interface VerticalResizablePanelProps {
    defaultHeight: number;
    minHeight: number;
    maxHeight: number;
    children: ReactNode;
    position: 'top' | 'bottom';
}

const VerticalResizablePanel = ({ defaultHeight, minHeight, maxHeight, children, position }: VerticalResizablePanelProps) => {
    const [height, setHeight] = useState(defaultHeight);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !panelRef.current) return;

            if (position === 'top') {
                const rect = panelRef.current.getBoundingClientRect();
                const panelStartY = rect.top;
                const newHeight = e.clientY - panelStartY;
                setHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
            } else {
                const windowHeight = window.innerHeight;
                const newHeight = windowHeight - e.clientY;
                setHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, minHeight, maxHeight, position]);

    const handleMouseDown = () => {
        setIsResizing(true);
    };

    return (
        <div
            ref={panelRef}
            className={`vertical-resizable-panel ${position}`}
            style={{
                flexBasis: `${height}px`,
                flexGrow: 0,
                flexShrink: 0
            }}
        >
            {children}
            <div
                className={`vertical-resize-handle ${position}`}
                onMouseDown={handleMouseDown}
            >
                <div className="vertical-resize-handle-line" />
            </div>
        </div>
    );
};

export default VerticalResizablePanel;
