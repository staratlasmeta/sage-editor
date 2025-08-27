export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'production' | 'crafting' | 'efficiency' | 'exploration' | 'mastery';
    hidden?: boolean;
    trackProgress?: boolean;  // Indicates if this achievement should track progress
    progressTarget?: number;  // The target number for progress tracking
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
    // Claim Stakes Achievements
    first_stake: {
        id: 'first_stake',
        name: 'Pioneer',
        description: 'Place your first claim stake',
        icon: '🏭',
        category: 'exploration'
    },
    multi_planet: {
        id: 'multi_planet',
        name: 'Multi-Planetary',
        description: 'Own claim stakes on 5 different planets',
        icon: '🌌',
        category: 'exploration',
        trackProgress: true,
        progressTarget: 5
    },
    efficient_builder: {
        id: 'efficient_builder',
        name: 'Efficient Builder',
        description: 'Place 5+ buildings in a single claim stake',
        icon: '📐',
        category: 'efficiency',
        trackProgress: true,
        progressTarget: 5
    },
    power_positive: {
        id: 'power_positive',
        name: 'Power Positive',
        description: 'Achieve 100+ MW surplus power',
        icon: '⚡',
        category: 'efficiency'
    },
    self_sufficient: {
        id: 'self_sufficient',
        name: 'Self Sufficient',
        description: 'Build a fuel processor and become fuel independent',
        icon: '⛽',
        category: 'mastery'
    },

    // Resource Production Achievements
    first_extraction: {
        id: 'first_extraction',
        name: 'First Extraction',
        description: 'Extract your first resource',
        icon: '⛏️',
        category: 'production'
    },
    million_units: {
        id: 'million_units',
        name: 'Million Unit Club',
        description: 'Produce 1,000,000 units of any resource',
        icon: '📊',
        category: 'production',
        trackProgress: true,
        progressTarget: 1000000
    },
    resource_mogul: {
        id: 'resource_mogul',
        name: 'Resource Mogul',
        description: 'Have 10,000+ units of 5 different resources',
        icon: '💎',
        category: 'production',
        trackProgress: true,
        progressTarget: 5
    },

    // Crafting Achievements
    first_craft: {
        id: 'first_craft',
        name: 'First Creation',
        description: 'Complete your first crafting job',
        icon: '🔨',
        category: 'crafting'
    },
    master_crafter: {
        id: 'master_crafter',
        name: 'Master Crafter',
        description: 'Craft a Tier 5 component',
        icon: '🏆',
        category: 'crafting'
    },
    speed_crafter: {
        id: 'speed_crafter',
        name: 'Speed Demon',
        description: 'Complete 10 crafting jobs within an hour',
        icon: '⚡',
        category: 'crafting'
    },
    production_line: {
        id: 'production_line',
        name: 'Production Line',
        description: 'Run 10 crafting jobs simultaneously',
        icon: '🏭',
        category: 'crafting',
        trackProgress: true,
        progressTarget: 10
    },

    // Efficiency Achievements
    optimizer: {
        id: 'optimizer',
        name: 'The Optimizer',
        description: 'Achieve 95% efficiency on any production chain',
        icon: '📈',
        category: 'efficiency'
    },
    perfect_balance: {
        id: 'perfect_balance',
        name: 'Perfect Balance',
        description: 'Balance all resource flows to net zero waste',
        icon: '⚖️',
        category: 'efficiency'
    },

    // Mastery Achievements
    starbase_commander: {
        id: 'starbase_commander',
        name: 'Starbase Commander',
        description: 'Upgrade starbase to Central Space Station',
        icon: '🚀',
        category: 'mastery'
    },
    industrial_empire: {
        id: 'industrial_empire',
        name: 'Industrial Empire',
        description: 'Own 10+ active claim stakes',
        icon: '🏛️',
        category: 'mastery',
        trackProgress: true,
        progressTarget: 10
    },
    recipe_master: {
        id: 'recipe_master',
        name: 'Recipe Master',
        description: 'Unlock and craft 100 different recipes',
        icon: '📜',
        category: 'mastery'
    }
};

export const ACHIEVEMENT_CATEGORIES = {
    production: { name: 'Production', icon: '⛏️', color: 'var(--status-success)' },
    crafting: { name: 'Crafting', icon: '🔨', color: 'var(--accent-blue)' },
    efficiency: { name: 'Efficiency', icon: '📈', color: 'var(--accent-gold)' },
    exploration: { name: 'Exploration', icon: '🌌', color: 'var(--accent-purple)' },
    mastery: { name: 'Mastery', icon: '🏆', color: 'var(--primary-orange)' }
}; 