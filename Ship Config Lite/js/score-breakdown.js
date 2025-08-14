// === SCORE BREAKDOWN PANEL MODULE ===
// This module provides detailed score breakdown functionality for ship scoring system
// Dependencies: Requires app.js to be loaded first for global variables and functions

/**
 * Show detailed score breakdown panel for a ship
 * @param {Object} ship - Ship object with stats and properties
 * @param {Object} modifiedStats - Ship stats after component modifications
 * @param {Object} scores - Calculated scores for all categories
 * @param {Array} allShips - Array of all ships for comparison
 * @param {String} focusCategory - Optional category to focus on (null for overall breakdown)
 * @param {String} scoreType - 'global' or 'class' to indicate which scoring comparison is being shown
 */
function showScoreBreakdownPanel(ship, modifiedStats, scores, allShips, focusCategory = null, scoreType = 'global') {
    // Validate dependencies
    if (typeof SCORE_CATEGORIES === 'undefined') {
        console.error('SCORE_CATEGORIES not found. Make sure app.js is loaded first.');
        return;
    }
    
    // Hide any existing stat modification panel first
    if (typeof hideStatModificationTooltip === 'function') {
        hideStatModificationTooltip();
    }
    
    // Get or create the panel element
    let panel = document.getElementById('score-breakdown-tooltip');
    if (!panel) {
        panel = createScoreBreakdownPanel();
    }
    
    // Calculate category weights
    const categoryWeights = {};
    Object.keys(SCORE_CATEGORIES).forEach(categoryKey => {
        categoryWeights[categoryKey] = getCategoryWeight(categoryKey, ship);
    });
    
    // Create content based on focus
    let content = '';
    if (focusCategory) {
        content = generateCategoryBreakdownContent(ship, modifiedStats, scores, allShips, focusCategory, categoryWeights, scoreType);
    } else {
        content = generateOverallBreakdownContent(ship, modifiedStats, scores, allShips, categoryWeights, scoreType);
    }
    
    // Update panel and show with animation
    panel.innerHTML = content;
    panel.style.display = 'block';
    setTimeout(() => panel.style.transform = 'translateX(0)', 10);
}

/**
 * Hide score breakdown panel with animation
 */
function hideScoreBreakdownPanel() {
    const panel = document.getElementById('score-breakdown-tooltip');
    if (panel) {
        panel.style.transform = 'translateX(450px)';
        setTimeout(() => panel.style.display = 'none', 300);
    }
}

/**
 * Create the score breakdown panel element
 * @returns {HTMLElement} The created panel element
 */
