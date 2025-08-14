// === MODULE: Simulation ===
// Handles simulation mode, XP accumulation, skill progression, and stats tracking

// Simulation state
const SimulationState = {
    isRunning: false,
    isPaused: false,
    speed: 1, // 1x, 2x, 4x, 8x speed multipliers
    startTime: null,
    pausedTime: 0,
    lastUpdateTime: null,
    
    // Career XP tracking - keyed by career node ID
    careerXP: new Map(), // nodeId -> { xp: number, level: number, unspentPoints: number, isActive: boolean }
    
    // Renown tracking
    renown: {
        total: 0,
        unspent: 0,
        careerPointsEarned: 0, // Track total career points earned for renown calculation
        progressToNextRenown: 0 // Progress toward next renown point (0-5)
    },
    
    // Node progression tracking
    nodeProgress: new Map(), // nodeId -> { unlocked: boolean, currentLevel: number, maxLevel: number }
    
    // Configuration for node progression
    nodeConfig: new Map() // nodeId -> { isSequential: boolean, childOrder: array }
};

// Cache DOM elements for simulation UI
let cachedUIElements = {
    xpContainer: null,
    renownDisplay: null,
    lastUIUpdate: 0
};

/**
 * Initialize simulation mode
 */
function initializeSimulation(editor) {
    console.log('Initializing simulation');
    
    // Reset simulation state
    SimulationState.isRunning = false;
    SimulationState.isPaused = false;
    SimulationState.speed = 1;
    SimulationState.startTime = null;
    SimulationState.pausedTime = 0;
    SimulationState.lastUpdateTime = null;
    
    // Clear career XP
    SimulationState.careerXP.clear();
    
    // Reset UI cache
    cachedUIElements.xpContainer = null;
    cachedUIElements.renownDisplay = null;
    cachedUIElements.lastUIUpdate = 0;
    
    // Initialize career nodes
    editor.nodes.forEach(node => {
        if (node.tag === 'Career') {
            const nodeColor = window.NodeManager.getNodeColor(node, editor);
            SimulationState.careerXP.set(node.id, {
                xp: 0,
                level: 0,
                unspentPoints: 0,
                xpRate: 0.5 + Math.random() * 0.5, // Reduced: Random XP rate between 5-15 per second (was 10-30)
                nextLevelXP: 100, // Initial XP required for level 1
                color: nodeColor, // Store node color for progress bar
                isActive: false // Career starts paused
            });
        }
    });
    
    // First pass: Initialize all nodes as locked
    editor.nodes.forEach(node => {
        SimulationState.nodeProgress.set(node.id, {
            unlocked: false,
            currentLevel: 0,
            maxLevel: node.scalability === 'Unlimited' ? Infinity : 1
        });
        
        // Initialize node configuration
        SimulationState.nodeConfig.set(node.id, {
            isSequential: node.progressionType === 'sequential',
            childOrder: node.childOrder || []
        });
    });
    
    // Second pass: Unlock nodes that should start unlocked
    // A node starts unlocked if:
    // 1. It's a C4 guidance node AND
    // 2. It has no parents, OR all its parents are unlocked
    const checkAndUnlockNode = (nodeId) => {
        const node = editor.nodes.get(nodeId);
        if (!node) return false;
        
        const isGuidanceNode = !node.scalability || node.scalability === 'Successive Range';
        
        // Only C4 guidance nodes can start unlocked
        if (!isGuidanceNode || node.milestone !== 'C4') {
            return false;
        }
        
        // Check all parents
        const parentConnections = Array.from(editor.connections.values())
            .filter(conn => conn.to === nodeId);
        
        if (parentConnections.length === 0) {
            // No parents - can be unlocked
            const progress = SimulationState.nodeProgress.get(nodeId);
            progress.unlocked = true;
            progress.currentLevel = 1;
            return true;
        }
        
        // Check if all parents are unlocked
        let allParentsUnlocked = true;
        for (const conn of parentConnections) {
            const parentProgress = SimulationState.nodeProgress.get(conn.from);
            if (!parentProgress || !parentProgress.unlocked) {
                allParentsUnlocked = false;
                break;
            }
        }
        
        if (allParentsUnlocked) {
            const progress = SimulationState.nodeProgress.get(nodeId);
            progress.unlocked = true;
            progress.currentLevel = 1;
            return true;
        }
        
        return false;
    };
    
    // Keep trying to unlock nodes until no more can be unlocked
    let changed = true;
    while (changed) {
        changed = false;
        editor.nodes.forEach(node => {
            const progress = SimulationState.nodeProgress.get(node.id);
            if (!progress.unlocked && checkAndUnlockNode(node.id)) {
                changed = true;
            }
        });
    }
    
    // Reset renown
    SimulationState.renown = { total: 0, unspent: 0, careerPointsEarned: 0, progressToNextRenown: 0 };
    
    console.log('Simulation initialized');
}

