import React, { useState } from 'react';
import { useSharedState, STARBASE_LEVELS } from '../contexts/SharedStateContext';

interface SettingsPanelProps {
    onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
    const { state, updateStarbaseLevel, dispatch } = useSharedState();
    const [activeTab, setActiveTab] = useState('starbase');

    const handleStarbaseUpgrade = () => {
        if (state.starbaseLevel < 6) {
            updateStarbaseLevel(state.starbaseLevel + 1);
        }
    };

    const handleStarbaseDowngrade = () => {
        if (state.starbaseLevel > 0) {
            updateStarbaseLevel(state.starbaseLevel - 1);
        }
    };

    const handleSettingChange = (setting: string, value: any) => {
        dispatch({
            type: 'UPDATE_SETTINGS',
            payload: { [setting]: value }
        });
    };

    const currentLevelData = STARBASE_LEVELS[state.starbaseLevel as keyof typeof STARBASE_LEVELS];
    const nextLevelData = state.starbaseLevel < 6 ?
        STARBASE_LEVELS[(state.starbaseLevel + 1) as keyof typeof STARBASE_LEVELS] : null;

    return (
        <div className="settings-panel-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>⚙️ Settings & Configuration</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="settings-tabs">
                    <button
                        className={`settings-tab ${activeTab === 'starbase' ? 'active' : ''}`}
                        onClick={() => setActiveTab('starbase')}
                    >
                        🚀 Starbase
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'simulation' ? 'active' : ''}`}
                        onClick={() => setActiveTab('simulation')}
                    >
                        🎮 Simulation
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preferences')}
                    >
                        🎨 Preferences
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
                        onClick={() => setActiveTab('about')}
                    >
                        ℹ️ About
                    </button>
                </div>

                <div className="settings-content">
                    {activeTab === 'starbase' && (
                        <div className="starbase-settings">
                            <div className="starbase-current">
                                <h3>Current Starbase</h3>
                                <div className="starbase-level-display">
                                    <div className="level-badge">
                                        <span className="level-number">Level {state.starbaseLevel}</span>
                                        <span className="level-name">{currentLevelData.name}</span>
                                    </div>
                                    <div className="level-progress">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${(state.starbaseLevel / 6) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="starbase-features">
                                    <h4>Current Features</h4>
                                    <ul>
                                        {currentLevelData.features.map(feature => (
                                            <li key={feature}>✓ {feature}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="starbase-capabilities">
                                    <div className="capability">
                                        <h4>Claim Stake Tiers</h4>
                                        <div className="tier-badges">
                                            {[1, 2, 3, 4, 5].map(tier => (
                                                <span
                                                    key={tier}
                                                    className={`tier-badge ${currentLevelData.claimStakeTiers.includes(tier) ? 'unlocked' : 'locked'}`}
                                                >
                                                    T{tier}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="capability">
                                        <h4>Crafting Hab Plots</h4>
                                        <div className="plot-counts">
                                            {Object.entries(currentLevelData.habPlotsByTier).map(([tier, count]) => (
                                                <div key={tier} className="plot-count">
                                                    <span className="plot-tier">T{tier}:</span>
                                                    <span className="plot-number">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="starbase-controls">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleStarbaseDowngrade}
                                        disabled={state.starbaseLevel === 0}
                                    >
                                        ⬇️ Downgrade
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleStarbaseUpgrade}
                                        disabled={state.starbaseLevel === 6}
                                    >
                                        ⬆️ Upgrade
                                    </button>
                                </div>
                            </div>

                            {nextLevelData && (
                                <div className="starbase-next">
                                    <h3>Next Level Preview</h3>
                                    <div className="next-level-info">
                                        <h4>Level {state.starbaseLevel + 1}: {nextLevelData.name}</h4>
                                        <div className="next-features">
                                            <h5>New Features:</h5>
                                            <ul>
                                                {nextLevelData.features.map(feature => (
                                                    <li key={feature}>+ {feature}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'simulation' && (
                        <div className="simulation-settings">
                            <h3>Simulation Settings</h3>

                            <div className="setting-group">
                                <label>
                                    <span>Auto-Save</span>
                                    <input
                                        type="checkbox"
                                        checked={state.settings.autoSave}
                                        onChange={e => handleSettingChange('autoSave', e.target.checked)}
                                    />
                                </label>
                            </div>

                            <div className="setting-group">
                                <label>
                                    <span>Crew Management Mode</span>
                                    <select
                                        value={state.settings.crewMode}
                                        onChange={e => handleSettingChange('crewMode', e.target.value)}
                                    >
                                        <option value="auto">Automatic</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </label>
                            </div>

                            <div className="setting-group">
                                <label>
                                    <span>Tutorial Mode</span>
                                    <input
                                        type="checkbox"
                                        checked={!state.settings.tutorialCompleted}
                                        onChange={e => handleSettingChange('tutorialCompleted', !e.target.checked)}
                                    />
                                </label>
                            </div>

                            <div className="setting-group">
                                <h4>Simulation Speed</h4>
                                <div className="speed-controls">
                                    <button
                                        className={`btn btn-sm ${state.settings?.simulationSpeed === 0.5 ? 'btn-primary' : ''}`}
                                        onClick={() => handleSettingChange('simulationSpeed', 0.5)}
                                    >
                                        0.5x
                                    </button>
                                    <button
                                        className={`btn btn-sm ${(!state.settings?.simulationSpeed || state.settings?.simulationSpeed === 1) ? 'btn-primary' : ''}`}
                                        onClick={() => handleSettingChange('simulationSpeed', 1)}
                                    >
                                        1x
                                    </button>
                                    <button
                                        className={`btn btn-sm ${state.settings?.simulationSpeed === 2 ? 'btn-primary' : ''}`}
                                        onClick={() => handleSettingChange('simulationSpeed', 2)}
                                    >
                                        2x
                                    </button>
                                    <button
                                        className={`btn btn-sm ${state.settings?.simulationSpeed === 5 ? 'btn-primary' : ''}`}
                                        onClick={() => handleSettingChange('simulationSpeed', 5)}
                                    >
                                        5x
                                    </button>
                                </div>
                                <p style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    Current speed: {state.settings?.simulationSpeed || 1}x
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="preferences-settings">
                            <h3>Display Preferences</h3>

                            <div className="setting-group">
                                <label>
                                    <span>Show Resource Icons</span>
                                    <input type="checkbox" defaultChecked />
                                </label>
                            </div>

                            <div className="setting-group">
                                <label>
                                    <span>Compact Mode</span>
                                    <input type="checkbox" />
                                </label>
                            </div>

                            <div className="setting-group">
                                <label>
                                    <span>Number Format</span>
                                    <select>
                                        <option>Standard (1,234)</option>
                                        <option>Scientific (1.23e3)</option>
                                        <option>Abbreviated (1.2K)</option>
                                    </select>
                                </label>
                            </div>

                            <div className="setting-group">
                                <label>
                                    <span>Animation Speed</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        defaultValue="50"
                                    />
                                </label>
                            </div>

                            <h3 style={{ marginTop: '2rem' }}>Data Management</h3>

                            <div className="setting-group" style={{ marginTop: '1rem' }}>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        if (confirm('Are you sure you want to clear all saved data? This will reset:\n\n' +
                                            '• All claim stakes\n' +
                                            '• Crafting hab designs\n' +
                                            '• Saved games\n' +
                                            '• Achievements\n' +
                                            '• Settings\n\n' +
                                            'This action cannot be undone!')) {
                                            // Clear ALL localStorage items related to the app
                                            try {
                                                // Get all keys first
                                                const allKeys = [];
                                                for (let i = 0; i < localStorage.length; i++) {
                                                    const key = localStorage.key(i);
                                                    if (key) {
                                                        allKeys.push(key);
                                                    }
                                                }

                                                // Remove ALL keys except walletlink (which is from an external service)
                                                allKeys.forEach(key => {
                                                    // Keep wallet-related keys if they exist
                                                    if (!key.includes('walletlink') && !key.includes('wallet')) {
                                                        console.log('Removing localStorage key:', key);
                                                        localStorage.removeItem(key);
                                                    }
                                                });

                                                // Double-check that our specific keys are removed
                                                const appKeys = [
                                                    'claimStakeInstances',
                                                    'craftingHabInstances',
                                                    'sageC4SharedState',
                                                    'recipeBuildPlans',
                                                    'craftingQueue'
                                                ];

                                                appKeys.forEach(key => {
                                                    if (localStorage.getItem(key) !== null) {
                                                        console.log('Force removing:', key);
                                                        localStorage.removeItem(key);
                                                    }
                                                });

                                                // Small delay to ensure localStorage operations complete
                                                setTimeout(() => {
                                                    // Final verification before reload
                                                    const remaining = localStorage.getItem('claimStakeInstances');
                                                    if (remaining) {
                                                        console.error('Failed to clear claimStakeInstances, trying localStorage.clear()');
                                                        localStorage.clear();
                                                    }
                                                    window.location.reload();
                                                }, 100);
                                            } catch (error) {
                                                console.error('Error clearing localStorage:', error);
                                                // Try a simpler approach if the above fails
                                                localStorage.clear();
                                                setTimeout(() => {
                                                    window.location.reload();
                                                }, 100);
                                            }
                                        }
                                    }}
                                    style={{
                                        background: 'var(--status-danger)',
                                        width: '100%',
                                        padding: '1rem',
                                        fontSize: '1rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    🗑️ Start Fresh (Clear All Data)
                                </button>
                                <p style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center'
                                }}>
                                    This will reset everything and restart the application
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="about-settings">
                            <h3>About SAGE C4 Tools</h3>

                            <div className="about-content">
                                <p className="version">Version 1.0.0</p>

                                <h4>Created for the Star Atlas Community</h4>
                                <p>
                                    This tool suite helps players understand and master the C4
                                    (Claim, Craft, Combat, Conquer) system through interactive
                                    simulation and planning.
                                </p>

                                <h4>Features</h4>
                                <ul>
                                    <li>🏭 Claim Stakes Simulator - Design and optimize resource extraction</li>
                                    <li>🔧 Crafting Hab Tool - Plan and execute crafting operations</li>
                                    <li>📋 Recipe Explorer - Visualize complex crafting dependencies</li>
                                </ul>

                                <h4>Tips</h4>
                                <ul>
                                    <li>• Use Magic Resources (🪄) for testing</li>
                                    <li>• Save your designs frequently</li>
                                    <li>• Export saves to share with friends</li>
                                    <li>• Upgrade your starbase to unlock more features</li>
                                </ul>

                                <div className="credits">
                                    <p>Built with ❤️ for Star Atlas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 