function createScoreBreakdownPanel() {
    const panel = document.createElement('div');
    panel.id = 'score-breakdown-tooltip';
    panel.className = 'stat-panel';
    panel.style.cssText = `
        display: none; position: fixed; top: 0; right: 0; bottom: 0; width: 450px;
        background-color: rgba(20, 20, 20, 0.97); border-left: 1px solid #666;
        padding: 0; z-index: 1000; color: white; font-size: 14px; text-align: left;
        overflow: auto; transition: transform 0.3s ease-in-out; transform: translateX(450px);
        box-shadow: -4px 0 8px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(panel);
    return panel;
}

/**
 * Generate content for specific category breakdown
 */
function generateCategoryBreakdownContent(ship, modifiedStats, scores, allShips, focusCategory, categoryWeights, scoreType = 'global') {
    const category = SCORE_CATEGORIES[focusCategory];
    const categoryScore = scores[focusCategory];
    const categoryWeight = categoryWeights[focusCategory];
    
    // Determine comparison scope text
    const comparisonScope = scoreType === 'class' ? 
        `${getClassNameFromNumber(ship.Class)} Ships` : 
        'All Ships';
    
    let content = `
        <div style="background:#111;padding:15px;border-bottom:1px solid #555;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;color:#FFD700;font-size:18px;">${category.icon} ${category.name} Score Breakdown</h3>
            <button onclick="hideScoreBreakdownPanel()" style="background:none;border:none;color:#ccc;font-size:20px;cursor:pointer;">&times;</button>
        </div>
        <div style="padding:15px;">
            <div style="text-align:center;margin-bottom:15px;">
                <div style="font-size:24px;font-weight:bold;color:#FFD700;">${getShipDisplayName(ship)}</div>
                <div style="color:#aaa;font-size:14px;">${getClassNameFromNumber(ship.Class)} ${ship.Spec}</div>
                <div style="color:${getScoreColor(categoryScore)};font-weight:bold;font-size:18px;margin-top:10px;">${category.name} Score: ${categoryScore}/100</div>
                <div style="color:#3d8bf8;font-size:12px;margin-top:5px;">Compared to: ${comparisonScope}</div>
            </div>
            <div style="margin-bottom:20px;">
                <h4 style="margin:0 0 10px 0;color:white;border-bottom:1px solid #444;padding-bottom:5px;">Stats in ${category.name} Category</h4>
    `;
    
    category.stats.forEach(statName => {
        const statValue = modifiedStats[statName];
        const weight = Math.abs(category.weights[statName] || 1.0);
        const isLowerBetter = (category.weights[statName] || 1.0) < 0;
        const allStatValues = allShips.map(s => s[statName] || 0);
        const statScore = calculateStatScore(statValue, statName, allStatValues);
        
        content += `
            <div style="margin-bottom:12px;background:rgba(30,30,30,0.5);padding:10px;border-radius:4px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                    <div style="color:#FFD700;font-weight:bold;">${statName}</div>
                    <div style="color:${getScoreColor(statScore)};font-weight:bold;">${statScore.toFixed(1)}/100</div>
                </div>
                <div style="font-size:12px;color:#BBB;margin-bottom:5px;">
                    Value: ${formatNumber(statValue)} | Weight: ${weight}x ${isLowerBetter ? '(lower is better)' : ''}
                </div>
                <div style="font-size:11px;color:#888;">
                    Contribution: ${statScore.toFixed(1)} × ${weight} = ${(statScore * weight).toFixed(1)} points
                </div>
            </div>
        `;
    });
    
    content += `
            </div>
            <div style="margin-bottom:20px;">
                <h4 style="margin:0 0 10px 0;color:white;border-bottom:1px solid #444;padding-bottom:5px;">Specialization Bonus</h4>
                <div style="font-size:12px;color:#ccc;">
                    Ship Spec: <span style="color:#4CAF50;font-weight:bold;">${ship.Spec}</span><br>
                    Category Weight: <span style="color:${categoryWeight > 1.0 ? '#4CAF50' : categoryWeight < 1.0 ? '#ff6b6b' : 'white'};font-weight:bold;">
                        ${categoryWeight.toFixed(2)}x ${categoryWeight > 1.0 ? '(+' + ((categoryWeight - 1.0) * 100).toFixed(0) + '% bonus)' : categoryWeight < 1.0 ? '(' + ((categoryWeight - 1.0) * 100).toFixed(0) + '% penalty)' : '(no bonus)'}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    return content;
}

/**
 * Generate content for overall score breakdown
 */