/**
 * Toggle a specific career's active state
 */
function toggleCareer(nodeId) {
    const careerData = SimulationState.careerXP.get(nodeId);
    if (!careerData) return;
    
    careerData.isActive = !careerData.isActive;
    
    // Check if any careers are active
    let anyActive = false;
    SimulationState.careerXP.forEach(data => {
        if (data.isActive) anyActive = true;
    });
    
    if (anyActive) {
        // If we have active careers, ensure simulation is running
        if (!SimulationState.isRunning) {
            startSimulation(window.editor);
        } else if (SimulationState.isPaused) {
            // Resume if paused
            SimulationState.isPaused = false;
            SimulationState.lastUpdateTime = Date.now();
            requestAnimationFrame(() => updateSimulation(window.editor));
        }
    } else {
        // No active careers, pause the simulation
        if (SimulationState.isRunning) {
            pauseSimulation();
        }
    }
    
    // Force immediate UI update
    updateSimulationUI(window.editor);
}

/**
 * Check if any careers are active
 */
function hasActiveCareers() {
    let anyActive = false;
    SimulationState.careerXP.forEach(data => {
        if (data.isActive) anyActive = true;
    });
    return anyActive;
}

/**
 * Start or resume simulation
 */
function startSimulation(editor) {
    if (!SimulationState.isRunning) {
        SimulationState.isRunning = true;
        SimulationState.isPaused = false;
        SimulationState.startTime = Date.now() - SimulationState.pausedTime;
        SimulationState.lastUpdateTime = Date.now();
        
        // Start the simulation loop
        requestAnimationFrame(() => updateSimulation(editor));
        
        console.log('Simulation started');
    }
}

/**
 * Pause simulation
 */
function pauseSimulation() {
    if (SimulationState.isRunning && !SimulationState.isPaused) {
        SimulationState.isPaused = true;
        SimulationState.pausedTime = Date.now() - SimulationState.startTime;
        console.log('Simulation paused');
    }
}

/**
 * Stop simulation completely
 */
function stopSimulation() {
    SimulationState.isRunning = false;
    SimulationState.isPaused = false;
    console.log('Simulation stopped');
}

/**
 * Change simulation speed
 */
function setSimulationSpeed(speed) {
    SimulationState.speed = speed;
    console.log(`Simulation speed set to ${speed}x`);
    
    // Update UI to reflect new speed
    updateSimulationUI(window.editor);
}

/**
 * Update simulation state
 */
