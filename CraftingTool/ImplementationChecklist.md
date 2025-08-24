# 🚀 SAGE C4 Tools - Complete Implementation Checklist

## ✅ Pre-Flight Checklist

### Files You Need to Create:
1. **`/public/data/mockData.json`** - Copy from artifact "mockData.json"
2. **`/public/data/mockRecipes.csv`** - Copy from artifact "mockRecipes.csv"

### Initial Setup Commands:
```bash
# 1. Create the React project
npm create vite@latest sage-c4-tools -- --template react
cd sage-c4-tools

# 2. Install required dependencies
npm install papaparse

# 3. Create folder structure
mkdir -p src/shared/components src/shared/services src/shared/contexts src/shared/styles
mkdir -p src/claim-stakes/components src/claim-stakes/services
mkdir -p src/crafting-hab/components src/crafting-hab/services  
mkdir -p src/crafting-recipes/components src/crafting-recipes/services
mkdir -p public/data

# 4. Place data files
# Copy mockData.json and mockRecipes.csv to public/data/

# 5. Start development server
npm run dev
```

---

## 📋 Implementation Order (3-Day Sprint)

### **DAY 1 - Foundation & Claim Stakes (8 hours)**

#### **Morning Session (Hours 1-4)**
- [ ] **Hour 1: Project Setup**
  - Set up Vite project
  - Install dependencies
  - Create folder structure
  - Add data files
  
- [ ] **Hour 2: Core Infrastructure**
  - `App.jsx` - Main shell
  - `DataLoader.js` - Data loading service
  - `DataContext.jsx` - Data provider
  - `SharedStateContext.jsx` - Shared state
  - Verify data loads correctly

- [ ] **Hour 3: Navigation & UI Base**
  - `Navigation.jsx` - Top navigation
  - `SaveService.js` - Save/load functionality
  - `App.css` - Base styles
  - Add Google Fonts (Orbitron, Exo 2)

- [ ] **Hour 4: Claim Stakes Structure**
  - `ClaimStakesSimulator.jsx` - Main component
  - `PlanetBrowser.jsx` - Planet selection
  - Basic CSS for claim stakes
  - Test navigation between views

#### **Afternoon Session (Hours 5-8)**
- [ ] **Hour 5: Claim Stake Designer Base**
  - Create `ClaimStakeDesigner.jsx`
  - Building palette (static list first)
  - Slot management logic
  - Basic placement (click to add)

- [ ] **Hour 6: Resource Calculations**
  - Create calculation services
  - Power balance calculation
  - Crew requirements
  - Resource extraction rates

- [ ] **Hour 7: Visual Enhancements**
  - Add building categories
  - Color coding by type
  - Efficiency indicators
  - Resource flow display

- [ ] **Hour 8: State Management**
  - Save claim stake to state
  - Load existing stakes
  - Resource production simulation
  - Basic achievements

---

### **DAY 2 - Crafting Tools (8 hours)**

#### **Morning Session (Hours 1-4)**
- [ ] **Hour 1: Crafting Hab Structure**
  - `CraftingHabTool.jsx` - Main component
  - `StarbaseSelector.jsx` - Starbase selection
  - `HabDesigner.jsx` - Hab designer base
  - Basic layout and navigation

- [ ] **Hour 2: Hab Building System**
  - Building placement for habs
  - Crafting station properties
  - Storage modules
  - Hub validation

- [ ] **Hour 3: Crafting Interface**
  - `CraftingInterface.jsx` - Job management
  - Recipe selector
  - Job queue display
  - Progress tracking

- [ ] **Hour 4: Job Management**
  - Start/pause/cancel jobs
  - Resource consumption
  - Output calculation
  - Time management

#### **Afternoon Session (Hours 5-8)**
- [ ] **Hour 5: Recipe Tool Structure**
  - `CraftingRecipesTool.jsx` - Main component
  - `RecipeExplorer.jsx` - Recipe browser
  - Search and filter functionality
  - Recipe cards

- [ ] **Hour 6: Tree Visualization**
  - `TreeVisualizer.jsx` - Canvas-based tree
  - Basic node rendering
  - Connection lines
  - Simple layout algorithm

- [ ] **Hour 7: Recipe Analysis**
  - `RecipeAnalyzer.jsx` - Analysis dashboard
  - Resource requirements calculation
  - Time calculations
  - Efficiency metrics

