// === MODULE: Connection Manager ===
// Handles connections between nodes

/**
 * Create a connection between two nodes
 */
function createConnection(editor, fromNode, toNode, connectionType = 'linear') {
    if (fromNode.id === toNode.id) return;
    
    const key = `${fromNode.id}_${toNode.id}`;
    const reverseKey = `${toNode.id}_${fromNode.id}`;
    
    if (!editor.connections.has(key) && !editor.connections.has(reverseKey)) {
        // Save state for undo
        if (window.NodeManager && window.NodeManager.saveUndoState) {
            window.NodeManager.saveUndoState(editor);
        }
        
        editor.connections.set(key, {
            from: fromNode.id,
            to: toNode.id,
            type: connectionType  // Use provided connection type
        });
        
        // Set parent-child relationship
        toNode.parent = fromNode.id;
        
        // Always update the child's color to inherit from parent
        // Clear any custom color on the child so it inherits from parent
        toNode.customColor = null;
        toNode.color = window.NodeManager.getNodeColor(toNode, editor);
        
        // Update all descendants' colors if needed
        if (window.NodeManager && window.NodeManager.updateDescendantColors) {
            window.NodeManager.updateDescendantColors(editor, toNode);
        }
        
        // Update stats from NodeManager
        if (window.NodeManager && window.NodeManager.updateStats) {
            window.NodeManager.updateStats(editor);
        }
        
        // Mark for redraw
        if (window.Rendering && window.Rendering.setNeedsRedraw) {
            window.Rendering.setNeedsRedraw();
        }
    }
}

/**
 * Remove all connections for a specific node
 */
function removeNodeConnections(editor, nodeId) {
    editor.connections.forEach((connection, key) => {
        if (connection.from === nodeId || connection.to === nodeId) {
            editor.connections.delete(key);
        }
    });
}

/**
 * Get all connections for a specific node
 */
function getNodeConnections(editor, nodeId) {
    const connections = [];
    editor.connections.forEach(connection => {
        if (connection.from === nodeId || connection.to === nodeId) {
            connections.push(connection);
        }
    });
    return connections;
}

/**
 * Check if two nodes are connected
 */
function areNodesConnected(editor, nodeId1, nodeId2) {
    const key1 = `${nodeId1}_${nodeId2}`;
    const key2 = `${nodeId2}_${nodeId1}`;
    return editor.connections.has(key1) || editor.connections.has(key2);
}

/**
 * Remove a specific connection
 */
function removeConnection(editor, fromId, toId) {
    const key1 = `${fromId}_${toId}`;
    const key2 = `${toId}_${fromId}`;
    
    // Check which direction the connection was stored
    let parentId = null;
    let childId = null;
    
    if (editor.connections.has(key1)) {
        editor.connections.delete(key1);
        parentId = fromId;
        childId = toId;
    } else if (editor.connections.has(key2)) {
        editor.connections.delete(key2);
        parentId = toId;
        childId = fromId;
    }
    
    // If a connection was removed, update the parent relationship
    if (parentId && childId) {
        const childNode = editor.nodes.get(childId);
        if (childNode && childNode.parent === parentId) {
            childNode.parent = null;
            
            // Reset the node color since it no longer has a parent
            childNode.color = window.NodeManager.getNodeColor(childNode, editor);
            
            // Update all descendants' colors
            if (window.NodeManager && window.NodeManager.updateDescendantColors) {
                window.NodeManager.updateDescendantColors(editor, childNode);
            }
        }
    }
    
    // Update stats from NodeManager
    if (window.NodeManager && window.NodeManager.updateStats) {
        window.NodeManager.updateStats(editor);
    }
}

/**
 * Clear all connections
 */
function clearConnections(editor) {
    editor.connections.clear();
    
    // Update stats from NodeManager
    if (window.NodeManager && window.NodeManager.updateStats) {
        window.NodeManager.updateStats(editor);
    }
}

/**
 * Get squared distance from point to line segment
 */
function distanceSquaredToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    if (dx === 0 && dy === 0) {
        // It's a point, not a line
        const dpx = px - x1;
        const dpy = py - y1;
        return dpx * dpx + dpy * dpy;
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    
    const dpx = px - nearestX;
    const dpy = py - nearestY;
    
    return dpx * dpx + dpy * dpy;
}

/**
 * Get approximate distance from point to bezier curve
 * Uses subdivision to approximate the curve
 */
