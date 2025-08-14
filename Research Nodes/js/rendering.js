// === MODULE: Rendering ===
// Handles all canvas rendering operations

// Cache for performance optimization
const textCache = new Map();
const childCountCache = new Map();
let lastNodeCount = 0;
let lastConnectionCount = 0;
let needsRedraw = true;
let continuousFrameCount = 0;

// Text truncation cache
let lastCanvasFont = '';

// Simulation state cache
const simulationStateCache = new Map();
let simulationCacheFrame = 0;

/**
 * Mark canvas as needing redraw
 */
function setNeedsRedraw() {
    needsRedraw = true;
}

/**
 * Clear caches when data changes
 */
function clearCaches() {
    textCache.clear();
    childCountCache.clear();
    lastCanvasFont = '';
    simulationStateCache.clear();
    setNeedsRedraw();
}

/**
 * Get truncated text with caching
 */
function getTruncatedText(ctx, text, maxWidth, font) {
    const cacheKey = `${text}_${maxWidth}_${font}`;
    
    if (textCache.has(cacheKey)) {
        return textCache.get(cacheKey);
    }
    
    ctx.save();
    ctx.font = font;
    
    let result = text;
    if (ctx.measureText(text).width > maxWidth) {
        while (ctx.measureText(result + '...').width > maxWidth && result.length > 0) {
            result = result.substring(0, result.length - 1);
        }
        result += '...';
    }
    
    ctx.restore();
    textCache.set(cacheKey, result);
    return result;
}

/**
 * Get child count with caching
 */
function getChildCount(editor, nodeId) {
    // Check if cache needs update
    if (editor.connections.size !== lastConnectionCount) {
        childCountCache.clear();
        lastConnectionCount = editor.connections.size;
    }
    
    if (childCountCache.has(nodeId)) {
        return childCountCache.get(nodeId);
    }
    
    let count = 0;
    editor.connections.forEach(conn => {
        if (conn.from === nodeId) {
            count++;
        }
    });
    
    childCountCache.set(nodeId, count);
    return count;
}

/**
 * Convert hex color to HSL
 */
