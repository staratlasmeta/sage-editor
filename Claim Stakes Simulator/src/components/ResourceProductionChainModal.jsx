import React, { useState } from 'react';
import '../styles/ResourceProductionChainModal.css';

const ResourceProductionChainModal = ({ isOpen, onClose, constructionCost = {}, gameData, onReceiveResources }) => {
    // Move useState outside the conditional to fix hook rules violation
    const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' or 'detailed'

    if (!isOpen) return null;

    // Get the correct cargo data, handling different possible structures
    const cargoData = gameData?.cargo || (gameData?.data && gameData.data.cargo) || {};

    // Debug logging to help troubleshoot
    console.log('ResourceProductionChainModal - gameData structure:', {
        hasGameData: !!gameData,
        hasDirectCargo: !!gameData?.cargo,
        hasNestedCargo: !!(gameData?.data && gameData.data.cargo),
        cargoKeysCount: Object.keys(cargoData).length,
        constructionCostKeys: Object.keys(constructionCost || {})
    });

    // Check if we have valid construction cost and cargo data
    const hasValidData = cargoData && Object.keys(cargoData).length > 0 &&
        constructionCost && Object.keys(constructionCost).length > 0;

    const getProductionChain = (resourceId) => {
        // Clean up the resource ID
        const cleanResourceId = resourceId.replace('cargo-', '');
        const resource = cargoData[resourceId] || cargoData[`cargo-${cleanResourceId}`];

        if (!resource) {
            console.warn(`Resource not found: ${resourceId}`);
            return null;
        }

        return {
            id: resource.id,
            name: resource.name,
            tier: resource.tier || 1,
            planetTypes: resource.planetTypes || [],
            extractionRate: resource.extractionRate || {},
            inputs: resource.recipe?.inputs || {},
            isRawResource: !resource.recipe?.inputs
        };
    };

    const renderProductionChain = (resourceId, amount, level = 0) => {
        const chain = getProductionChain(resourceId);
        if (!chain) return null;

        const cleanResourceId = resourceId.replace('cargo-', '');
        const resourceName = chain.name || cleanResourceId.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        // Add indentation for nested levels
        const indent = level * 20;

        return (
            <div className="production-chain-item" style={{ marginLeft: `${indent}px` }}>
                <div className="resource-header">
                    <span className="resource-name">{resourceName}</span>
                    <span className="resource-amount">{amount}</span>
                </div>
                <div className="resource-details">
                    {chain.isRawResource ? (
                        <div className="raw-resource-info">
                            <p>Raw Resource</p>
                            <p>Available on: {chain.planetTypes.join(', ') || 'Unknown'}</p>
                        </div>
                    ) : (
                        <div className="processed-resource-info">
                            <p>Processed Resource</p>
                            <p>Processing available on: {chain.planetTypes.join(', ') || 'Unknown'}</p>
                            {Object.keys(chain.inputs).length > 0 && (
                                <div className="ingredients">
                                    <p>Requires:</p>
                                    <div className="ingredients-list">
                                        {Object.entries(chain.inputs).map(([inputId, inputAmount]) => (
                                            <div key={inputId} className="ingredient">
                                                {renderProductionChain(inputId, inputAmount * amount, level + 1)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Helper to get all required resources in the chain
    const getAllRequiredResources = (resourceId, amount = 1, accumulator = {}) => {
        // Ensure resourceId is valid
        if (!resourceId) {
            console.warn('Invalid resourceId in getAllRequiredResources');
            return accumulator;
        }

        // Get resource data from the correct location
        const resource = cargoData[resourceId] || cargoData[`cargo-${resourceId.replace('cargo-', '')}`];

        if (!resource) {
            console.warn(`Resource not found: ${resourceId}`);

            // Add a placeholder for this resource in the accumulator
            accumulator[resourceId] = {
                name: resourceId.replace('cargo-', '').split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' '),
                amount: (accumulator[resourceId]?.amount || 0) + amount,
                planetTypes: [],
                isRawResource: true,
                tier: 1
            };

            return accumulator;
        }

        // Add this resource to accumulator
        accumulator[resourceId] = {
            name: resource.name,
            amount: (accumulator[resourceId]?.amount || 0) + amount,
            planetTypes: resource.planetTypes || [],
            isRawResource: !resource.recipe?.inputs,
            tier: resource.tier || 1
        };

        // Process recipe inputs
        if (resource.recipe?.inputs) {
            Object.entries(resource.recipe.inputs).forEach(([inputId, inputAmount]) => {
                getAllRequiredResources(inputId, inputAmount * amount, accumulator);
            });
        }

        return accumulator;
    };

    // Get optimal claim stakes needed
    const getOptimalClaimStakes = () => {
        // Get all resources needed for all construction costs
        const allResources = {};
        Object.entries(constructionCost).forEach(([resourceId, amount]) => {
            getAllRequiredResources(resourceId, amount, allResources);
        });

        // Group resources by planet types
        const planetGroups = {};
        Object.entries(allResources).forEach(([id, resource]) => {
            resource.planetTypes.forEach(planetType => {
                if (!planetGroups[planetType]) {
                    planetGroups[planetType] = {
                        resources: [],
                        maxTier: 1
                    };
                }
                planetGroups[planetType].resources.push({
                    id,
                    ...resource
                });
                planetGroups[planetType].maxTier = Math.max(planetGroups[planetType].maxTier, resource.tier || 1);
            });
        });

        return planetGroups;
    };

    const renderOptimalPath = () => {
        const planetGroups = getOptimalClaimStakes();

        return (
            <div className="optimal-path">
                <h3>Recommended Claim Stakes</h3>
                <div className="claim-stakes-list">
                    {Object.entries(planetGroups).map(([planetType, group]) => {
                        // Check if any resources in the group are raw resources
                        const hasRawResources = group.resources.some(r => r.isRawResource);
                        const hasProcessedResources = group.resources.some(r => !r.isRawResource);

                        return (
                            <div key={planetType} className="planet-group">
                                <h4>{planetType} (Tier {group.maxTier})</h4>
                                <div className="resources-needed">
                                    <p>Resources to process/extract:</p>
                                    <ul>
                                        {group.resources.map(resource => (
                                            <li key={resource.id}>
                                                {resource.amount}x {resource.name}
                                                {resource.isRawResource ? ' (Raw Resource)' : ' (Processing)'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="required-buildings">
                                    <p>Required buildings:</p>
                                    <ul>
                                        {hasRawResources && (
                                            <li>Extraction Hub T{group.maxTier}</li>
                                        )}
                                        {hasProcessedResources && (
                                            <li>Processing Hub T{group.maxTier}</li>
                                        )}
                                        {group.resources.map(resource => (
                                            <li key={resource.id}>
                                                {resource.isRawResource ?
                                                    `${resource.name} Extractor` :
                                                    `${resource.name} Processor`
                                                } T{group.maxTier}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Wrap render function in try/catch for error handling
    const safeRenderProductionChain = (resourceId, amount, level = 0) => {
        try {
            return renderProductionChain(resourceId, amount, level);
        } catch (error) {
            console.error('Error rendering production chain:', error);
            return (
                <div className="error-message">
                    <p>Error rendering production chain for {resourceId}</p>
                    <p>{error.message}</p>
                </div>
            );
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="resource-modal">
                <div className="modal-header">
                    <h2>Resource Production Chain</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {!hasValidData ? (
                    <div className="modal-content error-content">
                        <h3>Missing Resource Data</h3>
                        <p>We couldn't load the resource production information. This might be because:</p>
                        <ul>
                            <li>The game data hasn't fully loaded yet</li>
                            <li>The building doesn't have valid construction costs</li>
                            <li>The required resources aren't defined in the cargo database</li>
                        </ul>
                        <div className="buttons">
                            <button onClick={onClose}>Close</button>
                            <button
                                onClick={() => onReceiveResources(constructionCost)}
                                className="receive-resources-btn"
                            >
                                Receive Resources Anyway
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="modal-content">
                        <div className="tab-header">
                            <button
                                className={`tab-button ${activeTab === 'recommended' ? 'active' : ''}`}
                                onClick={() => setActiveTab('recommended')}
                            >
                                Recommended Plan
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'detailed' ? 'active' : ''}`}
                                onClick={() => setActiveTab('detailed')}
                            >
                                Detailed Breakdown
                            </button>
                        </div>

                        <div className="tab-content">
                            {activeTab === 'recommended' ? (
                                <div className="recommended-tab">
                                    <h3>Recommended Claim Stakes</h3>
                                    {renderOptimalPath()}
                                    <button
                                        className="receive-resources-btn"
                                        onClick={() => onReceiveResources(constructionCost)}
                                    >
                                        Receive Resources
                                    </button>
                                </div>
                            ) : (
                                <div className="detailed-tab">
                                    <h3>Resource Production Breakdown</h3>
                                    <div className="production-chains">
                                        {Object.entries(constructionCost).map(([resourceId, amount]) => (
                                            <div key={resourceId} className="chain-container">
                                                {safeRenderProductionChain(resourceId, amount)}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className="receive-resources-btn"
                                        onClick={() => onReceiveResources(constructionCost)}
                                    >
                                        Receive Resources
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceProductionChainModal; 