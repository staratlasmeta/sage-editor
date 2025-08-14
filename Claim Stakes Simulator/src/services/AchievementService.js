/**
 * AchievementService.js
 * Manages achievement tracking, progress, and notifications
 */

class AchievementService {
    constructor() {
        this.achievements = this.initializeAchievements();
        this.playerProgress = this.loadProgress();
    }

    /**
     * Initialize all achievement definitions
     * @returns {Object} Achievement definitions organized by category
     */
    initializeAchievements() {
        return {
            resourceMastery: {
                // Resource Collection Achievements
                firstSteps: {
                    id: 'first-steps',
                    name: 'First Steps',
                    description: 'Collect 1,000 of any resource',
                    tier: 'Bronze',
                    requirement: { type: 'resource_collection', target: 1000 },
                    icon: '📦'
                },
                resourceHoarder: {
                    id: 'resource-hoarder',
                    name: 'Resource Hoarder',
                    description: 'Collect 100,000 of any resource',
                    tier: 'Silver',
                    requirement: { type: 'resource_collection', target: 100000 },
                    icon: '🏪'
                },
                industrialStockpile: {
                    id: 'industrial-stockpile',
                    name: 'Industrial Stockpile',
                    description: 'Collect 1,000,000 of any resource',
                    tier: 'Gold',
                    requirement: { type: 'resource_collection', target: 1000000 },
                    icon: '🏭'
                },
                resourceMagnate: {
                    id: 'resource-magnate',
                    name: 'Resource Magnate',
                    description: 'Collect 10,000,000 of any resource',
                    tier: 'Platinum',
                    requirement: { type: 'resource_collection', target: 10000000 },
                    icon: '💎'
                },
                galacticReserves: {
                    id: 'galactic-reserves',
                    name: 'Galactic Reserves',
                    description: 'Collect 100,000,000 of any resource',
                    tier: 'Diamond',
                    requirement: { type: 'resource_collection', target: 100000000 },
                    icon: '🌌'
                },

                // Production Rate Achievements
                steadyProduction: {
                    id: 'steady-production',
                    name: 'Steady Production',
                    description: 'Achieve 10/sec production rate of any resource',
                    tier: 'Bronze',
                    requirement: { type: 'production_rate', target: 10 },
                    icon: '⚙️'
                },
                industrialScale: {
                    id: 'industrial-scale',
                    name: 'Industrial Scale',
                    description: 'Achieve 100/sec production rate of any resource',
                    tier: 'Silver',
                    requirement: { type: 'production_rate', target: 100 },
                    icon: '🏗️'
                },
                massProduction: {
                    id: 'mass-production',
                    name: 'Mass Production',
                    description: 'Achieve 1,000/sec production rate of any resource',
                    tier: 'Gold',
                    requirement: { type: 'production_rate', target: 1000 },
                    icon: '🚀'
                },
                megaFactory: {
                    id: 'mega-factory',
                    name: 'Mega Factory',
                    description: 'Achieve 10,000/sec production rate of any resource',
                    tier: 'Platinum',
                    requirement: { type: 'production_rate', target: 10000 },
                    icon: '🌟'
                },

                // Resource Diversity Achievements
                resourceExplorer: {
                    id: 'resource-explorer',
                    name: 'Resource Explorer',
                    description: 'Produce 10 different resource types',
                    tier: 'Bronze',
                    requirement: { type: 'resource_diversity', target: 10 },
                    icon: '🔍'
                },
                materialScientist: {
                    id: 'material-scientist',
                    name: 'Material Scientist',
                    description: 'Produce 25 different resource types',
                    tier: 'Silver',
                    requirement: { type: 'resource_diversity', target: 25 },
                    icon: '🧪'
                },
                resourceMaster: {
                    id: 'resource-master',
                    name: 'Resource Master',
                    description: 'Produce 50 different resource types',
                    tier: 'Gold',
                    requirement: { type: 'resource_diversity', target: 50 },
                    icon: '👑'
                },
                galacticEconomist: {
                    id: 'galactic-economist',
                    name: 'Galactic Economist',
                    description: 'Produce all available resource types',
                    tier: 'Platinum',
                    requirement: { type: 'resource_diversity', target: 'all' },
                    icon: '🌍'
                }
            },

            industrialDevelopment: {
                // Construction Achievements
                firstBuilder: {
                    id: 'first-builder',
                    name: 'First Builder',
                    description: 'Construct 5 buildings',
                    tier: 'Bronze',
                    requirement: { type: 'buildings_constructed', target: 5 },
                    icon: '🔨'
                },
                industrialDeveloper: {
                    id: 'industrial-developer',
                    name: 'Industrial Developer',
                    description: 'Construct 25 buildings',
                    tier: 'Silver',
                    requirement: { type: 'buildings_constructed', target: 25 },
                    icon: '🏗️'
                },
                megaConstructor: {
                    id: 'mega-constructor',
                    name: 'Mega Constructor',
                    description: 'Construct 100 buildings',
                    tier: 'Gold',
                    requirement: { type: 'buildings_constructed', target: 100 },
                    icon: '🏭'
                },
                galacticArchitect: {
                    id: 'galactic-architect',
                    name: 'Galactic Architect',
                    description: 'Construct 500 buildings',
                    tier: 'Platinum',
                    requirement: { type: 'buildings_constructed', target: 500 },
                    icon: '🏛️'
                },

                // Upgrade Achievements
                improvementInitiative: {
                    id: 'improvement-initiative',
                    name: 'Improvement Initiative',
                    description: 'Upgrade 5 buildings to T2+',
                    tier: 'Bronze',
                    requirement: { type: 'buildings_upgraded', target: 5, minTier: 2 },
                    icon: '⬆️'
                },
                technologyAdopter: {
                    id: 'technology-adopter',
                    name: 'Technology Adopter',
                    description: 'Upgrade 15 buildings to T3+',
                    tier: 'Silver',
                    requirement: { type: 'buildings_upgraded', target: 15, minTier: 3 },
                    icon: '🔧'
                },
                advancedEngineer: {
                    id: 'advanced-engineer',
                    name: 'Advanced Engineer',
                    description: 'Upgrade 25 buildings to T4+',
                    tier: 'Gold',
                    requirement: { type: 'buildings_upgraded', target: 25, minTier: 4 },
                    icon: '⚡'
                },
                masterTechnician: {
                    id: 'master-technician',
                    name: 'Master Technician',
                    description: 'Upgrade 50 buildings to T5',
                    tier: 'Platinum',
                    requirement: { type: 'buildings_upgraded', target: 50, minTier: 5 },
                    icon: '🎯'
                },

                // Specialization Achievements
                powerEngineer: {
                    id: 'power-engineer',
                    name: 'Power Engineer',
                    description: 'Build 10 power generation modules',
                    tier: 'Bronze',
                    requirement: { type: 'building_type_count', target: 10, buildingType: 'power' },
                    icon: '⚡'
                },
                extractionSpecialist: {
                    id: 'extraction-specialist',
                    name: 'Extraction Specialist',
                    description: 'Build 15 extraction modules',
                    tier: 'Silver',
                    requirement: { type: 'building_type_count', target: 15, buildingType: 'extraction' },
                    icon: '⛏️'
                },
                processingExpert: {
                    id: 'processing-expert',
                    name: 'Processing Expert',
                    description: 'Build 20 processing modules',
                    tier: 'Gold',
                    requirement: { type: 'building_type_count', target: 20, buildingType: 'processing' },
                    icon: '🏭'
                },
                industrialComplex: {
                    id: 'industrial-complex',
                    name: 'Industrial Complex',
                    description: 'Have all hub types on a single claim stake',
                    tier: 'Silver',
                    requirement: { type: 'all_hubs_single_stake', target: 1 },
                    icon: '🏢'
                },
                megaFacility: {
                    id: 'mega-facility',
                    name: 'Mega Facility',
                    description: 'Have 50+ buildings on a single claim stake',
                    tier: 'Platinum',
                    requirement: { type: 'buildings_per_stake', target: 50 },
                    icon: '🌆'
                }
            },

            territorialExpansion: {
                // Claim Stake Achievements
                firstClaim: {
                    id: 'first-claim',
                    name: 'First Claim',
                    description: 'Purchase your first claim stake',
                    tier: 'Bronze',
                    requirement: { type: 'claim_stakes_owned', target: 1 },
                    icon: '🏴'
                },
                expandingEmpire: {
                    id: 'expanding-empire',
                    name: 'Expanding Empire',
                    description: 'Own 5 claim stakes',
                    tier: 'Silver',
                    requirement: { type: 'claim_stakes_owned', target: 5 },
                    icon: '🗺️'
                },
                territorialControl: {
                    id: 'territorial-control',
                    name: 'Territorial Control',
                    description: 'Own 15 claim stakes',
                    tier: 'Gold',
                    requirement: { type: 'claim_stakes_owned', target: 15 },
                    icon: '👑'
                },
                galacticDominance: {
                    id: 'galactic-dominance',
                    name: 'Galactic Dominance',
                    description: 'Own 50 claim stakes',
                    tier: 'Platinum',
                    requirement: { type: 'claim_stakes_owned', target: 50 },
                    icon: '🌌'
                },

                // Planet Diversity Achievements
                planetExplorer: {
                    id: 'planet-explorer',
                    name: 'Planet Explorer',
                    description: 'Own claim stakes on 3 different planet types',
                    tier: 'Bronze',
                    requirement: { type: 'planet_diversity', target: 3 },
                    icon: '🪐'
                },
                cosmicColonizer: {
                    id: 'cosmic-colonizer',
                    name: 'Cosmic Colonizer',
                    description: 'Own claim stakes on 5 different planet types',
                    tier: 'Silver',
                    requirement: { type: 'planet_diversity', target: 5 },
                    icon: '🚀'
                },
                universalPresence: {
                    id: 'universal-presence',
                    name: 'Universal Presence',
                    description: 'Own claim stakes on all planet types',
                    tier: 'Gold',
                    requirement: { type: 'planet_diversity', target: 'all' },
                    icon: '🌍'
                }
            }
        };
    }