function generateOverallBreakdownContent(ship, modifiedStats, scores, allShips, categoryWeights, scoreType = 'global') {
    const uberScore = scores.Uber;
    
    // Determine comparison scope text and icon
    const comparisonScope = scoreType === 'class' ? 
        `${getClassNameFromNumber(ship.Class)} Ships` : 
        'All Ships';
    const scoreIcon = scoreType === 'class' ? '🏆' : '⭐';
    
    let content = `
        <div style="background:#111;padding:15px;border-bottom:1px solid #555;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;color:#FFD700;font-size:18px;">${scoreIcon} Overall Score Breakdown</h3>
            <button onclick="hideScoreBreakdownPanel()" style="background:none;border:none;color:#ccc;font-size:20px;cursor:pointer;">&times;</button>
        </div>
        <div style="padding:15px;">            <div style="text-align:center;margin-bottom:15px;">                <div style="font-size:24px;font-weight:bold;color:#FFD700;">${getShipDisplayName(ship)}</div>                <div style="color:#aaa;font-size:14px;">${getClassNameFromNumber(ship.Class)} ${ship.Spec}</div>                <div style="color:${getScoreColor(uberScore)};font-weight:bold;font-size:18px;margin-top:10px;">Overall Score: ${uberScore}/100</div>                <div style="color:#3d8bf8;font-size:12px;margin-top:5px;">Compared to: ${comparisonScope}</div>            </div>
            <div style="margin-bottom:20px;">
                <h4 style="margin:0 0 10px 0;color:white;border-bottom:1px solid #444;padding-bottom:5px;">Category Breakdown</h4>
    `;
    
    Object.keys(SCORE_CATEGORIES).forEach(categoryKey => {
        const category = SCORE_CATEGORIES[categoryKey];
        const categoryScore = scores[categoryKey];
        const categoryWeight = categoryWeights[categoryKey];
        
        content += `
            <div style="margin-bottom:12px;background:rgba(30,30,30,0.5);padding:10px;border-radius:4px;cursor:pointer;" 
                 onclick="showScoreBreakdownPanel(addedShips.find(s => s['Ship Name'] === '${ship['Ship Name']}'), 
                 calculateModifiedStats(addedShips.find(s => s['Ship Name'] === '${ship['Ship Name']}'), 
                 shipConfigurations['${getShipIdentifier(ship)}'][${activeConfigIndices[ship.id] || 0}].components), 
                 calculateShipScores(addedShips.find(s => s['Ship Name'] === '${ship['Ship Name']}'), 
                 calculateModifiedStats(addedShips.find(s => s['Ship Name'] === '${ship['Ship Name']}'), 
                 shipConfigurations['${getShipIdentifier(ship)}'][${activeConfigIndices[ship.id] || 0}].components), ships), ships, '${categoryKey}')">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                    <div style="color:${category.color};font-weight:bold;">${category.icon} ${category.name}</div>
                    <div style="color:${getScoreColor(categoryScore)};font-weight:bold;">${categoryScore}/100</div>
                </div>
                <div style="font-size:12px;color:#BBB;">
                    Weight: ${categoryWeight.toFixed(2)}x | Click for details →
                </div>
            </div>
        `;
    });
    
    // Show final calculation
    const totalWeightedScore = Object.keys(SCORE_CATEGORIES).reduce((sum, categoryKey) => {
        return sum + (scores[categoryKey] * categoryWeights[categoryKey]);
    }, 0);
    
    const totalWeight = Object.keys(SCORE_CATEGORIES).reduce((sum, categoryKey) => {
        return sum + categoryWeights[categoryKey];
    }, 0);
    
    content += `
            </div>
            <div style="margin-bottom:20px;">
                <h4 style="margin:0 0 10px 0;color:white;border-bottom:1px solid #444;padding-bottom:5px;">Final Calculation</h4>
                <div style="font-family:monospace;color:#BBB;background-color:rgba(0,0,0,0.3);padding:10px;border-radius:4px;line-height:1.6;">
                    Overall Score = Total Weighted Points ÷ Total Weight<br>
                    Overall Score = ${totalWeightedScore.toFixed(1)} ÷ ${totalWeight.toFixed(2)}<br>
                    <span style="color:${getScoreColor(uberScore)};font-weight:bold;">Overall Score = ${uberScore}</span>
                </div>
            </div>
            <div style="background-color:rgba(0,0,0,0.3);padding:15px;border-radius:4px;font-size:11px;color:#aaa;">
                <div style="font-weight:bold;margin-bottom:8px;color:#FFD700;">How Scoring Works:</div>
                <div style="line-height:1.4;">
                    • Each stat is normalized to 0-100 scale based on ${scoreType === 'class' ? 'ships in the same class' : 'all ships'}<br>
                    • Stats are grouped into 6 categories with specific weights<br>
                    • Ship specialization provides category weight bonuses<br>
                    • Category scores are weighted and averaged for final score<br>
                    • Higher scores indicate better performance ${scoreType === 'class' ? 'within the ship class' : 'across all ships'}
                </div>
            </div>
        </div>
    `;
    
    return content;
}

// === MODULE EXPORT ===
// Expose functions to global scope for use by app.js
window.ScoreBreakdown = {
    showPanel: showScoreBreakdownPanel,
    hidePanel: hideScoreBreakdownPanel
};

// Also expose individual functions for backward compatibility
window.showScoreBreakdownPanel = showScoreBreakdownPanel;
window.hideScoreBreakdownPanel = hideScoreBreakdownPanel;

console.log('Score Breakdown module loaded successfully'); 