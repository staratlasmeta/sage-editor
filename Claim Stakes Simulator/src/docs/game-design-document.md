# Claim Stakes Simulator - Comprehensive Game Design Document

## Table of Contents
1. [Introduction](#introduction)
2. [Data-Driven Architecture](#data-driven-architecture)
3. [Core Game Systems](#core-game-systems)
4. [User Interface](#user-interface)
5. [Claim Stake Management](#claim-stake-management)
6. [Resource System](#resource-system)
7. [Building System](#building-system)
8. [Time & Simulation](#time--simulation)
9. [Game Progression](#game-progression)
10. [Achievement System](#achievement-system)
11. [Save/Load System](#saveload-system)
12. [UI Style Guide](#ui-style-guide)
13. [Notification System](#notification-system)
14. [JSON Data Structure](#json-data-structure)
15. [Implementation Guidelines](#implementation-guidelines)

## Introduction

### [CSS-001] Game Overview
The Claim Stakes Simulator is a resource management simulation game implemented as a React application. Players purchase, develop, and manage interplanetary claim stakes across different factions and planet types, constructing buildings to extract and process resources.

**Core Game Loop:**
1. Purchase claim stakes on various planets
2. Construct buildings to extract and process resources
3. Manage power, crew, and resource networks
4. Upgrade infrastructure to increase efficiency
5. Expand operations across multiple claim stakes
6. Progress through achievement milestones

**Game Objectives:**
- Create self-sustaining resource production chains
- Optimize resource extraction and processing
- Expand operations to multiple claim stakes
- Achieve all gameplay milestones
- Create efficient cross-claim stake resource networks

## Data-Driven Architecture

### [CSS-101] JSON-First Design Philosophy
The simulator implements a strictly data-driven architecture where all game entities and mechanics are defined in the JSON data structure.

**Requirements:**
- All game content is loaded from the gameData_allTiers.json file
- No hardcoded assumptions exist about:
  - Number or types of planets
  - Number or types of factions
  - Resource categories or types
  - Building categories or types
  - Tier limits
  - Game mechanics parameters

**Expected Behavior:**
- The application must function identically if:
  - New planet types are added
  - Existing planet types are removed
  - New factions are added
  - New resources or buildings are introduced
  - Tag system is expanded with new tags

### [CSS-102] Dynamic Content Generation
The simulator must generate all UI elements and game systems based solely on the loaded data.

**Requirements:**
- Generate all UI dropdown options from JSON data
- Create filtering categories based on available data
- Build game entities based solely on data definitions
- Scale UI to accommodate variable amounts of content

**Expected Behavior:**
- Adding new content to JSON immediately makes it available in-game
- Removing content from JSON immediately removes it from the game
- UI automatically adjusts to show only available options

### [CSS-103] Data Validation
The simulator must include comprehensive validation of loaded data structures.

**Requirements:**
- Validate JSON structure on application startup
- Check for required fields and relationship integrity
- Provide clear error messages for data issues
- Use fallbacks for non-critical missing data

**Expected Behavior:**
- Validation errors provide specific information about data issues
- Critical data errors prevent game initialization
- Non-critical data issues use defaults and display warnings

## Core Game Systems

### [CSS-201] Faction System
The game includes multiple factions that control different regions of space.

**Requirements:**
- Factions must be loaded from JSON data
- Each faction must have a unique identifier and display name
- Faction information must be displayed on claim stakes
- Factions affect available resources via tag system

**Expected Behavior:**
- Faction filter limits visible claim stakes to selected faction
- Faction badge appears on all claim stake listings
- Faction information is prominently displayed in claim stake details
- Adding/removing factions in JSON updates all relevant UI elements

### [CSS-202] Planet Type System
The game includes multiple planet types, each with unique resource distributions.

**Requirements:**
- Planet types must be loaded from JSON data
- Each planet type has unique versions and tiers
- Planet types determine resource availability via "richness" values
- Planet types provide specific tags to claim stakes

**Expected Behavior:**
- Planet type filter limits visible claim stakes to selected type
- Planet type information is displayed in claim stake details
- Resources available on a claim stake are determined by planet type
- Adding/removing planet types in JSON updates all relevant UI elements

### [CSS-203] Tier System
The game implements a tiered progression system for claim stakes and buildings.

**Requirements:**
- Each claim stake has a tier (T1-T5)
- Buildings have tiers that determine their efficiency
- Claim stake tier limits hub upgrade tiers
- Tier system is implemented via data attributes

**Expected Behavior:**
- Higher tier claim stakes provide more building slots
- Higher tier buildings are more efficient
- Hub buildings cannot exceed claim stake tier
- Module buildings can be upgraded to T5 regardless of claim stake tier
- Tier filter limits visible claim stakes to selected tier range

### [CSS-204] Tag System
The game implements a comprehensive tag system that determines compatibility and relationships.

**Requirements:**
- Tags must be loaded from JSON data
- Four tag categories: Planet Type, Faction, Resource, Building
- Buildings have "requiredTags" and "addedTags" properties
- Claim stakes inherit tags from planet types and definitions

**Expected Behavior:**
- Buildings only appear if their requiredTags match claim stake tags
- When a building is constructed, its addedTags are added to the claim stake
- Tags control the chain of building prerequisites
- Adding/removing tags in JSON updates all relevant mechanics

### [CSS-205] Starbase Level System
The game implements a starbase level system that determines available claim stake tiers.

**Requirements:**
- Starbase levels range from 0-6
- Each level unlocks specific claim stake tiers:
  - Level 0: T1 only
  - Level 1: T1-T2
  - Level 2: T1-T3
  - Level 3: T1-T4
  - Level 4+: T1-T5
  - Level 6: CSS (Central Space Station)
- Starbase level is adjustable in the UI

**Expected Behavior:**
- Adjusting starbase level immediately updates available claim stakes
- Unavailable tiers are hidden or shown as locked
- Starbase level is displayed prominently when browsing planets
- Different planets can have different starbase levels

## User Interface

### [CSS-301] Main Layout
The simulator features a three-panel layout with responsive design.

**Requirements:**
- Top status bar with simulation controls and global metrics
- Left sidebar with claim stakes list
- Main content area for selected claim stake details
- Responsive design that adapts to window size

**Expected Behavior:**
- Layout maintains usability at different screen sizes
- Panels resize appropriately to fill available space
- Overflow content scrolls within panels
- Minimum width/height requirements prevent unusable layouts

### [CSS-302] Top Status Bar
The top status bar provides global controls and information.

**Requirements:**
- Time controls:
  - Pause/play button
  - Speed selection (1x, 2x, 5x, 10x, 100x, 1000x)
  - Elapsed time display (HH:MM:SS)
- Resource overview button (expandable panel)
- Global metrics display:
  - Total slots used
  - Total hubs
  - Total modules
  - Total crew
  - Net power
- Achievement button
- Save/load button

**Expected Behavior:**
- Controls remain accessible at all times
- Speed setting is maintained when switching between claim stakes
- Expandable resource panel shows all resources with production rates
- Global metrics update in real-time

### [CSS-303] Left Sidebar
The left sidebar shows owned claim stakes and purchase controls.

**Requirements:**
- "YOUR CLAIM STAKES" header with count in parentheses
- List of all owned claim stakes showing:
  - Name
  - Faction
  - Tier
  - Planet type
- Purchase/Add Claim Stake button at bottom
- Empty state message when no stakes owned

**Expected Behavior:**
- Selected claim stake is highlighted
- Clicking a claim stake loads its details in main content area
- List scrolls when it exceeds available vertical space
- Purchase button navigates to claim stake selection screen

### [CSS-304] Main Content Area - Claim Stake Selection
The claim stake selection screen shows available claim stakes to purchase.

**Requirements:**
- Filtering system with dropdowns:
  - Faction
  - Planet Type
  - Tier
  - Resources
- List of available claim stakes showing:
  - Name
  - Tier
  - Faction
  - Slots
- Detailed information panel for selected claim stake with tabs:
  - General: Basic information
  - Resources: Available resources
  - Buildings: Available buildings
- Purchase button

**Expected Behavior:**
- Filters update list immediately
- Selecting a claim stake displays details
- Resources are filtered based on planet archetype and tier
- Buildings are filtered based on tags and tier
- Purchase button is enabled only when a claim stake is selected

### [CSS-305] Main Content Area - Claim Stake Overview
The claim stake overview provides key information about the selected claim stake.

**Requirements:**
- Tabs for "OVERVIEW" and "BUILDINGS"
- Status sections:
  - SLOTS: Used/Total with available slots
  - CREW: Used/Total with available crew
  - POWER: Net value with generation and usage
  - FUEL: Current amount with operational status
- Planet information section:
  - Type
  - Faction
- Available resources grid:
  - Resource name
  - Current amount
  - Production rate

**Expected Behavior:**
- Tab switching maintains state
- Status sections update in real-time
- Resources grid shows all resources native to the planet
- Positive rates shown in green, negative in red
- Empty state displayed when no claim stake is selected

### [CSS-306] Main Content Area - Buildings Tab
The buildings tab allows construction and management of buildings.

**Requirements:**
- Toggle between "Construct Buildings" and "My Buildings" views
- Category filters (All, Hubs, Central, Extraction, Processing, Farming, Storage)
- "Show buildings requiring prerequisites" checkbox
- Building cards in grid layout with fixed height
- Building cards contain:
  - Tier tabs (T1-T5)
  - Overview/Production/Construct tabs
  - Building stats (power, crew, storage)
  - Resource inputs/outputs
  - Construct/Upgrade button

**Expected Behavior:**
- Toggle switches between available and constructed buildings
- Filters update building list immediately
- Fixed height cards maintain consistent layout
- Tabs within cards maintain overall card height
- Building cards show only the information relevant to the selected tab

## Claim Stake Management

### [CSS-401] Planet Instance System
The game organizes claim stakes under planet instances.

- Planet instances combine information from planetArchetype and provide available claim stake definitions
- Available claim stakes are templates that players can purchase, not pre-existing instances
- When a player purchases a claim stake definition, it creates a new claim stake instance owned by the player

**Requirements:**
- Planet instances combine:
  - Name and description
  - Reference to planetArchetype
  - Starbase level (adjustable)
  - List of available claim stakes
- Starbase level controls which tiers of claim stakes are available
- Planet archetype determines resource richness and tags
- UI workflow: Select planet → Adjust starbase level → View claim stakes

**Expected Behavior:**
- Planets list shows all available planets
- Selecting a planet shows its details and available claim stakes
- Adjusting starbase level immediately updates available claim stakes
- Adding/removing planets in JSON updates all relevant UI elements

### [CSS-402] Claim Stake Selection
The claim stake selection process allows filtering and detailed information review.
The selection process shows available claim stake definitions filtered by planet, faction, tier, etc.
These are not yet owned by the player but represent options they can purchase

**Requirements:**
- Implement filtering as defined in CSS-304
- Display detailed information in tabs:
  - General: Basic information (tier, slots, rent multiplier, hub value)
  - Resources: Available resources with richness values
  - Buildings: Available building types
- Resources are filtered based on:
  - Planet archetype tags
  - Extraction module availability
  - Minimum tier requirements
- Buildings are filtered based on:
  - Claim stake and planet archetype tags
  - Minimum tier requirements

**Expected Behavior:**
- Resources only appear if an extraction module exists that can extract them
- Resources only appear if the minimum tier requirement is met
- Buildings only appear if all required tags are present
- Buildings only appear if the minimum tier requirement is met
- One version of each building is shown (not all tiers)

### [CSS-403] Claim Stake Purchase
The purchase process adds a claim stake to the player's inventory.
The purchase creates a new claim stake instance owned by the player
This instance starts with only the Central Hub T1 and initial fuel
The instance is then developed by the player through construction and resource management

**Requirements:**
- "Purchase Claim Stake" button confirms selection
- Initial Central Hub T1 is automatically constructed
- Initial fuel is granted (1000 × tier)
- UI navigates to new claim stake overview after purchase

**Expected Behavior:**
- Claim stake is added to owned stakes list
- Central Hub T1 is pre-built and operational
- Initial resources and status reflect the central hub's capabilities
- UI focuses on new claim stake's overview tab

[CSS-404] Claim Stake Instance Creation
The claim stake instance creation process transforms a claim stake definition into a player-owned entity.
Requirements:

When a player purchases a claim stake definition, it creates a new claim stake instance with:

Reference to original claim stake definition
Inherited properties (tier, slots, tags)
Automatic T1 Central Hub construction
Initial fuel amount (1000 × tier)
Empty buildings object (except for Central Hub T1)
Storage capacity inherited from Central Hub T1
Tags from three sources:

Planet archetype tags
Claim stake definition tags
Central Hub T1 added tags

Expected Behavior:

New claim stake instances appear in left sidebar
New instances start with only Central Hub T1 constructed
Initial storage and resource production reflect Central Hub capabilities
UI automatically navigates to new claim stake overview
All applicable tags are properly combined in the instance data

[CSS-405] Building Availability Filtering
The simulator implements precise filtering of available buildings for each claim stake instance.
Requirements:

Three-layer filtering system:

Tier filtering: Hide buildings where minimumTier > claim stake tier
Tag filtering: Only show buildings where all requiredTags are satisfied by:

Planet archetype tags
Claim stake definition addedTags
Potentially added tags from constructable prerequisite buildings


Resource filtering: For extraction buildings, hide if resource's richness on planet is 0 or not defined


Recursive "dependency chain analysis" to determine potentially available buildings:

Start with buildings whose requiredTags are directly satisfied
Add their addedTags to available tags pool
Check for newly available buildings
Repeat until no new buildings become available

Expected Behavior:

"Show buildings requiring prerequisites" checkbox reveals buildings that could become available
Buildings that can never be built on the claim stake remain hidden
Filter updates dynamically when new buildings are constructed
UI clearly indicates why a building cannot be constructed (via tooltips)
Extraction modules only appear for resources available on the planet (richness > 0)

## Resource System

### [CSS-501] Resource Categories
The game defines multiple resource categories with different properties.

**Requirements:**
- Resource categories:
  - Raw Resources: Directly extracted from planets
  - Processed Resources: Created by refining raw resources
  - Advanced Resources: Created by combining multiple resources
- Each resource has:
  - Unique identifier (e.g., "cargo-iron-ore")
  - Display name
  - Tier level
  - Planet type associations
  - Faction associations
  - Recipe (for processed/advanced resources)

**Expected Behavior:**
- Resource categories are determined by their data properties
- Raw resources have no recipe inputs
- Processed resources have one or more inputs and one output
- Advanced resources have multiple inputs and may have multiple outputs
- Adding/removing resources in JSON updates all relevant UI elements

### [CSS-502] Resource Tracking
The game tracks resources at global and per-claim stake levels.

**Requirements:**
- Two tracking levels:
  - Global Resources: Total across all claim stakes (top bar)
  - Per-Claim Stake Resources: Local to specific claim stakes
- For each resource, track:
  - Current amount
  - Production rate per second
  - Storage capacity
  - Used storage percentage

**Expected Behavior:**
- Resources accumulate based on production rates
- Storage limits prevent excess accumulation
- Global view shows totals across all claim stakes
- Per-claim stake view shows local production/storage
- UI updates in real-time with current values

### [CSS-503] Resource Production and Consumption System
The resource production system handles extraction, processing, and consumption with two distinct mechanisms.

**Requirements:**
- **resourceExtractionRate**: Used for extraction buildings only
  - Contains only positive values
  - Represents base extraction rate per second
  - **Affected by planet richness**: Actual rate = base rate × planet richness
  - Used primarily by extraction modules and central hubs for manual extraction
  
- **resourceRate**: Used for all building operations (consumption and production)
  - Contains both negative values (consumption) and positive values (production)
  - Negative values: Resources consumed per second (e.g., "cargo-fuel": -10 = consumes 10 fuel/sec)
  - Positive values: Resources produced per second (e.g., "cargo-ammunition": 10 = produces 10 ammo/sec)
  - **Not affected by planet richness**: Uses exact values specified
  - Used by processing buildings, power plants, and any building that consumes/produces resources

**Expected Behavior:**
- **Extraction Process**:
  - Raw extraction rate (from resourceExtractionRate) × planet richness = actual extraction rate
  - Only occurs if building has sufficient power and crew
  - Stops when storage is full
  
- **Processing/Consumption Process**:
  - Checks all negative resourceRate values (required inputs)
  - If ANY required input is unavailable, building stops functioning
  - If building stops and provides power, power generation drops to 0
  - Other buildings dependent on that power also shut down
  - Positive resourceRate values produce outputs when building is operational
  
- **Resource Chain Dependencies**:
  - Buildings can consume outputs from other buildings
  - Net rates are aggregated across all buildings in claim stake
  - Resource flow must be balanced to maintain operations

### [CSS-504] Building Operation Prerequisites
Buildings have strict operational requirements that must be met continuously.

**Requirements:**
- **Power Requirements**: Building must have sufficient power available BEFORE construction
- **Crew Requirements**: Building must have sufficient crew slots and available crew
- **Resource Requirements**: All negative resourceRate values must be satisfied each second
- **Fuel Dependency**: Power-generating buildings require fuel to operate

**Expected Behavior:**
- If any prerequisite fails, building becomes non-operational
- Non-operational buildings:
  - Stop all resource production (resourceRate outputs)
  - Stop all resource extraction (resourceExtractionRate)
  - If they generate power, power output drops to 0
  - Cascade effect: Other buildings may shut down due to power loss
- Prerequisites are checked every simulation tick
- Buildings resume operation when prerequisites are restored

### [CSS-505] Resource Transport
The game allows resources to be transported between claim stakes.

**Requirements:**
- "Get Resources" button for resource acquisition
- "How to Get Resources" shows options for unavailable resources:
  - Recommended Claim Stakes: Planets with the resource
  - Production Chain: Steps to create the resource
  - Get Resources: Option to instantly receive needed resources

**Expected Behavior:**
- Resource transport is instantaneous when using "Get Resources"
- Production chains can span multiple claim stakes
- Recommended claim stakes prioritize planets with high resource richness
- Resource acquisition options are dynamically generated based on data

### [CSS-506] Resource Richness System
The richness system determines resource extraction efficiency on different planets.

**Requirements:**
- Each planet archetype defines richness values for different resources
- Richness is a multiplier applied to resourceExtractionRate values only
- Richness values range from 0 (not available) to multiple values (very abundant)
- Richness does NOT affect resourceRate values (processing/consumption)
- UI displays richness values in resource cards on planet selection screen

**Expected Behavior:**
- Resources with 0 richness cannot be extracted on that planet
- Higher richness planets are more efficient for extracting specific resources
- Richness values are displayed in the UI as "Richness: 1x", "Richness: 2x", etc.
- Resource cards are filtered to only show resources with richness > 0
- Resource production rates dynamically update based on applicable richness

### [CSS-507] Real-Time Resource Calculation
The resource system must calculate and update rates every simulation second.

**Requirements:**
- Resource calculations occur every simulation tick (1 second game time)
- Net resource rates are calculated by aggregating all buildings:
  - Sum all resourceExtractionRate values (affected by richness)
  - Sum all positive resourceRate values (production)
  - Sum all negative resourceRate values (consumption)
- Resource amounts update based on net rates
- UI displays current amounts and rates in real-time

**Expected Behavior:**
- Resource amounts visibly increase/decrease every simulation second
- Production rates are recalculated when buildings are added/removed/shut down
- Storage limits prevent resource accumulation beyond capacity
- Negative net rates can deplete resources to zero
- UI updates reflect changes immediately

## Building System

### [CSS-601] Building Categories
The game defines multiple building categories with different functions.

**Requirements:**
- Two primary categories:
  - Hubs: Unique buildings that unlock modules (one per type per claim stake)
  - Modules: Multiple instances can be built, connected to respective hubs
- Hub types:
  - Central Hub: Core building, power, crew, storage, fuel consumption
  - Extraction Hub: Unlocks extraction modules
  - Processing Hub: Unlocks processing modules
  - Storage Hub: Unlocks storage modules
  - Farm Hub: Unlocks farm modules
- Module types:
  - Power Generation Modules: Generate power, consume fuel
  - Crew Quarters Module: Increases crew slots
  - Extraction Modules: Extract specific resources
  - Processing Modules: Convert resources
  - Storage Modules: Increase storage capacity
  - Farm Modules: Produce organic resources
  - Fuel Generator Module: Self-sustainable fuel (T3+)

**Expected Behavior:**
- Hubs and modules are determined by their data properties
- Central Hub is automatically provided at T1 when claim stake is purchased
- Only one of each hub type can exist on a claim stake
- Multiple modules of the same type can be built
- Adding/removing building types in JSON updates all relevant UI elements

### [CSS-602] Building Properties
Each building has specific properties that determine its behavior.

**Requirements:**
- Basic Properties: ID, name, description, tier, minimum tier
- Placement Properties: Slots required, hub value
- Construction Properties: Cost, construction time, deconstruction time, refund
- Operational Properties: Crew slots, needed crew, power, storage
- Resource Properties: Resource rate (inputs), resource extraction rate (outputs)
- Tag Properties: Required tags, added tags

**Expected Behavior:**
- Properties determine building availability and functionality
- Tier affects building efficiency and output
- Minimum tier determines earliest availability
- Resource rates determine production capabilities
- Tags determine prerequisites and unlock additional buildings

### [CSS-603] Building Prerequisites
Buildings have specific requirements that must be met before construction.

**Requirements:**
- Power: Sufficient power generation must exist BEFORE construction
- Crew: Sufficient crew slots must exist BEFORE construction
- Slots: Sufficient building slots must be available
- Tags: All required tags must be present on the claim stake
- Resources: Construction resources must be available

**Expected Behavior:**
- Prerequisites are checked before enabling construction
- Missing prerequisites disable the construct button
- Tooltip explains missing prerequisites
- "Show buildings requiring prerequisites" checkbox reveals buildings that could be unlocked

### [CSS-604] Building Cards
Building information is displayed in standardized cards with specific layout.

**Requirements:**
- Fixed height with interior scrolling
- Consistent appearance between preview and actual building cards
- Three tab types:
  - Overview: Building stats and requirements
  - Production: Resource inputs and outputs
  - Construct/Upgrade: Construction options and costs
- Tier tabs showing T1-T5 options
- Hub buildings have "HUB" badge
- Module buildings show count indicator

**Expected Behavior:**
- Cards maintain consistent height when switching between tabs
- Interior scrollbars appear when content exceeds fixed height
- Building cards and preview cards follow the same styling
- Tier tabs limited by claim stake tier for hubs
- All tiers available for modules

### [CSS-605] Construction and Upgrading
The construction system handles both new buildings and upgrades with strict prerequisite validation.

**Requirements:**
- **Construction Workflow**:
  1. Validate all prerequisites BEFORE starting construction
  2. Check power requirements: Total power generation ≥ total power consumption + new building power
  3. Check crew requirements: Available crew slots ≥ building's neededCrew
  4. Check slot requirements: Available building slots ≥ building's slots requirement
  5. Check resource costs: All construction resources must be available
  6. Deduct construction costs immediately when construction begins
  7. Create new building instance with unique ID
  8. Add building to claim stake's buildings array

- **Upgrade Workflow**:
  1. Validate all prerequisites for the upgraded building
  2. Check power requirements for the new tier
  3. Check crew requirements for the new tier
  4. Check resource costs for the upgrade
  5. Deduct upgrade costs immediately when upgrade begins
  6. Replace existing building with upgraded version
  7. Maintain building instance continuity

**Expected Behavior:**
- **Prerequisites are enforced**: Construction/upgrade buttons are disabled when requirements aren't met
- **Clear error messages**: UI shows exactly what prerequisites are missing
- **Resource deduction**: Construction costs are immediately deducted from available resources
- **Power validation**: System ensures power grid can support new/upgraded buildings
- **Crew validation**: System ensures sufficient crew is available for operation
- **Slot validation**: System ensures claim stake has sufficient building slots
- **Hub uniqueness**: Only one hub of each type can exist per claim stake
- **Module instances**: Multiple modules of the same type can be built with unique instance IDs

### [CSS-606] Prerequisite Validation System
The prerequisite validation system ensures all requirements are met before construction/upgrade.

**Requirements:**
- **Power Validation**:
  - Calculate total power generation from all operational buildings
  - Calculate total power consumption including the new/upgraded building
  - Ensure net power ≥ 0 after construction/upgrade
  - Account for buildings that may shut down due to resource constraints

- **Crew Validation**:
  - Calculate total crew slots from all buildings
  - Calculate total crew needed including the new/upgraded building
  - Ensure available crew ≥ needed crew for the new building

- **Slot Validation**:
  - Calculate total building slots from claim stake definition and hubs
  - Calculate slots used by all existing buildings
  - Ensure available slots ≥ slots required by new building

- **Resource Validation**:
  - Check both local and global resource pools
  - Ensure all construction/upgrade costs can be paid
  - Display missing resources clearly in UI

**Expected Behavior:**
- **Real-time validation**: Prerequisites are checked continuously as game state changes
- **Visual indicators**: UI clearly shows which prerequisites are met/unmet
- **Detailed tooltips**: Hover information explains exactly what's needed
- **Progressive disclosure**: Advanced requirements are shown when relevant
- **Graceful degradation**: Partial requirements are indicated (e.g., "Need 50 more steel")

### [CSS-607] Building Instance Management
The building instance management system handles unique building identities and state.

**Requirements:**
- **Instance ID Generation**:
  - Hub buildings: `claimStakeBuilding-{type}-hub-t{tier}-instance-{timestamp}`
  - Module buildings: `claimStakeBuilding-{type}-module-t{tier}-instance-{timestamp}`
  - Unique timestamps ensure no ID collisions

- **Building State Tracking**:
  - Operational status (running/stopped)
  - Construction progress (for buildings under construction)
  - Resource production/consumption rates
  - Power generation/consumption
  - Crew assignment

- **Upgrade Continuity**:
  - Maintain instance relationships during upgrades
  - Preserve building-specific state where applicable
  - Update tier-dependent properties (power, efficiency, etc.)

**Expected Behavior:**
- **Unique identification**: Every building instance has a unique, persistent ID
- **State persistence**: Building state is maintained across game sessions
- **Upgrade tracking**: System tracks which buildings have been upgraded
- **Performance optimization**: Efficient lookup and management of building instances

## Time & Simulation

### [CSS-701] Simulation Timer
The game runs on a simulated time system with adjustable speeds.

**Requirements:**
- 1-second real-time update interval
- Adjustable speeds: 1x, 2x, 5x, 10x, 100x, 1000x
- Pause/resume functionality
- Elapsed time display (HH:MM:SS)

**Expected Behavior:**
- At 1x, each second increases game time by 1 second
- At 5x, each second increases game time by 5 seconds
- Speed changes take effect immediately on the next tick
- Pausing stops all resource production and consumption
- Time display updates with each simulation tick

### [CSS-702] Resource Simulation
Resources accumulate and are consumed based on production rates.

**Requirements:**
- Resource rates are calculated per second
- Raw extraction: Base rate × richness = actual rate
- Processing: Requires all inputs to generate outputs
- Storage limits prevent excess accumulation
- Production dependencies are enforced

**Expected Behavior:**
- Resources accumulate continuously during simulation
- Production stops when storage is full
- Processing halts when input resources are depleted
- Consumption continues as long as resources are available
- UI updates to reflect current resource amounts and rates

### [CSS-703] Fuel System
The fuel system powers buildings and requires management.

**Requirements:**
- Power-generating buildings consume fuel
- Fuel consumption based on resourceRate property
- Manual fuel resupply button in fuel status section
- Tier 3+ buildings enable self-sustainable fuel system

**Expected Behavior:**
- Fuel decreases according to consumption rates
- When fuel runs out, power generation stops
- Buildings become non-operational without power
- Manual resupply adds 1000 × claim stake tier units of fuel
- Self-sustainable fuel system reduces manual intervention at higher tiers

### [CSS-704] Construction Queue
Buildings under construction appear in a queue with progress tracking.

**Requirements:**
- Buildings under construction appear in a queue
- Time remaining is displayed for each item
- Progress bars show completion percentage
- Construction automatically finishes when time elapses

**Expected Behavior:**
- Construction times are affected by simulation speed
- Multiple buildings can be under construction simultaneously
- Completed buildings become operational immediately
- Buildings in queue are sorted by completion time

## Game Progression

### [CSS-801] Progression Stages
The game features distinct progression stages with increasing complexity.

**Requirements:**
- Early Game: Single T1 claim stake, basic extraction and processing
- Mid Game: Multiple claim stakes, cross-stake resource chains, T2-T3 hubs
- Late Game: T5 claim stakes, self-sustaining systems, complex networks

**Expected Behavior:**
- Achievement triggers mark progression between stages
- Resource requirements increase with progression
- Later stages unlock more efficient buildings and processes
- Gameplay depth increases as player advances

### [CSS-802] Resource Chains
Resources can be processed through multi-step chains across claim stakes.

**Requirements:**
- Basic resources are extracted directly
- Processed resources require one or more input resources
- Advanced resources require multiple processing steps
- Resource chains can span multiple claim stakes

**Expected Behavior:**
- "How to Get Resources" shows the complete chain to produce a resource
- Complex resources require establishing multiple extraction and processing facilities
- Later game focuses on optimizing resource chains for efficiency
- Transportation between claim stakes enables specialized production facilities

### [CSS-803] Efficiency Optimization
Players can optimize their operations for maximum efficiency.

**Requirements:**
- Building placement affects overall efficiency
- Resource production can be balanced for sustainable operation
- Power generation and consumption should be optimized
- Storage capacity allocation requires strategic decisions

**Expected Behavior:**
- Efficient setups produce more resources with fewer buildings
- Balanced power systems minimize waste
- Strategic use of higher tier buildings improves output
- Specialized claim stakes increase overall efficiency

## Achievement System

### [CSS-901] Achievement Categories and Structure
The game features a comprehensive achievement system with multiple categories tracking different aspects of gameplay.

**Requirements:**
- **Five Primary Achievement Categories**:
  - **Resource Mastery**: Collection, production rates, and resource diversity
  - **Industrial Development**: Building construction, upgrades, and specialization
  - **Territorial Expansion**: Claim stake acquisition, planet diversity, and faction relationships
  - **Engineering Excellence**: Complex production chains, efficiency optimization, and technological advancement
  - **Exploration Milestones**: Discovery, experimentation, and mastery of game mechanics

- **Achievement Structure**:
  - Each achievement has multiple tiers (Bronze, Silver, Gold, Platinum, Diamond)
  - Progressive requirements that scale with player advancement
  - Hidden achievements that unlock through specific actions or combinations
  - Meta-achievements that require completing multiple other achievements

**Expected Behavior:**
- Achievements unlock progressively during gameplay
- Achievement notification appears when completed with tier indication
- Achievement progress is saved with game state and persists across sessions
- Adding/removing achievements in JSON updates the achievement system dynamically

### [CSS-902] Resource Mastery Achievements
Track player progress in resource collection, production, and management.

**Requirements:**
- **Resource Collection Achievements**:
  - "First Steps": Collect 1,000 of any resource (Bronze)
  - "Resource Hoarder": Collect 100,000 of any resource (Silver)
  - "Industrial Stockpile": Collect 1,000,000 of any resource (Gold)
  - "Resource Magnate": Collect 10,000,000 of any resource (Platinum)
  - "Galactic Reserves": Collect 100,000,000 of any resource (Diamond)

- **Production Rate Achievements**:
  - "Steady Production": Achieve 10/sec production rate of any resource (Bronze)
  - "Industrial Scale": Achieve 100/sec production rate of any resource (Silver)
  - "Mass Production": Achieve 1,000/sec production rate of any resource (Gold)
  - "Mega Factory": Achieve 10,000/sec production rate of any resource (Platinum)

- **Resource Diversity Achievements**:
  - "Resource Explorer": Produce 10 different resource types (Bronze)
  - "Material Scientist": Produce 25 different resource types (Silver)
  - "Resource Master": Produce 50 different resource types (Gold)
  - "Galactic Economist": Produce all available resource types (Platinum)

**Expected Behavior:**
- Track cumulative resource collection across all claim stakes
- Monitor peak production rates for each resource type
- Count unique resource types produced (not just collected)
- Update progress in real-time as resources are produced/collected

### [CSS-903] Industrial Development Achievements
Track building construction, upgrades, and industrial specialization.

**Requirements:**
- **Construction Achievements**:
  - "First Builder": Construct 5 buildings (Bronze)
  - "Industrial Developer": Construct 25 buildings (Silver)
  - "Mega Constructor": Construct 100 buildings (Gold)
  - "Galactic Architect": Construct 500 buildings (Platinum)

- **Upgrade Achievements**:
  - "Improvement Initiative": Upgrade 5 buildings to T2+ (Bronze)
  - "Technology Adopter": Upgrade 15 buildings to T3+ (Silver)
  - "Advanced Engineer": Upgrade 25 buildings to T4+ (Gold)
  - "Master Technician": Upgrade 50 buildings to T5 (Platinum)

- **Specialization Achievements**:
  - "Power Engineer": Build 10 power generation modules (Bronze)
  - "Extraction Specialist": Build 15 extraction modules (Silver)
  - "Processing Expert": Build 20 processing modules (Gold)
  - "Industrial Complex": Have all hub types on a single claim stake (Silver)
  - "Mega Facility": Have 50+ buildings on a single claim stake (Platinum)

**Expected Behavior:**
- Count total buildings constructed across all claim stakes
- Track highest tier achieved for each building type
- Monitor specialization patterns and building type distributions
- Recognize complex industrial setups and efficient designs

### [CSS-904] Territorial Expansion Achievements
Track claim stake acquisition, planet diversity, and territorial control.

**Requirements:**
- **Claim Stake Achievements**:
  - "First Claim": Purchase your first claim stake (Bronze)
  - "Expanding Empire": Own 5 claim stakes (Silver)
  - "Territorial Control": Own 15 claim stakes (Gold)
  - "Galactic Dominance": Own 50 claim stakes (Platinum)

- **Planet Diversity Achievements**:
  - "Planet Explorer": Own claim stakes on 3 different planet types (Bronze)
  - "Cosmic Colonizer": Own claim stakes on 5 different planet types (Silver)
  - "Universal Presence": Own claim stakes on all planet types (Gold)

- **Faction Achievements**:
  - "Diplomatic Relations": Own claim stakes with all 3 factions (Silver)
  - "Faction Specialist": Own 10+ claim stakes with a single faction (Gold)
  - "Galactic Diplomat": Maintain balanced presence across all factions (Platinum)

- **Tier Achievements**:
  - "Tier Advancement": Own a T3 claim stake (Bronze)
  - "High-Tech Operations": Own a T4 claim stake (Silver)
  - "Elite Territory": Own a T5 claim stake (Gold)
  - "Tier Master": Own claim stakes of all tiers (Platinum)

**Expected Behavior:**
- Track claim stake ownership across all planets and factions
- Monitor tier distribution and advancement patterns
- Recognize strategic territorial expansion and specialization
- Update achievements when claim stakes are purchased or upgraded

### [CSS-905] Engineering Excellence Achievements
Track complex production chains, efficiency optimization, and technological mastery.

**Requirements:**
- **Production Chain Achievements**:
  - "Supply Chain": Create a 3-step production chain (Bronze)
  - "Industrial Network": Create a 5-step production chain (Silver)
  - "Complex Manufacturing": Create a 7-step production chain (Gold)
  - "Mega Production Line": Create a 10-step production chain (Platinum)

- **Efficiency Achievements**:
  - "Self-Sufficient": Achieve fuel self-sufficiency on a claim stake (Silver)
  - "Zero Waste": Achieve 100% resource utilization efficiency (Gold)
  - "Perfect Balance": Maintain stable resource levels for 1 hour game time (Gold)
  - "Optimization Master": Achieve maximum efficiency across all systems (Platinum)

- **Technology Achievements**:
  - "Advanced Materials": Produce 10 different T4+ resources (Silver)
  - "Cutting Edge": Produce 5 different T5 resources (Gold)
  - "Technology Pioneer": Be first to produce a new resource type (Hidden)
  - "Innovation Leader": Discover optimal building combinations (Hidden)

**Expected Behavior:**
- Analyze production chains and track complexity metrics
- Monitor resource flow efficiency and waste reduction
- Recognize innovative building combinations and optimal setups
- Track technological advancement and resource tier progression

### [CSS-906] Achievement Display and Progression
Provide an engaging interface for viewing achievement progress and completion.

**Requirements:**
- **Achievement Panel Interface**:
  - Organized by category with expandable sections
  - Progress bars for multi-tier achievements
  - Completion status with date/time stamps
  - Achievement icons and tier indicators (Bronze, Silver, Gold, Platinum, Diamond)

- **Progress Tracking**:
  - Real-time progress updates
  - Percentage completion for complex achievements
  - Next milestone indicators
  - Estimated time to completion (where applicable)

- **Notification System**:
  - Achievement unlock notifications with celebration effects
  - Progress milestone notifications (25%, 50%, 75% completion)
  - Achievement hint system for hidden achievements
  - Achievement sharing capabilities

**Expected Behavior:**
- Achievement panel is accessible from top bar button
- Achievements are sorted by category and completion status
- Progress indicators update in real-time during gameplay
- Notifications appear with appropriate visual and audio feedback
- Hidden achievements provide subtle hints without spoiling the discovery

## Save/Load System

### [CSS-A01] Game State Persistence
The game provides automatic and manual saving of game state.

**Requirements:**
- Automatic saving at regular intervals (every 5 minutes)
- Manual save button in top bar
- Complete game state is stored:
  - Owned claim stakes and buildings
  - Resource amounts and production
  - Time elapsed
  - Achievement progress

**Expected Behavior:**
- Auto-save notification appears when complete
- Manual save provides confirmation
- Save files use timestamp in name
- Save data persists between sessions

### [CSS-A02] Save Management
The game provides a system to manage multiple save files.

**Requirements:**
- Save file listing screen
- Support for multiple save files
- Delete functionality
- Save file preview information

**Expected Behavior:**
- Save files are listed chronologically
- Selecting a save file shows preview
- Delete button prompts for confirmation
- Preview shows key metrics

### [CSS-A03] Loading System
The game allows loading previously saved game states.

**Requirements:**
- Load button on main menu
- Loading from save files
- Resume game state exactly as saved
- Restore all timers and production

**Expected Behavior:**
- Loading replaces current game state
- Loading notification shows progress
- Game resumes from saved state
- Confirmation prompt if unsaved progress exists

[CSS-A04] Save Data Structure
The save data structure must capture the complete game state for persistence.
Requirements:

Save data structure:

json{
  "saveTimestamp": "[timestamp]",
  "gameTime": "[seconds]",
  "simulationSpeed": "[1x, 2x, 5x, etc.]",
  "globalResources": {
    "cargo-[resource-id]": [amount],
    ...
  },
  "ownedClaimStakes": {
    "claimStakeInstance-[id]": {
      "name": "Claim Stake Name",
      "description": "Description",
      "claimStakeDefinition": "claimStakeDefinition-[id]",
      "planet": "planetInstance-[id]",
      "tags": [
        "tag-[category]-[value]",
        ...
      ],
      "buildings": {
        "claimStakeBuilding-[id]": {
          "count": [number],
          "tier": [1-5],
          "constructionProgress": [0-100],
          "upgradeInProgress": [boolean]
        },
        ...
      },
      "resources": {
        "cargo-[resource-id]": {
          "amount": [number],
          "rate": [number],
          "storage": [capacity]
        },
        ...
      },
      "fuel": {
        "amount": [number],
        "capacity": [number],
        "rate": [consumption-rate]
      },
      "power": {
        "generation": [number],
        "consumption": [number],
        "net": [number]
      },
      "crew": {
        "total": [number],
        "used": [number],
        "available": [number]
      },
      "slots": {
        "total": [number],
        "used": [number],
        "available": [number]
      }
    },
    ...
  },
  "achievements": {
    "achievement-[id]": {
      "completed": [boolean],
      "progress": [number],
      "completionDate": "[timestamp]"
    },
    ...
  },
  "constructionQueue": [
    {
      "claimStakeId": "claimStakeInstance-[id]",
      "buildingId": "claimStakeBuilding-[id]",
      "tier": [1-5],
      "timeRemaining": [seconds],
      "progress": [0-100]
    },
    ...
  ]
}
Expected Behavior:

Save data completely restores game state
All resource amounts, rates, and storage are preserved
Building states including construction progress are maintained
Tags system state is fully captured
Construction queue is preserved exactly as left

[CSS-A05] Load Process Implementation
The load process must restore the complete game state from save data.
Requirements:

Loading process steps:

Clear current game state
Load save data JSON
Validate save data structure
Restore global resources
Recreate all claim stake instances
Rebuild tag system state for each claim stake
Reconstruct all buildings at correct tiers
Restore construction queue
Resume simulation at saved speed
Update all UI elements to reflect loaded state



Expected Behavior:

Game state is identical before save and after load
All UI elements reflect proper state
Resource production resumes as before
Construction continues from saved progress
Time simulation continues from saved point
Error handling gracefully manages corrupted saves


## UI Style Guide

### [CSS-B01] Color Palette
The game uses a consistent color scheme throughout the UI.

**Requirements:**
- Primary Background: #121212
- Secondary Background: #1E1E1E
- Tertiary Background: #2D2D2D
- Primary Text: #FFFFFF
- Secondary Text: #AAAAAA
- Accent Primary: #3A86FF
- Accent Secondary: #8338EC
- Success: #38B000
- Warning: #FFAA00
- Error: #FF5252
- Positive Value: #38B000
- Negative Value: #FF5252

**Expected Behavior:**
- Colors maintain consistent meaning throughout UI
- Positive values use Success color
- Negative values use Error color
- Warnings use Warning color
- UI elements maintain proper contrast ratios

### [CSS-B02] Typography
The game uses consistent typography throughout the UI.

**Requirements:**
- Primary Font: 'Inter', sans-serif
- Heading 1: 24px, 600 weight
- Heading 2: 20px, 600 weight
- Heading 3: 16px, 600 weight
- Body Text: 14px, 400 weight
- Small Text: 12px, 400 weight
- Button Text: 14px, 500 weight

**Expected Behavior:**
- Text maintains consistent sizing throughout UI
- Headings use appropriate size hierarchy
- Text has sufficient contrast against backgrounds
- Font weights maintain readability at all sizes

### [CSS-B03] UI Components
The game features standardized UI components with consistent styling.

**Requirements:**
- Buttons:
  - Primary Button: #3A86FF background, #FFFFFF text
  - Secondary Button: #2D2D2D background, #FFFFFF text
  - Danger Button: #FF5252 background, #FFFFFF text
  - Border Radius: 4px
  - Padding: 8px 16px
- Cards:
  - Background: #1E1E1E
  - Border: 1px solid #333333
  - Border Radius: 8px
  - Padding: 16px
  - Box Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
- Tabs:
  - Inactive Tab: #AAAAAA text, transparent border
  - Active Tab: #FFFFFF text, #3A86FF border-bottom
  - Padding: 8px 16px
- Inputs:
  - Background: #2D2D2D
  - Border: 1px solid #444444
  - Text: #FFFFFF
  - Placeholder: #888888
  - Focus Border: #3A86FF
  - Border Radius: 4px
  - Padding: 8px 12px

**Expected Behavior:**
- UI components maintain consistent styling throughout
- Hover states provide clear feedback
- Disabled states are visually distinct
- Focus states are clearly visible for accessibility

[CSS-B04] Layout Implementation Details
The layout implementation must follow precise specifications for consistency.
Requirements:

Three-panel layout dimensions:

Top status bar: 60px height, 100% width
Left sidebar: 300px width, calc(100vh - 60px) height
Main content area: calc(100vw - 300px) width, calc(100vh - 60px) height


Responsive considerations:

Minimum window width: 1024px
Minimum window height: 768px
Sidebar collapses to icons only below 1200px width
Building cards maintain fixed 300px width, 300px height


Grid spacing:

Card margins: 16px
Card padding: 16px
Section padding: 24px
Tab padding: 8px 16px



Expected Behavior:

Layout remains functional at all supported dimensions
No elements overlap or overflow inappropriately
Scrollbars appear only when necessary
Cards maintain fixed dimensions regardless of content
UI elements scale appropriately with window size

[CSS-B05] Building Card Template
Building cards must follow a precise template for consistent appearance.
Requirements:

Building card template structure:

html<div class="building-card">
  <!-- Header -->
  <div class="building-card-header">
    <div class="building-name">{Building Name}</div>
    <div class="building-badge">{HUB/MODULE Badge}</div>
  </div>
  
  <!-- Tier Tabs -->
  <div class="tier-tabs">
    <div class="tier-tab {active}">T1</div>
    <div class="tier-tab">T2</div>
    <!-- Additional tier tabs -->
  </div>
  
  <!-- Content Tabs -->
  <div class="content-tabs">
    <div class="content-tab {active}">Overview</div>
    <div class="content-tab">Production</div>
    <div class="content-tab">Construct/Upgrade</div>
  </div>
  
  <!-- Tab Content with fixed height and interior scroll -->
  <div class="tab-content" style="height: 180px; overflow-y: auto;">
    <!-- Overview Tab Content -->
    <div class="tab-panel {visible}">
      <div class="building-stats">
        <div class="stat-row">
          <div class="stat-label">Power:</div>
          <div class="stat-value {positive/negative}">{value}</div>
        </div>
        <!-- Additional stats -->
      </div>
    </div>
    
    <!-- Production Tab Content -->
    <div class="tab-panel">
      <!-- Resource inputs and outputs -->
    </div>
    
    <!-- Construct Tab Content -->
    <div class="tab-panel">
      <!-- Construction requirements and button -->
    </div>
  </div>
</div>
Expected Behavior:

All building cards follow identical template
Fixed heights maintain consistent UI
Interior scrolling handles overflow content
Tab switching doesn't change card dimensions
Card design matches approved UI screenshots

## Notification System

### [CSS-C01] Notification Types
The game implements multiple notification types for different purposes.

**Requirements:**
- Four notification types:
  - Information: General updates (blue)
  - Success: Positive events (green)
  - Warning: Attention required (yellow)
  - Error: Problems or failures (red)
- Dismissable notifications
- Auto-dismiss for non-critical notifications

**Expected Behavior:**
- Notifications appear in the top-right corner
- Notifications stack vertically with newest on top
- Critical notifications require manual dismissal
- Information notifications auto-dismiss after 5 seconds

### [CSS-C02] Notification Triggers
The game triggers notifications for various game events.

**Requirements:**
- Building completion
- Resource storage approaching capacity (80%+)
- Fuel running low (20% or less)
- Achievement unlocked
- Auto-save completed
- Error conditions

**Expected Behavior:**
- Notifications trigger at appropriate thresholds
- Building completion shows success notification
- Resource and fuel warnings show warning notification
- Achievements show success notification with animation

### [CSS-C03] Notification History
The game maintains a history of recent notifications.

**Requirements:**
- Notification history panel
- Store recent notifications (last 50)
- Filter by notification type
- Clear all button

**Expected Behavior:**
- Notification history is accessible from top bar
- Notifications are listed chronologically
- Filtering updates list immediately
- Clear all button prompts for confirmation

## JSON Data Structure

### [CSS-D01] PlanetArchetype Structure
The JSON data defines planet archetypes with their characteristics.

**Structure:**
```json
{
  "planetArchetype-[id]": {
    "name": "Planet Name",
    "description": "Description text",
    "richness": {
      "cargo-[resource-id]": [richness-value],
      ...
    },
    "tags": [
      "tag-[category]-[value]",
      ...
    ]
  }
}
```

**Expected Behavior:**
- Planet archetypes define resource richness and tags
- Adding a new planet archetype makes it available in-game
- Modifying richness values affects resource extraction rates
- Changing tags affects building availability

### [CSS-D02] ClaimStakeDefinition Structure
The JSON data defines claim stake types that can be purchased.

**Structure:**
```json
{
  "claimStakeDefinition-[id]": {
    "id": "claimStakeDefinition-[id]",
    "name": "Claim Stake Name",
    "tier": "[1-5]",
    "slots": [number],
    "rentMultiplier": [number],
    "hubValue": [number],
    "requiredTags": [
      "tag-[category]-[value]",
      ...
    ],
    "addedTags": [
      "tag-[category]-[value]",
      ...
    ]
  }
}
```

**Expected Behavior:**
- Claim stake definitions determine available slots and tier
- Required tags determine which planet archetypes can use this definition
- Added tags provide additional capabilities to the claim stake
- Hub value determines which hubs can be built

### [CSS-D03] ClaimStakeBuilding Structure
The JSON data defines buildings that can be constructed on claim stakes.

**Structure:**
```json
{
  "claimStakeBuilding-[id]": {
    "id": "[id]",
    "name": "Building Name",
    "description": "Description text",
    "tier": [1-5],
    "minimumTier": [1-5],
    "slots": [number],
    "constructionCost": {
      "cargo-[resource-id]": [amount],
      ...
    },
    "constructionTime": [seconds],
    "crewSlots": [number],
    "neededCrew": [number],
    "power": [number],
    "storage": [number],
    "hubValue": [number],
    "requiredTags": [
      "tag-[category]-[value]",
      ...
    ],
    "addedTags": [
      "tag-[category]-[value]",
      ...
    ],
    "resourceRate": {
      "cargo-[resource-id]": [rate],
      ...
    },
    "resourceExtractionRate": {
      "cargo-[resource-id]": [rate],
      ...
    },
    "deconstructionTime": [seconds],
    "refund": {
      "cargo-[resource-id]": [amount],
      ...
    }
  }
}
```

**Expected Behavior:**
- Building properties determine construction requirements and capabilities
- Required tags filter which claim stakes can build this building
- Added tags enable additional buildings when constructed
- Resource rates define inputs (consumption) and outputs (production)
- Power value is positive for generation, negative for consumption

### [CSS-D04] Cargo (Resource) Structure
The JSON data defines resources and their properties.

**Structure:**
```json
{
  "cargo-[id]": {
    "id": "cargo-[id]",
    "name": "Resource Name",
    "tier": [1-5],
    "planetTypes": [
      "Planet Type 1",
      ...
    ],
    "factions": [
      "Faction 1",
      ...
    ],
    "recipe": {
      "inputs": {
        "cargo-[resource-id]": [amount],
        ...
      },
      "outputs": {}
    }
  }
}
```

**Expected Behavior:**
- Resource properties determine availability and production
- Tier indicates minimum claim stake tier required
- Planet types and factions limit where resource can be found
- Recipe defines inputs required to create processed resources
- Empty inputs indicate a raw resource

### [CSS-D05] Planet Instance Structure
The JSON data defines planet instances with their available claim stakes.

**Structure:**
```json
{
  "planets": {
    "planetInstance-[id]": {
      "name": "Planet Name",
      "description": "Description",
      "planetArchetype": "planetArchetype-[id]",
      "starbaseLevel": "[0-6]",
      "claimStakes": {
        "claimStakeInstance-[id]": {
          "instance": {
            "name": "Claim Stake Name",
            "description": "Description",
            "claimStakeDefinition": "claimStakeDefinition-[id]",
            "buildings": {
              "claimStakeBuilding-[id]": [count],
              ...
            },
            "storage": [capacity]
          },
          "count": [number]
        },
        ...
      }
    },
    ...
  }
}
```

**Expected Behavior:**
- Planet instances link archetypes to specific locations
- Starbase level controls available claim stake tiers
- Claim stake instances define available purchases
- Buildings and storage define pre-existing structures
- Count determines quantity available for purchase

[CSS-D06] Planet Instance Implementation
The planet instance section of the JSON structure must be implemented precisely.
Structure Details:
json{
  "planets": {
    "planetInstance-[id]": {
      "name": "Planet Name",
      "description": "Description",
      "planetArchetype": "planetArchetype-[id]", // References the planetArchetype definition
      "starbaseLevel": "[0-6]", // Player-adjustable value that determines available claim stake tiers
      "claimStakes": {
        "claimStakeInstance-[id]": { // These are templates that the player can purchase
          "instance": {
            "name": "Claim Stake Name",
            "description": "Description",
            "claimStakeDefinition": "claimStakeDefinition-[id]", // References the claim stake template
            "buildings": { // Empty at first (except for Central Hub T1 which is auto-added on purchase)
              "claimStakeBuilding-[id]": [count],
              ...
            },
            "storage": [capacity] // Initial value comes from Central Hub T1
          },
          "count": [number] // Available quantity of this claim stake definition
        },
        ...
      }
    },
    ...
  }
}
Important Implementation Notes:

The starbaseLevel is a property of the planet instance, not individual claim stakes
The claimStakes object contains template definitions that can be purchased, not player-owned instances
When a player purchases a claim stake, a new instance is created in the player's owned claim stakes list
The initial state of a purchased claim stake includes just the Central Hub T1 and initial fuel
The buildings object starts with just the Central Hub T1 entry and expands as the player constructs more buildings

[CSS-D07] Owned Claim Stake Instance Structure
The owned claim stake instance structure must be implemented to track player progress.
Structure:
json{
  "ownedClaimStakes": {
    "claimStakeInstance-[unique-id]": {
      "id": "claimStakeInstance-[unique-id]",
      "name": "Claim Stake Name",
      "planetInstance": "planetInstance-[id]",
      "claimStakeDefinition": "claimStakeDefinition-[id]",
      "tier": [1-5], // Inherited from claimStakeDefinition
      "slots": {
        "total": [number], // Inherited from claimStakeDefinition
        "used": [number], // Sum of slots used by constructed buildings
        "available": [number] // total - used
      },
      "tags": [ // Combined tags from all sources
        "tag-[category]-[value]",
        ...
      ],
      "buildings": {
        "claimStakeBuilding-[id]": {
          "id": "claimStakeBuilding-[id]",
          "tier": [1-5],
          "count": [number],
          "constructionTime": [seconds-remaining],
          "isConstructing": [boolean]
        },
        ...
      },
      "resources": {
        "cargo-[resource-id]": {
          "amount": [number],
          "rate": [number-per-second],
          "storage": [capacity]
        },
        ...
      },
      "fuel": {
        "amount": [number],
        "capacity": [number],
        "consumption": [rate-per-second]
      },
      "power": {
        "generation": [number],
        "consumption": [number],
        "net": [number]
      },
      "crew": {
        "slots": [number],
        "used": [number],
        "available": [number]
      }
    },
    ...
  }
}
Expected Behavior:

When a player purchases a claim stake, this structure is created
Structure is updated in real-time as buildings are constructed, resources are produced, etc.
Tags list combines planet archetype tags, claim stake definition tags, and building added tags
Resource rates are calculated based on constructed buildings and planet richness
UI displays information from this structure in the claim stake overview

## Implementation Guidelines

### [CSS-E01] Data-Driven Development
All game mechanics, balancing values, and content must be loaded from the JSON data files.

**Requirements:**
- No gameplay values should be hardcoded
- Changes to game balance should require only JSON edits
- UI must adapt dynamically to data structure

**Expected Behavior:**
- Adding new content requires only JSON updates
- Removing content requires only JSON updates
- Game logic works with any valid data structure

### [CSS-E02] Consistent UI Styling
All UI elements must follow the style guide precisely.

**Requirements:**
- Fixed heights for building cards with interior scrolling
- Consistent spacing and padding
- Standard color palette applied throughout
- Typography rules followed for all text

**Expected Behavior:**
- UI appears cohesive and professional
- Building cards maintain consistent height regardless of content
- Color meanings remain consistent across the application
- Text is readable at all sizes

### [CSS-E03] Performance Optimization
The game must perform efficiently even at high simulation speeds.

**Requirements:**
- Efficient data structures for game state
- Memoization for complex calculations
- Optimized UI updates
- Smooth performance at high speeds

**Expected Behavior:**
- Game runs smoothly at 1000x speed
- No performance degradation with many claim stakes
- Resource calculations remain accurate at all speeds
- UI updates without lag or stutter

### [CSS-E04] Cross-Claim Stake Integration
The game must seamlessly integrate operations across multiple claim stakes.

**Requirements:**
- Resource tracking at both local and global levels
- Resource transportation between claim stakes
- Production chains that span multiple claim stakes
- Global overview of all operations

**Expected Behavior:**
- Resources can be viewed globally or per claim stake
- Production chains can involve multiple claim stakes
- Efficient cross-stake operations are possible
- UI provides clear information about operations across all claim stakes

### [CSS-E05] Testing Methodology
Implementation must include comprehensive testing of all systems.

**Requirements:**
- Functional testing of core mechanics
- Integration testing between systems
- Performance testing at scale
- User experience testing

**Expected Behavior:**
- All game mechanics function as specified
- Systems interact correctly
- Performance remains acceptable under load
- UI provides clear feedback and intuitive controls

[CSS-E06] Tag System Implementation
The tag system implementation must handle complex dependency chains with recursive analysis.
Requirements:

Tag system implementation approach:

Create master list of all possible tags in the game
For each claim stake instance, maintain:

Base tags (from planet archetype and claim stake definition)
Added tags (from constructed buildings)
Available tags (base tags + added tags + potential tags from buildable prerequisites)


Implement recursive tag resolution algorithm:
pseudocodefunction resolveAvailableTags(claimStakeInstance):
  availableTags = [
    ...planetArchetype.tags,
    ...claimStakeDefinition.addedTags
  ]
  
  for each constructedBuilding in claimStakeInstance.buildings:
    availableTags.push(...constructedBuilding.addedTags)
  
  previousSize = -1
  while (availableTags.length > previousSize):
    previousSize = availableTags.length
    for each building in allBuildings:
      if (building.minimumTier <= claimStakeInstance.tier AND
          building.requiredTags are all in availableTags):
        availableTags.push(...building.addedTags)
  
  return availableTags

Use available tags to filter building list for UI display



Expected Behavior:

Tag system correctly identifies all potentially buildable buildings
Building prerequisites form proper dependency chains
UI correctly filters available buildings based on tags
Adding buildings properly updates available tag list
"Show buildings requiring prerequisites" checkbox properly reveals potential buildings

[CSS-E07] Resource Richness Implementation
The resource richness system must be implemented with precise multiplication rules.
Requirements:

Resource richness implementation:
pseudocodefunction calculateResourceRate(building, planetArchetype, claimStakeInstance):
  // For buildings that extract resources
  if building has resourceExtractionRate:
    for each resource in building.resourceExtractionRate:
      if resource exists in planetArchetype.richness:
        actualRate = building.resourceExtractionRate[resource] * 
                    planetArchetype.richness[resource]
      else:
        actualRate = 0 // Resource not available on this planet
  
  // For buildings that process resources (no richness multiplier)
  if building has resourceRate (inputs):
    // Processing rate is determined purely by input consumption rate
    // and is not affected by planet richness
    
  return calculatedRates

Richness values must be displayed in UI for all available resources
Resources with zero richness must be filtered from UI
Processing buildings must ignore richness in calculations

Expected Behavior:

Extraction rates properly factor in planet richness
Processing rates ignore richness values
UI properly displays richness multipliers
Resources with zero richness don't appear in extraction options
Changing planets updates resource extraction rates based on richness

## [CSS-F01] Resource Production Chain Modal
The simulator must visualize resource production chains for strategic planning.
Requirements:

Two-tab resource chain modal:

"Recommended Plan" tab showing recommended claim stakes
"Detailed Breakdown" tab showing production hierarchy


Recommended claim stakes section shows:

Planet names and tiers
Available resources to process/extract
Required buildings for each planet


Detailed breakdown section shows:

Hierarchical view of resource dependencies
Amount requirements for each resource
Processing locations for each resource
Raw resource origins



Expected Behavior:

Modal appears when clicking "How to Get Resources"
Resource chain is dynamically generated based on game state
Resources are grouped by processing steps
UI clearly shows which planets can produce which resources
Dependencies are visually indicated through indentation and connecting lines

[CSS-F02] Cross-Claim Stake Resource Planning
The simulator must facilitate planning resource production across multiple claim stakes.
Requirements:

"Receive Resources" button for instant resource acquisition
Resource production breakdown showing:

Raw resource sources
Processing steps and locations
Required building chains
Optimal claim stake recommendations


Filter controls to focus on specific resources or production chains
Visual indication of resource transportation between claim stakes

Expected Behavior:

Chain visualization updates based on owned claim stakes
Recommendations prioritize efficient resource acquisition
UI clearly indicates resources requiring multi-step production
Production chains can span multiple claim stakes
Recommendations adapt to player's current ownership
