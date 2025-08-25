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
        const hostname = window.location.hostname;
        const isGitHubPages = hostname.includes('.github.io');
        const isLocal = window.location.protocol === 'file:' || hostname === 'localhost';

        if (isGitHubPages) {
            // For GitHub Pages with format: https://[user].github.io/[project]/
            // Extract the base path and navigate to the main index
            const pathParts = window.location.pathname.split('/').filter(Boolean);

            // Check if we're in a subdirectory of the project
            if (pathParts.length > 0) {
                // Navigate to the project root
                const projectName = pathParts[0]; // This would be 'SAGE Editor Suite' or similar
                window.location.href = `/${projectName}/SAGE Editor Suite/index.html`;
            } else {
                // Fallback to relative path
                window.location.href = '../../../SAGE Editor Suite/index.html';
            }
        } else if (isLocal && !hostname.includes('localhost')) {
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
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowResourcesView(true)}
                        title="Open Full Resource Management"
                    >
                        🌐 Global Resources
                    </button>
                    <AchievementPanel />
                    <SaveLoadManager onNotification={showNotification} />
                    <button className="btn btn-secondary" onClick={() => setShowSettings(true)}>
                        ⚙️ Settings
                    </button>
                </div>
            </nav>

            {showSettings && (
                <SettingsPanel onClose={() => setShowSettings(false)} />
            )}

            {showResourcesView && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }} onClick={() => setShowResourcesView(false)}>
                    <div className="modal-content large" style={{
                        background: 'var(--primary-light, #1a1a1a)',
                        border: '2px solid var(--primary-orange, #ff6b35)',
                        borderRadius: '8px',
                        padding: '2rem',
                        width: '90vw',
                        maxWidth: '1200px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>
                        <button style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary-orange, #ff6b35)',
                            fontSize: '2rem',
                            cursor: 'pointer'
                        }} onClick={() => setShowResourcesView(false)}>×</button>
                        <ResourcesView claimStakes={claimStakes} onClose={() => setShowResourcesView(false)} />
                    </div>
                </div>
            )}

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />
        </>
    );
} 