    /**
     * Load player progress from localStorage
     * @returns {Object} Player achievement progress
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('achievementProgress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load achievement progress:', error);
            return {};
        }
    }

    /**
     * Save player progress to localStorage
     */
    saveProgress() {
        try {
            localStorage.setItem('achievementProgress', JSON.stringify(this.playerProgress));
        } catch (error) {
            console.error('Failed to save achievement progress:', error);
        }
    }

    /**
     * Update achievement progress based on game state
     * @param {Object} gameState - Current game state
     * @returns {Array} Newly unlocked achievements
     */
    updateProgress(gameState) {
        const newlyUnlocked = [];

        // Update all achievement categories
        Object.entries(this.achievements).forEach(([category, achievements]) => {
            Object.entries(achievements).forEach(([achievementKey, achievement]) => {
                const progress = this.calculateProgress(achievement, gameState);
                const previousProgress = this.playerProgress[achievement.id] || { completed: false, progress: 0 };

                // Update progress
                this.playerProgress[achievement.id] = {
                    ...previousProgress,
                    progress: progress,
                    completed: progress >= 100,
                    completionDate: progress >= 100 && !previousProgress.completed ? new Date().toISOString() : previousProgress.completionDate
                };

                // Check for newly unlocked achievement
                if (progress >= 100 && !previousProgress.completed) {
                    newlyUnlocked.push({
                        ...achievement,
                        category: category
                    });
                }
            });
        });

        this.saveProgress();
        return newlyUnlocked;
    }