function updateSimulation(editor) {
    if (!SimulationState.isRunning) {
        return;
    }
    
    // Check if we should continue - either not paused OR at least one career is active
    const hasActive = hasActiveCareers();
    if (SimulationState.isPaused && !hasActive) {
        return;
    }
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - SimulationState.lastUpdateTime) / 1000; // Convert to seconds
    const adjustedDelta = deltaTime * SimulationState.speed;
    
    // Update career XP only for active careers
    let totalLevelsGained = 0;
    let needsUIUpdate = false;
    
    SimulationState.careerXP.forEach((careerData, nodeId) => {
        // Only accumulate XP if this career is active
        if (!careerData.isActive) return;
        
        const xpGain = careerData.xpRate * adjustedDelta;
        const previousXP = careerData.xp;
        careerData.xp += xpGain;
        
        // Check for level ups
        while (careerData.xp >= careerData.nextLevelXP) {
            careerData.xp -= careerData.nextLevelXP;
            careerData.level++;
            careerData.unspentPoints++;
            totalLevelsGained++;
            needsUIUpdate = true; // Only update UI on level changes
            
            // Increase XP requirement for next level (exponential growth)
            careerData.nextLevelXP = Math.floor(careerData.nextLevelXP * 1.2);
        }
    });
    
    // Award renown for career points earned (every 6 career points = 1 renown)
    if (totalLevelsGained > 0) {
        SimulationState.renown.careerPointsEarned += totalLevelsGained;
        SimulationState.renown.progressToNextRenown += totalLevelsGained;
        
        // Check if we earned new renown points
        const renownPointsEarned = Math.floor(SimulationState.renown.progressToNextRenown / 6);
        if (renownPointsEarned > 0) {
            SimulationState.renown.progressToNextRenown %= 6;
            SimulationState.renown.total += renownPointsEarned;
            SimulationState.renown.unspent += renownPointsEarned;
            
            // Big celebration for renown points!
            if (window.UIControls) {
                window.UIControls.showToast(`🎉 RENOWN POINT EARNED! 🎉`, 3000);
            }
            
            // Trigger celebration animation
            if (window.Rendering) {
                window.Rendering.triggerRenownCelebration();
            }
            
            needsUIUpdate = true;
        }
    }
    
    SimulationState.lastUpdateTime = currentTime;
    
    // Update UI only when necessary and throttle updates to 10 FPS for smooth visuals
    const timeSinceLastUIUpdate = currentTime - cachedUIElements.lastUIUpdate;
    if (needsUIUpdate || timeSinceLastUIUpdate > 100) { // Update UI at most 10 times per second
        updateSimulationUI(editor);
        cachedUIElements.lastUIUpdate = currentTime;
    }
    
    // Continue animation loop if we're still running and have active careers
    if (SimulationState.isRunning && hasActive) {
        requestAnimationFrame(() => updateSimulation(editor));
    }
}

/**
 * Check if a node can be unlocked
 */
function canUnlockNode(editor, nodeId) {
    const node = editor.nodes.get(nodeId);
    if (!node) return false;
    
    const progress = SimulationState.nodeProgress.get(nodeId);
    if (progress.unlocked && progress.currentLevel >= progress.maxLevel) {
        return false; // Already at max level
    }
    
    // Check parent requirements
    const parentConnections = Array.from(editor.connections.values())
        .filter(conn => conn.to === nodeId);
    
    if (parentConnections.length === 0) {
        return true; // Root nodes are always unlockable
    }
    
    // Check each parent - ALL must be unlocked
    for (const conn of parentConnections) {
        const parentNode = editor.nodes.get(conn.from);
        const parentProgress = SimulationState.nodeProgress.get(conn.from);
        
        if (!parentProgress || !parentProgress.unlocked) {
            return false; // Parent not unlocked
        }
        
        // Check if parent has specific unlock requirements
        if (parentNode.scalability === 'Successive Range') {
            const parentConfig = SimulationState.nodeConfig.get(conn.from);
            
            if (parentConfig.isSequential) {
                // For sequential progression, check if this node is next in order
                const childOrder = parentConfig.childOrder;
                const nodeIndex = childOrder.indexOf(nodeId);
                
                if (nodeIndex === -1) {
                    // Node not in order list, treat as free-form
                    continue; // Check other parents
                }
                
                // Check if all previous nodes in sequence are unlocked
                for (let i = 0; i < nodeIndex; i++) {
                    const prevNodeProgress = SimulationState.nodeProgress.get(childOrder[i]);
                    if (!prevNodeProgress || !prevNodeProgress.unlocked) {
                        return false;
                    }
                }
            }
        }
    }
    
    return true; // All parents are unlocked
}

/**
 * Get available points for spending on a node
 */