- [ ] **Hour 8: Integration**
  - Connect resource flows
  - Transfer between tools
  - Shared inventory updates
  - Test all connections

---

### **DAY 3 - Polish & Advanced Features (8 hours)**

#### **Morning Session (Hours 1-4)**
- [ ] **Hour 1: Drag & Drop (Claim Stakes)**
  - Implement drag functionality
  - Visual feedback during drag
  - Snap-to-grid
  - Connection preview

- [ ] **Hour 2: Advanced Visualizations**
  - Enhanced tree rendering
  - Interactive nodes
  - Zoom/pan controls
  - Layout options

- [ ] **Hour 3: Animations**
  - Resource flow animations
  - Building placement effects
  - Achievement notifications
  - Progress animations

- [ ] **Hour 4: Tutorial System**
  - Tutorial overlay component
  - Step-by-step guidance
  - Highlight system
  - Progress tracking

#### **Afternoon Session (Hours 5-8)**
- [ ] **Hour 5: Optimization Features**
  - Auto-arrange buildings
  - Recipe path optimization
  - Efficiency suggestions
  - Batch calculations

- [ ] **Hour 6: Advanced Save System**
  - Multiple save slots
  - Export/import functionality
  - Auto-save indicator
  - Save versioning

- [ ] **Hour 7: Final Polish**
  - Sound effects (optional)
  - Loading states
  - Error handling
  - Performance optimization

- [ ] **Hour 8: Testing & Bug Fixes**
  - Cross-tool testing
  - Save/load integrity
  - Edge cases
  - Final adjustments

---

## 🎯 MVP Deliverables (Must Have)

### Claim Stakes Simulator
- ✅ Planet browsing and selection
- ✅ Building placement (basic click)
- ✅ Resource calculation
- ✅ Power/crew validation
- ✅ Save/load functionality

### Crafting Hab Tool
- ✅ Starbase selection
- ✅ Hab designer with buildings
- ✅ Recipe selection
- ✅ Job queue management
- ✅ Resource consumption

### Crafting Recipes Tool
- ✅ Recipe search/filter
- ✅ Basic tree visualization
- ✅ Resource requirements
- ✅ Path display

### Shared Features
- ✅ Data loading from JSON/CSV
- ✅ Navigation between tools
- ✅ Save/load system
- ✅ SAGE-themed UI

---

## 🚨 Common Pitfalls to Avoid

1. **Don't over-engineer early** - Get basic functionality working first
2. **Test data loading immediately** - Ensure your mock data works
3. **Keep components simple initially** - Add complexity incrementally
4. **Save work frequently** - Implement save system early
5. **Focus on one tool at a time** - Complete before moving on

---

## 📝 Quick Start Code Snippets

### Testing Data Load:
```javascript
// In App.jsx, add console.log to verify data
useEffect(() => {
  loadGameData().then(data => {
    console.log('Loaded game data:', data);
    console.log('Resources count:', Object.keys(data.resources).length);
    console.log('Buildings count:', Object.keys(data.claimStakeBuildings).length);
  });
}, []);
```

### Quick Style Variables:
```css
/* Add to index.css for immediate styling */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Exo+2:wght@300;400;600&display=swap');

:root {
  --primary-orange: #FF6B35;
  --primary-dark: #0A0A0A;
  --primary-light: #1A1A1A;
  --accent-blue: #00A8E8;
  --border-color: #2A2A2A;
}
```

### Simple State Test:
```javascript
// Test shared state is working
const TestComponent = () => {
  const { state, dispatch } = useSharedState();
  return (
    <div>
      <p>Atlas: {state.atlas}</p>
      <button onClick={() => dispatch({ type: 'UPDATE_ATLAS', payload: -100 })}>
        Spend 100 Atlas
      </button>
    </div>
  );
};
```

---

## 🎮 You're Ready to Build!

### Start with:
1. Run the setup commands
2. Copy the mock data files
3. Create App.jsx from the provided code
4. Test that data loads
5. Build one component at a time

### Success Indicators:
- ✅ Data loads without errors
- ✅ Navigation switches between tools
- ✅ Can select a planet and see its data
- ✅ Can place a building and see stats update
- ✅ Save/load preserves state

---

## 💬 Need Help?

If you get stuck:
1. Check browser console for errors
2. Verify data files are in `/public/data/`
3. Ensure all imports match file paths
4. Start with static UI, add interactivity later
5. Use mock functions initially (console.log actions)

Remember: **Build incrementally, test frequently, save progress!**