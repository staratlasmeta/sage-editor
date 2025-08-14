/**
 * BuildingService.js
 * Centralized service for managing building construction and upgrades
 */

import ResourceCalculationService from './ResourceCalculationService';

class BuildingService {
    /**
     * Constructs a new building
     * @param {Object} building - Building definition
     * @param {Object} claimStake - Current claim stake
     * @param {Object} resources - Available resources
     * @returns {Object} Updated claim stake with new building
     */
    constructBuilding(building, claimStake, resources, globalResources) {
        // Validate building definition
        if (!this.validateBuildingDefinition(building)) {
            return {
                success: false,
                message: "Invalid building definition"
            };
        }

        // Comprehensive prerequisite validation
        const validation = ResourceCalculationService.validateConstructionPrerequisites(
            building,
            claimStake,
            resources
        );

        if (!validation.canConstruct) {
            return {
                success: false,
                message: `Cannot construct building: ${validation.issues.join(', ')}`,
                issues: validation.issues
            };
        }

        // Generate instance ID for buildings
        const isHub = building.id.includes('hub');

        // Ensure building ID has correct prefix
        let buildingId = building.id;
        if (!buildingId.startsWith('claimStakeBuilding-')) {
            buildingId = `claimStakeBuilding-${buildingId}`;
        }

        // Add instance ID for all buildings to ensure uniqueness
        buildingId = `${buildingId}-instance-${Date.now()}`;

        console.log(`[DEBUG] Constructing building with ID: ${buildingId}`);
        console.log(`[DEBUG] Current buildings:`, claimStake.buildings);

        // For hub buildings, check if the same hub type already exists
        let updatedBuildings = [...(claimStake.buildings || [])];

        if (isHub) {
            const hubType = this.extractHubType(buildingId);
            const existingHubOfSameType = updatedBuildings.find(existingId => {
                const existingHubType = this.extractHubType(existingId);
                return existingHubType === hubType;
            });

            if (existingHubOfSameType) {
                return {
                    success: false,
                    message: `A ${hubType} hub already exists on this claim stake`
                };
            }
        }

        // Add the new building
        updatedBuildings.push(buildingId);

        // Calculate resource costs
        const { updatedResources, updatedGlobalResources } =
            this.deductResourceCosts(building.constructionCost, claimStake.resources, globalResources);

        // Process building tags - add the building's tags to the claim stake
        let updatedDefinition = claimStake.definition || {};
        let updatedTags = [...(updatedDefinition.addedTags || [])];

        // Add new tags from the building
        if (building.addedTags && Array.isArray(building.addedTags)) {
            building.addedTags.forEach(tag => {
                if (!updatedTags.includes(tag)) {
                    updatedTags.push(tag);
                }
            });
        }

        // Create a new definition object with updated tags
        updatedDefinition = {
            ...updatedDefinition,
            addedTags: updatedTags
        };

        console.log(`[DEBUG] Final updated buildings array:`, updatedBuildings);

        // Dispatch an event to notify about the construction
        window.dispatchEvent(new CustomEvent('constructionAttempted', {
            detail: {
                buildingId: buildingId,
                timestamp: Date.now(),
                success: true,
                buildings: updatedBuildings
            }
        }));

        return {
            success: true,
            updatedClaimStake: {
                ...claimStake,
                buildings: updatedBuildings,
                resources: updatedResources,
                definition: updatedDefinition
            },
            updatedGlobalResources,
            buildingId
        };
    }

