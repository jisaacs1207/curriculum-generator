import React from "react";
import ReactDOM from "react-dom/client";
import posthog from "posthog-js";
import App from "./App";
import { SettingsProvider } from "./context/SettingsContext";
import "./index.css";

const phKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();
const phHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
if (phKey && typeof window !== "undefined") {
  posthog.init(phKey, {
    api_host: phHost,
    person_profiles: "identified_only",
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
);
