
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthData } from "@/types";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
        nestedField?: string;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
    } | null>(null);

    const authTypes: { id: AuthData['type']; label: string }[] = [
        { id: 'none', label: 'No Auth' },
        { id: 'bearer', label: 'Bearer Token' },
        { id: 'basic', label: 'Basic Auth' },
        { id: 'apiKey', label: 'API Key' },
        { id: 'digest', label: 'Digest Auth' },
        { id: 'oauth1', label: 'OAuth 1.0' },
        { id: 'oauth2', label: 'OAuth 2.0' },
        { id: 'aws', label: 'AWS Signature' },
        { id: 'hawk', label: 'Hawk' },
    ];

    const handleTypeChange = (type: AuthData['type']) => {
        let newAuth: AuthData = { type };
        switch (type) {
            case 'bearer': newAuth.bearer = { token: '' }; break;
            case 'basic': newAuth.basic = { username: '', password: '' }; break;
            case 'apiKey': newAuth.apiKey = { key: '', value: '', addTo: 'header' }; break;
            case 'digest': newAuth.digest = { username: '', password: '', realm: '', nonce: '', algorithm: 'MD5', qop: 'auth', opaque: '', cnonce: '' }; break;
            case 'oauth1': newAuth.oauth1 = { consumerKey: '', consumerSecret: '', token: '', tokenSecret: '', signatureMethod: 'HMAC-SHA1', addParamsToHeader: true }; break;
            case 'aws': newAuth.aws = { accessKey: '', secretKey: '', region: 'us-east-1', service: 'execute-api' }; break;
            case 'hawk': newAuth.hawk = { authId: '', authKey: '', algorithm: 'sha256' }; break;
            case 'oauth2': newAuth.oauth2 = { accessToken: '', tokenType: 'Bearer', addTokenTo: 'header', grantType: 'authorization_code' }; break;
        }
        onChange?.(newAuth);
    };

    const handleNestedChange = (category: keyof AuthData, field: string, value: any) => {
        if (!currentAuth[category]) return;
        const newAuth = { ...currentAuth };
        // @ts-ignore
        newAuth[category] = { ...newAuth[category], [field]: value };
        onChange?.(newAuth);

        if (typeof value === 'string') {
            const match = value.match(/\{\{([^}]*)$/);
            if (match && collectionVariables.length > 0) {
                const searchTerm = match[1].toLowerCase();
                const suggestions = collectionVariables.filter(v => v.enabled && v.key.toLowerCase().includes(searchTerm));
                if (suggestions.length > 0) {
                    setAutocomplete({ show: true, field: category, nestedField: field, suggestions, cursorPosition: value.length });
                } else { setAutocomplete(null); }
            } else { setAutocomplete(null); }
        }
    };

    const insertVariable = (category: keyof AuthData, field: string, varKey: string) => {
        // @ts-ignore
        const currentValue = currentAuth[category]?.[field] || '';
        const beforeMatch = currentValue.substring(0, currentValue.lastIndexOf('{{'));
        const newValue = beforeMatch + `{{${varKey}}}`;
        handleNestedChange(category, field, newValue);
        setAutocomplete(null);
    };

    const TableInput = ({ category, field, placeholder, type = "text", className = "" }: { category: keyof AuthData, field: string, placeholder?: string, type?: string, className?: string }) => (
        <div className={`relative w-full h-9 group/input-wrapper ${className}`}>
            <Input
                type={type}
                placeholder={placeholder}
                // @ts-ignore
                value={currentAuth[category]?.[field] || ''}
                onChange={(e) => handleNestedChange(category, field, e.target.value)}
                className="absolute inset-0 h-full w-full bg-transparent border-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 rounded-none px-3 text-sm transition-all placeholder:text-muted-foreground/40 z-10"
            />
            {autocomplete && autocomplete.show && autocomplete.field === category && autocomplete.nestedField === field && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-xl z-50 max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {autocomplete.suggestions.map((v) => (
                        <div key={v.key} className="px-3 py-2 cursor-pointer hover:bg-muted/50 border-b border-border/30 last:border-0" onClick={() => insertVariable(category, field, v.key)}>
                            <div className="font-mono text-xs font-semibold text-primary mb-0.5">{`{{${v.key}}}`}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{v.value || <span className="italic">Empty</span>}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const AuthTable = ({ headers, children }: { headers: string[], children: React.ReactNode }) => (
        <div className="w-full border rounded-md overflow-hidden bg-background shadow-sm">
            <Table className="border-collapse table-fixed">
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b divide-x divide-border/50">
                        {headers.map((h, i) => (
                            <TableHead key={i} className="px-3 h-9 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 align-middle">
                                {h}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="hover:bg-muted/5 border-b divide-x divide-border/20 group h-9 transition-colors">
                        {children}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="flex w-full h-full bg-background overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 flex-shrink-0 border-r bg-muted/5 flex flex-col">
                <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Auth Type
                </div>
                <div className="flex-1 space-y-0.5 px-2 overflow-y-auto">
                    {authTypes.map(type => (
                        <button
                            key={type.id}
                            onClick={() => handleTypeChange(type.id)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center justify-between group relative overflow-hidden",
                                currentAuth.type === type.id
                                    ? "bg-muted text-foreground font-medium shadow-sm lg:border-l-[3px] lg:border-l-primary lg:rounded-l-none lg:bg-gradient-to-r lg:from-primary/5 lg:to-transparent"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <span className="relative z-10">{type.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full min-w-0 bg-background">
                <ScrollArea className="h-full w-full">
                    <div className="p-4 pb-20">
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {currentAuth.type === 'none' && (
                                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                                    <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mb-3" />
                                    <p className="text-sm text-muted-foreground text-center">
                                        This request does not use any authorization.
                                    </p>
                                </div>
                            )}

                            {currentAuth.type === 'bearer' && (
                                <AuthTable headers={["Token"]}>
                                    <TableCell className="p-0 align-middle"><TableInput category="bearer" field="token" placeholder="Bearer Token" /></TableCell>
                                </AuthTable>
                            )}

                            {currentAuth.type === 'basic' && (
                                <AuthTable headers={["Username", "Password"]}>
                                    <TableCell className="p-0 align-middle"><TableInput category="basic" field="username" placeholder="Username" /></TableCell>
                                    <TableCell className="p-0 align-middle"><TableInput category="basic" field="password" type="password" placeholder="Password" /></TableCell>
                                </AuthTable>
                            )}

                            {currentAuth.type === 'apiKey' && (
                                <AuthTable headers={["Key", "Value", "Add To"]}>
                                    <TableCell className="p-0 align-middle"><TableInput category="apiKey" field="key" placeholder="Key" /></TableCell>
                                    <TableCell className="p-0 align-middle"><TableInput category="apiKey" field="value" placeholder="Value" /></TableCell>
                                    <TableCell className="p-0 align-middle w-[150px]">
                                        <Select value={currentAuth.apiKey?.addTo} onValueChange={(val) => handleNestedChange('apiKey', 'addTo', val)}>
                                            <SelectTrigger className="h-9 w-full bg-transparent border-none focus:ring-0 focus:ring-offset-0 rounded-none px-3 text-xs font-medium text-muted-foreground">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="header">Header</SelectItem>
                                                <SelectItem value="query">Query Params</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </AuthTable>
                            )}

                            {currentAuth.type === 'aws' && (
                                <div className="space-y-6">
                                    <AuthTable headers={["Access Key", "Secret Key"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="aws" field="accessKey" placeholder="AWS Access Key ID" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="aws" field="secretKey" type="password" placeholder="AWS Secret Access Key" /></TableCell>
                                    </AuthTable>
                                    <AuthTable headers={["Region", "Service", "Session Token"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="aws" field="region" placeholder="us-east-1" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="aws" field="service" placeholder="e.g. s3" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="aws" field="sessionToken" placeholder="AWS Session Token" /></TableCell>
                                    </AuthTable>
                                </div>
                            )}

                            {currentAuth.type === 'digest' && (
                                <div className="space-y-6">
                                    <AuthTable headers={["Username", "Password"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="username" placeholder="Username" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="password" type="password" placeholder="Password" /></TableCell>
                                    </AuthTable>
                                    <AuthTable headers={["Realm", "Nonce"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="realm" placeholder="Realm" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="nonce" placeholder="Nonce" /></TableCell>
                                    </AuthTable>
                                    <AuthTable headers={["Algorithm", "qop", "Opaque"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="algorithm" placeholder="MD5" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="qop" placeholder="auth" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="digest" field="opaque" placeholder="Opaque" /></TableCell>
                                    </AuthTable>
                                </div>
                            )}

                            {currentAuth.type === 'oauth1' && (
                                <div className="space-y-6">
                                    <AuthTable headers={["Consumer Key", "Consumer Secret"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="oauth1" field="consumerKey" placeholder="Consumer Key" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="oauth1" field="consumerSecret" type="password" placeholder="Consumer Secret" /></TableCell>
                                    </AuthTable>
                                    <AuthTable headers={["Access Token", "Token Secret"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="oauth1" field="token" placeholder="Access Token" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="oauth1" field="tokenSecret" type="password" placeholder="Token Secret" /></TableCell>
                                    </AuthTable>
                                    <AuthTable headers={["Signature Method"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="oauth1" field="signatureMethod" placeholder="HMAC-SHA1" /></TableCell>
                                    </AuthTable>
                                </div>
                            )}

                            {currentAuth.type === 'hawk' && (
                                <div className="space-y-6">
                                    <AuthTable headers={["Auth ID", "Auth Key"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="hawk" field="authId" placeholder="Hawk ID" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="hawk" field="authKey" type="password" placeholder="Hawk Key" /></TableCell>
                                    </AuthTable>
                                    <AuthTable headers={["Algorithm", "App"]}>
                                        <TableCell className="p-0 align-middle"><TableInput category="hawk" field="algorithm" placeholder="sha256" /></TableCell>
                                        <TableCell className="p-0 align-middle"><TableInput category="hawk" field="app" placeholder="App ID" /></TableCell>
                                    </AuthTable>
                                </div>
                            )}

                            {currentAuth.type === 'oauth2' && (
                                <div className="space-y-8">
                                    {/* Configuration Section */}
                                    <div className="space-y-4">
                                        <div className="pb-2 border-b">
                                            <h3 className="text-sm font-medium tracking-wide text-foreground">Configuration</h3>
                                        </div>

                                        <div className="space-y-1.5 relative w-1/2 pr-2">
                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pl-1">Grant Type</Label>
                                            <Select value={currentAuth.oauth2?.grantType} onValueChange={(val) => handleNestedChange('oauth2', 'grantType', val)}>
                                                <SelectTrigger className="bg-background/50 h-8 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="authorization_code">Authorization Code</SelectItem>
                                                    <SelectItem value="client_credentials">Client Credentials</SelectItem>
                                                    <SelectItem value="implicit">Implicit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <AuthTable headers={["Callback URL", "Auth URL"]}>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="redirectUri" placeholder="Callback URL" /></TableCell>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="authUrl" placeholder="https://..." /></TableCell>
                                        </AuthTable>
                                        <AuthTable headers={["Client ID", "Client Secret"]}>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="clientId" placeholder="Client ID" /></TableCell>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="clientSecret" type="password" placeholder="Client Secret" /></TableCell>
                                        </AuthTable>
                                        <AuthTable headers={["Access Token URL", "Scope"]}>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="accessTokenUrl" placeholder="https://..." /></TableCell>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="scope" placeholder="read:user write:user" /></TableCell>
                                        </AuthTable>

                                        <Button className="w-full" variant="secondary" onClick={() => alert("Feature Coming Soon: This will open browser to " + (currentAuth.oauth2?.authUrl || 'Auth URL'))}>
                                            Get New Access Token
                                        </Button>
                                    </div>

                                    {/* Current Token Section */}
                                    <div className="space-y-4">
                                        <div className="pb-2 border-b">
                                            <h3 className="text-sm font-medium tracking-wide text-foreground">Current Token</h3>
                                        </div>
                                        <AuthTable headers={["Access Token"]}>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="accessToken" placeholder="Access Token" /></TableCell>
                                        </AuthTable>
                                        <AuthTable headers={["Header Prefix"]}>
                                            <TableCell className="p-0 align-middle"><TableInput category="oauth2" field="tokenType" placeholder="Bearer" /></TableCell>
                                        </AuthTable>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default AuthorizationPanel;
