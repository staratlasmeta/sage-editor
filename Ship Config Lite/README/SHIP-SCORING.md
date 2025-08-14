# Ship Scoring System Documentation

## Overview

The Ship Scoring System in Ship Config Lite provides a comprehensive evaluation framework for ships based on their performance across multiple categories. This system helps players understand the strengths and weaknesses of different ship configurations at a glance.

The system now provides **dual scoring perspectives**:
- **Global Scores**: Compare ships against ALL ships in the game
- **Class Scores**: Compare ships only against others in the same size class (e.g., XXS vs XXS, Medium vs Medium)

## How It Works

### Scoring Categories

The system evaluates ships across 6 main categories:

#### 1. Combat ⚔️ (Red: #ff4444)
Evaluates a ship's combat effectiveness
- **Stats Evaluated**: 
  - `damage` (weight: 1.5) - Higher is better
  - `max_ap` (weight: 1.2) - Higher is better
  - `ap_recharge_time` (weight: -0.8) - Lower is better
  - `hit_points` (weight: 1.3) - Higher is better
  - `shield_points` (weight: 1.2) - Higher is better
  - `shield_recharge_rate` (weight: 1.0) - Higher is better
  - `shield_break_delay` (weight: -0.5) - Lower is better
  - `ammo_capacity` (weight: 0.7) - Higher is better

#### 2. Mobility 🚀 (Green: #44ff44)
Evaluates speed and movement capabilities
- **Stats Evaluated**:
  - `subwarp_speed` (weight: 1.2) - Higher is better
  - `warp_speed` (weight: 1.5) - Higher is better
  - `max_warp_distance` (weight: 1.0) - Higher is better
  - `warp_cool_down` (weight: -0.8) - Lower is better
  - `warp_fuel_consumption` (weight: -0.6) - Lower is better
  - `subwarp_fuel_consumption` (weight: -0.5) - Lower is better
  - `planet_exit_fuel` (weight: -0.4) - Lower is better
  - `warp_lane_speed` (weight: 1.0) - Higher is better
  - `warp_spool_time` (weight: -0.7) - Lower is better

#### 3. Cargo 📦 (Blue: #4444ff)
Evaluates transport and hauling capacity
- **Stats Evaluated**:
  - `cargo_capacity` (weight: 1.5) - Higher is better
  - `passenger_capacity` (weight: 1.2) - Higher is better
  - `loading_rate` (weight: 1.0) - Higher is better

#### 4. Mining ⛏️ (Orange: #ffaa44)
Evaluates resource extraction efficiency
- **Stats Evaluated**:
  - `asteroid_mining_food_rate` (weight: 1.0) - Higher is better
  - `asteroid_mining_ammo_rate` (weight: 1.0) - Higher is better
  - `asteroid_mining_rate` (weight: 1.5) - Higher is better

#### 5. Support 🔧 (Light Blue: #44aaff)
Evaluates utility and support capabilities
- **Stats Evaluated**:
  - `scan_cool_down` (weight: -0.5) - Lower is better
  - `sduPerScan` (weight: 1.0) - Higher is better
  - `scan_cost` (weight: -0.3) - Lower is better
  - `scan_power` (weight: 1.2) - Higher is better
  - `repair_cost` (weight: -0.4) - Lower is better
  - `repair_rate` (weight: 1.3) - Higher is better
  - `repair_ability` (weight: 1.5) - Higher is better
  - `repair_efficiency` (weight: 1.2) - Higher is better
  - `repair_cooldown` (weight: -0.6) - Lower is better

#### 6. Economy 💰 (Yellow: #ffff44)
Evaluates economic efficiency
- **Stats Evaluated**:
  - `fuel_capacity` (weight: 1.0) - Higher is better
  - `loot_rate` (weight: 1.2) - Higher is better
  - `ship_size_value` (weight: 0.8) - Higher is better
  - `lp_value` (weight: 1.0) - Higher is better
  - `warp_lane_fee` (weight: -0.5) - Lower is better

### Scoring Process

#### 1. Stat Normalization
Each stat is normalized to a 0-100 scale:
- The system compares the stat value against all other ships in the game
- Minimum and maximum values are determined across all ships
- The stat is scaled proportionally within this range
- For "lower is better" stats (negative weights), the scale is inverted

#### 2. Category Score Calculation
For each category:
1. Each stat's normalized score is multiplied by its weight
2. All weighted scores are summed
3. The result is divided by the sum of weights
4. Final category score is 0-100

