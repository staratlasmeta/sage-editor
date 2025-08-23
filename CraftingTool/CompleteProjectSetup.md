// ========================================
// STEP 1: Project Setup (Terminal Commands)
// ========================================
/*
npm create vite@latest sage-c4-tools -- --template react
cd sage-c4-tools
npm install
npm install papaparse

# Create the folder structure:
mkdir -p src/shared/components src/shared/services src/shared/styles
mkdir -p src/claim-stakes/components src/claim-stakes/services
mkdir -p src/crafting-hab/components src/crafting-hab/services
mkdir -p src/crafting-recipes/components src/crafting-recipes/services
mkdir -p public/data

# Place mockData.json and mockRecipes.csv in public/data/
*/

// ========================================
// STEP 2: src/App.jsx - Main Application Shell
// ========================================
import React, { useState, useEffect } from 'react';
import { DataProvider } from './shared/contexts/DataContext';
import { SharedStateProvider } from './shared/contexts/SharedStateContext';
import Navigation from './shared/components/Navigation';
import ClaimStakesSimulator from './claim-stakes/ClaimStakesSimulator';
import CraftingHabTool from './crafting-hab/CraftingHabTool';
import CraftingRecipesTool from './crafting-recipes/CraftingRecipesTool';
import DataLoader from './shared/services/DataLoader';
import './App.css';

function App() {
  const [activeeTool, setActiveTool] = useState('claim-stakes');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      const data = await DataLoader.loadAll();
      setGameData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load game data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Star Atlas C4 Tools...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={loadGameData}>Retry</button>
      </div>
    );
  }

  return (
    <DataProvider value={gameData}>
      <SharedStateProvider>
        <div className="app">
          <Navigation activeTool={activeTool} onToolChange={setActiveTool} />
          
          <main className="tool-container">
            {activeTool === 'claim-stakes' && <ClaimStakesSimulator />}
            {activeTool === 'crafting-hab' && <CraftingHabTool />}
            {activeTool === 'crafting-recipes' && <CraftingRecipesTool />}
          </main>
        </div>
      </SharedStateProvider>
    </DataProvider>
  );
}

export default App;

// ========================================
// STEP 3: src/shared/services/DataLoader.js
// ========================================
import Papa from 'papaparse';

class DataLoader {
  static async loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return await response.json();
    } catch (error) {
      console.error(`Error loading JSON from ${path}:`, error);
      throw error;
    }
  }

  static async loadCSV(path) {
    return new Promise((resolve, reject) => {
      Papa.parse(path, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  static async loadAll() {
    try {
      const [mockData, recipes] = await Promise.all([
        this.loadJSON('/data/mockData.json'),
        this.loadCSV('/data/mockRecipes.csv')
      ]);

      // Process and merge data
      const processedRecipes = this.processRecipes(recipes);
      
      return {
        ...mockData,
        recipesCSV: processedRecipes,
        // Merge CSV recipes with JSON recipes
        allRecipes: [...mockData.craftingRecipes, ...processedRecipes]
      };
    } catch (error) {
      console.error('Failed to load game data:', error);
      throw new Error('Failed to initialize game data. Please check that all data files are present.');
    }
  }

  static processRecipes(csvData) {
    return csvData.map(row => ({
      id: row.OutputID,
      name: row.OutputName,
      type: row.OutputType,
      tier: row.OutputTier,
      constructionTime: row.ConstructionTime,
      ingredients: this.extractIngredients(row),
      completionStatus: row.CompletionStatus,
      productionSteps: row.ProductionSteps
    }));
  }

  static extractIngredients(row) {
    const ingredients = {};
    for (let i = 1; i <= 5; i++) {
      const ingredient = row[`Ingredient${i}`];
      const quantity = row[`Quantity${i}`];
      if (ingredient && quantity) {
        ingredients[ingredient] = quantity;
      }
    }
    return ingredients;
  }
}

export default DataLoader;

// ========================================
// STEP 4: src/shared/contexts/DataContext.jsx
// ========================================
import React, { createContext, useContext } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children, value }) => {
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useGameData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useGameData must be used within DataProvider');
  }
  return context;
};

// ========================================
// STEP 5: src/shared/contexts/SharedStateContext.jsx
// ========================================
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import SaveService from '../services/SaveService';

const SharedStateContext = createContext(null);

const initialState = {
  playerFaction: 'MUD',
  atlas: 100000,
  crew: 50,
  starbaseInventory: {},
  claimStakes: [],
  craftingHabs: [],
  achievements: [],
  notifications: []
};

