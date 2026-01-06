import { Layers, Ghost, Clock, Settings } from "lucide-react";
import "./ActivityBar.css";

interface ActivityBarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

const ActivityBar = ({ activeView, setActiveView }: ActivityBarProps) => {
    // Strictly offline/local items
    const activities = [
        { id: "collections", icon: Layers, label: "APIs" },
        { id: "mock_server", icon: Ghost, label: "Mock Server" },
        { id: "history", icon: Clock, label: "History" },
    ];

    return (
        <aside className="activity-bar">
            <div className="activity-top">
                {activities.map((item) => (
                    <div
                        key={item.id}
                        className={`activity-item ${activeView === item.id ? "active" : ""}`}
                        onClick={() => setActiveView(item.id)}
                        title={item.label}
                    >
                        <item.icon size={22} strokeWidth={1.8} />
                    </div>
                ))}
            </div>
            <div className="activity-spacer"></div>
            <div className="activity-bottom">
                <div
                    className={`activity-item ${activeView === "settings" ? "active" : ""}`}
                    title="Settings"
                    onClick={() => setActiveView("settings")}
                >
                    <Settings size={22} strokeWidth={1.8} />
                </div>
            </div>
        </aside>
    );
};

export default ActivityBar;
