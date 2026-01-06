import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

    return (
        <div className="space-y-4">
            {/* Auth Type Selector */}
            <div className="space-y-2">
                <Label>Auth Type</Label>
                <Select value={currentAuth.type} onValueChange={(value) => handleTypeChange(value as AuthData['type'])}>
                    <SelectTrigger className="w-[200px]">
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
            <div className="space-y-4">
                {currentAuth.type === 'none' && (
                    <div className="text-sm text-muted-foreground py-4">
                        This request does not use any authorization.
                    </div>
                )}

                {currentAuth.type === 'bearer' && currentAuth.bearer && (
                    <div className="space-y-2">
                        <Label htmlFor="bearer-token">Token</Label>
                        <div className="relative">
                            <Input
                                id="bearer-token"
                                type="text"
                                placeholder="Enter bearer token"
                                value={currentAuth.bearer.token}
                                onChange={(e) => handleFieldChange('token', e.target.value)}
                            />
                            {autocomplete && autocomplete.show && autocomplete.field === 'token' && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                    {autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                            onClick={() => insertVariable('token', v.key)}
                                        >
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                            <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentAuth.type === 'basic' && currentAuth.basic && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="basic-username">Username</Label>
                            <div className="relative">
                                <Input
                                    id="basic-username"
                                    type="text"
                                    placeholder="Username"
                                    value={currentAuth.basic.username}
                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'username' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                                onClick={() => insertVariable('username', v.key)}
                                            >
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                                <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="basic-password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="basic-password"
                                    type="password"
                                    placeholder="Password"
                                    value={currentAuth.basic.password}
                                    onChange={(e) => handleFieldChange('password', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'password' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                                onClick={() => insertVariable('password', v.key)}
                                            >
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                                <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {currentAuth.type === 'apiKey' && currentAuth.apiKey && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="apikey-key">Key</Label>
                            <div className="relative">
                                <Input
                                    id="apikey-key"
                                    type="text"
                                    placeholder="Key (e.g. X-API-Key)"
                                    value={currentAuth.apiKey.key}
                                    onChange={(e) => handleFieldChange('key', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'key' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                                onClick={() => insertVariable('key', v.key)}
                                            >
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                                <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="apikey-value">Value</Label>
                            <div className="relative">
                                <Input
                                    id="apikey-value"
                                    type="text"
                                    placeholder="API Key value"
                                    value={currentAuth.apiKey.value}
                                    onChange={(e) => handleFieldChange('value', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'value' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                                onClick={() => insertVariable('value', v.key)}
                                            >
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                                <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Add To</Label>
                            <Select value={currentAuth.apiKey.addTo} onValueChange={(value) => handleApiKeyAddToChange(value as 'header' | 'query')}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="header">Header</SelectItem>
                                    <SelectItem value="query">Query Params</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {currentAuth.type === 'oauth2' && currentAuth.oauth2 && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="oauth-token">Access Token</Label>
                            <div className="relative">
                                <Input
                                    id="oauth-token"
                                    type="text"
                                    placeholder="Access token"
                                    value={currentAuth.oauth2.accessToken}
                                    onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'accessToken' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-40 overflow-auto">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                                                onClick={() => insertVariable('accessToken', v.key)}
                                            >
                                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                                                <span className="text-muted-foreground text-xs ml-2">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="oauth-type">Token Type</Label>
                            <Input
                                id="oauth-type"
                                type="text"
                                placeholder="Bearer"
                                value={currentAuth.oauth2.tokenType}
                                onChange={(e) => handleFieldChange('tokenType', e.target.value)}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export { AuthorizationPanel as default, type AuthData };