    /**
     * Calculate progress percentage for an achievement
     * @param {Object} achievement - Achievement definition
     * @param {Object} gameState - Current game state
     * @returns {number} Progress percentage (0-100)
     */
    calculateProgress(achievement, gameState) {
        const { requirement } = achievement;

        switch (requirement.type) {
            case 'resource_collection':
                return this.calculateResourceCollectionProgress(requirement, gameState);
            case 'production_rate':
                return this.calculateProductionRateProgress(requirement, gameState);
            case 'resource_diversity':
                return this.calculateResourceDiversityProgress(requirement, gameState);
            case 'buildings_constructed':
                return this.calculateBuildingsConstructedProgress(requirement, gameState);
            case 'buildings_upgraded':
                return this.calculateBuildingsUpgradedProgress(requirement, gameState);
            case 'building_type_count':
                return this.calculateBuildingTypeProgress(requirement, gameState);
            case 'claim_stakes_owned':
                return this.calculateClaimStakesProgress(requirement, gameState);
            case 'planet_diversity':
                return this.calculatePlanetDiversityProgress(requirement, gameState);
            default:
                return 0;
        }
    }

    /**
     * Calculate resource collection progress
     */
    calculateResourceCollectionProgress(requirement, gameState) {
        let maxAmount = 0;

        // Check global resources
        if (gameState.globalResources) {
            Object.values(gameState.globalResources).forEach(resource => {
                if (typeof resource === 'object' && resource.amount) {
                    maxAmount = Math.max(maxAmount, resource.amount);
                }
            });
        }

        return Math.min(100, (maxAmount / requirement.target) * 100);
    }

