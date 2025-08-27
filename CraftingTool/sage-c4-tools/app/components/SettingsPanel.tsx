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
                        className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preferences')}
                    >
                        ⚙️ Preferences
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
                        onClick={() => setActiveTab('data')}
                    >
                        💾 Data
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
                                        <div className="level-number">
                                            <div>Level</div>
                                            <div>{state.starbaseLevel}</div>
                                        </div>
                                        <div className="level-name">{currentLevelData.name}</div>
                                    </div>
                                    <div className="level-progress">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${(state.starbaseLevel / 6) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="starbase-features">
                                    <h4>✨ Current Features</h4>
                                    <ul>
                                        {currentLevelData.features.map(feature => (
                                            <li key={feature}>✓ {feature}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="starbase-capabilities">
                                    <div className="capability">
                                        <h4>🏭 Claim Stake Tiers</h4>
                                        <div className="settings-tier-badges">
                                            {[1, 2, 3, 4, 5].map(tier => (
                                                <span
                                                    key={tier}
                                                    className={`settings-tier-badge ${currentLevelData.claimStakeTiers.includes(tier) ? 'unlocked' : 'locked'}`}
                                                >
                                                    T{tier}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="capability">
                                        <h4>🔧 Crafting Hab Plots</h4>
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

                    {activeTab === 'preferences' && (
                        <div className="preferences-settings">
                            <h3>Application Settings</h3>

                            <div className="setting-group">
                                <label>
                                    <span>🔄 Auto-Save</span>
                                    <input
                                        type="checkbox"
                                        checked={state.settings.autoSave}
                                        onChange={e => handleSettingChange('autoSave', e.target.checked)}
                                    />
                                </label>
                                <p style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    Automatically save your progress every few seconds
                                </p>
                            </div>

                            <div className="setting-group" style={{ marginTop: '2rem' }}>
                                <h4>💾 Save/Load Game State</h4>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            const savedData = {
                                                version: '1.0.0',
                                                timestamp: Date.now(),
                                                state: state,
                                                claimStakes: localStorage.getItem('claimStakeInstances'),
                                                craftingHabs: localStorage.getItem('craftingHabInstances'),
                                                recipes: localStorage.getItem('recipeBuildPlans')
                                            };
                                            const dataStr = JSON.stringify(savedData, null, 2);
                                            const blob = new Blob([dataStr], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `sage-c4-save-${Date.now()}.json`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        📥 Export Save
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = '.json';
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        try {
                                                            const savedData = JSON.parse(event.target?.result as string);
                                                            if (savedData.claimStakes) {
                                                                localStorage.setItem('claimStakeInstances', savedData.claimStakes);
                                                            }
                                                            if (savedData.craftingHabs) {
                                                                localStorage.setItem('craftingHabInstances', savedData.craftingHabs);
                                                            }
                                                            if (savedData.recipes) {
                                                                localStorage.setItem('recipeBuildPlans', savedData.recipes);
                                                            }
                                                            if (savedData.state) {
                                                                localStorage.setItem('sageC4SharedState', JSON.stringify(savedData.state));
                                                            }
                                                            alert('Save loaded successfully! The page will now reload.');
                                                            window.location.reload();
                                                        } catch (err) {
                                                            alert('Error loading save file. Please check the file format.');
                                                        }
                                                    };
                                                    reader.readAsText(file);
                                                }
                                            };
                                            input.click();
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        📤 Import Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="data-settings">
                            <h3>Data Management</h3>

                            <div className="setting-group">
                                <h4>📊 Current Saved Data</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span>🏭 Claim Stakes: </span>
                                        <strong>{(() => {
                                            try {
                                                const data = localStorage.getItem('claimStakeInstances');
                                                return data ? JSON.parse(data).length : 0;
                                            } catch {
                                                return 0;
                                            }
                                        })()}</strong> saved
                                    </li>
                                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span>🔧 Crafting Habs: </span>
                                        <strong>{(() => {
                                            try {
                                                const data = localStorage.getItem('craftingHabInstances');
                                                return data ? JSON.parse(data).length : 0;
                                            } catch {
                                                return 0;
                                            }
                                        })()}</strong> saved
                                    </li>
                                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span>📋 Recipe Plans: </span>
                                        <strong>{(() => {
                                            try {
                                                const data = localStorage.getItem('recipeBuildPlans');
                                                return data ? JSON.parse(data).length : 0;
                                            } catch {
                                                return 0;
                                            }
                                        })()}</strong> saved
                                    </li>
                                </ul>
                            </div>

                            <div className="setting-group" style={{ marginTop: '2rem' }}>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        if (confirm('Are you sure you want to clear all saved data?\n\nThis will reset:\n• All claim stakes\n• Crafting hab designs\n• Saved games\n• Settings\n• Achievements\n• All progress\n\nThis action cannot be undone!')) {
                                            console.log('🗑️ === STARTING DATA CLEAR PROCESS ===');

                                            // Check current state before clearing
                                            const beforeClear = localStorage.getItem('claimStakeInstances');
                                            if (beforeClear) {
                                                console.log('📦 Found claimStakeInstances before clear:', beforeClear.length, 'chars');
                                                try {
                                                    const parsed = JSON.parse(beforeClear);
                                                    console.log('📦 Contains', parsed.length, 'claim stakes');
                                                } catch (e) {
                                                    console.error('Could not parse existing data');
                                                }
                                            } else {
                                                console.log('📦 No claimStakeInstances found before clear');
                                            }

                                            // Clear ALL localStorage keys related to this app
                                            const keysToRemove: string[] = [];

                                            // Get all localStorage keys
                                            // We need to collect keys first because we can't modify while iterating
                                            const allKeys: string[] = [];
                                            for (let i = 0; i < localStorage.length; i++) {
                                                const key = localStorage.key(i);
                                                if (key) {
                                                    allKeys.push(key);
                                                }
                                            }

                                            // Now check which keys to remove
                                            for (const key of allKeys) {
                                                // Remove all app-related keys
                                                if (
                                                    key === 'claimStakeInstances' ||
                                                    key === 'craftingHabInstances' ||
                                                    key === 'sageC4SharedState' ||
                                                    key === 'recipeBuildPlans' ||
                                                    key === 'craftingQueue' ||
                                                    key === 'achievementTrackerExpanded' ||
                                                    key === 'achievementTrackerVisible' ||
                                                    key === 'showAchievementProgress' ||
                                                    key.startsWith('tutorial_') ||
                                                    key.startsWith('save_') ||
                                                    key.startsWith('quickSave') ||
                                                    key.startsWith('autoSave')
                                                ) {
                                                    keysToRemove.push(key);
                                                }
                                            }

                                            console.log('Clearing localStorage keys:', keysToRemove);

                                            // Remove all identified keys
                                            keysToRemove.forEach(key => {
                                                localStorage.removeItem(key);
                                            });

                                            // Explicitly ensure critical keys are removed
                                            localStorage.removeItem('claimStakeInstances');
                                            localStorage.removeItem('sageC4SharedState');
                                            localStorage.removeItem('craftingHabInstances');
                                            localStorage.removeItem('recipeBuildPlans');
                                            localStorage.removeItem('craftingQueue');

                                            // Verify that claimStakeInstances is actually gone
                                            const verifyRemoved = localStorage.getItem('claimStakeInstances');
                                            if (verifyRemoved) {
                                                console.error('Failed to remove claimStakeInstances!', verifyRemoved);
                                            } else {
                                                console.log('Successfully cleared claimStakeInstances');
                                            }

                                            // Also clear sessionStorage in case anything is cached there
                                            try {
                                                sessionStorage.clear();
                                            } catch (e) {
                                                console.warn('Could not clear sessionStorage:', e);
                                            }

                                            // Also reset the shared state context directly
                                            dispatch({ type: 'RESET_STATE' });

                                            // Mark that we're clearing to prevent any saves during this time
                                            (window as any).isClearing = true;

                                            // Final verification before reload
                                            setTimeout(() => {
                                                const finalCheck = localStorage.getItem('claimStakeInstances');
                                                if (finalCheck) {
                                                    console.error('❌ CRITICAL: claimStakeInstances still exists after clear!');
                                                    console.error('Content:', finalCheck);
                                                    // Try to remove it again
                                                    localStorage.removeItem('claimStakeInstances');
                                                    console.warn('Attempted to remove it again');
                                                }

                                                // List all remaining localStorage keys
                                                console.log('📋 Final localStorage state before reload:');
                                                for (let i = 0; i < localStorage.length; i++) {
                                                    const key = localStorage.key(i);
                                                    if (key) {
                                                        console.log(`  - ${key}: ${localStorage.getItem(key)?.length || 0} chars`);
                                                    }
                                                }

                                                console.log('🔄 Performing hard reload...');
                                                // Use location.href for a hard reload that bypasses cache
                                                window.location.href = window.location.href;
                                            }, 250);
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
                                    🗑️ Clear All Data
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

                                <h4>⌨️ Keyboard Shortcuts</h4>
                                <ul>
                                    <li>• <kbd style={{
                                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 215, 0, 0.1))',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(255, 107, 53, 0.3)',
                                        color: '#FF6B35',
                                        fontWeight: 'bold'
                                    }}>Ctrl</kbd> + <kbd style={{
                                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 215, 0, 0.1))',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(255, 107, 53, 0.3)',
                                        color: '#FF6B35',
                                        fontWeight: 'bold'
                                    }}>S</kbd> - Quick save</li>
                                    <li>• <kbd style={{
                                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 215, 0, 0.1))',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(255, 107, 53, 0.3)',
                                        color: '#FF6B35',
                                        fontWeight: 'bold'
                                    }}>Esc</kbd> - Close dialogs</li>
                                    <li>• <kbd style={{
                                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 215, 0, 0.1))',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(255, 107, 53, 0.3)',
                                        color: '#FF6B35',
                                        fontWeight: 'bold'
                                    }}>Tab</kbd> - Navigate between tools</li>
                                </ul>

                                <div className="credits">
                                    <p>Built with <span style={{ color: '#FF4136', fontSize: '1.2em' }}>❤️</span> for Star Atlas</p>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>© 2024 SAGE C4 Tools</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
} 