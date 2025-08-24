import React, { useState } from 'react';
import { NavLink } from 'react-router';
import { AchievementPanel } from './AchievementPanel';
import { SaveLoadManager } from './SaveLoadManager';
import { NotificationSystem, useNotifications } from './NotificationSystem';
import { SettingsPanel } from './SettingsPanel';
import { ResourcesView } from './ResourcesView';

interface NavigationProps {
    className?: string;
    claimStakes?: any[];
}

export function Navigation({ className = '', claimStakes = [] }: NavigationProps) {
    const { notifications, showNotification, dismissNotification } = useNotifications();
    const [showSettings, setShowSettings] = useState(false);
    const [showResourcesView, setShowResourcesView] = useState(false);

    const handleHomeClick = () => {
        // Navigate back to SAGE Editor Suite
        // Check if we're in production (standalone build) or development
        const isProduction = window.location.protocol === 'file:' || !window.location.host.includes('localhost');

        if (isProduction) {
            // In production, navigate to the SAGE Editor Suite
            window.location.href = '../../SAGE Editor Suite/index.html';
        } else {
            // In development, just show an alert
            alert('In production, this will navigate to the SAGE Editor Suite');
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

                    <NavLink
                        to="/"
                        className={({ isActive }) => `tool-button ${isActive ? 'active' : ''}`}
                    >
                        <span className="tool-icon">🏭</span>
                        <span>Claim Stakes</span>
                    </NavLink>

                    <NavLink
                        to="/crafting-hab"
                        className={({ isActive }) => `tool-button ${isActive ? 'active' : ''}`}
                    >
                        <span className="tool-icon">🔧</span>
                        <span>Crafting Hab</span>
                    </NavLink>

                    <NavLink
                        to="/recipes"
                        className={({ isActive }) => `tool-button ${isActive ? 'active' : ''}`}
                    >
                        <span className="tool-icon">📋</span>
                        <span>Recipes</span>
                    </NavLink>
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

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            {showSettings && (
                <SettingsPanel onClose={() => setShowSettings(false)} />
            )}

            {showResourcesView && (
                <ResourcesView
                    claimStakes={claimStakes}
                    onClose={() => setShowResourcesView(false)}
                />
            )}
        </>
    );
} 