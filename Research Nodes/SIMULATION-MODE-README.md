# Research Nodes - Simulation Mode

## Overview

The Simulation Mode transforms the Research Nodes editor into an interactive skill tree progression system, allowing you to simulate player progression through the skill tree as if it were an in-game system. This mode includes XP accumulation, skill point spending, career progression, and visual feedback for node states.

## Features

### Core Functionality

1. **Career-based XP System**
   - Nodes tagged as "Career" accumulate XP over time
   - Each career has its own XP pool and leveling system
   - XP accumulates at randomized rates (10-30 XP per second base rate)
   - Leveling up grants skill points specific to that career

2. **Renown System**
   - Earned at a 1:1 ratio when any career gains a level
   - Can be spent on "Council Rank" nodes
   - Represents cross-career progression

3. **Node Progression Types**
   - **Unlimited Scalability**: Can be leveled infinitely
   - **Single Activation**: One-time unlock (1 point maximum)
   - **Successive Range**: Special parent nodes with two progression modes:
     - **Sequential**: Children must be unlocked in a specific order
     - **Free-form**: Children can be unlocked in any order

4. **Time Control**
   - Play/Pause simulation
   - Speed controls: 1x, 2x, 4x, 8x
   - Reset to start over

## User Interface

### Entering Simulation Mode

Click the 🎮 button in the main menu bar to enter Simulation Mode. The UI will change to show:

1. **Simulation Toolbar**: Controls for play/pause, speed, and stats
2. **Career XP Panel**: Real-time display of all career progress
3. **Renown Display**: Current available and total renown points

### Node States

Nodes in simulation mode have distinct visual states:

- **Locked** (Gray/Dimmed): Cannot be unlocked yet
- **Unlockable** (Pulsing Blue): Ready to unlock with available points
- **Unlocked** (Green Glow): Active and can be leveled (if Unlimited)
- **Maxed** (Gold Glow): Reached maximum level

### Interacting with Nodes

- **Left Click**: Spend a point on the node (if unlockable and points available)
- **Right Click**: Remove a point from the node (refund)
  - Note: Cannot remove points if child nodes depend on it

## Configuration

### Setting Up Sequential Progression

For "Successive Range" nodes:

1. In Edit mode, select the parent node
2. Set Scalability to "Successive Range"
3. Choose Progression Type:
   - **Free-form**: Children can be unlocked in any order
   - **Sequential**: Children must be unlocked in order
4. If Sequential, drag and drop to reorder children in the desired unlock sequence

### Career Setup

1. Tag nodes as "Career" to make them XP-generating nodes
2. Career nodes automatically start generating XP when simulation begins
3. Only children of career nodes can use that career's skill points

### Council Rank Setup

1. Tag nodes as "Council Rank" or include "Council" in the name
2. These nodes will use Renown points instead of career points

## Simulation Statistics

Click the 📊 Stats button to view:

- **Progress Overview**: Total nodes unlocked, total renown earned
- **Career Breakdown**: Level, unspent points, and XP progress for each career
- **Unlocked Skills**: List of all unlocked nodes with their levels

## Data Management

### Saving Simulation State

The simulation state can be exported/imported along with the node configuration:
- Career XP and levels
- Renown points
- Node unlock states
- Progression configuration

### Resetting

Click the 🔄 Reset button to:
- Reset all XP to 0
- Lock all nodes
- Clear all spent points
- Restart time tracking

## Best Practices

1. **Design Considerations**
   - Place "Career" nodes as major branches of your skill tree
   - Use "Council Rank" nodes for prestigious cross-career unlocks
   - Sequential progression works well for linear skill paths
   - Free-form progression suits branching specializations

2. **Testing Progressions**
   - Use higher speed settings to quickly test late-game progression
   - Monitor the stats panel to ensure balanced XP rates
   - Test different paths by using the refund feature

3. **Visual Hierarchy**
   - Parent nodes (level 0) appear larger
   - Career nodes show a ★ indicator
   - Scalability icons help identify progression types at a glance

## Technical Details

### XP Formula
- Base XP rate: 10-30 per second (randomized per career)
- Level requirement: Starts at 100 XP, increases by 20% per level
- Formula: `nextLevelXP = previousLevelXP * 1.2`

### Node Validation
- Nodes can only be unlocked if all parent nodes are unlocked
- Sequential children must follow the defined order
- Points can only be refunded if no child nodes depend on them

### Performance
- Simulation runs on requestAnimationFrame for smooth updates
- XP calculations are frame-independent using delta time
- Visual effects (like pulsing) are GPU-accelerated

## Troubleshooting

**Q: Nodes aren't becoming unlockable**
- Check that parent nodes are unlocked first
- Verify you have available points (career or renown)
- For sequential nodes, ensure previous siblings are unlocked

**Q: Can't remove points from a node**
- Check if any child nodes are unlocked (they must be cleared first)
- Single Activation nodes cannot be partially refunded

**Q: XP seems to accumulate slowly**
- Try increasing the simulation speed
- XP rates are randomized; some careers may be slower
- Check the Stats panel for accurate progress tracking 