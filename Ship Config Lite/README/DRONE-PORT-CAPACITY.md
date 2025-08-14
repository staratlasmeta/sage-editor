# Drone Port Capacity System

## Overview

The drone port capacity system allows you to configure how many drones each size class of drone port can hold. This provides realistic simulation where larger drone ports can deploy more drones, significantly increasing their combat effectiveness.

## Accessing the Configuration

1. Click on the **Edit Component Attributes** button in the left panel
2. Select **Ship Component** category
3. Click **Edit Scaling Formulas** button
4. Scroll down to the **Drone Port Capacities** section

## Default Capacities

Each size class has a default drone capacity:

- **XXS**: 2 drones
- **XS**: 4 drones
- **Small**: 8 drones
- **Medium**: 12 drones
- **Large**: 16 drones
- **Capital**: 24 drones
- **Commander**: 32 drones
- **Class 8**: 40 drones
- **Titan**: 48 drones

## Customizing Capacities

1. In the Drone Port Capacities section, you'll see input fields for each size class
2. Enter the desired number of drones for each size
3. Click **Apply Drone Port Capacities** to save your changes
4. The values are saved automatically and persist between sessions

## How It Works

### Automatic Scaling
When drones are equipped in a ship configuration:
1. The system detects all drone ports in the ship
2. Calculates total drone capacity based on port sizes
3. Multiplies drone stats by the number of drones that can be deployed

### Multiple Drone Types
If multiple drone types are equipped:
- The capacity is distributed proportionally among all drone types
- Each drone type gets an equal share of the available slots
- Any remaining slots go to the first drone type

### Stat Details
Click on any stat affected by drones to see:
- Number of drones deployed (e.g., "Armstrong IMP Tink (×8)")
- Individual and total contribution values
- Drone port information and capacity breakdown
- Complete calculation formula

## Example

If you have a Medium drone port (12 capacity) and equip one drone type:
- The drone's stats are multiplied by 12
- The stat details will show: "Final Value = base_stat × 12"

If you equip two different drone types:
- Each gets 6 drones (12 ÷ 2)
- Each drone type's stats are multiplied by 6

## Technical Details

- Capacities are stored in browser localStorage
- Changes apply immediately to all calculations
- The comparison table updates automatically when capacities change
- Values persist across browser sessions 