function hexToHSL(hex) {
    // Convert hex to RGB first
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Get brightness of a color (0-255)
 */
function getColorBrightness(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Using perceived brightness formula
    return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Get node generation level from its root parent
 */
function getNodeGeneration(editor, nodeId, visited = new Set()) {
    // Prevent infinite loops
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    
    const node = editor.nodes.get(nodeId);
    if (!node) return 0;
    
    // If node has a parent, get parent's generation + 1
    if (node.parent) {
        const parentGen = getNodeGeneration(editor, node.parent, visited);
        return parentGen + 1;
    }
    
    // No parent = root node (generation 0)
    return 0;
}

/**
 * Get node color with saturation adjustment based on generation
 */
function getNodeColorWithGeneration(editor, node) {
    let baseColor = node.color;
    
    // Check if node has C4 milestone - if not, use dark grey
    if (node.milestone !== 'C4') {
        baseColor = '#3a3a3a';  // Dark grey for non-C4 nodes
    }
    
    // Get generation level
    const generation = getNodeGeneration(editor, node.id);
    
    if (generation > 0) {
        // Convert to HSL
        const hsl = hexToHSL(baseColor);
        
        // For gray colors (saturation near 0), just adjust lightness
        if (hsl.s < 5) {
            // Increase lightness by 10% per generation for grays
            const newLightness = Math.min(90, hsl.l + (generation * 10));
            baseColor = hslToHex(hsl.h, 0, newLightness);
        } else {
            // For colored nodes, reduce saturation and increase lightness
            // Reduce saturation by 15% per generation
            const newSaturation = Math.max(30, hsl.s - (generation * 15));
            
            // Slightly increase lightness to compensate and keep colors visible
            // Add 5% lightness per generation but cap at 85%
            const newLightness = Math.min(85, hsl.l + (generation * 5));
            
            // Convert back to hex
            baseColor = hslToHex(hsl.h, newSaturation, newLightness);
        }
    }
    
    return baseColor;
}

/**
 * Main render function
 */
function render(editor) {
    const ctx = editor.ctx;
    const canvas = editor.canvas;
    
    // Clear canvas with background color
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply camera transform
    ctx.save();
    ctx.translate(editor.camera.x, editor.camera.y);
    ctx.scale(editor.camera.zoom, editor.camera.zoom);
    
    // Increment simulation cache frame to invalidate old cached states
    if (editor.mode === 'simulation') {
        simulationCacheFrame++;
        // Clear cache periodically to prevent memory buildup
        if (simulationCacheFrame % 100 === 0) {
            simulationStateCache.clear();
        }
    }
    
    // Draw in order: grid -> connections -> nodes
    if (editor.showGrid) {
        drawGrid(editor);
    }
    
    drawConnections(editor);
    
    // Draw temporary connection
    if (editor.connectingFrom) {
        const worldPos = window.CanvasManager.screenToWorld(editor, editor.lastMouse.x, editor.lastMouse.y);
        // Use grey color if connecting from non-C4 node
        const connectionColor = editor.connectingFrom.milestone !== 'C4' ? '#3a3a3a' : '#ffffff';
        drawSpline(editor,
            editor.connectingFrom.x, editor.connectingFrom.y,
            worldPos.x, worldPos.y,
            connectionColor, 2, true
        );
    }
    
    drawNodes(editor);
    
    // Restore context
    ctx.restore();
    
    // Draw selection box (in screen space)
    if (editor.isSelecting && editor.selectionBox) {
        ctx.save();
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
        
        const x = Math.min(editor.selectionBox.startX, editor.selectionBox.endX);
        const y = Math.min(editor.selectionBox.startY, editor.selectionBox.endY);
        const width = Math.abs(editor.selectionBox.endX - editor.selectionBox.startX);
        const height = Math.abs(editor.selectionBox.endY - editor.selectionBox.startY);
        
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }
}

/**
 * Draw background grid
 */
function drawGrid(editor) {
    const ctx = editor.ctx;
    const gridSize = 25; // Base grid unit for snapping
    const majorGridSize = gridSize * 4; // Major grid lines every 100px
    const minorGridSize = gridSize * 2; // Medium grid lines every 50px
    
    // Calculate visible area in world space
    const topLeft = window.CanvasManager.screenToWorld(editor, 0, 0);
    const bottomRight = window.CanvasManager.screenToWorld(editor, editor.width, editor.height);
    
    // Calculate grid bounds - always start from origin (0,0) to ensure stability
    const startX = Math.floor(topLeft.x / majorGridSize) * majorGridSize - majorGridSize;
    const startY = Math.floor(topLeft.y / majorGridSize) * majorGridSize - majorGridSize;
    const endX = Math.ceil(bottomRight.x / majorGridSize) * majorGridSize + majorGridSize;
    const endY = Math.ceil(bottomRight.y / majorGridSize) * majorGridSize + majorGridSize;
    
    // Helper function to determine if a line should be drawn at a specific level
    const getLineType = (coord) => {
        if (coord === 0) return 'origin';
        if (coord % majorGridSize === 0) return 'major';
        if (coord % minorGridSize === 0) return 'minor';
        if (coord % gridSize === 0) return 'fine';
        return null;
    };
    
    // Helper function to align coordinates to physical pixels
    const alignToPixel = (value) => {
        // Convert to screen space, round, then convert back
        const screenPos = value * editor.camera.zoom + editor.camera.x;
        const alignedScreenPos = Math.round(screenPos) + 0.5; // 0.5 offset for crisp lines
        return (alignedScreenPos - editor.camera.x) / editor.camera.zoom;
    };
    
    // Save context state for line width adjustments
    ctx.save();
    
    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
        const lineType = getLineType(x);
        if (!lineType) continue;
        
        // Align x coordinate to physical pixels
        const alignedX = alignToPixel(x);
        
        ctx.beginPath();
        ctx.moveTo(alignedX, topLeft.y - 100);
        ctx.lineTo(alignedX, bottomRight.y + 100);
        
        switch(lineType) {
            case 'origin':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2 / editor.camera.zoom; // Adjust line width for zoom
                break;
            case 'major':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1 / editor.camera.zoom;
                break;
            case 'minor':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1 / editor.camera.zoom;
                break;
            case 'fine':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
                ctx.lineWidth = 1 / editor.camera.zoom;
                break;
        }
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
        const lineType = getLineType(y);
        if (!lineType) continue;
        
        // Align y coordinate to physical pixels
        const alignedY = alignToPixel(y);
        
        ctx.beginPath();
        ctx.moveTo(topLeft.x - 100, alignedY);
        ctx.lineTo(bottomRight.x + 100, alignedY);
        
        switch(lineType) {
            case 'origin':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2 / editor.camera.zoom;
                break;
            case 'major':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1 / editor.camera.zoom;
                break;
            case 'minor':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1 / editor.camera.zoom;
                break;
            case 'fine':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
                ctx.lineWidth = 1 / editor.camera.zoom;
                break;
        }
        ctx.stroke();
    }
    
    // Restore context state
    ctx.restore();
}

/**
 * Draw all connections
 */
function drawConnections(editor) {
    const ctx = editor.ctx;
    
    // Group connections by color for batching
    const connectionsByColor = new Map();
    const selectedConnection = [];
    
    editor.connections.forEach((connection, key) => {
        const fromNode = editor.nodes.get(connection.from);
        const toNode = editor.nodes.get(connection.to);
        
        if (fromNode && toNode) {
            // Skip connections involving hidden nodes
            if (window.NodeManager.isNodeHidden(editor, connection.from) || 
                window.NodeManager.isNodeHidden(editor, connection.to)) {
                return;
            }
            
            // Check if this is the selected connection
            if (editor.selectedConnection === key) {
                selectedConnection.push({ from: fromNode, to: toNode, type: connection.type });
            } else {
                // Check if the target node has C4 milestone
                let connectionColor;
                let opacity = 0.6; // Default opacity
                
                if (toNode.milestone !== 'C4') {
                    // Grey connection for non-C4 target nodes
                    connectionColor = '#3a3a3a';
                    opacity = 0.3;
                } else {
                    // Get the parent node's color for the connection
                    connectionColor = getNodeColorWithGeneration(editor, fromNode);
                    
                    // In simulation mode, reduce opacity for connections to/from locked nodes
                    if (editor.mode === 'simulation' && window.Simulation) {
                        const fromProgress = window.Simulation.SimulationState.nodeProgress.get(fromNode.id);
                        const toProgress = window.Simulation.SimulationState.nodeProgress.get(toNode.id);
                        
                        if ((fromProgress && !fromProgress.unlocked) || (toProgress && !toProgress.unlocked)) {
                            opacity = 0.2; // Very faint for locked connections
                        }
                    }
                }
                
                // Group by color and opacity
                const colorKey = `${connectionColor}_${opacity}`;
                if (!connectionsByColor.has(colorKey)) {
                    connectionsByColor.set(colorKey, { color: connectionColor, opacity: opacity, connections: [] });
                }
                connectionsByColor.get(colorKey).connections.push({ from: fromNode, to: toNode, type: connection.type });
            }
        }
    });
    
    // Draw connections grouped by color and opacity
    connectionsByColor.forEach((group) => {
        ctx.beginPath();
        ctx.strokeStyle = group.color;
        ctx.lineWidth = 2;
        
        // Apply the opacity
        ctx.globalAlpha = group.opacity;
        
        group.connections.forEach(conn => {
            drawSplinePath(ctx, conn.from.x, conn.from.y, conn.to.x, conn.to.y, conn.type || 'linear');
        });
        
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
    
    // Draw selected connection with special style
    if (selectedConnection.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        selectedConnection.forEach(conn => {
            drawSplinePath(ctx, conn.from.x, conn.from.y, conn.to.x, conn.to.y, conn.type || 'linear');
        });
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Draw spline path without stroking (for batching)
 */
function drawSplinePath(ctx, x1, y1, x2, y2, type = 'linear') {
    ctx.moveTo(x1, y1);
    
    switch(type) {
        case 'curved':
            // Original bezier curve
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offset = Math.min(distance * 0.5, 100);
            
            if (Math.abs(dy) > Math.abs(dx)) {
                ctx.bezierCurveTo(
                    x1, y1 + offset,
                    x2, y2 - offset,
                    x2, y2
                );
            } else {
                ctx.bezierCurveTo(
                    x1 + offset, y1,
                    x2 - offset, y2,
                    x2, y2
                );
            }
            break;
            
        case 'linear':
            // Straight line
            ctx.lineTo(x2, y2);
            break;
            
        case 'step':
            // Right angle steps
            const midX = (x1 + x2) / 2;
            ctx.lineTo(midX, y1);
            ctx.lineTo(midX, y2);
            ctx.lineTo(x2, y2);
            break;
            
        case 'smooth':
            // Smooth S-curve
            const cpOffset = Math.abs(x2 - x1) * 0.5;
            ctx.bezierCurveTo(
                x1 + cpOffset, y1,
                x2 - cpOffset, y2,
                x2, y2
            );
            break;
            
        case 'arc':
            // Arc connection
            const radius = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 0.5;
            const arcX = x2 > x1 ? x1 + radius : x1 - radius;
            const arcY = y2 > y1 ? y2 - radius : y2 + radius;
            ctx.arcTo(x1, arcY, x2, arcY, radius);
            ctx.lineTo(x2, y2);
            break;
            
        case 'zigzag':
            // Zigzag pattern
            const segments = 5;
            const segmentWidth = (x2 - x1) / segments;
            const amplitude = 20;
            for (let i = 1; i <= segments; i++) {
                const segX = x1 + segmentWidth * i;
                const segY = y1 + (y2 - y1) * (i / segments) + (i % 2 === 0 ? amplitude : -amplitude);
                ctx.lineTo(segX, segY);
            }
            ctx.lineTo(x2, y2);
            break;
            
        default:
            // Default to linear
            ctx.lineTo(x2, y2);
    }
}

/**
 * Draw bezier spline between two points (for temporary connections)
 */
function drawSpline(editor, x1, y1, x2, y2, color, width, dashed = false, type = 'linear') {
    const ctx = editor.ctx;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    
    if (dashed) {
        ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath();
    drawSplinePath(ctx, x1, y1, x2, y2, type);
    ctx.stroke();
    
    ctx.restore();
}

/**
 * Draw all nodes
 */
function drawNodes(editor) {
    // In simulation mode, draw nodes in two passes to ensure locked nodes are on top
    if (editor.mode === 'simulation' && window.Simulation) {
        // First pass: draw unlocked and non-C4 nodes
        editor.nodes.forEach(node => {
            if (!window.NodeManager.isNodeHidden(editor, node.id)) {
                const progress = window.Simulation.SimulationState.nodeProgress.get(node.id);
                const isLocked = node.milestone === 'C4' && progress && !progress.unlocked;
                if (!isLocked) {
                    drawNode(editor, node);
                }
            }
        });
        
        // Second pass: draw locked C4 nodes on top
        editor.nodes.forEach(node => {
            if (!window.NodeManager.isNodeHidden(editor, node.id)) {
                const progress = window.Simulation.SimulationState.nodeProgress.get(node.id);
                const isLocked = node.milestone === 'C4' && progress && !progress.unlocked;
                if (isLocked) {
                    drawNode(editor, node);
                }
            }
        });
    } else {
        // Normal drawing order when not in simulation mode
        editor.nodes.forEach(node => {
            // Skip hidden nodes
            if (!window.NodeManager.isNodeHidden(editor, node.id)) {
                drawNode(editor, node);
            }
        });
    }
}

/**
 * Draw a single node
 */
function drawNode(editor, node) {
    const ctx = editor.ctx;
    const isSelected = node === editor.selectedNode || (editor.selectedNodes && editor.selectedNodes.has(node));
    const isHovered = node === editor.hoveredNode;
    const isParent = node.level === 0;
    
    // Adjust node size for parent nodes
    const nodeWidth = isParent ? node.width * 1.2 : node.width;
    const nodeHeight = isParent ? node.height * 1.2 : node.height;
    
    // Get simulation state if in simulation mode
    let simulationState = null;
    let simulationGlow = null;
    let isNextInSequence = false;
    let availablePoints = 0;
    
    if (editor.mode === 'simulation' && window.Simulation) {
        // Check cache first
        const cacheKey = `${node.id}_${simulationCacheFrame}`;
        const cached = simulationStateCache.get(cacheKey);
        
        if (cached) {
            simulationState = cached.simulationState;
            simulationGlow = cached.simulationGlow;
            isNextInSequence = cached.isNextInSequence;
            availablePoints = cached.availablePoints;
        } else {
            // Calculate and cache simulation state
            const progress = window.Simulation.SimulationState.nodeProgress.get(node.id);
            availablePoints = window.Simulation.getAvailablePoints(editor, node.id);
            
            if (progress) {
                // Only C4 nodes can be interacted with
                if (node.milestone === 'C4') {
                    if (progress.unlocked) {
                        // Check if it's a guidance node with unmaxed children
                        let isGuidanceWithUnmaxedChildren = false;
                        // Guidance nodes are those with no scalability OR Successive Range
                        const isGuidanceNode = !node.scalability || node.scalability === 'Successive Range';
                        
                        if (isGuidanceNode) {
                            // Recursively check all C4 descendants
                            const checkDescendants = (nodeId) => {
                                const childConnections = Array.from(editor.connections.values())
                                    .filter(conn => conn.from === nodeId);
                                
                                for (const conn of childConnections) {
                                    const childNode = editor.nodes.get(conn.to);
                                    if (childNode) {
                                        if (childNode.milestone === 'C4') {
                                            const childProgress = window.Simulation.SimulationState.nodeProgress.get(conn.to);
                                            if (childProgress) {
                                                // Check if child is not maxed
                                                if (!childProgress.unlocked || 
                                                    (childProgress.currentLevel < childProgress.maxLevel && childProgress.maxLevel !== Infinity)) {
                                                    return true; // Found unmaxed C4 child
                                                }
                                            }
                                        }
                                        // Recursively check this child's descendants
                                        if (checkDescendants(conn.to)) {
                                            return true;
                                        }
                                    }
                                }
                                return false;
                            };
                            
                            isGuidanceWithUnmaxedChildren = checkDescendants(node.id);
                        }
                        
                        if (progress.currentLevel >= progress.maxLevel && progress.maxLevel !== Infinity && !isGuidanceWithUnmaxedChildren) {
                            simulationState = 'maxed';
                            simulationGlow = '#FFD700'; // Gold
                        } else {
                            simulationState = 'unlocked';
                            simulationGlow = '#4AE290'; // Green
                        }
                    } else {
                        // All unactivated C4 nodes are locked
                        simulationState = 'locked';
                        
                        // Check if this node is next in a sequential progression
                        const parentConnections = Array.from(editor.connections.values())
                            .filter(conn => conn.to === node.id);
                        
                        for (const conn of parentConnections) {
                            const parentNode = editor.nodes.get(conn.from);
                            const parentProgress = window.Simulation.SimulationState.nodeProgress.get(conn.from);
                            
                            // Check if parent is a Successive Range node and is unlocked
                            if (parentNode && parentNode.scalability === 'Successive Range' && parentProgress && parentProgress.unlocked) {
                                const parentConfig = window.Simulation.SimulationState.nodeConfig.get(conn.from);
                                
                                if (parentConfig && parentConfig.isSequential && parentConfig.childOrder && parentConfig.childOrder.length > 0) {
                                    // Sequential progression - find the first unlocked child
                                    const childOrder = parentConfig.childOrder;
                                    
                                    // Find the first locked node in the sequence
                                    for (let i = 0; i < childOrder.length; i++) {
                                        const childId = childOrder[i];
                                        const childProgress = window.Simulation.SimulationState.nodeProgress.get(childId);
                                        
                                        if (!childProgress || !childProgress.unlocked) {
                                            // This is the first locked node - check if it's our current node
                                            if (childId === node.id) {
                                                isNextInSequence = true;
                                            }
                                            break; // Stop at the first locked node
                                        }
                                    }
                                    
                                    if (isNextInSequence) {
                                        break;
                                    }
                                } else {
                                    // Free-form progression - any direct child of unlocked Successive Range parent
                                    // that isn't already unlocked is "next"
                                    isNextInSequence = true;
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    // Non-C4 nodes are always shown as locked in simulation mode
                    simulationState = 'locked';
                }
            }
            
            // Cache the result
            simulationStateCache.set(cacheKey, {
                simulationState,
                simulationGlow,
                isNextInSequence,
                availablePoints
            });
        }
    }
    
    // Get color with generation-based saturation
    let nodeColor = getNodeColorWithGeneration(editor, node);
    let borderColor;
    
    // Override colors for locked simulation nodes (including unlockable ones)
    if (simulationState === 'locked') {
        nodeColor = '#2a2a2a'; // Dark grey for locked nodes
        borderColor = '#1a1a1a'; // Even darker border
    } else {
        // Normal border color - darker version for contrast
        const hsl = hexToHSL(nodeColor);
        borderColor = hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 20));
    }
    
    // Fill with node color
    ctx.fillStyle = nodeColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isParent ? 3 : (isSelected ? 3 : 2);
    
    // Calculate node position - ensure it aligns with grid
    // Round the position to prevent sub-pixel rendering
    const x = Math.round(node.x - nodeWidth / 2);
    const y = Math.round(node.y - nodeHeight / 2);
    
    // Draw rounded rectangle
    const radius = isParent ? 10 : 8;
    
    // Apply transparency ONLY for non-C4 nodes (not for locked simulation nodes)
    const originalAlpha = ctx.globalAlpha;
    if (node.milestone !== 'C4' && editor.mode !== 'simulation') {
        ctx.globalAlpha = 0.5;  // 50% opacity for non-C4 nodes only when NOT in simulation
    }
    
    // Draw simulation glow effect (only for unlocked/maxed nodes)
    if (simulationGlow && simulationState !== 'locked') {
        ctx.save();
        // Static glow for unlocked/maxed nodes
        ctx.shadowColor = simulationGlow;
        ctx.shadowBlur = 15;
    }
    
    ctx.beginPath();
    
    // Use native roundRect if available (more performant)
    if (ctx.roundRect) {
        ctx.roundRect(x, y, nodeWidth, nodeHeight, radius);
    } else {
        // Fallback to manual rounded rectangle
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + nodeWidth - radius, y);
        ctx.quadraticCurveTo(x + nodeWidth, y, x + nodeWidth, y + radius);
        ctx.lineTo(x + nodeWidth, y + nodeHeight - radius);
        ctx.quadraticCurveTo(x + nodeWidth, y + nodeHeight, x + nodeWidth - radius, y + nodeHeight);
        ctx.lineTo(x + radius, y + nodeHeight);
        ctx.quadraticCurveTo(x, y + nodeHeight, x, y + nodeHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Draw blue border for next-in-sequence nodes (regardless of available points)
    if (isNextInSequence) {
        ctx.save();
        ctx.strokeStyle = '#4A90E2'; // Blue
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6; // Make it faint
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x - 2, y - 2, nodeWidth + 4, nodeHeight + 4, radius);
        } else {
            // Manual rounded rectangle path (slightly larger)
            const offset = 2;
            ctx.moveTo(x - offset + radius, y - offset);
            ctx.lineTo(x - offset + nodeWidth + offset*2 - radius, y - offset);
            ctx.quadraticCurveTo(x - offset + nodeWidth + offset*2, y - offset, x - offset + nodeWidth + offset*2, y - offset + radius);
            ctx.lineTo(x - offset + nodeWidth + offset*2, y - offset + nodeHeight + offset*2 - radius);
            ctx.quadraticCurveTo(x - offset + nodeWidth + offset*2, y - offset + nodeHeight + offset*2, x - offset + nodeWidth + offset*2 - radius, y - offset + nodeHeight + offset*2);
            ctx.lineTo(x - offset + radius, y - offset + nodeHeight + offset*2);
            ctx.quadraticCurveTo(x - offset, y - offset + nodeHeight + offset*2, x - offset, y - offset + nodeHeight + offset*2 - radius);
            ctx.lineTo(x - offset, y - offset + radius);
            ctx.quadraticCurveTo(x - offset, y - offset, x - offset + radius, y - offset);
            ctx.closePath();
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    // Restore shadow settings
    if (simulationGlow && simulationState !== 'locked') {
        ctx.restore();
    }
    
    // Restore original alpha
    ctx.globalAlpha = originalAlpha;
    
    // Draw selection indicator or simulation state border
    if (isSelected && editor.mode !== 'simulation') {
        ctx.save();
        
        // Draw glow effect
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        
        // Redraw the path for the selection glow
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, nodeWidth, nodeHeight, radius);
        } else {
            // Manual rounded rectangle path
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + nodeWidth - radius, y);
            ctx.quadraticCurveTo(x + nodeWidth, y, x + nodeWidth, y + radius);
            ctx.lineTo(x + nodeWidth, y + nodeHeight - radius);
            ctx.quadraticCurveTo(x + nodeWidth, y + nodeHeight, x + nodeWidth - radius, y + nodeHeight);
            ctx.lineTo(x + radius, y + nodeHeight);
            ctx.quadraticCurveTo(x, y + nodeHeight, x, y + nodeHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }
        
        ctx.stroke();
        
        // Draw inner bright border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.stroke();
        
        ctx.restore();
    } else if (editor.mode === 'simulation' && simulationState && simulationState !== 'locked') {
        // Draw simulation state border (only for unlocked/maxed nodes)
        ctx.save();
        ctx.strokeStyle = simulationGlow;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, nodeWidth, nodeHeight, radius);
        } else {
            // Manual rounded rectangle path
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + nodeWidth - radius, y);
            ctx.quadraticCurveTo(x + nodeWidth, y, x + nodeWidth, y + radius);
            ctx.lineTo(x + nodeWidth, y + nodeHeight - radius);
            ctx.quadraticCurveTo(x + nodeWidth, y + nodeHeight, x + nodeWidth - radius, y + nodeHeight);
            ctx.lineTo(x + radius, y + nodeHeight);
            ctx.quadraticCurveTo(x, y + nodeHeight, x, y + nodeHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    // Draw hover effect
    if (isHovered && !isSelected) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.restore();
    }
    
    // Determine text and icon color based on node brightness
    const nodeBrightness = getColorBrightness(nodeColor);
    const textColor = simulationState === 'locked' ? '#666666' : (nodeBrightness > 128 ? '#000000' : '#ffffff');
    
    // Apply transparency for non-C4 nodes text/icons (only when not in simulation)
    if (node.milestone !== 'C4' && editor.mode !== 'simulation') {
        ctx.globalAlpha = 0.5;
    }
    
    // Draw icon based on scalability
    if (node.scalability) {
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = isParent ? '18px Arial' : '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '';
        if (node.scalability === 'Unlimited') icon = '∞';
        else if (node.scalability === 'Successive Range') icon = '↗';
        else if (node.scalability === 'Single Activation') icon = '●';
        
        ctx.fillText(icon, node.x - nodeWidth / 2 + 15, node.y);
        ctx.restore();
    }
    
    // Draw tag indicator (★ for Career tag)
    if (node.tag === 'Career') {
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = isParent ? '18px Arial' : '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText('★', node.x + nodeWidth / 2 - 15, node.y - nodeHeight / 2 + 15);
        ctx.restore();
    }
    
    // Draw child count badge
    const descendants = window.NodeManager.getDescendants(editor, node.id);
    if (descendants.size > 0) {
        ctx.save();
        const isCollapsed = editor.collapsedNodes.has(node.id);
        
        // Get child count - show total descendants if collapsed, visible children if expanded
        let count = isCollapsed ? descendants.size : window.NodeManager.getVisibleChildCount(editor, node.id);
        
        if (count > 0) {
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Position badge in top-right corner
            const badgeRadius = 8;
            const badgeX = node.x + nodeWidth / 2 - badgeRadius - 2;
            const badgeY = node.y - nodeHeight / 2 + badgeRadius + 2;
            
            // Draw badge background - white or black for contrast
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fillStyle = textColor;
            ctx.fill();
            
            // Draw badge border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw count - opposite of text color
            ctx.fillStyle = nodeBrightness > 128 ? '#ffffff' : '#000000';
            ctx.fillText(count.toString(), badgeX, badgeY);
        }
        
        ctx.restore();
    }
    
    // Draw text
    if (editor.showLabels) {
        ctx.fillStyle = textColor;
        
        const font = isParent ? 'bold 12px Arial' : '11px Arial';
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Get truncated text from cache
        const maxWidth = nodeWidth - 10;
        const text = getTruncatedText(ctx, node.name, maxWidth, font);
        
        ctx.fillText(text, node.x, node.y);
        
        // Draw level indicator for unlimited scalability nodes in simulation mode only
        if (editor.mode === 'simulation' && node.scalability === 'Unlimited') {
            const progress = window.Simulation ? window.Simulation.SimulationState.nodeProgress.get(node.id) : null;
            if (progress && progress.currentLevel > 0) {
                ctx.save();
                ctx.font = 'bold 10px Arial';
                // Use the same text color as the node text (not the glow color)
                ctx.fillStyle = textColor;
                const levelText = `Lv.${progress.currentLevel}`;
                ctx.fillText(levelText, node.x, node.y + nodeHeight/2 - 10);
                ctx.restore();
            }
        }
    }
    
    // Draw resize handle in edit mode
    if (editor.mode === 'edit' && (editor.hoveredHandle === node || editor.resizingNode === node)) {
        ctx.save();
        
        const handleSize = 16;
        const handleOffset = 4; // Inset from the corner
        const handleX = node.x + nodeWidth / 2 - handleSize/2 - handleOffset;
        const handleY = node.y + nodeHeight / 2 - handleSize/2 - handleOffset;
        const handleRadius = handleSize / 2;
        
        // Draw circular handle background with gradient effect
        const gradient = ctx.createRadialGradient(
            handleX, handleY, 0,
            handleX, handleY, handleRadius
        );
        
        if (editor.hoveredHandle === node || editor.resizingNode === node) {
            // Active/hover state - blue gradient
            gradient.addColorStop(0, '#5ba3f5');
            gradient.addColorStop(1, '#4a90e2');
        } else {
            // Inactive state - subtle gray
            gradient.addColorStop(0, '#555555');
            gradient.addColorStop(1, '#333333');
        }
        
        // Draw circle handle
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw modern grip pattern - three dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const dotSize = 1.5;
        const spacing = 3;
        
        // Draw 3x3 dots pattern
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                ctx.beginPath();
                ctx.arc(
                    handleX + i * spacing,
                    handleY + j * spacing,
                    dotSize,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
    
    // Restore global alpha at end of function
    ctx.globalAlpha = 1;
}

/**
 * Animation loop
 */
let fpsUpdateCounter = 0;
let mouseUpdateCounter = 0;
function animate(editor) {
    requestAnimationFrame(() => animate(editor));
    
    // Calculate FPS
    const now = performance.now();
    const delta = now - editor.lastFrameTime;
    editor.frameTime = editor.frameTime * 0.9 + delta * 0.1;
    editor.lastFrameTime = now;
    
    // Update FPS display every ~60 frames
    fpsUpdateCounter++;
    if (fpsUpdateCounter >= 60) {
        document.getElementById('fps').textContent = Math.round(1000 / editor.frameTime);
        fpsUpdateCounter = 0;
    }
    
    // Check if we need to redraw
    const isContinuousOp = editor.isDragging || editor.isNodeDragging || editor.isSelecting || editor.isResizing;
    
    if (isContinuousOp) {
        continuousFrameCount++;
        // Skip every other frame during continuous operations for better performance
        if (continuousFrameCount % 2 === 0 || needsRedraw) {
            render(editor);
            needsRedraw = false;
        }
    } else {
        continuousFrameCount = 0;
        if (editor.connectingFrom || needsRedraw || editor.nodes.size !== lastNodeCount) {
            render(editor);
            needsRedraw = false;
            lastNodeCount = editor.nodes.size;
        }
    }
}

/**
 * Play firework sound effect
 */
function playFireworkSound() {
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for the "whoosh" sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configure the whoosh sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
        
        // Configure volume envelope
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play the sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // Add some "sparkle" sounds
        for (let i = 0; i < 5; i++) {
            const sparkle = audioContext.createOscillator();
            const sparkleGain = audioContext.createGain();
            
            sparkle.type = 'square';
            sparkle.frequency.setValueAtTime(
                1000 + Math.random() * 2000, 
                audioContext.currentTime + 0.1 + i * 0.05
            );
            
            sparkleGain.gain.setValueAtTime(0, audioContext.currentTime + 0.1 + i * 0.05);
            sparkleGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.15 + i * 0.05);
            sparkleGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2 + i * 0.05);
            
            sparkle.connect(sparkleGain);
            sparkleGain.connect(audioContext.destination);
            
            sparkle.start(audioContext.currentTime + 0.1 + i * 0.05);
            sparkle.stop(audioContext.currentTime + 0.3 + i * 0.05);
        }
        
    } catch (e) {
        console.log('Could not play sound:', e);
    }
}

/**
 * Create firework animation at node position
 */
function triggerNodeFirework(nodeId) {
    const node = window.editor.nodes.get(nodeId);
    if (!node) {
        console.error('Node not found for firework:', nodeId);
        return;
    }
    
    console.log('Creating firework for node:', node.name, 'at position:', node.x, node.y);
    
    // Play sound effect
    playFireworkSound();
    
    // Create firework container
    const firework = document.createElement('div');
    firework.className = 'firework';
    
    // Convert world coordinates to screen coordinates using the proper function
    const screenPos = window.CanvasManager.worldToScreen(window.editor, node.x, node.y);
    
    // Get canvas position on page
    const canvas = window.editor.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate final screen position
    const screenX = rect.left + screenPos.x;
    const screenY = rect.top + screenPos.y;
    
    console.log('Node world pos:', node.x, node.y);
    console.log('Screen pos from worldToScreen:', screenPos.x, screenPos.y);
    console.log('Canvas rect:', rect.left, rect.top);
    console.log('Final firework position:', screenX, screenY);
    
    firework.style.left = screenX + 'px';
    firework.style.top = screenY + 'px';
    
    // Create particles
    const particleCount = 20;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        
        // Random color
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random direction
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const velocity = 50 + Math.random() * 100;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        // Set custom animation
        particle.style.animation = 'none';
        particle.animate([
            { 
                transform: 'translate(0, 0) scale(1)', 
                opacity: 1 
            },
            { 
                transform: `translate(${vx}px, ${vy}px) scale(0)`, 
                opacity: 0 
            }
        ], {
            duration: 1000,
            easing: 'cubic-bezier(0, 0, 0.2, 1)'
        });
        
        firework.appendChild(particle);
    }
    
    document.body.appendChild(firework);
    console.log('Firework element added to DOM, particle count:', particleCount);
    
    // Remove after animation
    setTimeout(() => {
        firework.remove();
        console.log('Firework removed');
    }, 1000);
}

/**
 * Play renown celebration sound
 */
function playRenownSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a more elaborate celebration sound
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
        
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
            
            gain.gain.setValueAtTime(0, audioContext.currentTime + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.5);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.start(audioContext.currentTime + i * 0.1);
            osc.stop(audioContext.currentTime + i * 0.1 + 0.5);
        });
        
        // Add a shimmering effect
        const shimmer = audioContext.createOscillator();
        const shimmerGain = audioContext.createGain();
        const shimmerFilter = audioContext.createBiquadFilter();
        
        shimmer.type = 'sawtooth';
        shimmer.frequency.setValueAtTime(2000, audioContext.currentTime);
        
        shimmerFilter.type = 'highpass';
        shimmerFilter.frequency.setValueAtTime(1000, audioContext.currentTime);
        
        shimmerGain.gain.setValueAtTime(0.05, audioContext.currentTime);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
        
        shimmer.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(audioContext.destination);
        
        shimmer.start(audioContext.currentTime);
        shimmer.stop(audioContext.currentTime + 1);
        
    } catch (e) {
        console.log('Could not play renown sound:', e);
    }
}

