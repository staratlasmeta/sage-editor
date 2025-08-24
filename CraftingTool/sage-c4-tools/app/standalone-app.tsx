import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { DataProvider } from './contexts/StandaloneDataContext';
import { SharedStateProvider } from './contexts/SharedStateContext';
import ClaimStakes from './routes/claim-stakes';
import CraftingHab from './routes/crafting-hab';
import Recipes from './routes/recipes';
import { StandaloneNavigation } from './components/StandaloneNavigation';
import { GlobalResourcePanel } from './components/GlobalResourcePanel';
import { SaveLoadManager } from './components/SaveLoadManager';
import { StarbaseControl } from './components/StarbaseControl';
import './app.css';
import './styles/sage-theme.css';

// Simple hash-based router for standalone build
function StandaloneApp() {
    const [currentRoute, setCurrentRoute] = useState('claim-stakes');

    useEffect(() => {
        // Handle hash changes
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) || 'claim-stakes';
            if (hash === 'crafting-hab' || hash === 'recipes') {
                setCurrentRoute(hash);
            } else {
                setCurrentRoute('claim-stakes');
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const renderContent = () => {
        switch (currentRoute) {
            case 'crafting-hab':
                return <CraftingHab />;
            case 'recipes':
                return <Recipes />;
            default:
                return <ClaimStakes />;
        }
    };

    return (
        <SharedStateProvider>
            <DataProvider>
                <div className="app-container">
                    <StandaloneNavigation currentRoute={currentRoute} />

                    <div className="main-layout">
                        <div className="left-sidebar">
                            <SaveLoadManager onNotification={(msg) => console.log(msg)} />
                            <StarbaseControl />
                        </div>

                        <main className="main-content">
                            {renderContent()}
                        </main>

                        <div className="right-sidebar">
                            <GlobalResourcePanel />
                        </div>
                    </div>
                </div>
            </DataProvider>
        </SharedStateProvider>
    );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <StandaloneApp />
    </React.StrictMode>
); 