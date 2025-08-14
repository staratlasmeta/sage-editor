import React, { useState, useEffect } from 'react';
import { saveGame, loadGame, getSavedGames, deleteSavedGame } from '../utils/saveLoad';
import './SaveLoadManager.css';

const SaveLoadManager = ({ gameState, onLoad, onClose }) => {
    const [savedGames, setSavedGames] = useState({});
    const [selectedSaveId, setSelectedSaveId] = useState(null);
    const [saveName, setSaveName] = useState('');
    const [view, setView] = useState('list'); // 'list', 'save', 'load', 'delete'
    const [confirmationMessage, setConfirmationMessage] = useState(null);

    // Load saved games on component mount
    useEffect(() => {
        const saves = getSavedGames();
        setSavedGames(saves);
    }, []);

    // Handle saving a game
    const handleSaveGame = () => {
        const result = saveGame(gameState, saveName);
        if (result.success) {
            // Refresh the saved games list
            setSavedGames(getSavedGames());
            setConfirmationMessage({
                type: 'success',
                text: result.message
            });
            // Reset the save name
            setSaveName('');
            // Return to the list view after a delay
            setTimeout(() => {
                setView('list');
                setConfirmationMessage(null);
            }, 1500);
        } else {
            setConfirmationMessage({
                type: 'error',
                text: result.message
            });
        }
    };

    // Handle loading a game
    const handleLoadGame = () => {
        if (!selectedSaveId) return;

        const result = loadGame(selectedSaveId);
        if (result.success) {
            setConfirmationMessage({
                type: 'success',
                text: result.message
            });

            // Notify parent about loaded game state
            onLoad(result.gameState);

            // Return to the list view after a delay
            setTimeout(() => {
                setView('list');
                setConfirmationMessage(null);
                onClose();
            }, 1500);
        } else {
            setConfirmationMessage({
                type: 'error',
                text: result.message
            });
        }
    };

    // Handle deleting a save
    const handleDeleteSave = () => {
        if (!selectedSaveId) return;

        const result = deleteSavedGame(selectedSaveId);
        if (result.success) {
            // Refresh the saved games list
            setSavedGames(getSavedGames());
            setSelectedSaveId(null);
            setConfirmationMessage({
                type: 'success',
                text: result.message
            });

            // Return to the list view after a delay
            setTimeout(() => {
                setView('list');
                setConfirmationMessage(null);
            }, 1500);
        } else {
            setConfirmationMessage({
                type: 'error',
                text: result.message
            });
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    return (
        <div className="save-load-backdrop" onClick={onClose}>
            <div className="save-load-manager" onClick={(e) => e.stopPropagation()}>
                <div className="save-load-header">
                    <h2>Game Saves</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {/* Confirmation message */}
                {confirmationMessage && (
                    <div className={`confirmation-message ${confirmationMessage.type}`}>
                        {confirmationMessage.text}
                    </div>
                )}

                {/* View selector */}
                <div className="view-selector">
                    <button
                        className={view === 'list' ? 'active' : ''}
                        onClick={() => setView('list')}
                    >
                        Saved Games
                    </button>
                    <button
                        className={view === 'save' ? 'active' : ''}
                        onClick={() => setView('save')}
                    >
                        Save Game
                    </button>
                </div>

                {/* List View */}
                {view === 'list' && (
                    <div className="saves-list">
                        {Object.keys(savedGames).length === 0 ? (
                            <div className="no-saves">No saved games found</div>
                        ) : (
                            <>
                                <div className="saves-list-header">
                                    <span className="save-name-header">Name</span>
                                    <span className="save-date-header">Date</span>
                                    <span className="save-actions-header">Actions</span>
                                </div>
                                {Object.values(savedGames).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((save) => (
                                    <div
                                        key={save.id}
                                        className={`save-item ${selectedSaveId === save.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedSaveId(save.id)}
                                    >
                                        <span className="save-name">{save.name}</span>
                                        <span className="save-date">{formatDate(save.timestamp)}</span>
                                        <span className="save-actions">
                                            <button
                                                className="load-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSaveId(save.id);
                                                    setView('load');
                                                }}
                                            >
                                                Load
                                            </button>
                                            <button
                                                className="delete-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSaveId(save.id);
                                                    setView('delete');
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* Save View */}
                {view === 'save' && (
                    <div className="save-form">
                        <h3>Save Current Game</h3>
                        <div className="form-group">
                            <label htmlFor="save-name">Save Name:</label>
                            <input
                                type="text"
                                id="save-name"
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                placeholder="Enter save name (optional)"
                            />
                        </div>
                        <div className="form-actions">
                            <button onClick={() => setView('list')}>Cancel</button>
                            <button className="primary-button" onClick={handleSaveGame}>Save Game</button>
                        </div>
                    </div>
                )}

                {/* Load View */}
                {view === 'load' && selectedSaveId && (
                    <div className="load-confirmation">
                        <h3>Load Game</h3>
                        <p>Are you sure you want to load this save?</p>
                        <p className="warning">Any unsaved progress will be lost!</p>

                        {savedGames[selectedSaveId]?.preview && (
                            <div className="save-preview">
                                <h4>Save Details</h4>
                                <div className="preview-item">
                                    <span>Name:</span>
                                    <span>{savedGames[selectedSaveId].name}</span>
                                </div>
                                <div className="preview-item">
                                    <span>Date:</span>
                                    <span>{formatDate(savedGames[selectedSaveId].timestamp)}</span>
                                </div>
                                <div className="preview-item">
                                    <span>Claim Stakes:</span>
                                    <span>{savedGames[selectedSaveId].preview.totalClaimStakes}</span>
                                </div>
                                <div className="preview-item">
                                    <span>Buildings:</span>
                                    <span>{savedGames[selectedSaveId].preview.totalBuildings}</span>
                                </div>
                                <div className="preview-item">
                                    <span>Played Time:</span>
                                    <span>{savedGames[selectedSaveId].preview.elapsedTime}</span>
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button onClick={() => setView('list')}>Cancel</button>
                            <button className="primary-button" onClick={handleLoadGame}>Load Game</button>
                        </div>
                    </div>
                )}

                {/* Delete View */}
                {view === 'delete' && selectedSaveId && (
                    <div className="delete-confirmation">
                        <h3>Delete Save</h3>
                        <p>Are you sure you want to delete this save?</p>
                        <p className="warning">This action cannot be undone!</p>

                        <div className="save-preview">
                            <div className="preview-item">
                                <span>Name:</span>
                                <span>{savedGames[selectedSaveId]?.name}</span>
                            </div>
                            <div className="preview-item">
                                <span>Date:</span>
                                <span>{formatDate(savedGames[selectedSaveId]?.timestamp)}</span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button onClick={() => setView('list')}>Cancel</button>
                            <button className="danger-button" onClick={handleDeleteSave}>Delete Save</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SaveLoadManager;