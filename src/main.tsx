import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { LoadingFallback } from "./components/LoadingFallback";


import { ErrorBoundary } from "./components/ErrorBoundary";

console.log("Starting app initialization...");

// Lazy load the main App component for faster initial render
const App = lazy(() => import("./App"));

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  console.log("Mounting React root...");
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