/**
 * Play completion sound for Successive Range mastery
 */
function playSuccessiveRangeSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a triumphant fanfare sound
        const notes = [
            { freq: 523.25, start: 0 },      // C
            { freq: 659.25, start: 0.1 },    // E
            { freq: 783.99, start: 0.2 },    // G
            { freq: 1046.50, start: 0.3 },   // High C
            { freq: 1046.50, start: 0.5 },   // High C (repeat)
            { freq: 783.99, start: 0.6 },    // G
            { freq: 1046.50, start: 0.7 }    // High C (final)
        ];
        
        notes.forEach(note => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            // Use triangle wave for a softer, more majestic sound
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, audioContext.currentTime + note.start);
            
            // Louder and longer than regular sounds
            gain.gain.setValueAtTime(0, audioContext.currentTime + note.start);
            gain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + note.start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.start + 0.8);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.start(audioContext.currentTime + note.start);
            osc.stop(audioContext.currentTime + note.start + 0.8);
        });
        
        // Add a bass drum hit for impact
        const kick = audioContext.createOscillator();
        const kickGain = audioContext.createGain();
        
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, audioContext.currentTime);
        kick.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.2);
        
        kickGain.gain.setValueAtTime(0.5, audioContext.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        kick.connect(kickGain);
        kickGain.connect(audioContext.destination);
        
        kick.start(audioContext.currentTime);
        kick.stop(audioContext.currentTime + 0.2);
        
        // Add reverb-like shimmer
        for (let i = 0; i < 10; i++) {
            const shimmer = audioContext.createOscillator();
            const shimmerGain = audioContext.createGain();
            
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(
                2000 + Math.random() * 2000, 
                audioContext.currentTime + 0.3 + i * 0.05
            );
            
            shimmerGain.gain.setValueAtTime(0.05, audioContext.currentTime + 0.3 + i * 0.05);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
            
            shimmer.connect(shimmerGain);
            shimmerGain.connect(audioContext.destination);
            
            shimmer.start(audioContext.currentTime + 0.3 + i * 0.05);
            shimmer.stop(audioContext.currentTime + 1.5);
        }
        
    } catch (e) {
        console.log('Could not play successive range sound:', e);
    }
}

