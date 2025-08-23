import React from 'react';
import { NavLink } from 'react-router';
import { AchievementPanel } from './AchievementPanel';
import { SaveLoadManager } from './SaveLoadManager';
import { NotificationSystem, useNotifications } from './NotificationSystem';

interface NavigationProps {
    className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
    const { notifications, showNotification, dismissNotification } = useNotifications();

    const handleHomeClick = () => {
        // Navigate back to SAGE Editor Suite
        // Using relative path to go up to the SAGE Editor Suite
        window.location.href = '../../SAGE Editor Suite/index.html';
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
                        to="/claim-stakes"
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
                    <AchievementPanel />
                    <SaveLoadManager onNotification={showNotification} />
                    <button className="btn btn-secondary" onClick={() => console.log('Settings')}>
                        ⚙️ Settings
                    </button>
                </div>
            </nav>

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />
        </>
    );
} 