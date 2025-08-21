# Combat Simulator UI Enhancement Guide

## Overview
This guide explains how to add Alpha Strike/Shield tier toggles to the Ship Config Lite combat simulator UI to support the new combat_equation_v4.js features.

## Required UI Elements

### Alpha Tier Controls
Add dropdowns for each fleet to select Alpha Strike and Alpha Shield tiers (0-4).

### HTML Structure to Add

```html
<!-- Add this inside the combat simulator modal, before the formula editor -->
<div class="combat-alpha-controls" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px;">
    <h4 style="margin: 0 0 10px 0;">Combat Skills & Bonuses</h4>
    
    <!-- Left Fleet Controls -->
    <div class="fleet-controls" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px;">
        <div class="left-fleet-controls">
            <h5 style="color: #4CAF50; margin: 0 0 5px 0;">Left Fleet</h5>
            <div class="control-group" style="margin-bottom: 5px;">
                <label style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Alpha Strike:</span>
                    <select id="left-alpha-strike-tier" class="alpha-tier-select" style="width: 120px;">
                        <option value="0">Tier 0 (0%)</option>
                        <option value="1">Tier 1 (10%)</option>
                        <option value="2">Tier 2 (20%)</option>
                        <option value="3">Tier 3 (30%)</option>
                        <option value="4">Tier 4 (40%)</option>
                    </select>
                </label>
            </div>
            <div class="control-group" style="margin-bottom: 5px;">
                <label style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Alpha Shield:</span>
                    <select id="left-alpha-shield-tier" class="alpha-tier-select" style="width: 120px;">
                        <option value="0">Tier 0 (0%)</option>
                        <option value="1">Tier 1 (10%)</option>
                        <option value="2">Tier 2 (20%)</option>
                        <option value="3">Tier 3 (30%)</option>
                        <option value="4">Tier 4 (40%)</option>
                    </select>
                </label>
            </div>
        </div>
        
        <!-- Right Fleet Controls -->
        <div class="right-fleet-controls">
            <h5 style="color: #ff6b6b; margin: 0 0 5px 0;">Right Fleet</h5>
            <div class="control-group" style="margin-bottom: 5px;">
                <label style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Alpha Strike:</span>
                    <select id="right-alpha-strike-tier" class="alpha-tier-select" style="width: 120px;">
                        <option value="0">Tier 0 (0%)</option>
                        <option value="1">Tier 1 (10%)</option>
                        <option value="2">Tier 2 (20%)</option>
                        <option value="3">Tier 3 (30%)</option>
                        <option value="4">Tier 4 (40%)</option>
                    </select>
                </label>
            </div>
            <div class="control-group" style="margin-bottom: 5px;">
                <label style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Alpha Shield:</span>
                    <select id="right-alpha-shield-tier" class="alpha-tier-select" style="width: 120px;">
                        <option value="0">Tier 0 (0%)</option>
                        <option value="1">Tier 1 (10%)</option>
                        <option value="2">Tier 2 (20%)</option>
                        <option value="3">Tier 3 (30%)</option>
                        <option value="4">Tier 4 (40%)</option>
                    </select>
                </label>
            </div>
        </div>
    </div>
    
    <!-- First Striker Control -->
    <div class="first-striker-control" style="text-align: center; margin-top: 10px;">
        <label>
            <span style="margin-right: 10px;">First Striker:</span>
            <input type="radio" name="first-striker" value="left" checked> Left
            <input type="radio" name="first-striker" value="right" style="margin-left: 20px;"> Right
        </label>
    </div>
</div>
```

### CSS Styles to Add

```css
.alpha-tier-select {
    background-color: var(--button-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 4px 8px;
    font-family: inherit;
    font-size: 12px;
}

.combat-alpha-controls h4 {
    color: var(--accent-color);
    font-size: 14px;
    font-weight: 600;
}

.combat-alpha-controls h5 {
    font-size: 13px;
    font-weight: 600;
}

.control-group label {
    font-size: 12px;
    color: var(--secondary-text-color);
}

.first-striker-control {
    border-top: 1px solid var(--border-color);
    padding-top: 10px;
}
```

### JavaScript Updates

Update the `runCombatSimulation` function in `combat-simulator-v2.js`:

```javascript
function runCombatSimulation() {
    // ... existing code ...
    
    // Set alpha tier levels from UI
    window.leftAlphaStrikeLevel = parseInt(document.getElementById('left-alpha-strike-tier')?.value || '0');
    window.leftAlphaShieldLevel = parseInt(document.getElementById('left-alpha-shield-tier')?.value || '0');
    window.rightAlphaStrikeLevel = parseInt(document.getElementById('right-alpha-strike-tier')?.value || '0');
    window.rightAlphaShieldLevel = parseInt(document.getElementById('right-alpha-shield-tier')?.value || '0');
    
    // Set first striker
    const firstStrikerRadios = document.getElementsByName('first-striker');
    for (let radio of firstStrikerRadios) {
        if (radio.checked) {
            window.combatFirstStriker = radio.value;
            break;
        }
    }
    
    // ... rest of existing code ...
}
```

### Optional: Save/Load Settings

Add functions to save and load alpha tier settings:

```javascript
// Save settings to localStorage
function saveCombatSettings() {
    const settings = {
        leftAlphaStrike: document.getElementById('left-alpha-strike-tier').value,
        leftAlphaShield: document.getElementById('left-alpha-shield-tier').value,
        rightAlphaStrike: document.getElementById('right-alpha-strike-tier').value,
        rightAlphaShield: document.getElementById('right-alpha-shield-tier').value,
        firstStriker: document.querySelector('input[name="first-striker"]:checked').value
    };
    localStorage.setItem('combatAlphaSettings', JSON.stringify(settings));
}

// Load settings from localStorage
function loadCombatSettings() {
    const saved = localStorage.getItem('combatAlphaSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        document.getElementById('left-alpha-strike-tier').value = settings.leftAlphaStrike || '0';
        document.getElementById('left-alpha-shield-tier').value = settings.leftAlphaShield || '0';
        document.getElementById('right-alpha-strike-tier').value = settings.rightAlphaStrike || '0';
        document.getElementById('right-alpha-shield-tier').value = settings.rightAlphaShield || '0';
        document.querySelector(`input[name="first-striker"][value="${settings.firstStriker || 'left'}"]`).checked = true;
    }
}

// Call loadCombatSettings when modal opens
```

## Integration Points

### 1. Modal Creation
Add the controls when creating the combat simulator modal in `createCombatSimulatorModal()`.

### 2. Modal Opening
Load saved settings when opening the modal in `openCombatSimulator()`.

### 3. Fight Button
Update window variables before executing the combat formula.

### 4. Save Button
Optionally save settings when saving formulas.

## Testing

1. Open combat simulator
2. Set different alpha tier levels for each fleet
3. Choose first striker
4. Paste combat_equation_v4.js
5. Click FIGHT!
6. Verify alpha bonuses appear in combat log
7. Test with Tier 0 (no bonus) and Tier 4 (max bonus)

## Visual Example

The UI should look like:

```
┌─────────────────────────────────────┐
│ Combat Skills & Bonuses             │
├─────────────────────────────────────┤
│ Left Fleet          Right Fleet     │
│ Alpha Strike: [▼]   Alpha Strike: [▼]│
│ Alpha Shield: [▼]   Alpha Shield: [▼]│
│                                     │
│ First Striker: (●) Left ( ) Right  │
└─────────────────────────────────────┘
```

## Alternative: Quick Toggle Buttons

For a simpler approach, add preset buttons:

```javascript
<div class="alpha-presets">
    <button onclick="setAlphaPreset('none')">No Skills</button>
    <button onclick="setAlphaPreset('balanced')">Balanced (Tier 2)</button>
    <button onclick="setAlphaPreset('offensive')">Offensive (Strike 4, Shield 0)</button>
    <button onclick="setAlphaPreset('defensive')">Defensive (Strike 0, Shield 4)</button>
    <button onclick="setAlphaPreset('maxed')">Maxed (All Tier 4)</button>
</div>

function setAlphaPreset(preset) {
    switch(preset) {
        case 'none':
            setAllAlphaTiers(0, 0, 0, 0);
            break;
        case 'balanced':
            setAllAlphaTiers(2, 2, 2, 2);
            break;
        case 'offensive':
            setAllAlphaTiers(4, 0, 4, 0);
            break;
        case 'defensive':
            setAllAlphaTiers(0, 4, 0, 4);
            break;
        case 'maxed':
            setAllAlphaTiers(4, 4, 4, 4);
            break;
    }
}
```

## Notes

- The UI changes are minimal and non-breaking
- Falls back to Tier 0 (no bonus) if controls not found
- Compatible with existing combat equations (v3 and earlier)
- Settings persist via localStorage (optional)
- Visual feedback shows current tier bonuses