/**
 * Trigger Successive Range completion celebration
 */
function triggerSuccessiveRangeCompletion(nodeId) {
    const node = window.editor.nodes.get(nodeId);
    if (!node) return;
    
    console.log('Successive Range mastered:', node.name);
    
    // Play triumphant sound
    playSuccessiveRangeSound();
    
    // Create golden explosion at node position
    const screenPos = window.CanvasManager.worldToScreen(window.editor, node.x, node.y);
    const canvas = window.editor.canvas;
    const rect = canvas.getBoundingClientRect();
    const screenX = rect.left + screenPos.x;
    const screenY = rect.top + screenPos.y;
    
    // Create multiple golden fireworks
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            createGoldenFireworkAt(screenX, screenY);
        }, i * 200);
    }
    
    // Create a golden pulse effect
    const pulse = document.createElement('div');
    pulse.style.position = 'fixed';
    pulse.style.left = screenX + 'px';
    pulse.style.top = screenY + 'px';
    pulse.style.width = '0px';
    pulse.style.height = '0px';
    pulse.style.borderRadius = '50%';
    pulse.style.border = '3px solid #FFD700';
    pulse.style.boxShadow = '0 0 20px #FFD700';
    pulse.style.pointerEvents = 'none';
    pulse.style.zIndex = '9998';
    pulse.style.transform = 'translate(-50%, -50%)';
    
    document.body.appendChild(pulse);
    
    // Animate the pulse
    pulse.animate([
        { 
            width: '0px', 
            height: '0px', 
            opacity: 1,
            borderWidth: '3px'
        },
        { 
            width: '200px', 
            height: '200px', 
            opacity: 0,
            borderWidth: '1px'
        }
    ], {
        duration: 1500,
        easing: 'ease-out'
    });
    
    setTimeout(() => {
        pulse.remove();
    }, 1500);
}

