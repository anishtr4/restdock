import { useState, useEffect } from "react";
import KeyValueEditor from "./KeyValueEditor";
import { Globe, Palette, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

import { THEMES } from "@/lib/themes";

interface GlobalVar {
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    themeId: string;
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
                <nav className="flex-1 p-2 space-y-1">
                    <Button
                        variant={activeTab === "global" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveTab("global")}
                    >
                        <Globe className="h-4 w-4" />
                        Global Variables
                    </Button>
                    <Button
                        variant={activeTab === "theme" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveTab("theme")}
                    >
                        <Palette className="h-4 w-4" />
                        Theme
                    </Button>
                    <Button
                        variant={activeTab === "general" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveTab("general")}
                    >
                        <Monitor className="h-4 w-4" />
                        General
                    </Button>
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === "global" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">Global Variables</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Variables defined here are accessible in all collections using <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{variableName}}`}</code>.
                            </p>
                        </div>
                        <KeyValueEditor
                            items={globalVariables.map(v => ({ ...v, active: v.enabled }))}
                            onChange={(items) => {
                                onGlobalVariablesChange(items.map(i => ({
                                    key: i.key,
                                    value: i.value,
                                    enabled: i.active,
                                    description: i.description
                                })));
                            }}
                        />
                    </div>
                )}

                {activeTab === "theme" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">Appearance</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Customize the look and feel of the application.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Label>Mode</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'light', label: 'Light', icon: <div className="h-6 w-6 rounded-full bg-[#f0f0f0] border border-gray-200" /> },
                                    { value: 'dark', label: 'Dark', icon: <div className="h-6 w-6 rounded-full bg-[#1e1e1e] border border-gray-700" /> },
                                    { value: 'system', label: 'System', icon: <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#f0f0f0] via-[#888] to-[#1e1e1e] border border-gray-300" /> }
                                ].map((item) => (
                                    <div
                                        key={item.value}
                                        className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${settings.theme === item.value
                                            ? "border-primary bg-accent"
                                            : "border-muted bg-popover"
                                            }`}
                                        onClick={() => updateSetting('theme', item.value as any)}
                                    >
                                        <div className="mb-2 rounded-md p-2 bg-background shadow-sm">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <Label>Theme Preset</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {THEMES.map((theme) => (
                                    <div
                                        key={theme.id}
                                        className={`relative flex flex-col items-start justify-between rounded-xl border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all overflow-hidden ${settings.themeId === theme.id
                                            ? "border-primary bg-accent/50"
                                            : "border-muted bg-popover"
                                            }`}
                                        onClick={() => updateSetting('themeId', theme.id)}
                                    >
                                        <div className="flex w-full items-center gap-2 mb-2">
                                            <div
                                                className="h-6 w-6 rounded-full shadow-sm border"
                                                style={{ backgroundColor: `hsl(${theme.variables['--primary']})` }}
                                            />
                                            <div
                                                className="h-4 w-12 border bg-muted"
                                                style={{ borderRadius: theme.variables['--radius'] }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold">{theme.name}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">{theme.description}</span>

                                        {settings.themeId === theme.id && (
                                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "general" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">General</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configure general application behavior.
                            </p>
                        </div>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="zoom">Zoom Level</Label>
                                    <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                                        {settings.zoomLevel}%
                                    </span>
                                </div>
                                <input
                                    id="zoom"
                                    type="range"
                                    min="80"
                                    max="150"
                                    step="5"
                                    value={settings.zoomLevel}
                                    onChange={(e) => updateSetting('zoomLevel', parseInt(e.target.value))}
                                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>80%</span>
                                    <span>100%</span>
                                    <span>150%</span>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="timeout">Request Timeout (ms)</Label>
                                <Input
                                    id="timeout"
                                    type="number"
                                    value={settings.requestTimeout}
                                    onChange={(e) => updateSetting('requestTimeout', parseInt(e.target.value))}
                                    className="w-[200px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Maximum time to wait for a response before cancelling.
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="redirects"
                                    checked={settings.followRedirects}
                                    onCheckedChange={(checked) => updateSetting('followRedirects', checked as boolean)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="redirects"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Follow Redirects
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically follow HTTP 3xx redirect responses.
                                    </p>
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
