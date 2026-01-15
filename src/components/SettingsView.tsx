import { useState, useEffect, useRef } from "react";
import KeyValueEditor from "./KeyValueEditor";
import { Globe, Palette, Monitor, Database, Download, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";



import { AppSettings } from "@/types";

interface GlobalVar {
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

interface SettingsViewProps {
    globalVariables: GlobalVar[];
    onGlobalVariablesChange: (vars: GlobalVar[]) => void;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onImportPostman: (json: string) => void;
    onImportRestDock: (json: string) => void;
    onExportRestDock: () => void;
}

const SettingsView = ({
    globalVariables,
    onGlobalVariablesChange,
    settings,
    onSettingsChange,
    onImportPostman,
    onImportRestDock,
    onExportRestDock
}: SettingsViewProps) => {
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
                    <Button
                        variant={activeTab === "data" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveTab("data")}
                    >
                        <Database className="h-4 w-4" />
                        Data Management
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
                                    <p className="text-xs text-muted-foreground">
                                        Automatically follow HTTP 3xx redirect responses.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2 pt-4 border-t">
                                <Label>App Update</Label>
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            const btn = document.getElementById('check-update-btn');
                                            const status = document.getElementById('update-status');
                                            if (btn) (btn as HTMLButtonElement).disabled = true;
                                            if (btn) btn.innerText = "Checking...";
                                            if (status) status.innerText = "";

                                            try {
                                                const { checkUpdate, getDownloadUrl } = await import('@/lib/updater');
                                                const { openUrl } = await import('@tauri-apps/plugin-opener'); // Dynamic import to avoid top-level issues if any

                                                const info = await checkUpdate();
                                                if (info) {
                                                    const url = getDownloadUrl(info);
                                                    if (status) {
                                                        status.innerHTML = `New version ${info.version} availble! <a href="#" class="text-primary hover:underline ml-2">Download</a>`;
                                                        // Add click handler to the link
                                                        status.querySelector('a')!.onclick = (e) => {
                                                            e.preventDefault();
                                                            if (url) openUrl(url);
                                                            else openUrl(`https://github.com/anishtr4/restdock_release/releases/tag/${info.version}`);
                                                        };
                                                    }
                                                } else {
                                                    if (status) status.innerText = "You are on the latest version.";
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                if (status) status.innerText = "Check failed.";
                                            } finally {
                                                if (btn) (btn as HTMLButtonElement).disabled = false;
                                                if (btn) btn.innerText = "Check for Updates";
                                            }
                                        }}
                                        id="check-update-btn"
                                    >
                                        Check for Updates
                                    </Button>
                                    <span id="update-status" className="text-sm font-medium"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "data" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">Data Management</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Import/Export data and backups.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex flex-col gap-1">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Download className="h-4 w-4" /> Import Postman Data
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Import collections from Postman JSON export (v2.1).
                                    </p>
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        id="import-postman"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => onImportPostman(ev.target?.result as string);
                                                reader.readAsText(file);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <Button variant="outline" onClick={() => document.getElementById('import-postman')?.click()}>
                                        Select File...
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex flex-col gap-1">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Database className="h-4 w-4" /> Backup & Restore
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Export your entire workspace (collections & environments) or restore from a backup.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <Button onClick={onExportRestDock} className="gap-2">
                                        <Upload className="h-4 w-4" /> Export Backup
                                    </Button>

                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        id="import-restdock"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => onImportRestDock(ev.target?.result as string);
                                                reader.readAsText(file);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <Button variant="secondary" onClick={() => document.getElementById('import-restdock')?.click()} className="gap-2">
                                        <Download className="h-4 w-4" /> Restore Backup
                                    </Button>
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
