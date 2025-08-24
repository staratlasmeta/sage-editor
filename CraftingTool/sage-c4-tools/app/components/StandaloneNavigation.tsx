import React, { useState } from 'react';
import { AchievementPanel } from './AchievementPanel';
import { SaveLoadManager } from './SaveLoadManager';
import { NotificationSystem, useNotifications } from './NotificationSystem';
import { SettingsPanel } from './SettingsPanel';
import { ResourcesView } from './ResourcesView';

interface StandaloneNavigationProps {
    className?: string;
    claimStakes?: any[];
    currentRoute?: string;
}

export function StandaloneNavigation({ className = '', claimStakes = [], currentRoute = 'claim-stakes' }: StandaloneNavigationProps) {
    const { notifications, showNotification, dismissNotification } = useNotifications();
    const [showSettings, setShowSettings] = useState(false);
    const [showResourcesView, setShowResourcesView] = useState(false);

    const handleHomeClick = () => {
        // Navigate back to SAGE Editor Suite
        // For GitHub Pages deployment, use relative path
        const isGitHubPages = window.location.hostname.includes('github.io');
        const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost';

        if (isGitHubPages) {
            // For GitHub Pages, go up to the main index
            window.location.href = '../../../SAGE Editor Suite/index.html';
        } else if (isLocal && !window.location.hostname.includes('localhost')) {
            // For local file:// protocol
            window.location.href = '../../SAGE Editor Suite/index.html';
        } else {
            // For development
            alert('In production, this will navigate to the SAGE Editor Suite');
        }
    };

    const handleNavClick = (route: string) => {
        if (route === 'claim-stakes') {
            window.location.hash = '';
        } else {
            window.location.hash = route;
        }
    };

    return (
        <>
            <nav className={`navigation ${className}`}>
                <div className="tool-selector">
                    <button
                        className="tool-button home-button"
                        onClick={handleHomeClick}
                        title="Return to SAGE Editor Suite"
                    >
                        <span className="tool-icon">🏠</span>
                        <span>Home</span>
                    </button>

                    <div className="divider" style={{
                        width: '1px',
                        height: '24px',
                        background: 'var(--border-color)',
                        margin: '0 0.5rem'
                    }}></div>

                    <button
                        onClick={() => handleNavClick('claim-stakes')}
                        className={`tool-button ${currentRoute === 'claim-stakes' ? 'active' : ''}`}
                    >
                        <span className="tool-icon">🏭</span>
                        <span>Claim Stakes</span>
                    </button>

                    <button
                        onClick={() => handleNavClick('crafting-hab')}
                        className={`tool-button ${currentRoute === 'crafting-hab' ? 'active' : ''}`}
                    >
                        <span className="tool-icon">🔧</span>
                        <span>Crafting Hab</span>
                    </button>

                    <button
                        onClick={() => handleNavClick('recipes')}
                        className={`tool-button ${currentRoute === 'recipes' ? 'active' : ''}`}
                    >
                        <span className="tool-icon">📋</span>
                        <span>Recipes</span>
                    </button>
                </div>

                <div className="global-actions">
                    <SaveLoadManager onNotification={showNotification} />
                    <AchievementPanel />
                    <button
                        className="settings-button"
                        onClick={() => setShowResourcesView(!showResourcesView)}
                        title="View Resources"
                    >
                        📊
                    </button>
                    <button
                        className="settings-button"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </nav>

            {showSettings && (
                <SettingsPanel onClose={() => setShowSettings(false)} />
            )}

            {showResourcesView && (
                <ResourcesView claimStakes={claimStakes} onClose={() => setShowResourcesView(false)} />
            )}

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />
        </>
    );
} 