import React, { useState, useEffect } from 'react';

const SearchAndFilter = ({ gameData, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        inputs: false,
        outputs: false,
        constructionCosts: false
    });
    const [isQuickFiltersExpanded, setIsQuickFiltersExpanded] = useState(false);

    // Extract all unique resources from the game data
    const getAllResources = () => {
        const resources = new Set();

        Object.values(gameData.claimStakeBuildings).forEach(building => {
            // Add construction cost resources
            Object.keys(building.constructionCost || {}).forEach(resource =>
                resources.add(resource.replace('cargo-', '')));

            // Add input resources
            Object.keys(building.resourceRate || {}).forEach(resource =>
                resources.add(resource.replace('cargo-', '')));

            // Add output resources
            Object.keys(building.resourceExtractionRate || {}).forEach(resource =>
                resources.add(resource.replace('cargo-', '')));
        });

        return Array.from(resources).sort();
    };

    const filterBuildings = () => {
        const searchTermLower = searchTerm.toLowerCase();

        // If no search term and no active filters, return all buildings
        if (!searchTermLower && !Object.values(activeFilters).some(v => v)) {
            return Object.entries(gameData.claimStakeBuildings);
        }

        const filteredBuildings = Object.entries(gameData.claimStakeBuildings)
            .filter(([id, building]) => {
                if (!searchTermLower) return true;

                const matches = [];

                // Search by name
                matches.push(building.name.toLowerCase().includes(searchTermLower));

                // Search in construction costs if filter is active
                if (activeFilters.constructionCosts && building.constructionCost) {
                    matches.push(Object.keys(building.constructionCost).some(resource =>
                        resource.toLowerCase().includes(searchTermLower)));
                }

                // Search in inputs if filter is active
                if (activeFilters.inputs && building.resourceRate) {
                    matches.push(Object.keys(building.resourceRate).some(resource =>
                        resource.toLowerCase().includes(searchTermLower)));
                }

                // Search in outputs if filter is active
                if (activeFilters.outputs && building.resourceExtractionRate) {
                    matches.push(Object.keys(building.resourceExtractionRate).some(resource =>
                        resource.toLowerCase().includes(searchTermLower)));
                }

                // If no filters are active, search everywhere
                if (!Object.values(activeFilters).some(v => v)) {
                    return matches.some(match => match);
                }

                // If filters are active, only return true if matches in selected filters
                return matches.some(match => match);
            });

        return filteredBuildings;
    };

    useEffect(() => {
        const filtered = filterBuildings();
        onFilterChange(filtered);
    }, [searchTerm, activeFilters]);

    return (
        <div className="search-and-filter">
            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search buildings or resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="search-filters">
                    <label>
                        <input
                            type="checkbox"
                            checked={activeFilters.inputs}
                            onChange={() => setActiveFilters(prev => ({
                                ...prev,
                                inputs: !prev.inputs
                            }))}
                        />
                        Search in Inputs
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={activeFilters.outputs}
                            onChange={() => setActiveFilters(prev => ({
                                ...prev,
                                outputs: !prev.outputs
                            }))}
                        />
                        Search in Outputs
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={activeFilters.constructionCosts}
                            onChange={() => setActiveFilters(prev => ({
                                ...prev,
                                constructionCosts: !prev.constructionCosts
                            }))}
                        />
                        Search in Construction Costs
                    </label>
                </div>
            </div>

            <div className="resource-quick-filters">
                <button
                    className="quick-filters-toggle"
                    onClick={() => setIsQuickFiltersExpanded(!isQuickFiltersExpanded)}
                >
                    Quick Resource Filters {isQuickFiltersExpanded ? '▼' : '▶'}
                </button>
                {isQuickFiltersExpanded && (
                    <div className="resource-tags">
                        {getAllResources().map(resource => (
                            <button
                                key={resource}
                                className={`resource-tag ${searchTerm === resource ? 'active' : ''}`}
                                onClick={() => setSearchTerm(resource)}
                            >
                                {resource}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchAndFilter; 