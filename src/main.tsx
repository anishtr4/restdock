import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";

// Lazy load the main App component for faster initial render
const App = lazy(() => import("./App"));

// Simple loading spinner that shows immediately
const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">Loading RestDock...</span>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>,
);