function getAvailablePoints(editor, nodeId) {
    const node = editor.nodes.get(nodeId);
    if (!node) return 0;
    
    // Check if node is a Council Rank node - they only use renown
    if (node.tag === 'Council Rank') {
        return SimulationState.renown.unspent;
    }
    
    // All other nodes use career points from their parent career
    const parentCareer = findParentCareer(editor, nodeId);
    if (parentCareer) {
        const careerData = SimulationState.careerXP.get(parentCareer.id);
        return careerData ? careerData.unspentPoints : 0;
    }
    
    return 0;
}

/**
 * Find the parent career node for a given node
 */
function findParentCareer(editor, nodeId) {
    const visited = new Set();
    const queue = [nodeId];
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const currentNode = editor.nodes.get(currentId);
        if (currentNode && currentNode.tag === 'Career') {
            return currentNode;
        }
        
        // Check parents
        const parentConnections = Array.from(editor.connections.values())
            .filter(conn => conn.to === currentId);
        
        parentConnections.forEach(conn => {
            queue.push(conn.from);
        });
    }
    
    return null;
}

/**
 * Check if upgrading this node completes all children of a Successive Range parent
 */
function checkSuccessiveRangeCompletion(editor, nodeId) {
    // Find all parent nodes of the upgraded node
    const parentConnections = Array.from(editor.connections.values())
        .filter(conn => conn.to === nodeId);
    
    parentConnections.forEach(conn => {
        const parentNode = editor.nodes.get(conn.from);
        if (parentNode && parentNode.scalability === 'Successive Range') {
            // Check if all C4 children of this Successive Range node are now maxed
            const childConnections = Array.from(editor.connections.values())
                .filter(c => c.from === conn.from);
            
            let allChildrenMaxed = true;
            let childCount = 0;
            
            // Check each direct child
            childConnections.forEach(childConn => {
                const childNode = editor.nodes.get(childConn.to);
                if (childNode && childNode.milestone === 'C4') {
                    childCount++;
                    const childProgress = SimulationState.nodeProgress.get(childConn.to);
                    
                    // Check if child is not maxed
                    if (!childProgress || !childProgress.unlocked || 
                        (childProgress.currentLevel < childProgress.maxLevel && childProgress.maxLevel !== Infinity)) {
                        allChildrenMaxed = false;
                    }
                }
            });
            
            // If all children are maxed and there are children, trigger celebration
            if (allChildrenMaxed && childCount > 0) {
                // Check if this is the first time (store previous state)
                const stateKey = `sr_complete_${conn.from}`;
                if (!window.successiveRangeCompletionState) {
                    window.successiveRangeCompletionState = new Set();
                }
                
                if (!window.successiveRangeCompletionState.has(stateKey)) {
                    window.successiveRangeCompletionState.add(stateKey);
                    
                    // Trigger special celebration!
                    console.log(`All children of ${parentNode.name} are now fully upgraded!`);
                    window.UIControls.showToast(`✨ ${parentNode.name} MASTERED! ✨`, 3000);
                    
                    // Play special sound and visual effect
                    if (window.Rendering) {
                        window.Rendering.triggerSuccessiveRangeCompletion(conn.from);
                    }
                }
            }
        }
    });
}

/**
 * Auto-unlock child guidance nodes when their parents are unlocked
 */
function autoUnlockChildGuidanceNodes(editor, parentId) {
    const childConnections = Array.from(editor.connections.values())
        .filter(conn => conn.from === parentId);
    
    childConnections.forEach(conn => {
        const childNode = editor.nodes.get(conn.to);
        if (childNode) {
            const childProgress = SimulationState.nodeProgress.get(conn.to);
            const isGuidanceNode = !childNode.scalability || childNode.scalability === 'Successive Range';
            
            // If it's a guidance node and not already unlocked, check if it should unlock
            if (isGuidanceNode && childProgress && !childProgress.unlocked) {
                // Check if all parents of this child are unlocked
                const childParentConnections = Array.from(editor.connections.values())
                    .filter(c => c.to === conn.to);
                
                let allParentsUnlocked = true;
                for (const parentConn of childParentConnections) {
                    const parentProgress = SimulationState.nodeProgress.get(parentConn.from);
                    if (!parentProgress || !parentProgress.unlocked) {
                        allParentsUnlocked = false;
                        break;
                    }
                }
                
                if (allParentsUnlocked) {
                    childProgress.unlocked = true;
                    childProgress.currentLevel = 1;
                    window.UIControls.showToast(`Auto-unlocked guidance node: ${childNode.name}`, 2000);
                    
                    // Recursively check this node's children
                    autoUnlockChildGuidanceNodes(editor, conn.to);
                }
            }
        }
    });
}