function sharedStateReducer(state, action) {
  switch (action.type) {
    case 'SET_FACTION':
      return { ...state, playerFaction: action.payload };
    
    case 'UPDATE_ATLAS':
      return { ...state, atlas: state.atlas + action.payload };
    
    case 'UPDATE_INVENTORY':
      return {
        ...state,
        starbaseInventory: {
          ...state.starbaseInventory,
          [action.starbaseId]: action.inventory
        }
      };
    
    case 'ADD_CLAIM_STAKE':
      return {
        ...state,
        claimStakes: [...state.claimStakes, action.payload]
      };
    
    case 'ADD_CRAFTING_HAB':
      return {
        ...state,
        craftingHabs: [...state.craftingHabs, action.payload]
      };
    
    case 'UNLOCK_ACHIEVEMENT':
      if (!state.achievements.includes(action.payload)) {
        return {
          ...state,
          achievements: [...state.achievements, action.payload],
          notifications: [...state.notifications, {
            type: 'achievement',
            message: `Achievement Unlocked: ${action.payload}`,
            timestamp: Date.now()
          }]
        };
      }
      return state;
    
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

export const SharedStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(sharedStateReducer, initialState);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      SaveService.autoSave(state);
    }, 30000);
    return () => clearInterval(interval);
  }, [state]);

  // Load saved state on mount
  useEffect(() => {
    const savedState = SaveService.load();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
    }
  }, []);

  const value = {
    state,
    dispatch,
    // Helper functions
    spendAtlas: (amount) => {
      if (state.atlas >= amount) {
        dispatch({ type: 'UPDATE_ATLAS', payload: -amount });
        return true;
      }
      return false;
    },
    transferResources: (from, to, resources) => {
      // Implementation for resource transfer
      console.log('Transferring resources:', { from, to, resources });
    }
  };

  return (
    <SharedStateContext.Provider value={value}>
      {children}
    </SharedStateContext.Provider>
  );
};

export const useSharedState = () => {
  const context = useContext(SharedStateContext);
  if (!context) {
    throw new Error('useSharedState must be used within SharedStateProvider');
  }
  return context;
};

// ========================================
// STEP 6: src/shared/components/Navigation.jsx
// ========================================
import React from 'react';
import SaveLoadManager from './SaveLoadManager';
import './Navigation.css';

function Navigation({ activeTool, onToolChange }) {
  const tools = [
    { id: 'claim-stakes', name: 'Claim Stakes', icon: '🏭' },
    { id: 'crafting-hab', name: 'Crafting Hab', icon: '🔧' },
    { id: 'crafting-recipes', name: 'Recipes', icon: '📋' }
  ];

  return (
    <nav className="sage-navigation">
      <div className="nav-brand">
        <span className="brand-text">SAGE C4 TOOLS</span>
      </div>
      
      <div className="nav-tools">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`nav-tool ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolChange(tool.id)}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-name">{tool.name}</span>
          </button>
        ))}
      </div>
      
      <div className="nav-actions">
        <SaveLoadManager />
      </div>
    </nav>
  );
}

export default Navigation;

// ========================================
// STEP 7: src/shared/services/SaveService.js
// ========================================
class SaveService {
  static STORAGE_KEY = 'sage_c4_tools_save';
  static AUTO_SAVE_KEY = 'sage_c4_tools_autosave';

  static save(data, slot = 'default') {
    try {
      const saveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        slot,
        data
      };
      localStorage.setItem(`${this.STORAGE_KEY}_${slot}`, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save:', error);
      return false;
    }
  }

  static load(slot = 'default') {
    try {
      const saved = localStorage.getItem(`${this.STORAGE_KEY}_${slot}`);
      if (saved) {
        const { data } = JSON.parse(saved);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load save:', error);
      return null;
    }
  }

  static autoSave(data) {
    this.save(data, 'autosave');
  }

  static exportSave(data) {
    const saveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      data
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage_c4_save_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async importSave(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { data } = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  static getSaveSlots() {
    const slots = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.STORAGE_KEY)) {
        try {
          const saved = JSON.parse(localStorage.getItem(key));
          slots.push({
            slot: saved.slot,
            timestamp: saved.timestamp,
            version: saved.version
          });
        } catch (error) {
          console.error('Invalid save slot:', key);
        }
      }
    }
    return slots;
  }
}

export default SaveService;

// ========================================
// STEP 8: src/App.css - Base Styles
// ========================================
/*
:root {
  --primary-orange: #FF6B35;
  --primary-dark: #0A0A0A;
  --primary-light: #1A1A1A;
  --accent-blue: #00A8E8;
  --accent-green: #00C896;
  --status-success: #2ECC40;
  --status-warning: #FF851B;
  --status-danger: #FF4136;
  --border-color: #2A2A2A;
  --text-primary: #FFFFFF;
  --text-secondary: #999999;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Exo 2', sans-serif;
  background: var(--primary-dark);
  color: var(--text-primary);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading-screen,
.error-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-orange);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tool-container {
  flex: 1;
  padding: 1rem;
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
}

button {
  background: var(--primary-orange);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
*/