#### 3. Ship Specialization Bonuses
Ships receive category weight modifiers based on their specialization:

**Combat Category**:
- Fighter: 1.5x
- Bomber: 1.4x
- Bounty Hunter: 1.3x
- Default: 1.0x

**Mobility Category**:
- Racer: 1.5x
- Data Runner: 1.3x
- Default: 1.0x

**Cargo Category**:
- Transport: 1.5x
- Freight: 1.6x
- Default: 0.8x

**Mining Category**:
- Miner: 1.8x
- Default: 0.3x

**Support Category**:
- Repair: 1.6x
- Rescue: 1.4x
- Refuel/Repair: 1.5x
- Multi-Role: 1.2x
- Default: 0.7x

**Economy Category**:
- Freight: 1.3x
- Transport: 1.2x
- Default: 0.9x

#### 4. Overall Score Calculation
The overall "Uber" score combines all category scores:
1. Each category score is multiplied by its specialization weight
2. All weighted category scores are summed
3. The result is divided by the sum of all category weights
4. Final overall score is 0-100

### Score Color Coding

Scores are color-coded for quick visual reference:
- **80-100**: Green (#4CAF50) - Excellent
- **60-79**: Light Green (#8BC34A) - Good
- **40-59**: Yellow (#FFC107) - Average
- **20-39**: Orange (#FF9800) - Below Average
- **0-19**: Red (#f44336) - Poor

## Using the Score Breakdown Panel

### Dual Scoring Display

Each ship shows two overall scores:
- **⭐ Global Score**: Performance compared to ALL ships
- **🏆 Class Score**: Performance compared to ships in the same size class

Below the overall scores, you can switch between viewing:
- **"All Ships" tab**: Shows category scores compared globally
- **Class-specific tab** (e.g., "XXS"): Shows category scores within the class

### Accessing Score Details

1. **Overall Score Breakdown**:
   - Click on either overall score (⭐ for global, 🏆 for class)
   - Shows all category scores with weights
   - Displays the final calculation
   - Indicates comparison scope (All Ships or Class-specific)

2. **Category Score Breakdown**:
   - Click on any category score from either view
   - Shows individual stat contributions
   - Displays stat values, weights, and calculations
   - Shows which comparison type you're viewing

### Understanding the Breakdown

The breakdown panel shows:
- **Ship Information**: Name, class, and specialization
- **Category Scores**: Each category with its score and weight
- **Stat Details** (in category view):
  - Current stat value
  - Weight multiplier
  - Whether lower or higher is better
  - Individual contribution to category score
- **Specialization Bonus**: How the ship's spec affects category weights
- **Final Calculation**: Mathematical breakdown of the overall score

## Configuration Impact

The scoring system takes into account:
- **Base Stats**: The ship's inherent statistics
- **Component Modifications**: How equipped components modify stats
- **Active Configuration**: The currently selected configuration for the ship

Modified stats from components are used in all calculations, allowing you to see how different configurations affect your ship's scores.

## Practical Use Cases

### 1. Ship Comparison
Compare ships to find the best option for your needs:
- High Combat scores for PvP activities
- High Mobility scores for racing or courier missions
- High Cargo scores for trading
- High Mining scores for resource extraction

**Global vs Class Scores**:
- **Global scores** help identify the absolute best ships regardless of size
- **Class scores** help find the best ship within a specific size constraint
- A ship might have low global scores but excellent class scores (e.g., best XXS fighter)

### 2. Configuration Optimization
Test different component combinations to:
- Maximize specific category scores
- Balance multiple categories
- Find the optimal setup for your playstyle

### 3. Fleet Composition
Build balanced fleets by:
- Selecting ships with complementary scores
- Ensuring coverage across different categories
- Avoiding redundancy in capabilities

## Technical Details

### Module Structure
- **ship-scoring.js**: Core scoring calculations
- **score-breakdown.js**: UI panel and detailed breakdowns

### Data Flow
1. Ship stats (base or modified) are passed to scoring functions
2. Stats are normalized against all ships in the database
3. Category scores are calculated with weights
4. Specialization bonuses are applied
5. Overall score is computed
6. Results are displayed with appropriate color coding

### Performance Considerations
- Scores are calculated on-demand when displayed
- Normalization uses cached ship data for efficiency
- UI updates are throttled to prevent excessive recalculation 