import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface AuthData {
    type: 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';
    bearer?: { token: string };
    basic?: { username: string; password: string };
    apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
    oauth2?: { accessToken: string; tokenType: string };
}

interface AuthorizationPanelProps {
    auth?: AuthData;
    onChange?: (auth: AuthData) => void;
    collectionVariables?: { key: string; value: string; enabled: boolean }[];
}

const AuthorizationPanel = ({
    auth,
    onChange,
    collectionVariables = []
}: AuthorizationPanelProps) => {
    const currentAuth: AuthData = auth || { type: 'none' };

    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        field: string;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
    } | null>(null);

    const handleTypeChange = (type: AuthData['type']) => {
        const newAuth: AuthData = { type };

        if (type === 'bearer') {
            newAuth.bearer = { token: '' };
        } else if (type === 'basic') {
            newAuth.basic = { username: '', password: '' };
        } else if (type === 'apiKey') {
            newAuth.apiKey = { key: '', value: '', addTo: 'header' };
        } else if (type === 'oauth2') {
            newAuth.oauth2 = { accessToken: '', tokenType: 'Bearer' };
        }

        onChange?.(newAuth);
    };

    const handleFieldChange = (field: string, value: string) => {
        const newAuth = { ...currentAuth };

        if (currentAuth.type === 'bearer' && newAuth.bearer) {
            newAuth.bearer.token = value;
        } else if (currentAuth.type === 'basic' && newAuth.basic) {
            if (field === 'username') newAuth.basic.username = value;
            else if (field === 'password') newAuth.basic.password = value;
        } else if (currentAuth.type === 'apiKey' && newAuth.apiKey) {
            if (field === 'key') newAuth.apiKey.key = value;
            else if (field === 'value') newAuth.apiKey.value = value;
        } else if (currentAuth.type === 'oauth2' && newAuth.oauth2) {
            if (field === 'accessToken') newAuth.oauth2.accessToken = value;
            else if (field === 'tokenType') newAuth.oauth2.tokenType = value;
        }

        onChange?.(newAuth);

        // Check for {{ pattern for autocomplete
        const match = value.match(/\{\{([^}]*)$/);
        if (match && collectionVariables.length > 0) {
            const searchTerm = match[1].toLowerCase();
            const suggestions = collectionVariables.filter(v =>
                v.enabled && v.key.toLowerCase().includes(searchTerm)
            );

            if (suggestions.length > 0) {
                setAutocomplete({
                    show: true,
                    field,
                    suggestions,
                    cursorPosition: value.length
                });
            } else {
                setAutocomplete(null);
            }
        } else {
            setAutocomplete(null);
        }
    };

    const insertVariable = (field: string, varKey: string) => {
        let currentValue = '';

        if (currentAuth.type === 'bearer' && currentAuth.bearer) {
            currentValue = currentAuth.bearer.token;
        } else if (currentAuth.type === 'basic' && currentAuth.basic) {
            currentValue = field === 'username' ? currentAuth.basic.username : currentAuth.basic.password;
        } else if (currentAuth.type === 'apiKey' && currentAuth.apiKey) {
            currentValue = field === 'key' ? currentAuth.apiKey.key : currentAuth.apiKey.value;
        } else if (currentAuth.type === 'oauth2' && currentAuth.oauth2) {
            currentValue = field === 'accessToken' ? currentAuth.oauth2.accessToken : currentAuth.oauth2.tokenType;
        }

        const beforeMatch = currentValue.substring(0, currentValue.lastIndexOf('{{'));
        const newValue = beforeMatch + `{{${varKey}}}`;
        handleFieldChange(field, newValue);
        setAutocomplete(null);
    };

    const handleApiKeyAddToChange = (addTo: 'header' | 'query') => {
        if (currentAuth.type === 'apiKey' && currentAuth.apiKey) {
            const newAuth = { ...currentAuth };
            newAuth.apiKey!.addTo = addTo;
            onChange?.(newAuth);
        }
    };

    // Shared styling constants to match KeyValueEditor
    const tableHeaderClass = "w-[30%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70";
    const headerRowClass = "hover:bg-transparent border-b divide-x divide-border/50 bg-muted/30";
    const rowClass = "hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors";
    const labelCellClass = "p-0 align-middle bg-muted/5 w-[30%] px-3 text-xs font-medium text-muted-foreground/80";
    const inputCellClass = "p-0 align-middle relative";
    const inputClass = "h-9 w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40";

    return (
        <div className="space-y-6">
            {/* Auth Type Selector - Kept clean but consistent */}
            <div className="flex items-center gap-4 py-2">
                <Label className="w-24 flex-shrink-0 text-muted-foreground font-medium text-xs uppercase tracking-wide">Auth Type</Label>
                <Select value={currentAuth.type} onValueChange={(value) => handleTypeChange(value as AuthData['type'])}>
                    <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Select auth type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Auth</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="apiKey">API Key</SelectItem>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Content Area */}
            {currentAuth.type !== 'none' && (
                <div className="w-full border rounded-md overflow-hidden bg-background shadow-sm">
                    <Table className="border-collapse table-fixed">
                        <TableHeader>
                            <TableRow className={headerRowClass}>
                                <TableHead className={tableHeaderClass}>Key</TableHead>
                                <TableHead className="w-[40%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Value</TableHead>
                                <TableHead className="w-[30%] px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentAuth.type === 'bearer' && currentAuth.bearer && (
                                <TableRow className={rowClass}>
                                    <TableCell className={labelCellClass}>Token</TableCell>
                                    <TableCell className={inputCellClass}>
                                        <Input
                                            type="text"
                                            placeholder="Enter bearer token"
                                            value={currentAuth.bearer.token}
                                            onChange={(e) => handleFieldChange('token', e.target.value)}
                                            className={inputClass}
                                        />
                                        {autocomplete && autocomplete.show && autocomplete.field === 'token' && (
                                            <div className="absolute top-full left-0 right-0 mt-0 bg-popover border border-border rounded-b-md shadow-xl z-50 max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter bg-muted/30 border-b">Variables</div>
                                                {autocomplete.suggestions.map((v, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between px-3 py-1.5 hover:bg-accent cursor-pointer text-sm group/item transition-colors"
                                                        onClick={() => insertVariable('token', v.key)}
                                                    >
                                                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border font-mono text-primary group-hover/item:border-primary/30 transition-colors shrink-0">{`{{${v.key}}}`}</code>
                                                        <span className="text-muted-foreground text-[10px] ml-2 truncate group-hover/item:text-foreground transition-colors text-right">{v.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-0 align-middle">
                                        <div className="px-3 text-xs italic text-muted-foreground/50">Bearer Token</div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {currentAuth.type === 'basic' && currentAuth.basic && (
                                <>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Username</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Input
                                                type="text"
                                                placeholder="Username"
                                                value={currentAuth.basic.username}
                                                onChange={(e) => handleFieldChange('username', e.target.value)}
                                                className={inputClass}
                                            />
                                            {autocomplete && autocomplete.show && autocomplete.field === 'username' && (
                                                <div className="absolute top-full left-0 right-0 mt-0 bg-popover border border-border rounded-b-md shadow-xl z-50 max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {autocomplete.suggestions.map((v, idx) => (
                                                        <div key={idx} className="flex items-center justify-between px-3 py-1.5 hover:bg-accent cursor-pointer text-sm" onClick={() => insertVariable('username', v.key)}>
                                                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border font-mono text-primary">{`{{${v.key}}}`}</code>
                                                            <span className="text-muted-foreground text-[10px] ml-2 truncate">{v.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="p-0 align-middle"></TableCell>
                                    </TableRow>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Password</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Input
                                                type="password"
                                                placeholder="Password"
                                                value={currentAuth.basic.password}
                                                onChange={(e) => handleFieldChange('password', e.target.value)}
                                                className={inputClass}
                                            />
                                            {autocomplete && autocomplete.show && autocomplete.field === 'password' && (
                                                <div className="absolute top-full left-0 right-0 mt-0 bg-popover border border-border rounded-b-md shadow-xl z-50 max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {autocomplete.suggestions.map((v, idx) => (
                                                        <div key={idx} className="flex items-center justify-between px-3 py-1.5 hover:bg-accent cursor-pointer text-sm" onClick={() => insertVariable('password', v.key)}>
                                                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border font-mono text-primary">{`{{${v.key}}}`}</code>
                                                            <span className="text-muted-foreground text-[10px] ml-2 truncate">{v.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="p-0 align-middle"></TableCell>
                                    </TableRow>
                                </>
                            )}

                            {currentAuth.type === 'apiKey' && currentAuth.apiKey && (
                                <>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Key</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Input
                                                type="text"
                                                placeholder="Key (e.g. X-API-Key)"
                                                value={currentAuth.apiKey.key}
                                                onChange={(e) => handleFieldChange('key', e.target.value)}
                                                className={inputClass}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0 align-middle"></TableCell>
                                    </TableRow>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Value</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Input
                                                type="text"
                                                placeholder="API Key value"
                                                value={currentAuth.apiKey.value}
                                                onChange={(e) => handleFieldChange('value', e.target.value)}
                                                className={inputClass}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0 align-middle"></TableCell>
                                    </TableRow>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Add To</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Select value={currentAuth.apiKey.addTo} onValueChange={(value) => handleApiKeyAddToChange(value as 'header' | 'query')}>
                                                <SelectTrigger className="w-full h-9 bg-transparent border-none focus:ring-1 focus:ring-primary/30 rounded-none px-3 text-sm shadow-none focus:ring-inset">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="header">Header</SelectItem>
                                                    <SelectItem value="query">Query Params</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="p-0 align-middle">
                                            <div className="px-3 text-xs italic text-muted-foreground/50">Where to add key</div>
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}

                            {currentAuth.type === 'oauth2' && currentAuth.oauth2 && (
                                <>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Access Token</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Input
                                                type="text"
                                                placeholder="Access token"
                                                value={currentAuth.oauth2.accessToken}
                                                onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                                                className={inputClass}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0 align-middle"></TableCell>
                                    </TableRow>
                                    <TableRow className={rowClass}>
                                        <TableCell className={labelCellClass}>Token Type</TableCell>
                                        <TableCell className={inputCellClass}>
                                            <Input
                                                type="text"
                                                placeholder="Bearer"
                                                value={currentAuth.oauth2.tokenType}
                                                onChange={(e) => handleFieldChange('tokenType', e.target.value)}
                                                className={inputClass}
                                            />
                                        </TableCell>
                                        <TableCell className="p-0 align-middle"></TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {currentAuth.type === 'none' && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/5 border rounded-md border-dashed">
                    <p className="text-sm text-muted-foreground">
                        This request does not use any authorization.
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                        Select an Auth type from the dropdown above to add credentials.
                    </p>
                </div>
            )}
        </div>
    );
};

export { AuthorizationPanel as default, type AuthData };
