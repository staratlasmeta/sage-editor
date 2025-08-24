np# Building Recipe Variations Analysis

## 🎯 **Key Finding: You Need 382 Recipe Variations**

Instead of creating 945 individual system recipes, you only need **382 unique building recipe variations** based on the unique combinations of planet types within systems.

## 📊 **Summary Statistics**

- **Total Systems**: 945
- **Unique Recipe Variations**: 382 (59% reduction!)
- **Average Systems per Recipe**: 2.47
- **Cross-Faction Combinations**: 182 (if you ignore factions)

## 🏆 **Top 10 Most Common System Signatures**

These represent your most important recipe variations:

| Rank | Recipe ID | Faction | Planet Types | Systems | Example System |
|------|-----------|---------|--------------|---------|----------------|
| 1 | RECIPE_001 | UST | Barren + Terrestrial | 12 | 002-UST-SEC-01 |
| 2 | RECIPE_002 | ONI | Asteroid Belt + Terrestrial | 11 | 016-ONI-CORE-06 |
| 3 | RECIPE_003 | UST | Barren + Volcanic | 10 | 006-UST-SEC-01 |
| 4 | RECIPE_004 | MUD | Barren + Terrestrial | 10 | 018-MUD-SEC-02 |
| 5 | RECIPE_005 | ONI | Asteroid Belt + Barren | 9 | 016-ONI-SEC-03 |
| 6 | RECIPE_006 | UST | Barren + Ice Giant + Oceanic + Terrestrial | 8 | CSS-UST-SEC-02 |
| 7 | RECIPE_007 | ONI | Asteroid Belt + Barren + Terrestrial | 8 | 020-ONI-SEC-07 |
| 8 | RECIPE_008 | MUD | Terrestrial + Volcanic | 8 | 018-MUD-SEC-03 |
| 9 | RECIPE_009 | MUD | Asteroid Belt + Barren + Terrestrial | 8 | 018-MUD-SEC-04 |
| 10 | RECIPE_010 | ONI | Barren + Gas Giant + Terrestrial | 7 | 017-ONI-SEC-01 |

## 🔍 **Recipe Complexity Breakdown**

| Planet Types | Recipe Variations | Percentage |
|--------------|------------------|------------|
| 2 planet types | 206 recipes | 53.9% |
| 3 planet types | 122 recipes | 31.9% |
| 4 planet types | 41 recipes | 10.7% |
| 5 planet types | 12 recipes | 3.1% |
| 6 planet types | 1 recipe | 0.3% |
| 7 planet types | 0 recipes | 0% |

**Key Insight**: Over 85% of your recipes will only need 2-3 planet types!

## 📋 **Recipe Database Structure**

Your building recipe table should have these columns:

```sql
CREATE TABLE BuildingRecipes (
    recipe_id VARCHAR(20),           -- RECIPE_001, RECIPE_002, etc.
    faction VARCHAR(10),             -- MUD, ONI, UST
    planet_types TEXT,               -- "Barren Planet + Terrestrial Planet"
    system_signature VARCHAR(255),   -- Same as planet_types
    system_count INT,                -- How many systems use this recipe
    example_systems TEXT,            -- List of systems for testing
    planet_counts JSON               -- Detailed planet counts per type
);
```

## 🎮 **Implementation Strategy**

### Option 1: Faction-Specific Recipes (Recommended)
- **Create**: 382 unique recipe variations
- **Pros**: Most accurate, accounts for faction differences
- **Cons**: More recipes to manage
- **Use when**: You want maximum granularity

### Option 2: Cross-Faction Base Recipes
- **Create**: 182 base recipes + faction modifiers
- **Pros**: Simpler, fewer recipes
- **Cons**: Less granular control
- **Use when**: You want simpler management

## 🚀 **Quick Start Guide**

### 1. Use the Generated Files
- **`building-recipe-variations.csv`** - Import into spreadsheet for planning
- **`building-recipe-variations.json`** - Use for programmatic access
- **`system-signatures-analysis.json`** - Detailed analysis data

### 2. Priority Implementation Order
1. **Start with Top 50 recipes** (covers ~200+ systems)
2. **Add 2-planet recipes** (covers 206 variations, 53.9% of cases)
3. **Add 3-planet recipes** (covers additional 122 variations)
4. **Handle edge cases** (4+ planet combinations)

### 3. Recipe ID System
Each recipe has a unique ID: `RECIPE_001`, `RECIPE_002`, etc.
- Lower numbers = more common combinations
- Higher numbers = rarer combinations

## 🔧 **Database Implementation Example**

```javascript
// Example: Get recipe for a specific system
function getRecipeForSystem(systemName, systemData) {
    const planetTypes = systemData.planets.map(p => p.archetype).sort();
    const signature = planetTypes.join(' + ');
    const faction = systemData.faction;
    
    // Look up recipe by faction + signature
    const recipeKey = `${faction}|${signature}`;
    return recipeDatabase[recipeKey];
}

// Example: Get all systems that use a specific recipe
function getSystemsForRecipe(recipeId) {
    return recipeVariations.find(r => r.recipeId === recipeId).exampleSystems;
}
```

## 📈 **Benefits of This Approach**

1. **59% Reduction**: 382 recipes instead of 945 individual system recipes
2. **Scalable**: Easy to add new systems to existing recipes
3. **Balanced**: Covers all faction and planet type combinations
4. **Efficient**: Focus development on common patterns first
5. **Maintainable**: Clear recipe IDs and systematic organization

## 🎯 **Special Cases to Consider**

### Unique Systems (1 system each)
- Found **many** signatures with only 1 system
- These are your rarest building opportunities
- Consider special/epic building variants for these

### Most Complex Recipe
- **7 planet types**: Only 1 recipe variation
- Perfect for ultra-rare/legendary buildings

### Simplest Recipes  
- **2 planet types**: 206 variations (53.9%)
- Perfect for common/basic buildings

## 📁 **Generated Files**

All files are in your root directory:
- `building-recipe-variations.csv` ⭐ (Spreadsheet planning)
- `building-recipe-variations.json` ⭐ (Programmatic access)
- `system-signatures-analysis.json` (Detailed analysis)
- `system-signature-analyzer.js` (Generator script)

---

**Generated from**: 945 systems, 3,929 planets  
**Analysis Date**: 2025-08-20  
**Result**: 382 unique building recipe variations needed 