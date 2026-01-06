import { useState, useRef, useEffect, ReactNode } from "react";
import "./ResizablePanel.css";

interface ResizablePanelProps {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
    children: ReactNode;
    position: 'left' | 'right';
}

const ResizablePanel = ({ defaultWidth, minWidth, maxWidth, children, position }: ResizablePanelProps) => {
    const [width, setWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !panelRef.current) return;

            if (position === 'left') {
                // Get where the panel starts (left edge)
                const rect = panelRef.current.getBoundingClientRect();
                const panelStartX = rect.left;
                // New width is: mouse position - where panel starts
                const newWidth = e.clientX - panelStartX;
                setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
            } else {
                const windowWidth = window.innerWidth;
                const newWidth = windowWidth - e.clientX;
                setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
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
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, minWidth, maxWidth, position]);

    const handleMouseDown = () => {
        setIsResizing(true);
    };

    return (
        <div
            ref={panelRef}
            className={`resizable-panel ${position}`}
            style={{
                flexBasis: `${width}px`,
                flexGrow: 0,
                flexShrink: 0
            }}
        >
            {children}
            <div
                className={`resize-handle ${position}`}
                onMouseDown={handleMouseDown}
            >
                <div className="resize-handle-line" />
            </div>
        </div>
    );
};

export default ResizablePanel;
