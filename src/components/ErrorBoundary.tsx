import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex flex-col items-center justify-center p-8 bg-background text-foreground">
                    <h1 className="text-2xl font-bold mb-4 text-destructive">Something went wrong</h1>
                    <p className="mb-4 text-muted-foreground max-w-lg text-center font-mono text-sm bg-muted p-4 rounded border">
                        {this.state.error?.message}
                    </p>
                    <Button onClick={() => window.location.reload()}>Reload App</Button>
                </div>
            );
        }

        return this.props.children;
    }
}
