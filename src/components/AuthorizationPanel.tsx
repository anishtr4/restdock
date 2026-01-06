import { useState } from "react";
import { ChevronDown } from "lucide-react";
import "./AuthorizationPanel.css";

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
    // Use props directly - default to 'none' if not provided
    const currentAuth: AuthData = auth || { type: 'none' };

    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        field: string;
        suggestions: typeof collectionVariables;
        cursorPosition: number;
    } | null>(null);

    const handleTypeChange = (type: AuthData['type']) => {
        const newAuth: AuthData = { type };

        // Initialize default values for each type
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
            currentValue = currentAuth.oauth2.accessToken;
        }

        const beforeMatch = currentValue.substring(0, currentValue.lastIndexOf('{{'));
        const newValue = beforeMatch + `{{${varKey}}}`;
        handleFieldChange(field, newValue);
        setAutocomplete(null);
    };

    return (
        <div className="auth-panel">
            {/* Header / Type Selector */}
            <div className="auth-type-section">
                <label>Auth Type</label>
                <div className="auth-type-dropdown-wrapper">
                    <select
                        className="auth-type-select"
                        value={currentAuth.type}
                        onChange={(e) => handleTypeChange(e.target.value as AuthData['type'])}
                    >
                        <option value="none">No Auth</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="apiKey">API Key</option>
                        <option value="oauth2">OAuth 2.0</option>
                    </select>
                    <ChevronDown size={14} className="auth-type-chevron" />
                </div>
            </div>

            {/* Content Area */}
            <div className="auth-config-container">

                {currentAuth.type === 'none' && (
                    <div className="no-auth-message">
                        This request does not use any authorization.
                    </div>
                )}

                {currentAuth.type === 'bearer' && currentAuth.bearer && (
                    <div className="form-group">
                        <label>Token</label>
                        <div className="form-input-wrapper">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter bearer token"
                                value={currentAuth.bearer.token}
                                onChange={(e) => handleFieldChange('token', e.target.value)}
                            />
                            {autocomplete && autocomplete.show && autocomplete.field === 'token' && (
                                <div className="autocomplete-menu">
                                    {autocomplete.suggestions.map((v, idx) => (
                                        <div
                                            key={idx}
                                            className="autocomplete-option"
                                            onClick={() => insertVariable('token', v.key)}
                                        >
                                            <span className="autocomplete-key">{"{{" + v.key + "}}"}</span>
                                            <span className="autocomplete-preview">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentAuth.type === 'basic' && currentAuth.basic && (
                    <>
                        <div className="form-group">
                            <label>Username</label>
                            <div className="form-input-wrapper">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Username"
                                    value={currentAuth.basic.username}
                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'username' && (
                                    <div className="autocomplete-menu">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="autocomplete-option"
                                                onClick={() => insertVariable('username', v.key)}
                                            >
                                                <span className="autocomplete-key">{"{{" + v.key + "}}"}</span>
                                                <span className="autocomplete-preview">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div className="form-input-wrapper">
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Password"
                                    value={currentAuth.basic.password}
                                    onChange={(e) => handleFieldChange('password', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'password' && (
                                    <div className="autocomplete-menu">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="autocomplete-option"
                                                onClick={() => insertVariable('password', v.key)}
                                            >
                                                <span className="autocomplete-key">{"{{" + v.key + "}}"}</span>
                                                <span className="autocomplete-preview">{v.value}</span>
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
                        <div className="form-group">
                            <label>Key</label>
                            <div className="form-input-wrapper">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Key (e.g. X-API-Key)"
                                    value={currentAuth.apiKey.key}
                                    onChange={(e) => handleFieldChange('key', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'key' && (
                                    <div className="autocomplete-menu">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="autocomplete-option"
                                                onClick={() => insertVariable('key', v.key)}
                                            >
                                                <span className="autocomplete-key">{"{{" + v.key + "}}"}</span>
                                                <span className="autocomplete-preview">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Value</label>
                            <div className="form-input-wrapper">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Value"
                                    value={currentAuth.apiKey.value}
                                    onChange={(e) => handleFieldChange('value', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'value' && (
                                    <div className="autocomplete-menu">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="autocomplete-option"
                                                onClick={() => insertVariable('value', v.key)}
                                            >
                                                <span className="autocomplete-key">{"{{" + v.key + "}}"}</span>
                                                <span className="autocomplete-preview">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Add To</label>
                            <div className="auth-type-dropdown-wrapper">
                                <select
                                    className="auth-type-select"
                                    value={currentAuth.apiKey.addTo}
                                    onChange={(e) => {
                                        const newAuth = { ...currentAuth };
                                        if (newAuth.apiKey) {
                                            newAuth.apiKey.addTo = e.target.value as 'header' | 'query';
                                            onChange?.(newAuth);
                                        }
                                    }}
                                >
                                    <option value="header">Header</option>
                                    <option value="query">Query Params</option>
                                </select>
                                <ChevronDown size={14} className="auth-type-chevron" />
                            </div>
                        </div>
                    </>
                )}

                {currentAuth.type === 'oauth2' && currentAuth.oauth2 && (
                    <>
                        <div className="form-group">
                            <label>Access Token</label>
                            <div className="form-input-wrapper">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter access token"
                                    value={currentAuth.oauth2.accessToken}
                                    onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                                />
                                {autocomplete && autocomplete.show && autocomplete.field === 'accessToken' && (
                                    <div className="autocomplete-menu">
                                        {autocomplete.suggestions.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="autocomplete-option"
                                                onClick={() => insertVariable('accessToken', v.key)}
                                            >
                                                <span className="autocomplete-key">{"{{" + v.key + "}}"}</span>
                                                <span className="autocomplete-preview">{v.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Token Type</label>
                            <div className="auth-type-dropdown-wrapper">
                                <select
                                    className="auth-type-select"
                                    value={currentAuth.oauth2.tokenType}
                                    onChange={(e) => handleFieldChange('tokenType', e.target.value)}
                                >
                                    <option value="Bearer">Bearer</option>
                                    <option value="MAC">MAC</option>
                                </select>
                                <ChevronDown size={14} className="auth-type-chevron" />
                            </div>
                            <small className="form-helper-text">Token will be sent as: {currentAuth.oauth2.tokenType} &lt;token&gt;</small>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthorizationPanel;
export type { AuthData };
