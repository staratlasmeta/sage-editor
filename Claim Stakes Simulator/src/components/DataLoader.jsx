import React, { useState, useRef } from 'react';
import {
    loadGameDataFromFile,
    loadGameDataFromJSON,
    getGameDataStatus,
    clearGameData,
    isStandaloneMode
} from '../utils/gameDataLoader';
import './DataLoader.css';

const DataLoader = ({ onDataLoaded, onError }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadStatus, setLoadStatus] = useState(null);
    const fileInputRef = useRef(null);

    // Get current data status
    const dataStatus = getGameDataStatus();

    const handleFileSelect = async (file) => {
        if (!file) return;

        setIsLoading(true);
        setLoadStatus(null);

        try {
            const result = await loadGameDataFromFile(file);

            if (result.success) {
                setLoadStatus({
                    type: 'success',
                    message: `Successfully loaded ${file.name}`,
                    details: {
                        filename: file.name,
                        size: (file.size / 1024).toFixed(1) + ' KB',
                        structure: result.structure || 'unknown',
                        stats: result.stats || {},
                        warnings: result.validation?.warnings || []
                    }
                });
                onDataLoaded(result.data);
            } else {
                setLoadStatus({
                    type: 'error',
                    message: result.error || 'Failed to load data',
                    details: result.details || {}
                });
                onError(new Error(result.error || 'Failed to load data'));
            }
        } catch (error) {
            console.error('File loading error:', error);
            setLoadStatus({
                type: 'error',
                message: `Error loading file: ${error.message}`,
                details: { error: error.message }
            });
            onError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileInputChange = (event) => {
        const file = event.target.files[0];
        handleFileSelect(file);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleClearData = () => {
        clearGameData();
        setLoadStatus({
            type: 'info',
            message: 'Game data cleared'
        });

        // Notify parent that data was cleared
        if (onDataLoaded) {
            onDataLoaded(null);
        }
    };

    const handleLoadDefaultData = async () => {
        setIsLoading(true);
        setLoadStatus(null);

        try {
            // Import and load the default game data
            const gameDataModule = await import('../gameData_allTiers.json');
            const gameDataJSON = JSON.stringify(gameDataModule.default || gameDataModule);

            const result = await loadGameDataFromJSON(gameDataJSON);

            if (result.success) {
                setLoadStatus({
                    type: 'success',
                    message: 'Successfully loaded default game data',
                    details: {
                        filename: 'gameData_allTiers.json (built-in)',
                        structure: result.structure || 'unknown',
                        stats: result.stats || {},
                        warnings: result.validation?.warnings || []
                    }
                });
                onDataLoaded(result.data);
            } else {
                setLoadStatus({
                    type: 'error',
                    message: result.error || 'Failed to load default data',
                    details: result.details || {}
                });
                onError(new Error(result.error || 'Failed to load default data'));
            }
        } catch (error) {
            console.error('Default data loading error:', error);
            setLoadStatus({
                type: 'error',
                message: `Error loading default data: ${error.message}`,
                details: { error: error.message }
            });
            onError(error);
        } finally {
            setIsLoading(false);
        }
    };

    // If we're in standalone mode, show different UI
    if (isStandaloneMode()) {
        return (
            <div className="data-loader standalone-mode">
                <div className="data-loader-content">
                    <div className="standalone-indicator">
                        <h2>🚀 Standalone Mode</h2>
                        <p>Game data is embedded in this HTML file</p>
                        <div className="data-status">
                            <h3>Loaded Sections:</h3>
                            <ul>
                                {Object.entries(dataStatus.sections).map(([section, count]) => (
                                    <li key={section}>
                                        <strong>{section}:</strong> {count} items
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="data-loader">
            <div className="data-loader-content">
                <div className="data-loader-header">
                    <h2>📊 Game Data Loader</h2>
                    <p>Load your game data JSON file to start playing</p>
                </div>

                {!dataStatus.loaded ? (
                    <div className="loading-section">
                        <div
                            className={`drop-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={handleBrowseClick}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                onChange={handleFileInputChange}
                                style={{ display: 'none' }}
                            />

                            {isLoading ? (
                                <div className="loading-indicator">
                                    <div className="spinner"></div>
                                    <p>Loading game data...</p>
                                </div>
                            ) : (
                                <div className="drop-zone-content">
                                    <div className="drop-zone-icon">📁</div>
                                    <h3>Drop your JSON file here</h3>
                                    <p>or click to browse for files</p>
                                    <div className="file-info">
                                        <small>Accepts: .json files</small>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="action-buttons">
                            <button
                                className="load-default-btn"
                                onClick={handleLoadDefaultData}
                                disabled={isLoading}
                            >
                                Load Default Game Data
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="loaded-section">
                        <div className="data-status">
                            <h3>✅ Game Data Loaded</h3>
                            <div className="status-grid">
                                {Object.entries(dataStatus.sections).map(([section, count]) => (
                                    <div key={section} className="status-item">
                                        <span className="status-label">{section}:</span>
                                        <span className="status-value">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="action-buttons">
                            <button
                                className="clear-data-btn"
                                onClick={handleClearData}
                                disabled={isLoading}
                            >
                                Clear Data & Load New File
                            </button>
                        </div>
                    </div>
                )}

                {loadStatus && (
                    <div className={`status-message ${loadStatus.type}`}>
                        <p>{loadStatus.message}</p>

                        {loadStatus.details && (
                            <div className="status-details">
                                {loadStatus.details.filename && (
                                    <p><strong>File:</strong> {loadStatus.details.filename}</p>
                                )}

                                {loadStatus.details.size && (
                                    <p><strong>Size:</strong> {loadStatus.details.size}</p>
                                )}

                                {loadStatus.details.structure && (
                                    <p><strong>Structure:</strong> {loadStatus.details.structure === 'nested' ? 'Nested (data under "data" key)' : 'Flat structure'}</p>
                                )}

                                {loadStatus.details.stats && (
                                    <div>
                                        <h4>Data Summary:</h4>
                                        <ul>
                                            <li>Cargo Items: {loadStatus.details.stats.cargo || 0}</li>
                                            <li>Claim Stake Definitions: {loadStatus.details.stats.claimStakeDefinitions || 0}</li>
                                            <li>Buildings: {loadStatus.details.stats.claimStakeBuildings || 0}</li>
                                            <li>Planet Archetypes: {loadStatus.details.stats.planetArchetypes || 0}</li>
                                        </ul>
                                    </div>
                                )}

                                {loadStatus.details.warnings && loadStatus.details.warnings.length > 0 && (
                                    <div>
                                        <h4>Warnings:</h4>
                                        <ul>
                                            {loadStatus.details.warnings.map((warning, index) => (
                                                <li key={index}>{warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {loadStatus.details.error && (
                                    <p><strong>Error Details:</strong> {loadStatus.details.error}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="data-loader-help">
                    <h4>📋 Instructions:</h4>
                    <ul>
                        <li>Use the default game data to get started</li>
                        <li>Or load a custom JSON file with your game data</li>
                        <li>JSON file must contain required sections: cargo, claimStakeDefinitions, claimStakeBuildings, planetArchetypes</li>
                        <li>File will be validated before loading</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DataLoader; 