/**
 * Spend a point on a node
 */
function spendPoint(editor, nodeId) {
    const node = editor.nodes.get(nodeId);
    if (!node) return false;
    
    console.log(`Attempting to spend point on node: ${node.name}, scalability: ${node.scalability}`);
    
    // Only allow interaction with C4 milestone nodes
    if (node.milestone !== 'C4') {
        window.UIControls.showToast('Only C4 milestone nodes can be modified', 2000);
        return false;
    }
    
    const progress = SimulationState.nodeProgress.get(nodeId);
    console.log(`Node progress:`, progress);
    
    // Check if this is a guidance node that's already unlocked
    if (node.scalability === 'Successive Range' && progress.unlocked) {
        window.UIControls.showToast('Guidance nodes cannot be upgraded further', 2000);
        return false;
    }
    
    if (!canUnlockNode(editor, nodeId)) {
        window.UIControls.showToast('Cannot unlock this node yet', 2000);
        return false;
    }
    
    const availablePoints = getAvailablePoints(editor, nodeId);
    if (availablePoints <= 0) {
        window.UIControls.showToast('No points available', 2000);
        return false;
    }
    
    // Spend the point - only use renown for Council Rank nodes
    if (node.tag === 'Council Rank') {
        // Council Rank nodes only use renown
        if (SimulationState.renown.unspent > 0) {
            SimulationState.renown.unspent--;
            const wasUnlocked = progress.unlocked;
            progress.unlocked = true;
            progress.currentLevel++;
            
            // Show appropriate message
            if (!wasUnlocked) {
                window.UIControls.showToast(`Unlocked: ${node.name}`, 2000);
            } else if (node.scalability === 'Unlimited') {
                window.UIControls.showToast(`${node.name} → Level ${progress.currentLevel}`, 2000);
            }
            
            // Trigger firework animation at the node position for any upgrade
            console.log('Triggering firework for node:', node.name);
            if (window.Rendering) {
                window.Rendering.triggerNodeFirework(nodeId);
            } else {
                console.error('window.Rendering not available!');
            }
            
            // Check for auto-unlocking child guidance nodes
            autoUnlockChildGuidanceNodes(editor, nodeId);
            
            // Check if this upgrade completed all children of any Successive Range parent
            checkSuccessiveRangeCompletion(editor, nodeId);
            
            // Update UI immediately after spending a point
            updateSimulationUI(editor);
            
            return true;
        } else {
            window.UIControls.showToast('Insufficient renown points', 2000);
            return false;
        }
    } else {
        // All other nodes use career points
        const parentCareer = findParentCareer(editor, nodeId);
        if (parentCareer) {
            const careerData = SimulationState.careerXP.get(parentCareer.id);
            if (careerData && careerData.unspentPoints > 0) {
                careerData.unspentPoints--;
                const wasUnlocked = progress.unlocked;
                progress.unlocked = true;
                progress.currentLevel++;
                
                // Show appropriate message
                if (!wasUnlocked) {
                    window.UIControls.showToast(`Unlocked: ${node.name}`, 2000);
                } else if (node.scalability === 'Unlimited') {
                    window.UIControls.showToast(`${node.name} → Level ${progress.currentLevel}`, 2000);
                }
                
                // Trigger firework animation at the node position for any upgrade
                console.log('Triggering firework for node:', node.name);
                if (window.Rendering) {
                    window.Rendering.triggerNodeFirework(nodeId);
                } else {
                    console.error('window.Rendering not available!');
                }
                
                // Check for auto-unlocking child guidance nodes
                autoUnlockChildGuidanceNodes(editor, nodeId);
                
                // Check if this upgrade completed all children of any Successive Range parent
                checkSuccessiveRangeCompletion(editor, nodeId);
                
                // Update UI immediately after spending a point
                updateSimulationUI(editor);
                
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Remove a point from a node (respec)
 */
function removePoint(editor, nodeId) {
    const node = editor.nodes.get(nodeId);
    if (!node) return false;
    
    // Only allow interaction with C4 milestone nodes
    if (node.milestone !== 'C4') {
        window.UIControls.showToast('Only C4 milestone nodes can be modified', 2000);
        return false;
    }
    
    const progress = SimulationState.nodeProgress.get(nodeId);
    if (!progress.unlocked || progress.currentLevel <= 0) {
        return false;
    }
    
    // Check if any child nodes are unlocked (can't remove if children depend on it)
    const childConnections = Array.from(editor.connections.values())
        .filter(conn => conn.from === nodeId);
    
    for (const conn of childConnections) {
        const childProgress = SimulationState.nodeProgress.get(conn.to);
        if (childProgress && childProgress.unlocked) {
            window.UIControls.showToast('Cannot remove: child nodes depend on this', 2000);
            return false;
        }
    }
    
    // Refund the point - only use renown for Council Rank nodes
    if (node.tag === 'Council Rank') {
        // Council Rank nodes only use renown
        SimulationState.renown.unspent++;
        progress.currentLevel--;
        if (progress.currentLevel <= 0) {
            progress.unlocked = false;
        }
        window.UIControls.showToast(`Removed point from: ${node.name}`, 2000);
        return true;
    } else {
        // All other nodes use career points
        const parentCareer = findParentCareer(editor, nodeId);
        if (parentCareer) {
            const careerData = SimulationState.careerXP.get(parentCareer.id);
            if (careerData) {
                careerData.unspentPoints++;
                progress.currentLevel--;
                if (progress.currentLevel <= 0) {
                    progress.unlocked = false;
                }
                window.UIControls.showToast(`Removed point from: ${node.name}`, 2000);
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Initialize simulation UI structure (called once)
 */
function initializeSimulationUI(editor) {
    if (!cachedUIElements.xpContainer) {
        cachedUIElements.xpContainer = document.getElementById('careerXPContainer');
    }
    
    if (cachedUIElements.xpContainer) {
        let html = '';
        
        // Add simulation controls at the top of the panel
        html += `
            <div class="simulation-controls-section">
                <div class="controls-row">
                    <span class="control-label">SPEED:</span>
                    <button class="speed-button" data-speed="1" onclick="window.Simulation.setSimulationSpeed(1);">1x</button>
                    <button class="speed-button" data-speed="2" onclick="window.Simulation.setSimulationSpeed(2);">2x</button>
                    <button class="speed-button" data-speed="4" onclick="window.Simulation.setSimulationSpeed(4);">4x</button>
                    <button class="speed-button" data-speed="8" onclick="window.Simulation.setSimulationSpeed(8);">8x</button>
                    <div class="control-spacer"></div>
                    <button class="sim-button" onclick="window.EventHandlers.showSimulationStats(window.editor);" title="Show Stats">📊</button>
                    <button class="sim-button" onclick="window.Simulation.resetSimulation(window.editor);" title="Reset">🔄</button>
                </div>
            </div>
            <div class="renown-section">
                <div class="renown-header">
                    <span class="renown-label">RENOWN</span>
                    <span class="renown-count" id="renownCount">0 / 0</span>
                </div>
                <div class="renown-progress">
                    <div class="renown-fill" id="renownFill" style="width: 0%"></div>
                    <div class="renown-text" id="renownProgressText">0 / 6</div>
                </div>
            </div>
            <div class="careers-divider"></div>
            <div id="careerProgressBars"></div>
        `;
        
        cachedUIElements.xpContainer.innerHTML = html;
        
        // Initialize career progress bars
        const progressContainer = document.getElementById('careerProgressBars');
        html = '';
        
        SimulationState.careerXP.forEach((careerData, nodeId) => {
            const node = editor.nodes.get(nodeId);
            if (node) {
                const nodeColor = careerData.color || '#4A90E2';
                
                html += `
                    <div class="career-xp-bar" data-career-id="${nodeId}">
                        <div class="career-header">
                            <div class="career-name" style="color: ${nodeColor}">${node.name.toUpperCase()}</div>
                            <button class="career-play-button" data-career-id="${nodeId}"
                                    onclick="window.Simulation.toggleCareer('${nodeId}')" 
                                    title="Play ${node.name}">
                                ▶
                            </button>
                        </div>
                        <div class="xp-progress">
                            <div class="xp-fill paused" data-career-id="${nodeId}" style="width: 0%; background: ${nodeColor}"></div>
                        </div>
                        <div class="career-stats" data-career-id="${nodeId}">
                            Level 0 | <span class="points-display">0 points</span>
                        </div>
                    </div>
                `;
            }
        });
        
        progressContainer.innerHTML = html;
    }
}

/**
 * Update simulation UI elements
 */
function updateSimulationUI(editor) {
    // Initialize UI structure if needed
    if (!document.getElementById('careerProgressBars')) {
        initializeSimulationUI(editor);
    }
    
    // Update speed buttons
    document.querySelectorAll('.speed-button').forEach(btn => {
        const speed = parseInt(btn.dataset.speed);
        if (speed === SimulationState.speed) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update renown display
    const renownCount = document.getElementById('renownCount');
    const renownFill = document.getElementById('renownFill');
    const renownProgressText = document.getElementById('renownProgressText');
    
    if (renownCount) {
        const hasPoints = SimulationState.renown.unspent > 0;
        const renownSection = document.querySelector('.renown-section');
        
        if (hasPoints) {
            renownSection.classList.add('has-points');
        } else {
            renownSection.classList.remove('has-points');
        }
        
        renownCount.textContent = `${SimulationState.renown.unspent} / ${SimulationState.renown.total}${hasPoints ? ' ready!' : ''}`;
    }
    
    if (renownFill && renownProgressText) {
        const progress = SimulationState.renown.progressToNextRenown;
        const progressPercent = (progress / 6) * 100;
        renownFill.style.width = `${progressPercent}%`;
        renownProgressText.textContent = `${progress} / 6`;
        
        // Add pulsing animation when close to earning a renown point
        if (progress >= 5) {
            renownFill.classList.add('almost-ready');
        } else {
            renownFill.classList.remove('almost-ready');
        }
    }
    
    // Update career progress bars
    SimulationState.careerXP.forEach((careerData, nodeId) => {
        const node = editor.nodes.get(nodeId);
        if (!node) return;
        
        // Update career bar container
        const careerBar = document.querySelector(`.career-xp-bar[data-career-id="${nodeId}"]`);
        if (careerBar) {
            const hasPoints = careerData.unspentPoints > 0;
            const isActive = careerData.isActive;
            
            // Update classes
            if (hasPoints) {
                careerBar.classList.add('has-points');
            } else {
                careerBar.classList.remove('has-points');
            }
            
            if (isActive) {
                careerBar.classList.add('active');
                careerBar.classList.remove('paused');
            } else {
                careerBar.classList.remove('active');
                careerBar.classList.add('paused');
            }
        }
        
        // Update play button
        const playButton = document.querySelector(`.career-play-button[data-career-id="${nodeId}"]`);
        if (playButton) {
            const isActive = careerData.isActive;
            
            if (isActive) {
                playButton.classList.add('playing');
                playButton.textContent = '⏸';
                playButton.title = `Pause ${node.name}`;
            } else {
                playButton.classList.remove('playing');
                playButton.textContent = '▶';
                playButton.title = `Play ${node.name}`;
            }
        }
        
        // Update XP progress bar
        const xpFill = document.querySelector(`.xp-fill[data-career-id="${nodeId}"]`);
        if (xpFill) {
            const xpPercent = Math.min(100, (careerData.xp / careerData.nextLevelXP) * 100);
            xpFill.style.width = `${xpPercent}%`;
            
            if (careerData.isActive) {
                xpFill.classList.remove('paused');
            } else {
                xpFill.classList.add('paused');
            }
        }
        
        // Update stats text
        const statsDiv = document.querySelector(`.career-stats[data-career-id="${nodeId}"]`);
        if (statsDiv) {
            const hasPoints = careerData.unspentPoints > 0;
            
            if (hasPoints) {
                statsDiv.classList.add('highlight-points');
            } else {
                statsDiv.classList.remove('highlight-points');
            }
            
            statsDiv.innerHTML = `Level ${careerData.level} | <span class="points-display">${careerData.unspentPoints} points${hasPoints ? ' ready!' : ''}</span>`;
        }
    });
    
    // Mark for redraw
    if (window.Rendering) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Get simulation stats for display
 */
function getSimulationStats() {
    const stats = {
        careers: [],
        unlockedNodes: 0,
        totalNodes: 0,
        renown: SimulationState.renown
    };
    
    // Collect career stats
    SimulationState.careerXP.forEach((careerData, nodeId) => {
        stats.careers.push({
            nodeId,
            level: careerData.level,
            unspentPoints: careerData.unspentPoints,
            xp: careerData.xp,
            nextLevelXP: careerData.nextLevelXP
        });
    });
    
    // Count unlocked nodes (excluding guidance nodes)
    SimulationState.nodeProgress.forEach((progress, nodeId) => {
        const node = window.editor.nodes.get(nodeId);
        if (node) {
            // Check if it's a guidance node (no scalability or Successive Range)
            const isGuidanceNode = !node.scalability || node.scalability === 'Successive Range';
            
            if (!isGuidanceNode) {
                stats.totalNodes++;
                if (progress.unlocked) {
                    stats.unlockedNodes++;
                }
            }
        }
    });
    
    return stats;
}

/**
 * Export simulation state
 */
function exportSimulationState() {
    return {
        careerXP: Array.from(SimulationState.careerXP.entries()),
        renown: SimulationState.renown,
        nodeProgress: Array.from(SimulationState.nodeProgress.entries()),
        nodeConfig: Array.from(SimulationState.nodeConfig.entries())
    };
}

/**
 * Import simulation state
 */
function importSimulationState(data) {
    if (data.careerXP) {
        SimulationState.careerXP = new Map(data.careerXP);
        // Ensure all careers have the isActive property
        SimulationState.careerXP.forEach(careerData => {
            if (careerData.isActive === undefined) {
                careerData.isActive = false;
            }
        });
    }
    if (data.renown) {
        SimulationState.renown = data.renown;
        // Ensure new fields exist for backward compatibility
        if (SimulationState.renown.careerPointsEarned === undefined) {
            SimulationState.renown.careerPointsEarned = 0;
        }
        if (SimulationState.renown.progressToNextRenown === undefined) {
            SimulationState.renown.progressToNextRenown = 0;
        }
    }
    if (data.nodeProgress) {
        SimulationState.nodeProgress = new Map(data.nodeProgress);
    }
    if (data.nodeConfig) {
        SimulationState.nodeConfig = new Map(data.nodeConfig);
    }
}

/**
 * Reset simulation
 */
function resetSimulation(editor) {
    stopSimulation();
    initializeSimulation(editor);
    
    // Clear successive range completion tracking
    if (window.successiveRangeCompletionState) {
        window.successiveRangeCompletionState.clear();
    }
    
    window.UIControls.showToast('Simulation reset', 2000);
    updateSimulationUI(editor);
}

// === MODULE EXPORT ===
window.Simulation = {
    initializeSimulation,
    startSimulation,
    pauseSimulation,
    stopSimulation,
    setSimulationSpeed,
    canUnlockNode,
    getAvailablePoints,
    spendPoint,
    removePoint,
    updateSimulationUI,
    getSimulationStats,
    exportSimulationState,
    importSimulationState,
    SimulationState,
    toggleCareer,
    hasActiveCareers,
    resetSimulation
};

console.log('Simulation module loaded successfully'); 