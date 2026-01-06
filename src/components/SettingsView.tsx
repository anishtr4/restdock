import { useState, useEffect } from "react";
import "./SettingsView.css";
import KeyValueEditor from "./KeyValueEditor";
import { Globe, Palette, Monitor } from "lucide-react";

interface GlobalVar {
    key: string;
    value: string;
    enabled: boolean;
}

interface SettingsViewProps {
    globalVariables: GlobalVar[];
    onGlobalVariablesChange: (vars: GlobalVar[]) => void;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    zoomLevel: number;
    requestTimeout: number; // ms
    followRedirects: boolean;
}

interface SettingsViewProps {
    globalVariables: GlobalVar[];
    onGlobalVariablesChange: (vars: GlobalVar[]) => void;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

const SettingsView = ({ globalVariables, onGlobalVariablesChange, settings, onSettingsChange }: SettingsViewProps) => {
    const [activeTab, setActiveTab] = useState("global");

    useEffect(() => {
        console.log("SettingsView MOUNTED");
    }, []);

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="settings-view">
            <div className="settings-sidebar">
                <div className="settings-header">
                    <h2>Settings</h2>
                </div>
                <div className="settings-nav">
                    <button
                        className={`settings-nav-item ${activeTab === "global" ? "active" : ""}`}
                        onClick={() => setActiveTab("global")}
                    >
                        <Globe size={16} />
                        Global Variables
                    </button>
                    <button
                        className={`settings-nav-item ${activeTab === "theme" ? "active" : ""}`}
                        onClick={() => setActiveTab("theme")}
                    >
                        <Palette size={16} />
                        Theme
                    </button>
                    <button
                        className={`settings-nav-item ${activeTab === "general" ? "active" : ""}`}
                        onClick={() => setActiveTab("general")}
                    >
                        <Monitor size={16} />
                        General
                    </button>
                </div>
            </div>

            <div className="settings-content">
                {activeTab === "global" && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>Global Variables</h3>
                            <p>Variables defined here are accessible in all collections using <code>{`{{global.variableName}}`}</code>.</p>
                        </div>
                        <div className="panel-body">
                            <KeyValueEditor
                                items={globalVariables.map(v => ({ ...v, active: v.enabled }))}
                                onChange={(items) => {
                                    onGlobalVariablesChange(items.map(i => ({
                                        key: i.key,
                                        value: i.value,
                                        enabled: i.active
                                    })));
                                }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === "theme" && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>Theme</h3>
                            <p>Customize the look and feel of the application.</p>
                        </div>
                        <div className="panel-body">
                            <div className="settings-form">
                                <div className="form-group">
                                    <label>Appearance</label>
                                    <div className="radio-group">
                                        {['light', 'dark'].map((t) => (
                                            <label key={t} className={`radio-card ${settings.theme === t ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="theme"
                                                    value={t}
                                                    checked={settings.theme === t}
                                                    onChange={() => updateSetting('theme', t as any)}
                                                />
                                                <span className="radio-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "general" && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>General</h3>
                            <p>General application settings.</p>
                        </div>
                        <div className="panel-body">
                            <div className="settings-form">
                                <div className="form-group">
                                    <label>Just Zoom Level (%)</label>
                                    <input
                                        type="range"
                                        min="80"
                                        max="150"
                                        step="10"
                                        value={settings.zoomLevel}
                                        onChange={(e) => updateSetting('zoomLevel', parseInt(e.target.value))}
                                    />
                                    <span className="value-badge">{settings.zoomLevel}%</span>
                                </div>
                                <div className="form-group">
                                    <label>Request Timeout (ms)</label>
                                    <input
                                        type="number"
                                        value={settings.requestTimeout}
                                        onChange={(e) => updateSetting('requestTimeout', parseInt(e.target.value))}
                                        className="text-input"
                                    />
                                </div>
                                <div className="form-group-checkbox">
                                    <input
                                        type="checkbox"
                                        id="redirects"
                                        checked={settings.followRedirects}
                                        onChange={(e) => updateSetting('followRedirects', e.target.checked)}
                                    />
                                    <label htmlFor="redirects">Follow Redirects</label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