    /**
     * Upgrades a module from its current tier to the next tier
     * @param {String} moduleId - ID of the module to upgrade
     * @param {Object} nextTierBuilding - Definition of the next tier building
     * @param {Object} claimStake - Current claim stake data
     * @param {Object} resources - Local resources
     * @param {Object} globalResources - Global resources
     * @returns {Object} Result with updated claim stake data
     */
    upgradeModule(moduleId, nextTierBuilding, claimStake, resources, globalResources) {
        // First ensure building definitions are valid
        if (!this.validateBuildingDefinition(nextTierBuilding)) {
            return {
                success: false,
                message: "Invalid next tier building definition"
            };
        }

        // Debug information
        const currentTierMatch = moduleId.match(/-t(\d+)/);
        const currentTier = currentTierMatch ? parseInt(currentTierMatch[1]) : 1;
        const nextTier = currentTier + 1;

        console.log(`⬆️ Upgrade to T${nextTier}:`, nextTierBuilding.name || nextTierBuilding.id);

        // Find the actual module ID in the buildings array
        const actualModuleId = this.findModuleInClaimStake(moduleId, claimStake);

        if (!actualModuleId) {
            return {
                success: false,
                message: "Module not found in claim stake"
            };
        }

        // Validate upgrade prerequisites
        const validation = ResourceCalculationService.validateConstructionPrerequisites(
            nextTierBuilding,
            claimStake,
            resources
        );

        if (!validation.canConstruct) {
            return {
                success: false,
                message: `Cannot upgrade building: ${validation.issues.join(', ')}`,
                issues: validation.issues
            };
        }

        // Format the next tier building ID correctly
        let newModuleId;
        const isHub = actualModuleId.includes('hub');

        if (isHub) {
            // For hubs, use a standardized format
            const baseIdMatch = actualModuleId.match(/^(claimStakeBuilding-)?([\w-]+)-hub/);
            if (baseIdMatch) {
                const hubType = baseIdMatch[2]; // e.g., 'central', 'extraction'
                newModuleId = `claimStakeBuilding-${hubType}-hub-t${nextTier}-instance-${Date.now()}`;
            } else {
                // Fallback format if pattern not recognized
                const baseId = actualModuleId.replace(/-t\d+/, '').replace(/-instance-\d+$/, '');
                newModuleId = `${baseId}-t${nextTier}-instance-${Date.now()}`;
            }
        } else {
            // For regular modules, maintain instance ID if possible
            const instanceMatch = actualModuleId.match(/-instance-(\d+)$/);
            const instanceId = instanceMatch ? `-instance-${instanceMatch[1]}` : `-instance-${Date.now()}`;
            const baseId = actualModuleId.replace(/-t\d+/, '').replace(/-instance-\d+$/, '');
            newModuleId = `${baseId}-t${nextTier}${instanceId}`;
        }

        // Calculate resource costs
        const { updatedResources, updatedGlobalResources } =
            this.deductResourceCosts(nextTierBuilding.constructionCost, resources, globalResources);

        // Create new buildings array: remove old module and add upgraded one
        const updatedBuildings = claimStake.buildings.map(buildingId =>
            buildingId === actualModuleId ? newModuleId : buildingId
        );

        // Process building tags for the upgraded building
        let updatedDefinition = claimStake.definition || {};
        let updatedTags = [...(updatedDefinition.addedTags || [])];

        // Add new tags from the upgraded building
        if (nextTierBuilding.addedTags && Array.isArray(nextTierBuilding.addedTags)) {
            nextTierBuilding.addedTags.forEach(tag => {
                if (!updatedTags.includes(tag)) {
                    updatedTags.push(tag);
                }
            });
        }

        updatedDefinition = {
            ...updatedDefinition,
            addedTags: updatedTags
        };

        console.log(`🔄 Upgrade successful: ${actualModuleId} → ${newModuleId}`);

        // Dispatch upgrade event
        window.dispatchEvent(new CustomEvent('buildingUpgraded', {
            detail: {
                oldBuildingId: actualModuleId,
                newBuildingId: newModuleId,
                tier: nextTier,
                timestamp: Date.now()
            }
        }));

        return {
            success: true,
            updatedClaimStake: {
                ...claimStake,
                buildings: updatedBuildings,
                resources: updatedResources,
                definition: updatedDefinition
            },
            updatedGlobalResources,
            oldBuildingId: actualModuleId,
            newBuildingId: newModuleId
        };
    }

    /**
     * Extract hub type from building ID
     * @param {string} buildingId - Building identifier
     * @returns {string} Hub type (e.g., 'central', 'extraction', 'processing')
     */
    extractHubType(buildingId) {
        const match = buildingId.match(/-([\w-]+)-hub/);
        return match ? match[1] : null;
    }

