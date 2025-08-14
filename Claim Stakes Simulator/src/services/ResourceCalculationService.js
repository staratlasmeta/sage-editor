/**
 * ResourceCalculationService - Utility service for resource calculations
 * This service provides helper methods for UI components to calculate various resource-related values
 * The actual simulation is handled by CentralizedSimulationService
 */

class ResourceCalculationService {

    /**
     * Validate construction prerequisites for a building
     * @param {Object} claimStake - The claim stake
     * @param {Object} buildingDef - Building definition
     * @param {Object} gameData - Game data
     * @param {Object} globalResources - Global resource pool
     * @returns {Object} Validation result
     */
    static validateConstructionPrerequisites(claimStake, buildingDef, gameData, globalResources = {}) {
        const validation = {
            canConstruct: true,
            issues: [],
            resourceRequirements: [],
            powerRequirement: 0,
            crewRequirement: 0
        };

        if (!claimStake || !buildingDef) {
            validation.canConstruct = false;
            validation.issues.push('Missing claim stake or building definition');
            return validation;
        }

        // Check if building already exists (for unique buildings)
        if (buildingDef.unique && claimStake.buildings?.includes(buildingDef.id)) {
            validation.canConstruct = false;
            validation.issues.push('This building already exists and is unique');
            return validation;
        }

        // Check resource requirements
        if (buildingDef.constructionCost) {
            Object.entries(buildingDef.constructionCost).forEach(([resourceId, cost]) => {
                const available = globalResources[resourceId] || 0;
                validation.resourceRequirements.push({
                    resourceId,
                    required: cost,
                    available,
                    sufficient: available >= cost
                });

                if (available < cost) {
                    validation.canConstruct = false;
                    validation.issues.push(`Insufficient ${resourceId}: need ${cost}, have ${available}`);
                }
            });
        }

        // Check power requirements
        if (buildingDef.powerConsumption) {
            const currentPower = this.calculateNetPower(claimStake);
            validation.powerRequirement = buildingDef.powerConsumption;

            if (currentPower < buildingDef.powerConsumption) {
                validation.canConstruct = false;
                validation.issues.push(`Insufficient power: need ${buildingDef.powerConsumption}, have ${currentPower}`);
            }
        }

        // Check crew requirements
        if (buildingDef.crewRequirement) {
            const availableCrew = this.calculateAvailableCrew(claimStake);
            validation.crewRequirement = buildingDef.crewRequirement;

            if (availableCrew < buildingDef.crewRequirement) {
                validation.canConstruct = false;
                validation.issues.push(`Insufficient crew: need ${buildingDef.crewRequirement}, have ${availableCrew}`);
            }
        }

        return validation;
    }

    /**
     * Calculate net power for a claim stake
     * @param {Object} claimStake - The claim stake
     * @returns {number} Net power (generation - consumption)
     */
    static calculateNetPower(claimStake) {
        if (!claimStake?.buildings) return 0;

        let totalGeneration = 0;
        let totalConsumption = 0;

        // This is a simplified calculation - the actual power calculation
        // should be done by CentralizedSimulationService
        // For now, return a basic value
        return totalGeneration - totalConsumption;
    }

    /**
     * Calculate available crew for a claim stake
     * @param {Object} claimStake - The claim stake
     * @returns {number} Available crew
     */
    static calculateAvailableCrew(claimStake) {
        if (!claimStake) return 0;

        // This is a simplified calculation - return basic value for now
        const totalCrewSlots = claimStake.definition?.crewSlots || 0;
        const usedCrew = 0; // Would need to calculate from buildings

        return totalCrewSlots - usedCrew;
    }

    /**
     * Calculate resource rates for a claim stake
     * @param {Object} claimStake - The claim stake
     * @param {Object} gameData - Game data
     * @returns {Object} Resource rates by resource ID
     */
    static calculateClaimStakeResourceRates(claimStake, gameData) {
        if (!claimStake?.buildings || !gameData) return {};

        const rates = {};

        // This is a simplified calculation - the actual rate calculation
        // should be delegated to CentralizedSimulationService
        // For now, return empty rates since CentralizedSimulationService handles this

        return rates;
    }

    /**
     * Calculate resource storage capacity for a resource
     * @param {Object} claimStake - The claim stake
     * @param {string} resourceId - Resource ID
     * @returns {Object} Storage information
     */
    static calculateResourceStorage(claimStake, resourceId) {
        if (!claimStake) {
            return {
                current: 0,
                capacity: 1000, // Default capacity
                percentage: 0
            };
        }

        const current = claimStake.resources?.[resourceId]?.amount ||
            claimStake.resources?.[resourceId] || 0;
        const capacity = 1000; // Default storage capacity - would need to calculate from buildings

        return {
            current,
            capacity,
            percentage: Math.round((current / capacity) * 100)
        };
    }

    /**
     * Get resource richness for a claim stake
     * @param {Object} claimStake - The claim stake
     * @param {Object} gameData - Game data
     * @returns {Object} Resource richness by resource ID
     */
    static getResourceRichness(claimStake, gameData) {
        if (!claimStake || !gameData) return {};

        // Extract planet archetype and return richness values
        // This should match the logic in CentralizedSimulationService
        return claimStake.resourceRichness || {};
    }
}

export default ResourceCalculationService; 