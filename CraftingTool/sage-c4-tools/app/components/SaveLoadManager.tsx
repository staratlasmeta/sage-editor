import React, { useState } from 'react';
import { useSharedState } from '../contexts/SharedStateContext';
import { useGameData } from '../contexts/DataContext';

interface SaveSlot {
    id: string;
    name: string;
    timestamp: number;
    data: any;
}

interface SaveLoadManagerProps {
    onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function SaveLoadManager({ onNotification }: SaveLoadManagerProps) {
    const { state, dispatch } = useSharedState();
    const [showSavePanel, setShowSavePanel] = useState(false);
    const [showLoadPanel, setShowLoadPanel] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);

    // Load save slots from localStorage
    const loadSaveSlots = () => {
        const slots: SaveSlot[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('sage_c4_save_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    slots.push({
                        id: key,
                        name: data.name || 'Unnamed Save',
                        timestamp: data.timestamp || 0,
                        data: data
                    });
                } catch (e) {
                    console.error('Failed to parse save slot:', key);
                }
            }
        }
        setSaveSlots(slots.sort((a, b) => b.timestamp - a.timestamp));
    };

    // Save current state
    const handleSave = () => {
        if (!saveName.trim()) {
            onNotification('Please enter a save name', 'error');
            return;
        }

        const saveData = {
            name: saveName,
            timestamp: Date.now(),
            version: '1.0.0',
            state: state,
            // Add any additional data that needs to be saved
            claimStakes: localStorage.getItem('claimStakeInstances'),
            craftingHabs: localStorage.getItem('craftingHabInstances')
        };

        const saveId = `sage_c4_save_${Date.now()}`;
        try {
            localStorage.setItem(saveId, JSON.stringify(saveData));
            onNotification(`Game saved as "${saveName}"`, 'success');
            setSaveName('');
            setShowSavePanel(false);
            loadSaveSlots();
        } catch (e) {
            onNotification('Failed to save game', 'error');
            console.error('Save error:', e);
        }
    };

    // Load a save
    const handleLoad = (slot: SaveSlot) => {
        try {
            const saveData = slot.data;

            // Restore shared state
            if (saveData.state) {
                dispatch({ type: 'LOAD_STATE', payload: saveData.state });
            }

            // Restore claim stakes
            if (saveData.claimStakes) {
                localStorage.setItem('claimStakeInstances', saveData.claimStakes);
            }

            // Restore crafting habs
            if (saveData.craftingHabs) {
                localStorage.setItem('craftingHabInstances', saveData.craftingHabs);
            }

            onNotification(`Game loaded: "${slot.name}"`, 'success');
            setShowLoadPanel(false);

            // Reload the page to ensure all components pick up the new state
            setTimeout(() => window.location.reload(), 500);
        } catch (e) {
            onNotification('Failed to load save', 'error');
            console.error('Load error:', e);
        }
    };

    // Delete a save
    const handleDelete = (slot: SaveSlot) => {
        if (confirm(`Delete save "${slot.name}"?`)) {
            localStorage.removeItem(slot.id);
            loadSaveSlots();
            onNotification('Save deleted', 'info');
        }
    };

    // Export save to file
    const handleExport = (slot: SaveSlot) => {
        const dataStr = JSON.stringify(slot.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sage-c4-save-${slot.name.replace(/\s+/g, '-')}-${slot.timestamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
        onNotification('Save exported', 'success');
    };

    // Import save from file
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                const saveId = `sage_c4_save_${Date.now()}`;
                localStorage.setItem(saveId, JSON.stringify(data));
                loadSaveSlots();
                onNotification('Save imported successfully', 'success');
            } catch (error) {
                onNotification('Failed to import save file', 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <button
                className="btn btn-secondary"
                onClick={() => {
                    setShowSavePanel(true);
                    setShowLoadPanel(false);
                }}
            >
                💾 Save
            </button>

            <button
                className="btn btn-secondary"
                onClick={() => {
                    loadSaveSlots();
                    setShowLoadPanel(true);
                    setShowSavePanel(false);
                }}
            >
                📁 Load
            </button>

            {/* Save Panel */}
            {showSavePanel && (
                <div className="save-load-panel">
                    <div className="panel-header">
                        <h3>Save Game</h3>
                        <button
                            className="close-button"
                            onClick={() => setShowSavePanel(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className="panel-content">
                        <div className="save-input-group">
                            <input
                                type="text"
                                placeholder="Enter save name..."
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                                autoFocus
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Panel */}
            {showLoadPanel && (
                <div className="save-load-panel">
                    <div className="panel-header">
                        <h3>Load Game</h3>
                        <button
                            className="close-button"
                            onClick={() => setShowLoadPanel(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className="panel-content">
                        <div className="import-section">
                            <label className="import-button">
                                📥 Import Save File
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>

                        <div className="save-slots">
                            {saveSlots.length === 0 ? (
                                <p className="no-saves">No saved games found</p>
                            ) : (
                                saveSlots.map(slot => (
                                    <div key={slot.id} className="save-slot">
                                        <div className="save-info">
                                            <h4>{slot.name}</h4>
                                            <span className="save-date">
                                                {new Date(slot.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="save-actions">
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleLoad(slot)}
                                            >
                                                Load
                                            </button>
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => handleExport(slot)}
                                            >
                                                Export
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(slot)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} 