function distanceToBezierCurve(px, py, x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
    // Subdivide the curve into segments and find minimum distance
    const segments = 20;
    let minDistSq = Infinity;
    
    let prevX = x1;
    let prevY = y1;
    
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        
        // Cubic bezier formula
        const x = mt3 * x1 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x2;
        const y = mt3 * y1 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y2;
        
        const distSq = distanceSquaredToLineSegment(px, py, prevX, prevY, x, y);
        minDistSq = Math.min(minDistSq, distSq);
        
        prevX = x;
        prevY = y;
    }
    
    return Math.sqrt(minDistSq);
}

/**
 * Get approximate distance from point to connection based on its type
 */
function getDistanceToConnection(px, py, fromNode, toNode, connectionType = 'linear') {
    switch(connectionType) {
        case 'linear':
            // Simple line distance
            return Math.sqrt(distanceSquaredToLineSegment(px, py, fromNode.x, fromNode.y, toNode.x, toNode.y));
            
        case 'step':
            // Check distance to each segment of the step
            const midX = (fromNode.x + toNode.x) / 2;
            const dist1 = Math.sqrt(distanceSquaredToLineSegment(px, py, fromNode.x, fromNode.y, midX, fromNode.y));
            const dist2 = Math.sqrt(distanceSquaredToLineSegment(px, py, midX, fromNode.y, midX, toNode.y));
            const dist3 = Math.sqrt(distanceSquaredToLineSegment(px, py, midX, toNode.y, toNode.x, toNode.y));
            return Math.min(dist1, dist2, dist3);
            
        case 'zigzag':
            // Check distance to multiple line segments
            const segments = 5;
            const segmentWidth = (toNode.x - fromNode.x) / segments;
            const amplitude = 20;
            let minDist = Infinity;
            
            let prevX = fromNode.x;
            let prevY = fromNode.y;
            
            for (let i = 1; i <= segments; i++) {
                const segX = fromNode.x + segmentWidth * i;
                const segY = fromNode.y + (toNode.y - fromNode.y) * (i / segments) + (i % 2 === 0 ? amplitude : -amplitude);
                
                const dist = Math.sqrt(distanceSquaredToLineSegment(px, py, prevX, prevY, segX, segY));
                minDist = Math.min(minDist, dist);
                
                prevX = segX;
                prevY = segY;
            }
            
            // Last segment to target
            const lastDist = Math.sqrt(distanceSquaredToLineSegment(px, py, prevX, prevY, toNode.x, toNode.y));
            return Math.min(minDist, lastDist);
            
        case 'curved':
        case 'smooth':
        case 'arc':
        default:
            // Use bezier approximation for curved types
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offset = connectionType === 'curved' ? Math.min(distance * 0.5, 100) : distance * 0.5;
            
            let cx1, cy1, cx2, cy2;
            
            if (connectionType === 'curved' && Math.abs(dy) > Math.abs(dx)) {
                cx1 = fromNode.x;
                cy1 = fromNode.y + offset;
                cx2 = toNode.x;
                cy2 = toNode.y - offset;
            } else {
                cx1 = fromNode.x + offset;
                cy1 = fromNode.y;
                cx2 = toNode.x - offset;
                cy2 = toNode.y;
            }
            
            return distanceToBezierCurve(px, py, fromNode.x, fromNode.y, cx1, cy1, cx2, cy2, toNode.x, toNode.y);
    }
}

/**
 * Get connection at position (with tolerance for clicking)
 */
function getConnectionAt(editor, x, y) {
    const tolerance = 10 / editor.camera.zoom; // 10 pixels tolerance, adjusted for zoom
    let closestConnection = null;
    let closestDistance = tolerance;
    
    editor.connections.forEach((connection, key) => {
        const fromNode = editor.nodes.get(connection.from);
        const toNode = editor.nodes.get(connection.to);
        
        if (!fromNode || !toNode) return;
        
        // Skip connections involving hidden nodes
        if (window.NodeManager.isNodeHidden(editor, connection.from) || 
            window.NodeManager.isNodeHidden(editor, connection.to)) {
            return;
        }
        
        // Get distance based on connection type
        const dist = getDistanceToConnection(x, y, fromNode, toNode, connection.type || 'linear');
        
        if (dist < closestDistance) {
            closestDistance = dist;
            closestConnection = key;
        }
    });
    
    return closestConnection;
}

// === MODULE EXPORT ===
window.ConnectionManager = {
    createConnection,
    removeNodeConnections,
    getNodeConnections,
    areNodesConnected,
    removeConnection,
    clearConnections,
    getConnectionAt
};

// Backward compatibility
window.createConnection = createConnection;
window.removeNodeConnections = removeNodeConnections;
window.getNodeConnections = getNodeConnections;
window.areNodesConnected = areNodesConnected;
window.removeConnection = removeConnection;
window.clearConnections = clearConnections;
window.getConnectionAt = getConnectionAt;

console.log('Connection Manager module loaded successfully'); 