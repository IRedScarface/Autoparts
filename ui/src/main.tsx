import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            padding: 12,
            border: "1px solid #f00",
            borderRadius: 12,
          }}
        >
          {String(
            this.state.error?.stack ||
              this.state.error?.message ||
              this.state.error,
          )}
        </pre>
      );
    }
    return this.props.children as any;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
