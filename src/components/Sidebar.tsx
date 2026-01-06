import "./Sidebar.css";

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h3>Collections</h3>
            </div>
            <div className="sidebar-content">
                <div className="sidebar-item active">New Request</div>
                <div className="sidebar-item">History</div>
            </div>
        </aside>
    );
};

export default Sidebar;