    /**
     * Find a module in the claim stake buildings array
     * @param {String} moduleId - Module ID to find
     * @param {Object} claimStake - Claim stake data
     * @returns {String|null} Actual module ID or null if not found
     */
    findModuleInClaimStake(moduleId, claimStake) {
        if (!claimStake.buildings || !Array.isArray(claimStake.buildings)) {
            return null;
        }

        // Try exact match first
        if (claimStake.buildings.includes(moduleId)) {
            return moduleId;
        }

        // Try to find by base ID (without instance suffix)
        const baseModuleId = moduleId.replace(/-instance-\d+$/, '');

        return claimStake.buildings.find(buildingId => {
            const baseBuildingId = buildingId.replace(/-instance-\d+$/, '');
            return baseBuildingId === baseModuleId;
        }) || null;
    }

    /**
     * Check if resources can be afforded
     * @param {Object} costs - Resource costs
     * @param {Object} localResources - Local resources
     * @param {Object} globalResources - Global resources
     * @returns {boolean} True if affordable
     */
    canAffordResources(costs, localResources, globalResources) {
        if (!costs) return true;

        for (const [resourceId, cost] of Object.entries(costs)) {
            const localAmount = localResources[resourceId]?.amount || 0;
            const globalAmount = globalResources[resourceId]?.amount || 0;
            const totalAvailable = localAmount + globalAmount;

            if (totalAvailable < cost) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a building can be constructed
     * @param {Object} building - Building definition
     * @param {Object} claimStake - Claim stake data
     * @param {Object} resources - Available resources
     * @param {Object} globalResources - Global resources
     * @returns {boolean} True if can construct
     */
    canConstructBuilding(building, claimStake, resources, globalResources) {
        const validation = ResourceCalculationService.validateConstructionPrerequisites(
            building,
            claimStake,
            resources
        );
        return validation.canConstruct;
    }

    /**
     * Validate building definition
     * @param {Object} building - Building definition
     * @returns {boolean} True if valid
     */
    validateBuildingDefinition(building) {
        if (!building || typeof building !== 'object') {
            console.error('Building definition is not an object:', building);
            return false;
        }

        if (!building.id || typeof building.id !== 'string') {
            console.error('Building definition missing or invalid id:', building);
            return false;
        }

        if (!building.name || typeof building.name !== 'string') {
            console.error('Building definition missing or invalid name:', building);
            return false;
        }

        // Additional validation can be added here
        return true;
    }

    /**
     * Deduct resource costs from available resources
     * @param {Object} costs - Resource costs
     * @param {Object} resources - Local resources
     * @param {Object} globalResources - Global resources
     * @returns {Object} Updated resource objects
     */
    deductResourceCosts(costs, resources, globalResources) {
        const updatedResources = { ...resources };
        const updatedGlobalResources = { ...globalResources };

        if (!costs) {
            return { updatedResources, updatedGlobalResources };
        }

        Object.entries(costs).forEach(([resourceId, cost]) => {
            let remainingCost = cost;

            // First try to deduct from local resources
            if (updatedResources[resourceId] && updatedResources[resourceId].amount > 0) {
                const localAmount = updatedResources[resourceId].amount;
                const deductFromLocal = Math.min(localAmount, remainingCost);

                updatedResources[resourceId] = {
                    ...updatedResources[resourceId],
                    amount: localAmount - deductFromLocal
                };

                remainingCost -= deductFromLocal;
            }

            // Then deduct remaining from global resources
            if (remainingCost > 0 && updatedGlobalResources[resourceId]) {
                const globalAmount = updatedGlobalResources[resourceId].amount || 0;
                const deductFromGlobal = Math.min(globalAmount, remainingCost);

                updatedGlobalResources[resourceId] = {
                    ...updatedGlobalResources[resourceId],
                    amount: globalAmount - deductFromGlobal
                };
            }
        });

        return { updatedResources, updatedGlobalResources };
    }

    /**
     * Get detailed prerequisite information for a building
     * @param {Object} building - Building definition
     * @param {Object} claimStake - Claim stake data
     * @param {Object} resources - Available resources
     * @returns {Object} Detailed prerequisite information
     */
    getPrerequisiteDetails(building, claimStake, resources) {
        return ResourceCalculationService.validateConstructionPrerequisites(
            building,
            claimStake,
            resources
        );
    }
}

export default new BuildingService(); 