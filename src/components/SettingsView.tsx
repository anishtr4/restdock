import { useState, useEffect } from "react";
import KeyValueEditor from "./KeyValueEditor";
import { Globe, Palette, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface GlobalVar {
    key: string;
    value: string;
    enabled: boolean;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    zoomLevel: number;
    requestTimeout: number;
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
        <div className="flex h-full bg-background">
            {/* Sidebar */}
            <div className="w-64 border-r flex flex-col">
                <div className="px-4 py-3 border-b">
                    <h2 className="text-lg font-semibold">Settings</h2>
                </div>
                <nav className="flex-1 p-2">
                    <button
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "global"
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                        onClick={() => setActiveTab("global")}
                    >
                        <Globe className="h-4 w-4" />
                        Global Variables
                    </button>
                    <button
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "theme"
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                        onClick={() => setActiveTab("theme")}
                    >
                        <Palette className="h-4 w-4" />
                        Theme
                    </button>
                    <button
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "general"
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                        onClick={() => setActiveTab("general")}
                    >
                        <Monitor className="h-4 w-4" />
                        General
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === "global" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">Global Variables</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Variables defined here are accessible in all collections using <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{global.variableName}}`}</code>.
                            </p>
                        </div>
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
                )}

                {activeTab === "theme" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">Theme</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Customize the look and feel of the application.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Appearance</Label>
                                <div className="flex gap-3">
                                    {['light', 'dark'].map((t) => (
                                        <label
                                            key={t}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-md cursor-pointer transition-colors ${settings.theme === t
                                                    ? 'border-primary bg-accent'
                                                    : 'border-input hover:bg-accent'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="theme"
                                                value={t}
                                                checked={settings.theme === t}
                                                onChange={() => updateSetting('theme', t as any)}
                                                className="sr-only"
                                            />
                                            <span className="text-sm font-medium">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "general" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">General</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                General application settings.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Zoom Level</Label>
                                    <span className="text-sm font-medium px-2 py-1 bg-muted rounded">{settings.zoomLevel}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="80"
                                    max="150"
                                    step="10"
                                    value={settings.zoomLevel}
                                    onChange={(e) => updateSetting('zoomLevel', parseInt(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timeout">Request Timeout (ms)</Label>
                                <Input
                                    id="timeout"
                                    type="number"
                                    value={settings.requestTimeout}
                                    onChange={(e) => updateSetting('requestTimeout', parseInt(e.target.value))}
                                    className="w-[200px]"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="redirects"
                                    checked={settings.followRedirects}
                                    onCheckedChange={(checked) => updateSetting('followRedirects', checked as boolean)}
                                />
                                <label
                                    htmlFor="redirects"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Follow Redirects
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
