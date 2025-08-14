# Configuration Pattern Builder

The Configuration Pattern Builder is a powerful tool in Ship Config Lite that allows you to create reusable patterns for generating ship configurations. It uses a ship's "Tier One" configuration as the source of truth for available component slots.

## Prerequisites

Before using the Pattern Builder, ensure:
1. You have loaded a ship into the comparison table
2. The ship has a configuration named **"Tier One"** (case-insensitive)
3. You have opened the configuration editor for that ship

## Accessing the Pattern Builder

1. Click on a ship's "Edit" button to open the configuration editor
2. In the configuration editor header, click the **"🔧 Pattern Builder"** button
3. The Pattern Builder interface will replace the normal configuration view

## Understanding Tier One

"Tier One" is the baseline configuration that defines:
- What types of components the ship can equip
- How many slots are available for each component type
- The maximum capacity for each component category

The Pattern Builder respects these limits and won't allow patterns that would exceed Tier One's slot allocations.

## Creating Patterns

### Step 1: Create a New Pattern
1. Click **"+ New Pattern"**
2. Enter a descriptive name for your pattern
3. The pattern editor will appear

### Step 2: Add Actions
Click **"+ Add Action"** to add pattern actions. Available actions include:

#### Remove All Components of Type
- Clears all components of a specific category and type
- Example: Remove all Ship Weapons - Kinetic

#### Convert Slot Type
- Converts slots from one component type to another
- Only works if Tier One has the target slot type
- Example: Convert Missiles → Ship Weapons

#### Fill Empty Slots
- Automatically fills empty slots with components
- Strategies:
  - **Auto-select**: Chooses mid-tier components
  - **Lowest tier**: Fills with T1 components
  - **Highest tier**: Fills with best available
  - **Specific**: (future feature) Select exact component

#### Upgrade/Downgrade Component Tier
- Changes equipped components to higher/lower tiers
- Maintains the same component type and class
- Example: Upgrade all weapons by 2 tiers

#### Set Exact Quantity
- Sets a specific number of slots for a component type
- Cannot exceed Tier One limits
- Example: Set exactly 3 Mining Laser slots

### Step 3: Organize Actions
- Use arrow buttons to reorder actions
- Actions execute in sequence from top to bottom
- Order matters! (e.g., remove before convert)

## Testing Patterns

Before applying a pattern:
1. Select a configuration from the dropdown
2. Click **"🧪 Test Pattern"**
3. Review the test results showing:
   - Which actions would succeed
   - Which would make changes
   - Any errors or conflicts

## Applying Patterns

### Apply to Current Config
- Click **"✅ Apply Pattern"**
- Creates a new configuration based on the current one
- Names it: `[Original Name] - [Pattern Name]`

### Apply to All Configs
- Click **"🔄 Apply to All Configs"**
- Applies the pattern to every configuration
- Creates multiple new configurations at once
- Shows summary of successes/failures

## Saving and Loading Patterns

### Save Pattern
1. Enter a pattern name
2. Click **"💾 Save Pattern"**
3. Pattern is saved to browser storage

### Load Pattern
1. Click **"📁 Load Pattern"**
2. Select from your saved patterns
3. Pattern is loaded for editing/use

## Pattern Examples

### Combat Loadout Pattern
1. Remove all Mining Drones
2. Convert Drone slots to Missile slots
3. Fill empty Weapon slots with highest tier
4. Upgrade all weapons by 1 tier

### Mining Configuration Pattern
1. Remove all weapons
2. Set Mining Lasers to maximum quantity
3. Fill empty Drone slots with Mining Drones
4. Remove all missiles

### Balanced Explorer Pattern
1. Set exactly 2 weapon slots
2. Set exactly 2 mining laser slots
3. Fill empty Shield Generator slots
4. Downgrade weapons by 1 tier (save power)

## Tips and Best Practices

1. **Name patterns descriptively**: Use names that clearly indicate the pattern's purpose
2. **Test before applying**: Always test on a single config first
3. **Order matters**: Plan your action sequence carefully
4. **Save frequently**: Save patterns you plan to reuse
5. **Start simple**: Begin with basic patterns before creating complex ones

## Limitations

- Patterns cannot exceed Tier One slot allocations
- Cannot create slots that don't exist in Tier One
- Component compatibility still applies (ship class restrictions)
- Patterns are saved per-browser (not synced)

## Troubleshooting

**"Tier One configuration not found"**
- Create a configuration named exactly "Tier One"
- This config defines available slots

**"Cannot exceed Tier One limit"**
- The pattern tries to create more slots than allowed
- Check Tier One's slot counts

**"No compatible components found"**
- The ship class may not support certain components
- Verify component availability for your ship class

**Pattern didn't apply any changes**
- The configuration may already match the pattern
- Check test results for "No change" indicators 