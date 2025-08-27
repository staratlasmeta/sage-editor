import React from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation
} from "react-router";
import { DataProvider } from './contexts/DataContext';
import { SharedStateProvider } from './contexts/SharedStateContext';
import { AchievementManager } from './components/AchievementNotification';
import type { LinksFunction } from "react-router";
import stylesheet from "./app.css?url";
import themeStyles from "./styles/sage-theme.css?url";
import settingsStyles from "./styles/settings-panel.css?url";
import achievementsStyles from "./styles/achievements.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "stylesheet", href: themeStyles },
  { rel: "stylesheet", href: settingsStyles },
  { rel: "stylesheet", href: achievementsStyles },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SAGE C4 Integrated Tools</title>
        <Meta />
        <Links />
        <style>{`
                    /* Global styles for SAGE theme */
                    :root {
                        --primary-orange: #FF6B35;
                        --primary-dark: #0A0A0A;
                        --primary-light: #1A1A1A;
                        --accent-blue: #00A8E8;
                        --accent-green: #00C896;
                        --accent-purple: #9B59B6;
                        --accent-gold: #FFD700;
                        --status-success: #2ECC40;
                        --status-warning: #FF851B;
                        --status-danger: #FF4136;
                        --status-info: #0074D9;
                        --faction-mud: #8B4513;
                        --faction-oni: #FF1493;
                        --faction-ust: #1E90FF;
                        --border-color: #2A2A2A;
                        --text-primary: #FFFFFF;
                        --text-secondary: #999999;
                        --text-dim: #666666;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        background: var(--primary-dark);
                        color: var(--text-primary);
                        font-family: "Exo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        min-height: 100vh;
                        overflow-x: hidden;
                    }

                    /* Scrollbar styling */
                    ::-webkit-scrollbar {
                        width: 10px;
                        height: 10px;
                    }

                    ::-webkit-scrollbar-track {
                        background: var(--primary-dark);
                    }

                    ::-webkit-scrollbar-thumb {
                        background: var(--primary-orange);
                        border-radius: 5px;
                    }

                    ::-webkit-scrollbar-thumb:hover {
                        background: #ff8659;
                    }
                `}</style>
        {/* Add hash routing script for production builds */}
        <script dangerouslySetInnerHTML={{
          __html: `
                        // Handle hash routing for standalone SPA
                        if (window.location.protocol === 'file:' || !window.location.host.includes('localhost')) {
                            // In production/standalone mode
                            if (!window.location.hash) {
                                // Default to claim-stakes if no hash
                                window.location.hash = '/';
                            }
                        }
                    `
        }} />
      </head>
      <body>
        <div className="app-container">
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <DataProvider>
      <SharedStateProvider>
        <AchievementManager>
          <Outlet key={location.pathname} />
        </AchievementManager>
      </SharedStateProvider>
    </DataProvider>
  );
}
