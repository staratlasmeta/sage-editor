# SAGE C4 Integrated Tools - Complete System Documentation

## Executive Summary

This document provides comprehensive specifications for three integrated tools designed for the Star Atlas community to understand and master the C4 (Claim, Craft, Combat, Conquer) system. The tools are:

1. **Claim Stakes Simulator** (Enhanced Version) - Resource extraction and processing on planets
2. **Crafting Hab Tool** (New) - Starbase-based crafting operations
3. **Crafting Recipes Tool** (New) - Recipe visualization and optimization

All three tools integrate seamlessly within the SAGE Editor Suite, sharing resources, UI patterns, and save systems.

---

## Table of Contents

- [A. System Architecture](#a-system-architecture)
- [B. Shared Components](#b-shared-components)
- [C. Claim Stakes Simulator (Enhanced)](#c-claim-stakes-simulator-enhanced)
- [D. Crafting Hab Tool](#d-crafting-hab-tool)
- [E. Crafting Recipes Tool](#e-crafting-recipes-tool)
- [F. Integration Features](#f-integration-features)
- [G. UI/UX Specifications](#g-uiux-specifications)
- [H. Data Structures](#h-data-structures)
- [I. Implementation Roadmap](#i-implementation-roadmap)
- [J. System Scale & Content](#j-system-scale--content)
- [K. Starbase Mechanics](#k-starbase-mechanics)
- [L. Building System Details](#l-building-system-details)

---

## A. System Architecture

### A1. Technology Stack
```
Frontend Framework: React 18.x
Build System: Vite
Styling: CSS Modules + SAGE Design System
State Management: React Context + useReducer
Data Persistence: LocalStorage + JSON Export/Import
Visualization: Canvas API (recipes), React Components (UI)
```

### A2. Module Structure
```
sage-c4-tools/
├── shared/
│   ├── components/
│   │   ├── Navigation.jsx         [A2.1]
│   │   ├── ResourceDisplay.jsx    [A2.2]
│   │   ├── SaveLoadManager.jsx    [A2.3]
│   │   └── Notifications.jsx      [A2.4]
│   ├── services/
│   │   ├── DataLoader.js          [A2.5]
│   │   ├── SaveService.js         [A2.6]
│   │   └── ResourceTransfer.js    [A2.7]
│   └── styles/
│       └── sage-theme.css         [A2.8]
├── claim-stakes/
│   ├── components/                [See Section C]
│   └── services/
├── crafting-hab/
│   ├── components/                [See Section D]
│   └── services/
└── crafting-recipes/
    ├── components/                [See Section E]
    └── services/
```

### A3. Data Flow Architecture
```
JSON Data Files → Data Loader Service → React Context → Components
                                     ↓
                          Local State Management
                                     ↓
                        Save Service ← → LocalStorage
                                     ↓
                        Export/Import System

// A3.1 Data Loading Priority
const DATA_LOAD_SEQUENCE = [
  { file: 'cargo.json', required: true },
  { file: 'tags.json', required: true },
  { file: 'planetArchetypes.json', required: true },
  { file: 'claimStakeBuildings.json', required: true },
  { file: 'craftingHabBuildings.json', required: true },
  { file: 'recipes.csv', required: true },
  { file: 'mapDataSubset.json', required: false } // Simplified version
]

// A3.2 Fallback Data
const FALLBACK_DATA = {
  // Minimal data to ensure app works without full dataset
  planets: [/* 3 test planets */],
  buildings: [/* 5 basic buildings */],
  resources: [/* 10 core resources */]
}
```

### A4. Inter-Tool Communication
- **Resource Pipeline**: Claim Stakes → Starbase Inventory → Crafting Hab
- **Recipe Integration**: Crafting Recipes ← → Both Simulators
- **Shared State**: Global resource pools, achievements, progression

---

## B. Shared Components

### B1. Navigation System
```jsx
// Integrated navigation bar matching SAGE Editor Suite
<SAGENavigation>
  <ToolSelector activeeTool={currentTool}>
    <Tool id="claim-stakes" icon="🏭" label="Claim Stakes" />
    <Tool id="crafting-hab" icon="🔧" label="Crafting Hab" />
    <Tool id="recipes" icon="📋" label="Recipes" />
  </ToolSelector>
  <GlobalActions>
    <SaveButton />
    <LoadButton />
    <SettingsButton />
  </GlobalActions>
</SAGENavigation>
```

### B2. Resource Management System
```javascript
// Unified resource tracking across all tools
ResourceManager = {
  pools: {
    claimStakes: {},     // Resources at claim stakes
    starbase: {},        // Resources at starbases
    inTransit: {}        // Resources being transported
  },
  
  transfer(from, to, resource, amount) {},
  validate(location, requirements) {},
  optimize(recipe, available) {}
}
```

### B3. Achievement System
```javascript
// Shared progression tracking
Achievements = {
  categories: [
    "Production Milestones",
    "Efficiency Expert",
    "Master Crafter",
    "Supply Chain Guru"
  ],
  
  track(action, value) {},
  unlock(achievementId) {},
  getProgress(category) {}
}
```

### B4. Save/Load System
```javascript
// Unified save structure
SaveData = {
  version: "1.0.0",
  timestamp: Date.now(),
  
  claimStakes: {
    stakes: [],
    buildings: [],
    resources: {}
  },
  
  craftingHabs: {
    plots: [],
    stations: [],
    jobs: []
  },
  
  recipes: {
    favorites: [],
    history: [],
    customTrees: []
  },
  
  shared: {
    achievements: {},
    settings: {},
    starbaseInventory: {}
  }
}
```

---

## C. Claim Stakes Simulator (Enhanced)

### C1. Core Gameplay Loop
```
1. Browse Available Planets → 2. Purchase Claim Stake
          ↓                            ↓
3. Design Layout (Slot-Based) → 4. Place Buildings
          ↓                            ↓
5. Finalize Design → 6. Buildings Construct
          ↓                            ↓
7. Real-time Resource Flow → 8. Manage Multiple Stakes
          ↓                            ↓
9. Export to Starbase → 10. Optimize & Expand
```

### C2. UI Components

#### C2.1 Planet Selection Screen
```jsx
<PlanetBrowser>
  <FilterBar>
    <FactionFilter />         // MUD, ONI, UST
    <ResourceFilter />        // Filter by available resources
    <SearchBar />            // Search planets by name
  </FilterBar>
  
  <TierSelector>
    {/* Only shows tiers unlocked by starbase level */}
    <TierButton tier={1} enabled={starbaseLevel >= 0} />
    <TierButton tier={2} enabled={starbaseLevel >= 1} />
    <TierButton tier={3} enabled={starbaseLevel >= 2} />
    <TierButton tier={4} enabled={starbaseLevel >= 3} />
    <TierButton tier={5} enabled={starbaseLevel >= 4} />
  </TierSelector>
  
  <PlanetList>
    {planets.map(planet => (
      <PlanetCard>
        <PlanetIcon />
        <PlanetName />
        <FactionBadge />
        <RentCost />         // ATLAS/day
        <ResourceBadges />   // Available resources
      </PlanetCard>
    ))}
  </PlanetList>
  
  <ClaimStakeInstances>
    {/* List of all active claim stakes */}
    <InstanceCard>
      <PlanetName />
      <TierBadge />
      <PowerStatus />      // Net power balance
      <CrewCount />
      <Status />          // Active/Design/Stopped
    </InstanceCard>
  </ClaimStakeInstances>
</PlanetBrowser>
```

#### C2.2 Claim Stake Manager
```jsx
<ClaimStakeManager>
  <ManagerHeader>
    <StakeName />           // Planet - Tier X
    <QuickStats>
      <PowerBalance />      // Must be ≥ 0
      <SlotUsage />        // Used/Max slots
      <CrewRequired />
      <Efficiency />
    </QuickStats>
  </ManagerHeader>
  
  <BuildingManagement>
    <CurrentBuildings>
      {/* Simple list of placed buildings */}
      {buildings.map(building => (
        <BuildingCard>
          <BuildingIcon />
          <BuildingName />
          <TierIndicator />
          <SlotCost />      // e.g., 20 slots for T5
          <PowerDraw />     // + for generators, - for consumers
          <CrewNeeded />
          <ActiveStatus />  // Green if running, red if stopped
          <RemoveButton />  // Only in design mode
        </BuildingCard>
      ))}
    </CurrentBuildings>
    
    <AvailableBuildings>
      {/* Only shown in design mode */}
      <CategoryFilter />
      <BuildingGrid>
        {availableBuildings.map(building => (
          <AddBuildingCard>
            <BuildingPreview />
            <SlotRequirement />
            <ClickToAdd />
          </AddBuildingCard>
        ))}
      </BuildingGrid>
    </AvailableBuildings>
    
    <ResourceStorage>
      {/* Current resources in claim stake storage */}
      <ResourceList />
      <MagicResourceButton />  // Simulator feature
    </ResourceStorage>
  </BuildingManagement>
  
  <ActionButtons>
    <FinalizeDesign />      // Start construction
    <Redesign />           // Modify existing stake
    <DeconstructAll />     // 50% material refund
  </ActionButtons>
</ClaimStakeManager>
```

#### C2.3 Production Overview (Right Sidebar)
```jsx
<ProductionOverview>
  <ResourceFlow>
    {/* Real-time per-second calculations */}
    {resources.map(resource => (
      <ResourceFlowItem>
        <ResourceName />
        <Production />      // +X/s
        <Consumption />     // -Y/s
        <NetFlow />        // Total/s (colored)
      </ResourceFlowItem>
    ))}
  </ResourceFlow>
  
  <AggregateView>
    {/* Total across all claim stakes */}
    <TotalProduction />
    <ActiveStakes />
    <NetResourceFlow />
  </AggregateView>
  
  <Tips>
    <Tip>Keep power positive or everything stops</Tip>
    <Tip>Central hub needs fuel to run</Tip>
    <Tip>T3+ can build fuel processors</Tip>
    <Tip>Deconstruct for 50% materials back</Tip>
  </Tips>
</ProductionOverview>
```

### C3. Game Mechanics

#### C3.1 Slot-Based Building System
```javascript
const SlotSystem = {
  // No spatial layout - just total slots
  calculateMaxSlots(tier) {
    // Simplified example - actual values from game data
    return tier * 20; // T1=20, T2=40, T3=60, T4=80, T5=100
  },
  
  canAddBuilding(currentSlots, buildingSlots, maxSlots) {
    return currentSlots + buildingSlots <= maxSlots;
  },
  
  // Buildings can require many slots
  buildingSlotExamples: {
    'central-hub-t1': 5,
    'central-hub-t5': 15,
    'processor-t5': 20,
    'storage-hub-t5': 25
  }
}
```

#### C3.2 Real-Time Resource Simulation
```javascript
const ResourceSimulation = {
  tickRate: 1000, // 1 second
  
  simulateTick(claimStake, deltaTime) {
    const resources = {...claimStake.resources};
    let allSystemsGo = true;
    
    // Phase 1: Check if we can run
    // Check fuel for central hub
    if (resources.fuel <= 0) {
      allSystemsGo = false; // No fuel = everything stops
    }
    
    // Check power balance
    const powerBalance = this.calculatePowerBalance(claimStake.buildings);
    if (powerBalance < 0) {
      allSystemsGo = false; // Negative power = everything stops
    }
    
    // Check resource requirements for each building
    claimStake.buildings.forEach(building => {
      if (building.resourceUsage) {
        for (const [resource, rate] of Object.entries(building.resourceUsage)) {
          if (resources[resource] < rate * deltaTime) {
            // This specific building stops, but others may continue
            building.isActive = false;
          }
        }
      }
    });
    
    // Phase 2: Produce/consume if systems are go
    if (allSystemsGo) {
      claimStake.buildings.forEach(building => {
        if (!building.isActive) return;
        
        // Consume resources
        if (building.resourceUsage) {
          for (const [resource, rate] of Object.entries(building.resourceUsage)) {
            resources[resource] -= rate * deltaTime;
          }
        }
        
        // Produce resources
        if (building.resourceProduction) {
          for (const [resource, rate] of Object.entries(building.resourceProduction)) {
            resources[resource] += rate * deltaTime;
          }
        }
        
        // Extract from planet (with richness modifier)
        if (building.extractionRate) {
          const planetRichness = this.getPlanetRichness(claimStake.planetId);
          for (const [resource, rate] of Object.entries(building.extractionRate)) {
            resources[resource] += rate * planetRichness * deltaTime;
          }
        }
      });
    }
    
    return { resources, systemsActive: allSystemsGo };
  }
}
```

#### C3.3 Building Dependencies
```javascript
const BuildingDependencies = {
  // Power generation vs consumption
  powerBuildings: {
    generators: ['central-hub', 'power-plant', 'solar-array'],
    consumers: ['extractor', 'processor', 'storage'] // Everything else
  },
  
  // Fuel requirement
  fuelConsumers: ['central-hub', 'power-plant'],
  
  // Self-sustaining at T3+
  fuelProducers: {
    'fuel-processor': {
      minTier: 3,
      input: { hydrogen: 2 },
      output: { fuel: 1 }
    }
  },
  
  // Building stops if missing inputs
  processingChains: {
    'copper-processor': {
      input: { 'copper-ore': 1 },
      output: { 'copper': 1 }
    },
    'steel-processor': {
      input: { 'iron-ore': 2, 'coal': 1 },
      output: { 'steel': 1 }
    }
  }
}
```

#### C3.4 Multiple Stake Management
```javascript
const MultiStakeManager = {
  // Player can own multiple claim stakes
  claimStakes: [],
  
  // Switch between stakes easily
  setActiveStake(stakeId) {
    this.activeStakeId = stakeId;
    this.refreshUI();
  },
  
  // Aggregate production view
  calculateTotalProduction() {
    const totals = {};
    
    this.claimStakes.forEach(stake => {
      if (!stake.isFinalized) return;
      
      const flow = this.calculateResourceFlow(stake);
      for (const [resource, net] of Object.entries(flow)) {
        totals[resource] = (totals[resource] || 0) + net;
      }
    });
    
    return totals;
  },
  
  // Deconstruction with refund
  deconstructBuilding(stakeId, buildingId) {
    const building = this.getBuilding(buildingId);
    const refund = {};
    
    // 50% material refund
    for (const [material, cost] of Object.entries(building.constructionCost)) {
      refund[material] = Math.floor(cost * 0.5);
    }
    
    // Add to starbase inventory
    this.addToInventory(refund);
    
    // Remove building
    this.removeBuilding(stakeId, buildingId);
  }
}
```

### C4. Gamification Elements

#### C4.1 Visual Feedback
```javascript
const VisualFeedback = {
  // Building status indicators
  buildingStates: {
    active: { border: 'green', glow: true, animation: 'pulse' },
    stopped: { border: 'red', glow: false, animation: 'none' },
    constructing: { border: 'yellow', glow: true, animation: 'build' }
  },
  
  // Resource flow animation
  resourceFlow: {
    positive: { color: 'green', direction: 'up' },
    negative: { color: 'red', direction: 'down' },
    neutral: { color: 'gray', direction: 'none' }
  },
  
  // Achievement unlocks
  achievementPopup: {
    duration: 3000,
    animation: 'slideInBounce',
    sound: 'achievement.mp3'
  }
}
```

#### C4.2 Progression Milestones
```javascript
const Milestones = {
  stakes: [
    { count: 1, achievement: 'First Stake', reward: 'Title: Pioneer' },
    { count: 5, achievement: 'Multi-Planet', reward: 'Title: Expansionist' },
    { count: 10, achievement: 'Empire Builder', reward: 'Title: Tycoon' }
  ],
  
  production: [
    { resource: 'any', amount: 1000, achievement: 'Getting Started' },
    { resource: 'any', amount: 1000000, achievement: 'Mass Production' },
    { resource: 'fuel', amount: 10000, achievement: 'Self Sufficient' }
  ],
  
  efficiency: [
    { percent: 90, achievement: 'Optimized' },
    { percent: 95, achievement: 'Peak Performance' },
    { percent: 100, achievement: 'Perfect Balance' }
  ]
}
```

### C5. Integration Features

#### C5.1 Resource Export
```javascript
const ResourceExport = {
  // Export to starbase inventory
  exportResources(claimStakeId, resources) {
    const stake = this.getClaimStake(claimStakeId);
    const starbase = this.getStarbase(stake.starbaseId);
    
    // Validate available resources
    for (const [resource, amount] of Object.entries(resources)) {
      if (stake.resources[resource] < amount) {
        throw new Error(`Insufficient ${resource}`);
      }
    }
    
    // Transfer resources
    for (const [resource, amount] of Object.entries(resources)) {
      stake.resources[resource] -= amount;
      starbase.inventory[resource] = (starbase.inventory[resource] || 0) + amount;
    }
    
    // Achievement check
    this.checkExportAchievements(resources);
  }
}
```

#### C5.2 Quick Actions
```javascript
const QuickActions = {
  // Magic resources for testing
  addMagicResources(claimStakeId) {
    const stake = this.getClaimStake(claimStakeId);
    
    // Add common resources
    stake.resources.fuel = (stake.resources.fuel || 0) + 100;
    stake.resources['iron-ore'] = (stake.resources['iron-ore'] || 0) + 100;
    stake.resources['copper-ore'] = (stake.resources['copper-ore'] || 0) + 100;
    
    // Visual feedback
    this.showNotification('Resources added! 🪄', 'success');
  },
  
  // Quick balance check
  validateDesign(buildings) {
    const stats = {
      power: 0,
      crew: 0,
      fuelConsumption: 0,
      canSelfSustain: false
    };
    
    buildings.forEach(building => {
      stats.power += building.power || 0;
      stats.crew += building.crew || 0;
      
      if (building.id.includes('fuel-processor')) {
        stats.canSelfSustain = true;
      }
    });
    
    return {
      ...stats,
      isValid: stats.power >= 0,
      warnings: this.getDesignWarnings(stats)
    };
  }
}
```

---

## D. Crafting Hab Tool

### D1. Core Mechanics
```
1. Select Starbase → 2. View Available Plots (by Tier)
        ↓                    ↓
3. Rent Plot → 4. Select Hab Tier (T1-T5)
        ↓                    ↓
5. Add Crafting Stations → 6. Add Cargo Storage
        ↓                    ↓
7. Finalize Design → 8. Select Recipes
        ↓                    ↓
9. Start Crafting Jobs → 10. Collect Output
```

### D2. UI Components

#### D2.1 Starbase Overview
```jsx
<StarbaseView>
  <StarbaseSelector>
    {starbases.map(starbase => (
      <StarbaseCard>
        <StarbaseName />
        <FactionBadge />
        <StarbaseLevel />    // Shows level 0-6
        <LevelName />       // Outpost to CSS
      </StarbaseCard>
    ))}
  </StarbaseSelector>
  
  <PlotGrid>
    {/* Plots generated based on STARBASE_LEVELS */}
    {generatePlots(starbaseLevel).map(plot => (
      <PlotTile>
        <TierIndicator />     // T1-T5
        <PlotStatus />       // Available/Rented/Active
        <RentCost />        // ATLAS/day
        <RentButton />      // Only if available
      </PlotTile>
    ))}
  </PlotGrid>
  
  <StarbaseInventory>
    <ResourceList>
      {/* Shared inventory from SharedStateContext */}
      {inventory.map(([resource, amount]) => (
        <ResourceItem>
          <ResourceName />
          <Amount />
        </ResourceItem>
      ))}
    </ResourceList>
    <MagicResourceButton />  // Simulator feature
  </StarbaseInventory>
</StarbaseView>
```

#### D2.2 Hab Designer
```jsx
<HabDesigner>
  <DesignHeader>
    <PlotInfo>T{tier} Plot</PlotInfo>
    <DesignMode>{isDesigning ? 'Design Mode' : 'Active'}</DesignMode>
  </DesignHeader>
  
  <CurrentDesign>
    <BuildingList>
      {buildings.map(building => (
        <HabBuildingCard>
          <BuildingType />     // hab/crafting-station/cargo
          <BuildingName />     // e.g., "Hab T3"
          <BuildingSize />     // XXS/XS/S/M for stations
          <RemoveButton />     // Only in design mode
        </HabBuildingCard>
      ))}
    </BuildingList>
    
    <DesignStats>
      <SlotUsage>{used}/{total} slots</SlotUsage>
      <JobSlots>{totalJobSlots} jobs</JobSlots>
      <CraftingSpeed>{speed}% speed</CraftingSpeed>
    </DesignStats>
  </CurrentDesign>
  
  <AvailableBuildings>
    {/* Only shown in design mode */}
    <BuildingCategory name="Hab">
      {/* Must select hab first, only one allowed */}
      {habTiers.filter(tier <= plotTier).map(hab => (
        <BuildingOption onClick={addHab}>
          <HabName />
          <SlotCount />
        </BuildingOption>
      ))}
    </BuildingCategory>
    
    <BuildingCategory name="Crafting Stations">
      {/* Multiple allowed, stack bonuses */}
      {stations.map(station => (
        <BuildingOption 
          onClick={addStation}
          disabled={slotsRemaining < 1}
        >
          <StationSize />     // XXS/XS/S/M
          <SpeedBonus />      // +10%, +20%, etc.
          <JobSlots />        // +1, +2, +3, +5
        </BuildingOption>
      ))}
    </BuildingCategory>
    
    <BuildingCategory name="Cargo Storage">
      {/* Tier-limited, adds job slots */}
      {cargoStorage.filter(tier <= plotTier).map(cargo => (
        <BuildingOption 
          onClick={addCargo}
          disabled={slotsRemaining < 1}
        >
          <StorageTier />     // T1-T5
          <JobSlotBonus />    // +1 to +5 jobs
        </BuildingOption>
      ))}
    </BuildingCategory>
  </AvailableBuildings>
  
  <ActionButtons>
    <CancelButton />          // Discard changes
    <FinalizeButton />        // Confirm design
  </ActionButtons>
</HabDesigner>
```

#### D2.3 Crafting Interface
```jsx
<CraftingInterface>
  <RecipeSelection>
    <Filters>
      <CategoryFilter>       // Component/Module/Consumable
        <Option value="all" />
        <Option value="component" />
        <Option value="module" />
        <Option value="consumable" />
      </CategoryFilter>
      <SearchBar placeholder="Search recipes..." />
    </Filters>
    
    <RecipeGrid>
      {recipes.map(recipe => (
        <RecipeCard 
          onClick={selectRecipe}
          disabled={!hasResources(recipe)}
        >
          <RecipeName />
          <RecipeTier />
          <Ingredients>
            {recipe.ingredients.map(ing => (
              <Ingredient>
                {ing.quantity} {ing.resource}
              </Ingredient>
            ))}
          </Ingredients>
          <Output>
            → {recipe.output.quantity} {recipe.output.resource}
          </Output>
        </RecipeCard>
      ))}
    </RecipeGrid>
  </RecipeSelection>
  
  <CraftControls>
    <SelectedRecipe>{recipe.name}</SelectedRecipe>
    <QuantitySelector>
      <Label>Quantity:</Label>
      <Input type="number" min="1" max="100" />
    </QuantitySelector>
    <CraftSummary>
      <Time>Time: {totalTime}s</Time>
      <Output>Output: {totalOutput} {resource}</Output>
    </CraftSummary>
    <StartCraftingButton />
  </CraftControls>
</CraftingInterface>

<JobQueue>
  <ActiveJobs>
    {jobs.map(job => (
      <JobCard status={job.status}>
        <JobHeader>
          <RecipeName />
          <Quantity>×{job.quantity}</Quantity>
        </JobHeader>
        <PlotInfo>Plot T{plot.tier}</PlotInfo>
        <ProgressBar>
          <ProgressFill width={job.progress} />
        </ProgressBar>
        <JobStatus>
          {job.status === 'active' && `${progress}%`}
          {job.status === 'completed' && 'Complete'}
        </JobStatus>
        {job.status === 'completed' && <CollectButton />}
      </JobCard>
    ))}
  </ActiveJobs>
  
  <OutputSummary>
    <RecentOutput>
      {completedJobs.slice(-5).map(job => (
        <OutputItem>
          {job.output.quantity} {job.output.resource}
        </OutputItem>
      ))}
    </RecentOutput>
  </OutputSummary>
</JobQueue>
```

### D3. Crafting Mechanics

#### D3.1 Plot & Building System
```javascript
const PlotSystem = {
  // Plots available based on starbase level
  generatePlots(starbaseLevel) {
    const levelData = STARBASE_LEVELS[starbaseLevel];
    const plots = [];
    
    // Generate plots for each tier
    Object.entries(levelData.habPlotsByTier).forEach(([tier, count]) => {
      for (let i = 0; i < count; i++) {
        plots.push({
          id: `plot_${starbaseId}_t${tier}_${i}`,
          tier: parseInt(tier),
          rentCost: tier * 100, // Scales with tier
          isRented: false
        });
      }
    });
    
    return plots;
  },
  
  // Building slot calculation
  calculateSlots(buildings) {
    let totalSlots = 0;
    let usedSlots = 0;
    
    buildings.forEach(building => {
      if (building.type === 'hab') {
        // Hab determines total slots
        totalSlots = HAB_SLOTS[building.tier]; // 10, 15, 20, 25, 30
      } else {
        // Other buildings use 1 slot each
        usedSlots += 1;
      }
    });
    
    return { totalSlots, usedSlots, remaining: totalSlots - usedSlots };
  }
}
```

#### D3.2 Job Management System
```javascript
const CraftingJobSystem = {
  // Start a new crafting job
  startJob(recipe, quantity, habPlot, starbaseInventory) {
    // Validate resources
    const resourceCheck = this.validateResources(recipe, quantity, starbaseInventory);
    if (!resourceCheck.valid) {
      throw new Error('Insufficient resources');
    }
    
    // Consume resources immediately
    this.consumeResources(recipe, quantity, starbaseInventory);
    
    // Calculate crafting time with speed bonus
    const baseTime = recipe.constructionTime * quantity;
    const speedMultiplier = habPlot.design.craftingSpeed; // From stations
    const totalTime = baseTime / speedMultiplier;
    
    // Create job
    return {
      id: generateId(),
      recipeId: recipe.id,
      habPlotId: habPlot.id,
      quantity: quantity,
      progress: 0,
      totalTime: totalTime,
      startTime: Date.now(),
      status: 'active',
      output: {
        resource: recipe.output.resource,
        quantity: recipe.output.quantity * quantity
      }
    };
  },
  
  // Real-time job simulation
  updateJobs(jobs, deltaTime) {
    return jobs.map(job => {
      if (job.status !== 'active') return job;
      
      const elapsed = (Date.now() - job.startTime) / 1000;
      const progress = Math.min(100, (elapsed / job.totalTime) * 100);
      
      if (progress >= 100) {
        // Job complete
        return { ...job, progress: 100, status: 'completed' };
      }
      
      return { ...job, progress };
    });
  },
  
  // Collect completed job
  collectJob(job, starbaseInventory) {
    if (job.status !== 'completed') return;
    
    // Add output to inventory
    starbaseInventory[job.output.resource] = 
      (starbaseInventory[job.output.resource] || 0) + job.output.quantity;
    
    // Remove job from queue
    return true;
  }
}
```

#### D3.3 Hab Bonus Calculations
```javascript
const HabBonusSystem = {
  // Calculate total bonuses from buildings
  calculateBonuses(buildings) {
    const bonuses = {
      craftingSpeed: 1.0,
      jobSlots: 0,
      efficiency: 1.0,
      unlockedRecipes: []
    };
    
    buildings.forEach(building => {
      switch (building.type) {
        case 'crafting-station':
          // Speed stacks multiplicatively
          bonuses.craftingSpeed *= STATION_SPEED[building.size];
          // Job slots stack additively
          bonuses.jobSlots += STATION_SLOTS[building.size];
          break;
          
        case 'cargo-storage':
          // Additional job slots from cargo
          bonuses.jobSlots += CARGO_JOB_SLOTS[building.tier];
          break;
          
        case 'landing-pad':
          // Future: import/export bonuses
          break;
      }
    });
    
    return bonuses;
  },
  
  // Station bonuses by size
  STATION_SPEED: {
    'XXS': 1.0,  // No bonus
    'XS': 1.1,   // +10%
    'S': 1.2,    // +20%
    'M': 1.3     // +30%
  },
  
  STATION_SLOTS: {
    'XXS': 1,
    'XS': 2,
    'S': 3,
    'M': 5
  }
}
```

### D4. Integration Features

#### D4.1 Starbase Inventory Management
```javascript
const InventoryIntegration = {
  // Uses SharedStateContext for inventory
  getStarbaseInventory(starbaseId) {
    return sharedState.starbaseInventory;
  },
  
  // Add resources (from claim stakes or magic)
  addResources(resources) {
    addToInventory(resources);
    showNotification('Resources added to starbase');
  },
  
  // Consume for crafting
  consumeResources(resources) {
    consumeFromInventory(resources);
  },
  
  // Check availability
  hasResources(recipe, quantity) {
    const inventory = this.getStarbaseInventory();
    return recipe.ingredients.every(ing => 
      (inventory[ing.resource] || 0) >= ing.quantity * quantity
    );
  }
}
```

#### D4.2 Simplified Crew System
```javascript
const CrewSystem = {
  // Auto-fill crew slots
  mode: 'automatic',
  
  calculateCrewForJob(recipe, habPlot) {
    // Base crew requirement from recipe
    const baseCrew = recipe.crewRequired || 10;
    
    // Modified by hab buildings (future feature)
    const crewMultiplier = 1.0;
    
    return Math.ceil(baseCrew * crewMultiplier);
  },
  
  // No manual crew management needed
  assignCrew(job) {
    job.crewAssigned = this.calculateCrewForJob(job.recipe, job.habPlot);
    return true; // Always succeeds in simulator
  }
}
```

#### D4.3 Achievement Integration
```javascript
const CraftingAchievements = {
  checkAchievements(action, data) {
    switch (action) {
      case 'rent_first_plot':
        unlockAchievement('first_hab_plot', 'Rented your first Crafting Hab plot');
        break;
        
      case 'complete_first_craft':
        unlockAchievement('first_craft_complete', 'Completed your first crafting job');
        updateStatistic('totalCrafts', 1);
        break;
        
      case 'craft_tier5':
        if (data.recipe.tier === 5) {
          unlockAchievement('master_crafter', 'Crafted a Tier 5 component');
        }
        break;
        
      case 'simultaneous_jobs':
        if (data.activeJobs >= 10) {
          unlockAchievement('production_line', 'Run 10 crafting jobs simultaneously');
        }
        break;
    }
  }
}
```

---

## E. Crafting Recipes Tool

### E1. Core Features
```
1. Recipe Search & Filter → 2. Select Target Recipe
          ↓                            ↓
3. Interactive Tree View → 4. Analyze Dependencies
          ↓                            ↓
5. Calculate Requirements → 6. Check Inventory
          ↓                            ↓
7. Optimize Path → 8. Export to Crafting Queue
```

### E2. UI Components

#### E2.1 Recipe Browser
```jsx
<RecipeBrowser>
  <SearchSection>
    <SearchInput placeholder="Search recipes..." />
  </SearchSection>
  
  <Filters>
    <TierFilter>
      <Option value="all">All Tiers</Option>
      <Option value="1">Tier 1</Option>
      {/* ... through Tier 5 */}
    </TierFilter>
    
    <TypeFilter>
      <Option value="all">All Types</Option>
      <Option value="component">Components</Option>
      <Option value="module">Modules</Option>
      <Option value="consumable">Consumables</Option>
      <Option value="ship">Ship Parts</Option>
    </TypeFilter>
  </Filters>
  
  <RecipeList>
    {recipes.map(recipe => (
      <RecipeListItem 
        selected={isSelected}
        insufficient={!hasIngredients}
      >
        <RecipeHeader>
          <RecipeName />
          <TierBadge>T{tier}</TierBadge>
        </RecipeHeader>
        
        <RecipeQuickInfo>
          <RecipeType />
          <CraftTime />
        </RecipeQuickInfo>
        
        <RecipeIO>
          <Inputs>
            {ingredients.map(ing => (
              <IngredientChip>
                {ing.quantity} {ing.resource}
              </IngredientChip>
            ))}
          </Inputs>
          <Arrow>→</Arrow>
          <Output>
            <OutputChip>
              {output.quantity} {output.resource}
            </OutputChip>
          </Output>
        </RecipeIO>
      </RecipeListItem>
    ))}
  </RecipeList>
</RecipeBrowser>
```

#### E2.2 Tree Visualization
```jsx
<TreeVisualizer>
  <VisualizationHeader>
    <RecipeTitle>{recipe.name} - Recipe Tree</RecipeTitle>
    <ViewControls>
      <ViewButton mode="simple">Simple</ViewButton>
      <ViewButton mode="detailed">Detailed</ViewButton>
      <ViewButton mode="efficiency">Efficiency</ViewButton>
    </ViewControls>
  </VisualizationHeader>
  
  <RecipeTreeCanvas 
    width={800} 
    height={600}
    onMouseMove={handleNodeHover}
  >
    {/* Rendered with Canvas API */}
    <TreeNodes>
      {/* Hierarchical node layout */}
      <Node>
        <NodeIcon>T{tier}</NodeIcon>
        <NodeName>{recipe.name}</NodeName>
        <NodeQuantity>×{quantity}</NodeQuantity>
      </Node>
    </TreeNodes>
    
    <Connections>
      {/* Bezier curves between nodes */}
      <CurvedLine from={parent} to={child} />
      <ArrowHead />
    </Connections>
  </RecipeTreeCanvas>
  
  <QuantityControl>
    <Label>Target Quantity:</Label>
    <Input type="number" min="1" max="1000" />
  </QuantityControl>
</TreeVisualizer>
```

#### E2.3 Analysis Dashboard
```jsx
<AnalysisDashboard>
  <ResourceRequirements>
    <SectionTitle>Raw Materials Needed</SectionTitle>
    {totalResources.map(([resource, amount]) => (
      <RequirementItem>
        <ResourceName>{resource}</ResourceName>
        <RequirementAmounts>
          <Required sufficient={hasEnough}>
            {amount}
          </Required>
          <Available>/ {inventory[resource]}</Available>
        </RequirementAmounts>
      </RequirementItem>
    ))}
  </ResourceRequirements>
  
  <TimeAnalysis>
    <TimeBreakdown>
      <TimeStat>
        <Label>Total Time:</Label>
        <Value>{totalTime}s</Value>
      </TimeStat>
      <TimeStat>
        <Label>With Bonuses:</Label>
        <Value>{totalTime * 0.8}s</Value>
      </TimeStat>
    </TimeBreakdown>
  </TimeAnalysis>
  
  <EfficiencyMetrics>
    <EfficiencyMeter>
      <EfficiencyFill width={efficiency} />
    </EfficiencyMeter>
    <EfficiencyValue>{efficiency}%</EfficiencyValue>
  </EfficiencyMetrics>
  
  <OptimizationTips>
    <Tip>Build multiple stations for parallel production</Tip>
    <Tip>Stockpile intermediate components</Tip>
    <Tip>Use T{tier} crafting stations for speed bonus</Tip>
  </OptimizationTips>
  
  <ActionButtons>
    <ExportToQueueButton />
    <SaveBuildPlanButton />
  </ActionButtons>
</AnalysisDashboard>
```

### E3. Visualization Engine

#### E3.1 Tree Building System
```javascript
const RecipeTreeBuilder = {
  // Build hierarchical tree from recipe
  buildTree(recipeId, depth = 0, visited = new Set()) {
    if (visited.has(recipeId) || depth > 5) return null;
    visited.add(recipeId);
    
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return null;
    
    const children = [];
    
    // Find producer recipes for each ingredient
    recipe.ingredients.forEach(ingredient => {
      const producer = recipes.find(r => 
        r.output.resource === ingredient.resource
      );
      if (producer) {
        const child = buildTree(producer.id, depth + 1, new Set(visited));
        if (child) children.push(child);
      }
    });
    
    return {
      id: recipeId,
      recipe,
      children,
      depth,
      x: 0, // Calculated by layout algorithm
      y: 0
    };
  },
  
  // Calculate node positions
  calculateLayout(root, canvasWidth, canvasHeight) {
    const levelHeight = 120;
    const nodesByLevel = new Map();
    
    // Group nodes by depth level
    const collectNodes = (node) => {
      if (!nodesByLevel.has(node.depth)) {
        nodesByLevel.set(node.depth, []);
      }
      nodesByLevel.get(node.depth).push(node);
      node.children.forEach(collectNodes);
    };
    
    collectNodes(root);
    
    // Position nodes horizontally at each level
    nodesByLevel.forEach((nodes, level) => {
      const levelWidth = canvasWidth / (nodes.length + 1);
      nodes.forEach((node, index) => {
        node.x = levelWidth * (index + 1);
        node.y = canvasHeight - (level + 1) * levelHeight;
      });
    });
  }
}
```

#### E3.2 Canvas Rendering
```javascript
const TreeRenderer = {
  // Main render function
  render(ctx, tree, viewMode, hoveredNode) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw connections first (behind nodes)
    this.drawConnections(ctx, tree, viewMode);
    
    // Draw nodes
    this.drawNodes(ctx, tree, viewMode, hoveredNode);
  },
  
  // Draw curved connections between nodes
  drawConnections(ctx, node, viewMode) {
    node.children.forEach(child => {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      
      // Bezier curve
      const controlY = (node.y + child.y) / 2;
      ctx.bezierCurveTo(
        node.x, controlY,
        child.x, controlY,
        child.x, child.y
      );
      
      // Style based on view mode
      ctx.strokeStyle = viewMode === 'efficiency' 
        ? `rgba(0, 200, 150, ${0.3 + node.depth * 0.15})`
        : 'rgba(255, 107, 53, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw arrow head
      this.drawArrow(ctx, child.x, child.y, controlY);
      
      // Recursive draw children
      this.drawConnections(ctx, child, viewMode);
    });
  },
  
  // Draw interactive nodes
  drawNodes(ctx, node, viewMode, hoveredNode) {
    const isHovered = hoveredNode === node.id;
    const radius = 40 + (isHovered ? 5 : 0);
    
    // Node background with gradient
    const gradient = ctx.createRadialGradient(
      node.x, node.y, 0, 
      node.x, node.y, radius
    );
    gradient.addColorStop(0, `rgba(255, 107, 53, ${isHovered ? 0.9 : 0.7})`);
    gradient.addColorStop(1, `rgba(255, 107, 53, ${isHovered ? 0.5 : 0.3})`);
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#FF6B35' : 'rgba(255, 107, 53, 0.8)';
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();
    
    // Node content
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`T${node.recipe.tier}`, node.x, node.y - 10);
    
    ctx.font = '12px Exo 2';
    ctx.fillText(node.recipe.name, node.x, node.y + 10);
    
    if (viewMode === 'detailed') {
      ctx.font = '10px Exo 2';
      ctx.fillStyle = '#00C896';
      ctx.fillText(`×${node.recipe.output.quantity}`, node.x, node.y + 25);
    }
    
    // Recursive draw children
    node.children.forEach(child => this.drawNodes(ctx, child, viewMode, hoveredNode));
  }
}
```

#### E3.3 Interaction System
```javascript
const InteractionManager = {
  // Handle mouse movement for hover effects
  handleMouseMove(canvas, tree, mouseX, mouseY) {
    let hoveredNode = null;
    
    const checkNode = (node) => {
      const distance = Math.sqrt(
        Math.pow(mouseX - node.x, 2) + 
        Math.pow(mouseY - node.y, 2)
      );
      
      if (distance < 40) {
        hoveredNode = node.id;
      }
      
      node.children.forEach(checkNode);
    };
    
    checkNode(tree);
    return hoveredNode;
  },
  
  // Handle node clicks (future feature)
  handleClick(node) {
    // Show detailed recipe info
    // Highlight path to root
    // Display alternatives
  }
}
```

### E4. Analysis Features

#### E4.1 Path Analysis
```javascript
const PathAnalyzer = {
  // Calculate total requirements and time
  analyzePath(recipe, targetQuantity) {
    const totalResources = {};
    const criticalPath = [];
    let totalTime = 0;
    let maxDepth = 0;
    
    const analyze = (r, qty, depth = 0) => {
      const multiplier = qty / r.output.quantity;
      totalTime += r.constructionTime * multiplier;
      criticalPath.push(r.id);
      maxDepth = Math.max(maxDepth, depth);
      
      r.ingredients.forEach(ing => {
        const requiredQty = ing.quantity * multiplier;
        
        // Find producer recipe
        const producer = recipes.find(rec => 
          rec.output.resource === ing.resource
        );
        
        if (producer) {
          // Recursive analysis
          analyze(producer, requiredQty, depth + 1);
        } else {
          // Raw material - accumulate
          totalResources[ing.resource] = 
            (totalResources[ing.resource] || 0) + requiredQty;
        }
      });
    };
    
    analyze(recipe, targetQuantity);
    
    return {
      totalTime,
      totalResources,
      criticalPath,
      efficiency: Math.min(100, 100 - (maxDepth * 5))
    };
  }
}
```

#### E4.2 Inventory Integration
```javascript
const InventoryChecker = {
  // Check against starbase inventory
  checkRequirements(requirements, inventory) {
    const result = {
      canCraft: true,
      missing: {},
      sufficient: {}
    };
    
    Object.entries(requirements).forEach(([resource, needed]) => {
      const available = inventory[resource] || 0;
      
      if (available >= needed) {
        result.sufficient[resource] = {
          needed: Math.ceil(needed),
          available
        };
      } else {
        result.canCraft = false;
        result.missing[resource] = {
          needed: Math.ceil(needed),
          available,
          shortfall: Math.ceil(needed - available)
        };
      }
    });
    
    return result;
  },
  
  // Highlight insufficient ingredients in UI
  markInsufficient(recipes, inventory) {
    return recipes.map(recipe => ({
      ...recipe,
      hasIngredients: recipe.ingredients.every(ing =>
        (inventory[ing.resource] || 0) >= ing.quantity
      )
    }));
  }
}
```

#### E4.3 Optimization Engine
```javascript
const OptimizationEngine = {
  // Generate optimization suggestions
  generateTips(recipe, analysis) {
    const tips = [];
    
    // Parallel production tip
    if (analysis.totalTime > 300) {
      tips.push(`Build multiple ${recipe.name} stations for parallel production`);
    }
    
    // Intermediate stockpiling
    if (analysis.criticalPath.length > 3) {
      tips.push('Stockpile intermediate components');
    }
    
    // Tier-specific tips
    tips.push(`Use T${recipe.tier} crafting stations for speed bonus`);
    
    // Batch size optimization
    if (recipe.output.quantity > 1) {
      const optimalBatch = Math.ceil(100 / recipe.output.quantity);
      tips.push(`Optimal batch size: ${optimalBatch} crafts`);
    }
    
    return tips;
  },
  
  // Find alternative paths (future feature)
  findAlternatives(targetResource) {
    return recipes.filter(r => r.output.resource === targetResource);
  }
}
```

### E5. Integration Features

#### E5.1 Export to Crafting Queue
```javascript
const QueueExporter = {
  // Export analyzed recipe to crafting hab
  exportToQueue(recipe, quantity, analysis) {
    const queueData = {
      recipe: recipe,
      quantity: quantity,
      requirements: analysis.totalResources,
      estimatedTime: analysis.totalTime,
      priority: 'normal'
    };
    
    // Future: Send to Crafting Hab tool
    localStorage.setItem('craftingQueue', JSON.stringify(queueData));
    
    showNotification('Recipe added to crafting queue!');
  }
}
```

#### E5.2 Build Plan Management
```javascript
const BuildPlanManager = {
  // Save build plans for later
  savePlan(name, recipe, quantity, analysis) {
    const plans = JSON.parse(localStorage.getItem('buildPlans') || '[]');
    
    plans.push({
      id: Date.now(),
      name: name,
      recipe: recipe,
      quantity: quantity,
      analysis: analysis,
      created: new Date().toISOString()
    });
    
    localStorage.setItem('buildPlans', JSON.stringify(plans));
  },
  
  // Load and apply saved plans
  loadPlan(planId) {
    const plans = JSON.parse(localStorage.getItem('buildPlans') || '[]');
    return plans.find(p => p.id === planId);
  }
}
```

---

## F. Integration Features

### F1. Cross-Tool Resource Flow
```javascript
ResourceFlowManager = {
  // Claim Stakes → Starbase
  exportFromClaimStake(stakeId, resources) {
    // Calculate transport time
    // Update starbase inventory
    // Track in-transit resources
    // Trigger arrival notification
  },
  
  // Starbase → Crafting Hab
  allocateToCrafting(resources, habId) {
    // Reserve resources
    // Update available pool
    // Track consumption
  },
  
  // Recipe Tool → Both Simulators
  importRecipePlan(plan) {
    // Parse recipe requirements
    // Check resource availability
    // Suggest production setup
    // Create crafting queue
  }
}

// F1.1 Recipe-to-Building Mapping
const RECIPE_BUILDING_MAP = {
  getRequiredBuilding: (recipeId) => {
    // Maps recipes to required crafting stations/buildings
  },
  canCraftAt: (recipe, building) => {
    // Validates if recipe can be crafted at building
  }
}

// F1.2 Resource Transfer Rules
const TRANSFER_RULES = {
  claimToStarbase: {
    timeCalculation: (distance) => distance * 60, // seconds
    maxCapacity: 1000,
    requiresFleet: true
  },
  starbaseToHab: {
    instant: true,
    sharedInventory: true
  }
}
```

### F2. Unified Achievement System
```javascript
UnifiedAchievements = {
  categories: {
    production: [
      { id: 'first_extraction', name: 'First Extraction', condition: 'Extract any resource' },
      { id: 'million_units', name: 'Million Unit Club', condition: 'Produce 1M units total' }
    ],
    
    crafting: [
      { id: 'first_craft', name: 'First Creation', condition: 'Complete first craft job' },
      { id: 'master_crafter', name: 'Master Crafter', condition: 'Craft 100 different items' }
    ],
    
    efficiency: [
      { id: 'optimizer', name: 'The Optimizer', condition: '95% efficiency on any chain' },
      { id: 'speed_demon', name: 'Speed Demon', condition: 'Complete 10 jobs in 1 hour' }
    ],
    
    exploration: [
      { id: 'multi_planet', name: 'Multi-Planetary', condition: 'Own stakes on 5 planets' },
      { id: 'faction_diverse', name: 'Diplomatic', condition: 'Operate in all factions' }
    ]
  },
  
  checkProgress(action, data) {
    // Evaluate against all conditions
    // Update progress bars
    // Trigger unlock animations
    // Award badges
  }
}
```

### F3. Data Synchronization
```javascript
DataSync = {
  syncInterval: 5000, // 5 seconds
  
  syncData() {
    // Gather state from all tools
    const state = {
      claimStakes: ClaimStakesManager.getState(),
      craftingHabs: CraftingHabManager.getState(),
      recipes: RecipeManager.getState(),
      shared: SharedState.getAll()
    };
    
    // Save to localStorage
    SaveService.save(state);
    
    // Broadcast updates
    EventBus.emit('state:synced', state);
  },
  
  loadData() {
    const saved = SaveService.load();
    if (saved) {
      // Restore each tool's state
      ClaimStakesManager.restore(saved.claimStakes);
      CraftingHabManager.restore(saved.craftingHabs);
      RecipeManager.restore(saved.recipes);
      SharedState.restore(saved.shared);
    }
  }
}
```

---

## G. UI/UX Specifications

### G1. Design System

#### G1.1 Color Palette
```css
:root {
  /* Primary Colors (SAGE Theme) */
  --primary-orange: #FF6B35;
  --primary-dark: #0A0A0A;
  --primary-light: #1A1A1A;
  
  /* Accent Colors */
  --accent-blue: #00A8E8;
  --accent-green: #00C896;
  --accent-purple: #9B59B6;
  --accent-gold: #FFD700;
  
  /* Status Colors */
  --status-success: #2ECC40;
  --status-warning: #FF851B;
  --status-danger: #FF4136;
  --status-info: #0074D9;
  
  /* Faction Colors */
  --faction-mud: #8B4513;
  --faction-oni: #FF1493;
  --faction-ust: #1E90FF;
  
  /* UI Elements */
  --border-color: #2A2A2A;
  --text-primary: #FFFFFF;
  --text-secondary: #999999;
  --text-dim: #666666;
}
```

#### G1.2 Typography
```css
/* Font System */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Exo+2:wght@300;400;600&display=swap');

.heading-primary {
  font-family: 'Orbitron', monospace;
  font-weight: 800;
  font-size: 2rem;
  letter-spacing: 0.05em;
}

.heading-secondary {
  font-family: 'Orbitron', monospace;
  font-weight: 600;
  font-size: 1.5rem;
}

.body-text {
  font-family: 'Exo 2', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.6;
}

.stat-text {
  font-family: 'Orbitron', monospace;
  font-weight: 400;
  font-size: 0.875rem;
  letter-spacing: 0.02em;
}
```

#### G1.3 Component Styling
```css
/* Button Styles */
.btn {
  font-family: 'Exo 2', sans-serif;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-primary {
  background: var(--primary-orange);
  color: white;
  border-color: var(--primary-orange);
}

.btn-primary:hover {
  background: transparent;
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
}

/* Card Styles */
.card {
  background: var(--primary-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    var(--primary-orange) 0%, 
    var(--accent-blue) 100%);
}

/* Panel Styles */
.panel {
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

### G2. Animation System

#### G2.1 Transitions
```css
/* Smooth state transitions */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 5px var(--primary-orange); }
  50% { box-shadow: 0 0 20px var(--primary-orange), 0 0 40px var(--primary-orange); }
}

@keyframes resourceFlow {
  0% { transform: translateX(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
```

#### G2.2 Interactive Feedback
```javascript
// Visual feedback for user actions
const FeedbackSystem = {
  success(element, message) {
    element.classList.add('feedback-success');
    this.showToast(message, 'success');
    setTimeout(() => element.classList.remove('feedback-success'), 2000);
  },
  
  error(element, message) {
    element.classList.add('feedback-error');
    this.showToast(message, 'error');
    element.classList.add('shake');
  },
  
  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}
```

### G3. Responsive Design

#### G3.1 Breakpoints
```css
/* Responsive breakpoints */
@media (max-width: 1920px) { /* Full HD */ }
@media (max-width: 1440px) { /* Laptop */ }
@media (max-width: 1024px) { /* Tablet Landscape */ }
@media (max-width: 768px) { /* Tablet Portrait */ }
@media (max-width: 480px) { /* Mobile */ }
```

#### G3.2 Layout Adaptation
```css
/* Responsive grid system */
.tool-container {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  gap: 1rem;
}

@media (max-width: 1024px) {
  .tool-container {
    grid-template-columns: 1fr;
  }
  
  .sidebar { display: none; }
  .mobile-menu { display: block; }
}
```

---

## H. Data Structures

### H1. Game Data Format

#### H1.1 Claim Stakes Data
```json
{
  "claimStakeDefinitions": [
    {
      "id": "cs_tier1_basic",
      "name": "Basic Claim Stake",
      "tier": 1,
      "slots": 10,
      "rentMultiplier": 1.0,
      "requiredTags": [],
      "addedTags": ["industrial"]
    }
  ],
  
  "buildings": [
    {
      "id": "extractor_basic",
      "name": "Basic Extractor",
      "category": "extraction",
      "slots": 2,
      "power": -10,
      "crew": 5,
      "extractionRate": {
        "iron": 10,
        "copper": 5
      },
      "requiredTags": ["industrial"],
      "tier": 1
    }
  ],
  
  "planetArchetypes": [
    {
      "id": "terrestrial_planet",
      "name": "Terrestrial Planet",
      "resources": {
        "iron": { "richness": 1.5 },
        "copper": { "richness": 1.2 },
        "silica": { "richness": 0.8 }
      },
      "tags": ["mining", "industrial"]
    }
  ]
}

// H1.4 Crafting Hab Buildings Data
{
  "craftingHabBuildings": {
    "crafting-station-basic": {
      "id": "crafting-station-basic",
      "name": "Basic Crafting Station",
      "slots": 2,
      "craftingSpeed": 1.0,
      "craftingEfficiency": 1.0,
      "crewRequired": 5,
      "powerRequired": 50,
      "unlockedRecipes": ["tier1_components"],
      "constructionCost": {
        "cargo-steel": 100,
        "cargo-electronics": 50
      }
    }
  }
}

// H1.5 Starbase Definitions
{
  "starbaseDefinitions": {
    "starbase_oni_01": {
      "id": "starbase_oni_01",
      "faction": "ONI",
      "level": 3,
      "habPlots": {
        "1": 5,  // Tier 1: 5 plots
        "2": 3,  // Tier 2: 3 plots
        "3": 1   // Tier 3: 1 plot
      },
      "rentPerDay": {
        "1": 100,
        "2": 500,
        "3": 2000
      },
      "tags": ["industrial", "oni"]
    }
  }
}

// H1.6 Resource Master List
{
  "resources": {
    "categories": {
      "raw": ["iron-ore", "copper-ore", "silica"],
      "processed": ["steel", "electronics", "fuel"],
      "advanced": ["high-density-alloy", "quantum-processor"]
    },
    "definitions": { /* all cargo definitions */ }
  }
}
```

#### H1.2 Crafting Recipes Data
```csv
OutputID,OutputName,OutputType,OutputTier,BuildingResourceTier,ConstructionTime,PlanetTypes,Factions,ResourceType,ProductionSteps,Ingredient1,Quantity1,Ingredient2,Quantity2,Ingredient3,Quantity3
comp_001,Iron Plate,Component,1,1,60,Rocky,All,Processed,2,iron_ore,10,coal,2,,
comp_002,Circuit Board,Component,2,2,120,Tech,All,Advanced,3,copper_wire,5,silica,3,plastic,2
```

#### H1.3 Save File Structure
```json
{
  "version": "1.0.0",
  "saveDate": "2024-01-15T10:30:00Z",
  "playerData": {
    "achievements": {},
    "statistics": {},
    "settings": {}
  },
  
  "claimStakes": [
    {
      "id": "stake_001",
      "planetId": "planet_mudFaction_01",
      "buildings": [],
      "resources": {},
      "efficiency": 0.85
    }
  ],
  
  "craftingHabs": [
    {
      "id": "hab_001",
      "starbaseId": "starbase_oni_01",
      "buildings": [],
      "activeJobs": []
    }
  ],
  
  "sharedInventory": {
    "starbase_oni_01": {
      "iron_ore": 1000,
      "copper_wire": 500
    }
  }
}
```

---

## I. Implementation Roadmap

### I1. Development Phases

#### Phase 1: Foundation (Day 1)
```
Morning (4 hours):
□ Set up project structure
□ Implement SAGE design system
□ Create shared components
□ Set up data loading system

Afternoon (4 hours):
□ Build navigation framework
□ Implement save/load system
□ Create resource management core
□ Test data flow between tools
```

#### Phase 2: Claim Stakes Enhancement (Day 1-2)
```
Day 1 Evening (4 hours):
□ Refactor existing React components
□ Implement drag & drop system
□ Create gamified UI elements
□ Add tutorial system

Day 2 Morning (4 hours):
□ Build planet browser
□ Create visual designer
□ Implement efficiency calculations
□ Add achievement tracking
```

#### Phase 3: Crafting Hab Tool (Day 2)
```
Day 2 Afternoon (4 hours):
□ Create starbase interface
□ Build hab designer
□ Implement job management
□ Add crafting queue system

Day 2 Evening (4 hours):
□ Create recipe selector
□ Build progress tracking
□ Implement bonus calculations
□ Test resource consumption
```

#### Phase 4: Crafting Recipes Tool (Day 3)
```
Day 3 Morning (4 hours):
□ Build recipe explorer
□ Create tree visualization
□ Implement path finding
□ Add analysis dashboard

Day 3 Afternoon (4 hours):
□ Build interactive canvas
□ Add metrics calculation
□ Create optimization engine
□ Implement export features
```

#### Phase 5: Integration & Polish (Day 3)
```
Day 3 Evening (4 hours):
□ Connect resource pipelines
□ Test achievement system
□ Implement notifications
□ Add visual polish

Final Testing (2 hours):
□ Cross-tool functionality
□ Save/load integrity
□ Performance optimization
□ Bug fixes
```

### I2. Critical Path Items

#### Must Have (MVP)
- Basic functionality for all three tools
- Data loading from JSON/CSV
- Save/load system
- Resource transfer between tools
- Core UI with SAGE theme

#### Should Have
- Drag & drop in claim stakes
- Visual recipe trees
- Achievement system
- Tutorial flow
- Efficiency calculations

#### Nice to Have
- Advanced animations
- Optimization algorithms
- Detailed analytics
- Keyboard shortcuts
- Sound effects

// I2.1 Day 1 MVP - Core Functionality
const DAY_1_MVP = {
  claimStakes: {
    must: ['planet selection', 'building placement', 'resource calculation'],
    skip: ['animations', 'drag-drop', 'achievements']
  },
  shared: {
    must: ['data loading', 'basic save/load', 'navigation'],
    skip: ['achievements', 'notifications']
  }
}

// I2.2 Day 2 MVP - Crafting Tools
const DAY_2_MVP = {
  craftingHab: {
    must: ['hab placement', 'job queue', 'resource consumption'],
    skip: ['optimization', 'animations']
  },
  recipes: {
    must: ['recipe search', 'basic tree view', 'requirements calc'],
    skip: ['complex visualizations', 'path optimization']
  }
}

### I3. Testing Strategy

#### Unit Tests
```javascript
// Test resource calculations
test('Resource extraction calculation', () => {
  const building = { extractionRate: { iron: 10 } };
  const richness = 1.5;
  const expected = 15;
  expect(calculateExtraction(building, richness)).toBe(expected);
});

// Test save/load integrity
test('Save/load preserves state', () => {
  const originalState = generateTestState();
  SaveService.save(originalState);
  const loadedState = SaveService.load();
  expect(loadedState).toEqual(originalState);
});
```

#### Integration Tests
```javascript
// Test resource flow
test('Resources transfer from claim stake to starbase', async () => {
  const stakeId = 'test_stake';
  const resources = { iron: 100 };
  
  await ResourceFlowManager.exportFromClaimStake(stakeId, resources);
  
  const starbaseInventory = SharedState.getStarbaseInventory();
  expect(starbaseInventory.iron).toBe(100);
});
```

#### Performance Benchmarks
```javascript
// Ensure smooth rendering
benchmark('Recipe tree rendering', () => {
  const complexRecipe = generateComplexRecipe(100); // 100 nodes
  const startTime = performance.now();
  
  TreeRenderer.renderTree(complexRecipe, canvas);
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(16); // 60 FPS
});
```

---

## J. System Scale & Content

### J1. Content Overview
```javascript
const CONTENT_SCALE = {
  totalRecipes: 3500,          // Including all ship config components
  rawResources: 99,            // Base materials
  components: 316,             // Processed items
  ingredients: 150,            // Intermediate products
  shipConfigComponents: 2935,  // Final products
  
  buildingRecipes: 2000,       // All tier variations
  infrastructureBuildings: {
    centralHub: 5,            // T1-T5
    cultivationHub: 5,        // T1-T5
    extractionHub: 5,         // T1-T5
    processingHub: 5,         // T1-T5
    storageHub: 5,            // T1-T5
    farmHub: 5               // T1-T5
  },
  
  extractorModules: 99,       // One per raw material
  processorModules: 200,      // For 2-step components
  
  habAssets: {
    habTiers: 5,              // T1-T5
    cargoStorage: 5,          // T1-T5
    craftingStations: 4,      // XXS, XS, S, M
    landingPads: 4,           // XXS, XS, S, M
    decorative: 3             // Paint, pet house
  }
}
```

### J2. Performance Considerations
```javascript
// Handle large recipe sets efficiently
const RecipeOptimizer = {
  // Use virtualization for displaying large lists
  virtualizedDisplay: {
    visibleItems: 50,
    bufferSize: 10,
    recycleViews: true
  },
  
  // Implement search indexing
  searchIndex: {
    buildIndex() {
      // Create inverted index for fast searching
      // Index by name, type, tier, ingredients
    },
    
    search(query) {
      // Use index for O(1) lookups
      // Fuzzy matching for typos
    }
  },
  
  // Lazy load recipe trees
  treeLoader: {
    loadDepth: 3,              // Initial depth
    expandOnDemand: true,      // Load deeper levels as needed
    cacheExpanded: true        // Remember expanded nodes
  }
}
```

### J3. UI Adaptations for Scale
```jsx
// Recipe Browser with virtualization
<RecipeBrowser>
  <VirtualList
    items={recipes}              // 3500 items
    itemHeight={80}
    renderItem={(recipe) => <RecipeCard recipe={recipe} />}
    overscan={5}
  />
  
  <Pagination
    totalItems={3500}
    itemsPerPage={50}
    currentPage={currentPage}
  />
  
  <QuickJump>
    <JumpToLetter />            // A-Z quick navigation
    <JumpToTier />             // T1-T5 shortcuts
    <JumpToCategory />         // Category shortcuts
  </QuickJump>
</RecipeBrowser>

// Building Palette with smart filtering
<BuildingPalette>
  <SmartFilter>
    <AvailableOnly />          // Hide unavailable buildings
    <TierFilter />             // Show only current tier
    <ResourceFilter />         // Filter by planet resources
    <TagFilter />              // Filter by requirements
  </SmartFilter>
  
  <BuildingGrid>
    {/* Only show relevant buildings */}
    {filteredBuildings.map(building => (
      <BuildingCard 
        key={building.id}
        building={building}
        upgradeable={canUpgrade(building)}
      />
    ))}
  </BuildingGrid>
</BuildingPalette>
```

---

## K. Starbase Mechanics

### K1. Starbase Level System
```javascript
const STARBASE_LEVELS = {
  0: {
    name: "Outpost",
    claimStakeTiers: [1],
    habPlotsByTier: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 },
    features: ["Basic operations"]
  },
  1: {
    name: "Station",
    claimStakeTiers: [1, 2],
    habPlotsByTier: { 1: 5, 2: 2, 3: 0, 4: 0, 5: 0 },
    features: ["Extended storage", "T2 unlocked"]
  },
  2: {
    name: "Hub",
    claimStakeTiers: [1, 2, 3],
    habPlotsByTier: { 1: 10, 2: 5, 3: 2, 4: 0, 5: 0 },
    features: ["Regional trade", "T3 unlocked"]
  },
  3: {
    name: "Complex",
    claimStakeTiers: [1, 2, 3, 4],
    habPlotsByTier: { 1: 15, 2: 10, 3: 5, 4: 2, 5: 0 },
    features: ["Advanced manufacturing", "T4 unlocked"]
  },
  4: {
    name: "Metroplex",
    claimStakeTiers: [1, 2, 3, 4, 5],
    habPlotsByTier: { 1: 20, 2: 15, 3: 10, 4: 5, 5: 2 },
    features: ["Full capabilities", "T5 unlocked"]
  },
  5: {
    name: "Capital Station",
    claimStakeTiers: [1, 2, 3, 4, 5],
    habPlotsByTier: { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 },
    features: ["Enhanced efficiency", "Bonus slots"]
  },
  6: {
    name: "Central Space Station",
    claimStakeTiers: [1, 2, 3, 4, 5],
    habPlotsByTier: { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 },
    features: ["Maximum capacity", "CSS bonuses", "Faction capital"]
  }
}

// Starbase progression affects both tools
const StarbaseProgression = {
  upgradeStarbase(starbaseId, newLevel) {
    // Update available claim stake tiers
    this.updateClaimStakeAccess(starbaseId, newLevel);
    
    // Update hab plot availability
    this.updateHabPlots(starbaseId, newLevel);
    
    // Unlock new features
    this.unlockFeatures(newLevel);
    
    // Apply efficiency bonuses
    if (newLevel >= 6) {
      this.applyCSSBonuses(starbaseId);
    }
  },
  
  canPlaceClaimStake(starbaseLevel, stakeTier) {
    const levelData = STARBASE_LEVELS[starbaseLevel];
    return levelData.claimStakeTiers.includes(stakeTier);
  },
  
  getAvailableHabPlots(starbaseLevel, habTier) {
    const levelData = STARBASE_LEVELS[starbaseLevel];
    return levelData.habPlotsByTier[habTier] || 0;
  }
}
```

### K2. Integrated Starbase UI
```jsx
<StarbaseControl>
  <StarbaseLevelDisplay>
    <CurrentLevel>{starbase.level}</CurrentLevel>
    <LevelName>{STARBASE_LEVELS[starbase.level].name}</LevelName>
    <ProgressToNext />
  </StarbaseLevelDisplay>
  
  <StarbaseCapabilities>
    <ClaimStakeAccess>
      {STARBASE_LEVELS[starbase.level].claimStakeTiers.map(tier => (
        <TierBadge key={tier} tier={tier} unlocked={true} />
      ))}
    </ClaimStakeAccess>
    
    <HabPlotAvailability>
      {Object.entries(STARBASE_LEVELS[starbase.level].habPlotsByTier).map(
        ([tier, count]) => (
          <PlotCount key={tier} tier={tier} available={count} />
        )
      )}
    </HabPlotAvailability>
    
    <FeatureList>
      {STARBASE_LEVELS[starbase.level].features.map(feature => (
        <Feature key={feature}>{feature}</Feature>
      ))}
    </FeatureList>
  </StarbaseCapabilities>
  
  <UpgradeOptions>
    <NextLevelPreview />
    <UpgradeRequirements />
    <UpgradeButton />
  </UpgradeOptions>
</StarbaseControl>
```

---

## L. Building System Details

### L1. Building Tier System
```javascript
const BuildingTierSystem = {
  // Infrastructure buildings match claim stake tier
  infrastructureRules: {
    maxTier: (claimStakeTier) => claimStakeTier,
    canUpgrade: (building, claimStake) => {
      return building.tier < claimStake.tier;
    }
  },
  
  // Other buildings can exceed claim stake tier
  standardBuildingRules: {
    maxTier: 5,
    canUpgrade: (building, availableSlots, powerBalance, crewAvailable) => {
      const upgradedBuilding = getUpgradedVersion(building);
      return (
        upgradedBuilding &&
        availableSlots >= upgradedBuilding.slots &&
        powerBalance + upgradedBuilding.power >= 0 &&
        crewAvailable >= upgradedBuilding.crew
      );
    }
  },
  
  // Show single building with upgrade path
  displayBuilding: (buildingFamily) => {
    // Only show current tier, not all 5 versions
    const currentTier = getCurrentTier(buildingFamily);
    const canUpgrade = this.canUpgrade(currentTier);
    
    return {
      building: currentTier,
      upgradeable: canUpgrade,
      nextTier: canUpgrade ? getNextTier(buildingFamily) : null
    };
  }
}
```

### L2. Tag-Based Availability
```javascript
const TagSystem = {
  // Buildings require specific tags to be available
  filterAvailableBuildings(allBuildings, context) {
    return allBuildings.filter(building => {
      // Check planet tags
      const planetTags = context.planet.tags || [];
      const hasRequiredPlanetTags = building.requiredPlanetTags.every(
        tag => planetTags.includes(tag)
      );
      
      // Check resource availability
      const planetResources = context.planet.resources || [];
      const hasRequiredResources = building.requiredResources.every(
        resource => planetResources.includes(resource)
      );
      
      // Check claim stake tags
      const stakeTags = context.claimStake.tags || [];
      const hasRequiredStakeTags = building.requiredStakeTags.every(
        tag => stakeTags.includes(tag)
      );
      
      // Check hub requirements
      const hasRequiredHub = !building.requiresHub || 
        context.buildings.some(b => b.providesHub === building.requiresHub);
      
      return hasRequiredPlanetTags && 
             hasRequiredResources && 
             hasRequiredStakeTags && 
             hasRequiredHub;
    });
  },
  
  // Dynamic tag addition from buildings
  updateAvailableTags(buildings) {
    const tags = new Set();
    
    buildings.forEach(building => {
      if (building.providesTags) {
        building.providesTags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags);
  }
}
```

### L3. Crew Simulation
```javascript
const CrewSystem = {
  // Simplified crew management
  mode: 'auto', // 'auto' or 'manual'
  
  autoMode: {
    // Assume max crew slots always filled
    calculateCrewUsage(buildings) {
      const totalCrewSlots = buildings.reduce(
        (sum, b) => sum + (b.crewSlots || 0), 0
      );
      const totalCrewNeeded = buildings.reduce(
        (sum, b) => sum + (b.crewNeeded || 0), 0
      );
      
      return {
        slots: totalCrewSlots,
        needed: totalCrewNeeded,
        available: totalCrewSlots, // Auto-filled
        efficiency: Math.min(1, totalCrewSlots / totalCrewNeeded)
      };
    }
  },
  
  manualMode: {
    // Player manages crew allocation
    allocateCrew(building, amount) {
      // Validate allocation
      // Update building efficiency
      // Recalculate production
    },
    
    optimizeAllocation(buildings, availableCrew) {
      // AI suggestion for crew distribution
      // Prioritize critical buildings
      // Balance efficiency
    }
  },
  
  // Fun crew features
  crewMorale: {
    factors: [
      { name: 'Quarters Quality', impact: 0.1 },
      { name: 'Recreation Facilities', impact: 0.05 },
      { name: 'Work Conditions', impact: 0.15 }
    ],
    
    calculateMorale(buildings) {
      // Calculate overall morale
      // Affects efficiency
      // Unlocks achievements
    }
  }
}
```

### L4. Building Categories
```javascript
const BuildingCategories = {
  infrastructure: {
    centralHub: {
      tiers: 5,
      unique: true,
      comesWithStake: true,
      provides: ['administration', 'basic-operations']
    },
    cultivationHub: {
      tiers: 5,
      unique: true,
      comesWithStake: true, // For cultivation stakes
      provides: ['farming-operations', 'bio-processing']
    },
    extractionHub: {
      tiers: 5,
      unlocks: ['extractor-modules'],
      provides: ['extraction-tag']
    },
    processingHub: {
      tiers: 5,
      unlocks: ['processor-modules'],
      provides: ['processing-tag']
    },
    storageHub: {
      tiers: 5,
      provides: ['bulk-storage', 'logistics']
    },
    farmHub: {
      tiers: 5,
      provides: ['agriculture', 'food-production']
    }
  },
  
  modules: {
    extractors: {
      count: 99, // One per raw material
      requiresHub: 'extraction',
      dynamicAvailability: true // Based on planet resources
    },
    processors: {
      count: 200, // For 2-step components
      requiresHub: 'processing',
      dynamicRecipes: true // Based on available inputs
    }
  },
  
  support: {
    power: ['generator', 'solar', 'fusion'],
    crew: ['quarters', 'recreation', 'medical'],
    defense: ['turret', 'shield', 'bunker'],
    logistics: ['warehouse', 'transport', 'communication']
  }
}
```

### L5. Recipe Planning Integration
```javascript
const RecipePlanningSystem = {
  // Plan recipes with current resources
  planWithAvailable(recipe, currentResources) {
    const plan = {
      canCraft: true,
      missing: {},
      craftable: 0
    };
    
    // Check each ingredient
    recipe.ingredients.forEach(({resource, amount}) => {
      const available = currentResources[resource] || 0;
      if (available < amount) {
        plan.canCraft = false;
        plan.missing[resource] = amount - available;
      }
    });
    
    // Calculate max craftable
    if (plan.canCraft) {
      plan.craftable = Math.min(
        ...recipe.ingredients.map(({resource, amount}) => 
          Math.floor(currentResources[resource] / amount)
        )
      );
    }
    
    return plan;
  },
  
  // Queue crafting jobs based on plan
  queueFromPlan(plan, craftingHab) {
    const jobs = [];
    
    plan.recipes.forEach(recipe => {
      // Find available station
      const station = craftingHab.findAvailableStation(recipe);
      
      if (station) {
        jobs.push({
          recipe: recipe,
          station: station,
          quantity: plan.quantities[recipe.id],
          priority: plan.priorities[recipe.id]
        });
      }
    });
    
    // Sort by priority and dependencies
    return this.optimizeJobOrder(jobs);
  },
  
  // Visual planning interface
  RecipePlanner: () => (
    <PlanningInterface>
      <ResourceInventory>
        <CurrentResources />
        <IncomingResources /> {/* From claim stakes */}
      </ResourceInventory>
      
      <RecipeSelector>
        <CraftableOnly /> {/* Filter by available resources */}
        <RecipeList />
      </RecipeSelector>
      
      <PlanBuilder>
        <DragDropRecipes />
        <QuantityAdjuster />
        <DependencyVisualizer />
      </PlanBuilder>
      
      <PlanSummary>
        <TotalTime />
        <ResourceConsumption />
        <ExpectedOutput />
        <QueueButton />
      </PlanSummary>
    </PlanningInterface>
  )
}
```

---

## Appendix A: Component Reference

### Shared Components
- `<Navigation />` - [B1]
- `<ResourceDisplay />` - [B2]
- `<SaveLoadManager />` - [B3]
- `<NotificationSystem />` - [B4]
- `<AchievementPanel />` - [F2]
- `<TutorialOverlay />` - [C3.1]
- `<StarbaseControl />` - [K2]

### Claim Stakes Components
- `<PlanetBrowser />` - [C2.1]
- `<ClaimStakeManager />` - [C2.2]
- `<BuildingPalette />` - [C2.2]
- `<ResourceFlowDiagram />` - [C2.3]
- `<EfficiencyIndicator />` - [C4.2]
- `<BuildingUpgrader />` - [L1]
- `<CrewManager />` - [L3]

### Crafting Hab Components
- `<StarbaseView />` - [D2.1]
- `<HabDesigner />` - [D2.2]
- `<CraftingInterface />` - [D2.3]
- `<JobQueue />` - [D2.3]
- `<ResourceImporter />` - [D4.1]
- `<RecipePlanner />` - [L5]

### Recipe Tool Components
- `<RecipeExplorer />` - [E2.1]
- `<TreeVisualizer />` - [E2.2]
- `<AnalysisDashboard />` - [E2.3]
- `<PathOptimizer />` - [E2.3]
- `<NodeInspector />` - [E2.2]
- `<VirtualizedRecipeList />` - [J3]

---

## Appendix B: API Reference

### Core Services
```javascript
// Data Loading Service
DataLoader.loadGameData(source: string): Promise<GameData>
DataLoader.loadRecipes(csvFile: File): Promise<Recipe[]>

// Save Service  
SaveService.save(state: AppState): void
SaveService.load(): AppState | null
SaveService.export(): Blob
SaveService.import(file: File): Promise<void>

// Resource Transfer Service
ResourceTransfer.fromClaimStake(stakeId: string, resources: ResourceMap): void
ResourceTransfer.toCraftingHab(habId: string, resources: ResourceMap): void
ResourceTransfer.calculate(from: Location, to: Location): TransferTime

// Starbase Service
StarbaseService.getLevel(starbaseId: string): number
StarbaseService.upgrade(starbaseId: string): void
StarbaseService.getCapabilities(level: number): StarbaseCapabilities
```

### Game Managers
```javascript
// Claim Stake Manager
ClaimStakeManager.create(planetId: string, definition: StakeDefinition): ClaimStake
ClaimStakeManager.addBuilding(stakeId: string, building: Building): void
ClaimStakeManager.upgradeBuilding(stakeId: string, buildingId: string): void
ClaimStakeManager.calculateEfficiency(stake: ClaimStake): number

// Crafting Manager
CraftingManager.startJob(recipe: Recipe, hab: Hab, crew: number): Job
CraftingManager.completeJob(jobId: string): CraftResult
CraftingManager.optimizeQueue(recipes: Recipe[]): Job[]
CraftingManager.planWithResources(recipes: Recipe[], available: Resources): Plan

// Recipe Analyzer
RecipeAnalyzer.findPath(target: string, constraints: Constraints): Path[]
RecipeAnalyzer.calculateRequirements(recipe: Recipe, quantity: number): ResourceMap
RecipeAnalyzer.optimizeBatch(recipe: Recipe): BatchSize

// Building Manager
BuildingManager.filterAvailable(buildings: Building[], context: Context): Building[]
BuildingManager.canUpgrade(building: Building, stake: ClaimStake): boolean
BuildingManager.calculateCrewNeeds(buildings: Building[]): CrewRequirements
```

---

## Appendix C: Performance Optimization

### Rendering Optimizations
```javascript
// Use React.memo for expensive components
const BuildingCard = React.memo(({ building, onClick }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.building.id === nextProps.building.id;
});

// Virtualize large lists
<VirtualList
  items={recipes}
  itemHeight={120}
  renderItem={(recipe) => <RecipeCard recipe={recipe} />}
/>

// Debounce expensive calculations
const debouncedCalculate = useMemo(
  () => debounce(calculateEfficiency, 300),
  []
);
```

### State Management
```javascript
// Use immer for immutable updates
const updateBuilding = produce((draft, buildingId, updates) => {
  const building = draft.buildings.find(b => b.id === buildingId);
  Object.assign(building, updates);
});

// Normalize state shape
const state = {
  buildings: {
    byId: { 'building_1': {...} },
    allIds: ['building_1']
  }
};
```

### Canvas Performance
```javascript
// Use offscreen canvas for complex rendering
const offscreen = new OffscreenCanvas(width, height);
const ctx = offscreen.getContext('2d');
// Render to offscreen
mainCtx.drawImage(offscreen, 0, 0);

// Implement dirty rectangle optimization
class CanvasRenderer {
  dirtyRegions = [];
  
  markDirty(x, y, width, height) {
    this.dirtyRegions.push({ x, y, width, height });
  }
  
  render() {
    this.dirtyRegions.forEach(region => {
      // Only redraw dirty regions
    });
  }
}
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-15 | System | Initial comprehensive documentation |
| 1.1.0 | 2024-01-15 | System | Added System Scale, Starbase Mechanics, and Building Details |

---

END OF DOCUMENTATION 