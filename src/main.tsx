import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";

// Lazy load the main App component for faster initial render
const App = lazy(() => import("./App"));

import { Cpu } from "lucide-react";

// Simple loading spinner that shows immediately
const LoadingFallback = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none">
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulsate" />
        <div className="relative w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg animate-fade-in-up">
          <Cpu className="w-12 h-12 text-white fill-current" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <h1 className="text-2xl font-bold tracking-tight text-primary">RestDock</h1>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
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
