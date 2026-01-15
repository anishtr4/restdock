export interface ScriptContext {
    environment: Record<string, string>;
    globals: Record<string, string>;
    request?: any;
    response?: any;
}

export interface ScriptResult {
    logs: string[];
    environment: Record<string, string>; // Modified env
    globals: Record<string, string>; // Modified globals
    tests: { name: string; passed: boolean; error?: string }[];
}

export class ScriptRunner {
    static async execute(script: string, context: ScriptContext): Promise<ScriptResult> {
        const logs: string[] = [];
        const tests: { name: string; passed: boolean; error?: string }[] = [];
        const modifiedEnv = { ...context.environment };
        const modifiedGlobals = { ...context.globals };

        // Mock Console
        const mockConsole = {
            log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
            error: (...args: any[]) => logs.push("ERROR: " + args.map(a => String(a)).join(' ')),
            warn: (...args: any[]) => logs.push("WARN: " + args.map(a => String(a)).join(' ')),
            info: (...args: any[]) => logs.push("INFO: " + args.map(a => String(a)).join(' '))
        };

        // Construct pm object
        const pm = {
            environment: {
                get: (key: string) => modifiedEnv[key],
                set: (key: string, value: string) => { modifiedEnv[key] = value; },
                has: (key: string) => key in modifiedEnv,
                unset: (key: string) => { delete modifiedEnv[key]; },
                clear: () => { for (const k in modifiedEnv) delete modifiedEnv[k]; }
            },
            globals: {
                get: (key: string) => modifiedGlobals[key],
                set: (key: string, value: string) => { modifiedGlobals[key] = value; },
                has: (key: string) => key in modifiedGlobals,
                unset: (key: string) => { delete modifiedGlobals[key]; },
                clear: () => { for (const k in modifiedGlobals) delete modifiedGlobals[k]; }
            },
            variables: {
                get: (key: string) => modifiedEnv[key] || modifiedGlobals[key]
            },
            request: context.request ? {
                url: { toString: () => context.request.url },
                method: context.request.method,
                headers: {
                    add: () => { }, // TODO
                    get: (key: string) => context.request.headers?.find((h: any) => h.key === key)?.value
                },
                body: context.request.body
            } : undefined,
            response: context.response ? {
                code: context.response.status,
                status: context.response.statusText,
                headers: context.response.headers,
                responseTime: context.response.time,
                text: () => context.response.body, // Simple text access
                json: () => {
                    try { return JSON.parse(context.response.body); }
                    catch { return null; }
                }
            } : undefined,
            test: (testName: string, callback: () => void) => {
                try {
                    callback();
                    tests.push({ name: testName, passed: true });
                } catch (e) {
                    tests.push({ name: testName, passed: false, error: String(e) });
                }
            },
            expect: (value: any) => {
                // very basic chai-like assertion
                return {
                    to: {
                        equal: (expected: any) => {
                            if (value != expected) throw new Error(`Expected ${value} to equal ${expected}`);
                        },
                        have: {
                            status: (code: number) => {
                                if (value !== code) throw new Error(`Expected status ${value} to be ${code}`);
                            }
                        }
                    }
                };
            }
        };

        try {
            // Wrap script in a function to scopes variables
            // prevent access to window/document via Proxy or strict mode?
            // "use strict"; is good.
            const userFunction = new Function('pm', 'console', `"use strict";\n${script}`);
            userFunction(pm, mockConsole);
        } catch (e) {
            logs.push("EXECUTION ERROR: " + String(e));
        }

        return {
            logs,
            environment: modifiedEnv,
            globals: modifiedGlobals,
            tests
        };
    }
}
