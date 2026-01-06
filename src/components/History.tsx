import { Clock } from "lucide-react";
// import "./History.css"; // Temporarily disabled during Tailwind migration

interface HistoryEntry {
    id: string;
    method: string;
    url: string;
    timestamp: number;
    status?: number;
}

interface HistoryProps {
    history: HistoryEntry[];
    onSelectHistoryItem: (entry: HistoryEntry) => void;
}

const History = ({ history, onSelectHistoryItem }: HistoryProps) => {
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 1 minute
        if (diff < 60000) return 'Just now';
        // Less than 1 hour
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        // Less than 1 day
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        // Otherwise show date
        return date.toLocaleDateString();
    };

    const getStatusColor = (status?: number) => {
        if (!status) return 'var(--text-tertiary)';
        if (status >= 200 && status < 300) return '#10b981';
        if (status >= 300 && status < 400) return '#f59e0b';
        if (status >= 400 && status < 500) return '#f97316';
        return '#ef4444';
    };

    return (
        <aside className="history-sidebar">
            <div className="history-header">
                <div className="header-title">
                    <Clock size={20} />
                    <h2>HISTORY</h2>
                </div>
                <p className="header-subtitle">{sortedHistory.length} requests</p>
            </div>

            <div className="history-content">
                {sortedHistory.length === 0 ? (
                    <div className="empty-history">
                        <Clock size={48} strokeWidth={1} />
                        <p>No history yet</p>
                        <span>Send a request to see it here</span>
                    </div>
                ) : (
                    sortedHistory.map((entry) => (
                        <div
                            key={entry.id}
                            className="history-item"
                            onClick={() => onSelectHistoryItem(entry)}
                        >
                            <div className="history-item-header">
                                <span className={`method-badge ${entry.method.toLowerCase()}`}>
                                    {entry.method}
                                </span>
                                {entry.status && (
                                    <span
                                        className="status-badge"
                                        style={{ color: getStatusColor(entry.status) }}
                                    >
                                        {entry.status}
                                    </span>
                                )}
                            </div>
                            <div className="history-item-url">{entry.url}</div>
                            <div className="history-item-time">{formatTime(entry.timestamp)}</div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
};

export default History;