/**
 * Create golden firework for Successive Range completion
 */
function createGoldenFireworkAt(x, y) {
    const firework = document.createElement('div');
    firework.className = 'firework';
    firework.style.left = x + 'px';
    firework.style.top = y + 'px';
    
    // Create golden particles
    const particleCount = 40; // More particles for bigger effect
    const goldenColors = ['#FFD700', '#FFA500', '#FFE74C', '#FFED4E', '#FFF59D'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        
        // Golden colors only
        particle.style.backgroundColor = goldenColors[Math.floor(Math.random() * goldenColors.length)];
        
        // Larger particles
        const size = 5 + Math.random() * 5;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.boxShadow = `0 0 ${size}px ${particle.style.backgroundColor}`;
        
        // Wider spread
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
        const velocity = 150 + Math.random() * 200;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity - 30;
        
        // Set custom animation
        particle.style.animation = 'none';
        particle.animate([
            { 
                transform: 'translate(0, 0) scale(1)', 
                opacity: 1 
            },
            { 
                transform: `translate(${vx}px, ${vy}px) scale(0.5)`, 
                opacity: 0 
            }
        ], {
            duration: 2000, // Longer duration
            easing: 'cubic-bezier(0, 0.5, 0.2, 1)'
        });
        
        firework.appendChild(particle);
    }
    
    document.body.appendChild(firework);
    
    // Remove after animation
    setTimeout(() => {
        firework.remove();
    }, 2000);
}