    /**
     * Calculate production rate progress
     */
    calculateProductionRateProgress(requirement, gameState) {
        let maxRate = 0;

        // Check all claim stakes for production rates
        if (gameState.ownedClaimStakes) {
            Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
                if (claimStake.resources) {
                    Object.values(claimStake.resources).forEach(resource => {
                        if (resource.rate > 0) {
                            maxRate = Math.max(maxRate, resource.rate);
                        }
                    });
                }
            });
        }

        return Math.min(100, (maxRate / requirement.target) * 100);
    }

    /**
     * Calculate resource diversity progress
     */
    calculateResourceDiversityProgress(requirement, gameState) {
        const producedResources = new Set();

        if (gameState.ownedClaimStakes) {
            Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
                if (claimStake.resources) {
                    Object.entries(claimStake.resources).forEach(([resourceId, resource]) => {
                        if (resource.rate > 0) {
                            producedResources.add(resourceId);
                        }
                    });
                }
            });
        }

        if (requirement.target === 'all') {
            // Would need to count total available resources from game data
            return producedResources.size >= 100 ? 100 : (producedResources.size / 100) * 100;
        }

        return Math.min(100, (producedResources.size / requirement.target) * 100);
    }

    /**
     * Calculate buildings constructed progress
     */
    calculateBuildingsConstructedProgress(requirement, gameState) {
        let totalBuildings = 0;

        if (gameState.ownedClaimStakes) {
            Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
                if (claimStake.buildings && Array.isArray(claimStake.buildings)) {
                    totalBuildings += claimStake.buildings.length;
                }
            });
        }

        return Math.min(100, (totalBuildings / requirement.target) * 100);
    }

    /**
     * Calculate buildings upgraded progress
     */
    calculateBuildingsUpgradedProgress(requirement, gameState) {
        let upgradedBuildings = 0;

        if (gameState.ownedClaimStakes) {
            Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
                if (claimStake.buildings && Array.isArray(claimStake.buildings)) {
                    // Count buildings that are tier 2 or higher (indicating they've been upgraded)
                    claimStake.buildings.forEach(buildingId => {
                        // Extract tier from building ID if possible
                        const tierMatch = buildingId.match(/-t(\d+)/);
                        if (tierMatch) {
                            const tier = parseInt(tierMatch[1], 10);
                            if (tier >= requirement.minimumTier || 2) {
                                upgradedBuildings++;
                            }
                        }
                    });
                }
            });
        }

        return Math.min(100, (upgradedBuildings / requirement.target) * 100);
    }

    /**
     * Calculate building type count progress  
     */
    calculateBuildingTypeProgress(requirement, gameState) {
        let buildingCount = 0;

        if (gameState.ownedClaimStakes) {
            Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
                if (claimStake.buildings && Array.isArray(claimStake.buildings)) {
                    // Count buildings that match the required type
                    claimStake.buildings.forEach(buildingId => {
                        if (requirement.buildingType && buildingId.includes(requirement.buildingType)) {
                            buildingCount++;
                        }
                    });
                }
            });
        }

        return Math.min(100, (buildingCount / requirement.target) * 100);
    }

    /**
     * Calculate claim stakes owned progress
     */
    calculateClaimStakesProgress(requirement, gameState) {
        const ownedCount = gameState.ownedClaimStakes ? Object.keys(gameState.ownedClaimStakes).length : 0;
        return Math.min(100, (ownedCount / requirement.target) * 100);
    }

    /**
     * Calculate planet diversity progress
     */
    calculatePlanetDiversityProgress(requirement, gameState) {
        const planetTypes = new Set();

        if (gameState.ownedClaimStakes) {
            Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
                if (claimStake.planetInstance) {
                    // Extract planet type from planet instance
                    planetTypes.add(claimStake.planetInstance);
                }
            });
        }

        if (requirement.target === 'all') {
            // Would need to count total available planet types from game data
            return planetTypes.size >= 6 ? 100 : (planetTypes.size / 6) * 100;
        }

        return Math.min(100, (planetTypes.size / requirement.target) * 100);
    }

    /**
     * Get all achievements with current progress
     * @returns {Object} All achievements with progress data
     */
    getAllAchievements() {
        const result = {};

        Object.entries(this.achievements).forEach(([category, achievements]) => {
            result[category] = {};
            Object.entries(achievements).forEach(([key, achievement]) => {
                result[category][key] = {
                    ...achievement,
                    progress: this.playerProgress[achievement.id] || { completed: false, progress: 0 }
                };
            });
        });

        return result;
    }

    /**
     * Get completed achievements count by category
     * @returns {Object} Completion counts by category
     */
    getCompletionStats() {
        const stats = {};

        Object.entries(this.achievements).forEach(([category, achievements]) => {
            const total = Object.keys(achievements).length;
            const completed = Object.values(achievements).filter(achievement =>
                this.playerProgress[achievement.id]?.completed
            ).length;

            stats[category] = { completed, total, percentage: (completed / total) * 100 };
        });

        return stats;
    }
}

export default new AchievementService(); 