/**
 * Trigger renown celebration animation
 */
function triggerRenownCelebration() {
    // Play celebration sound
    playRenownSound();
    
    // Create celebration text
    const celebration = document.createElement('div');
    celebration.className = 'renown-celebration';
    celebration.textContent = '✨ RENOWN EARNED ✨';
    
    document.body.appendChild(celebration);
    
    // Create multiple fireworks around the screen
    const positions = [
        { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3 },
        { x: window.innerWidth * 0.8, y: window.innerHeight * 0.3 },
        { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 },
        { x: window.innerWidth * 0.3, y: window.innerHeight * 0.7 },
        { x: window.innerWidth * 0.7, y: window.innerHeight * 0.7 }
    ];
    
    positions.forEach((pos, index) => {
        setTimeout(() => {
            createFireworkAt(pos.x, pos.y);
        }, index * 200);
    });
    
    // Remove after animation
    setTimeout(() => {
        celebration.remove();
    }, 2000);
}

/**
 * Create firework at specific screen position
 */
function createFireworkAt(x, y) {
    const firework = document.createElement('div');
    firework.className = 'firework';
    firework.style.left = x + 'px';
    firework.style.top = y + 'px';
    
    // Create particles
    const particleCount = 30;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#D6A3FF'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        
        // Random color
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random size
        const size = 3 + Math.random() * 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Random direction
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const velocity = 100 + Math.random() * 150;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity - 50; // Add some upward bias
        
        // Set custom animation
        particle.style.animation = 'none';
        particle.animate([
            { 
                transform: 'translate(0, 0) scale(1)', 
                opacity: 1 
            },
            { 
                transform: `translate(${vx}px, ${vy}px) scale(0)`, 
                opacity: 0 
            }
        ], {
            duration: 1500,
            easing: 'cubic-bezier(0, 0.5, 0.2, 1)'
        });
        
        firework.appendChild(particle);
    }
    
    document.body.appendChild(firework);
    
    // Remove after animation
    setTimeout(() => {
        firework.remove();
    }, 1500);
}

// === MODULE EXPORT ===
window.Rendering = {
    render,
    drawGrid,
    drawConnections,
    drawSpline,
    drawNodes,
    drawNode,
    animate,
    setNeedsRedraw,
    clearCaches,
    triggerNodeFirework,
    triggerRenownCelebration,
    triggerSuccessiveRangeCompletion
};

// Backward compatibility
window.render = render;
window.drawGrid = drawGrid;
window.drawConnections = drawConnections;
window.drawSpline = drawSpline;
window.drawNodes = drawNodes;
window.drawNode = drawNode;
window.animate = animate;
window.setNeedsRedraw = setNeedsRedraw;
window.clearCaches = clearCaches;

console.log('Rendering module loaded successfully'); 