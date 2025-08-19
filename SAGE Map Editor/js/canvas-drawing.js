// canvas-drawing.js - Functions for drawing on the canvases

// Canvas elements
let canvas = null;
let ctx = null;
let previewCanvas = null;
let previewCtx = null;

// Device pixel ratio for high DPI support
let devicePixelRatio = window.devicePixelRatio || 1;

// Make canvas variables available globally
window.canvas = canvas;
window.ctx = ctx;
window.previewCanvas = previewCanvas;
window.previewCtx = previewCtx;
window.devicePixelRatio = devicePixelRatio;
window.showResourceHeatmap = showResourceHeatmap;

// Initialize canvas context
function initCanvas() {
    canvas = document.getElementById('galaxyView');
    if (canvas) {
        ctx = canvas.getContext('2d');
        
        // Update global references
        window.canvas = canvas;
        window.ctx = ctx;
        
        updateCanvasSize();
    }
    previewCanvas = document.getElementById('systemPreview');
    if (previewCanvas) {
        previewCtx = previewCanvas.getContext('2d');
        
        // Set up high DPI support for system preview
        setupHighDPICanvas(previewCanvas, previewCtx);
        
        // Update global references
        window.previewCanvas = previewCanvas;
        window.previewCtx = previewCtx;
    }
}

// Set up high DPI support for a canvas
function setupHighDPICanvas(canvas, context) {
    // Get the device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    
    // Get the current size in CSS pixels
    const rect = canvas.getBoundingClientRect();
    
    // Set the canvas attributes to the display size times the device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale the drawing context
    context.scale(dpr, dpr);
    
    // Set the CSS size back to the original size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    console.log(`High DPI setup for canvas: DPR = ${dpr}, Size = ${canvas.width}x${canvas.height}`);
}

// Update canvas size
function updateCanvasSize() {
    if (!canvas) return;
    
    // Get the actual container dimensions
    const container = canvas.parentElement;
    
    // Get computed style to account for padding/borders
    const containerStyle = window.getComputedStyle(container);
    
    // Calculate available space accounting for padding
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(containerStyle.paddingBottom) || 0;
    
    // Calculate actual available space in CSS pixels
    const containerWidth = container.clientWidth - paddingLeft - paddingRight;
    const containerHeight = container.clientHeight - paddingTop - paddingBottom;
    
    // Only update if dimensions have actually changed
    const cssWidth = parseInt(canvas.style.width || containerWidth);
    const cssHeight = parseInt(canvas.style.height || containerHeight);
    
    if (cssWidth !== containerWidth || cssHeight !== containerHeight) {
        // Store the previous context state
        const prevDPR = devicePixelRatio;
        
        // Update device pixel ratio in case it changed (e.g., when moving between displays)
        devicePixelRatio = window.devicePixelRatio || 1;
        window.devicePixelRatio = devicePixelRatio;
        
        // Set CSS dimensions
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        
        // Set the canvas dimensions with high DPI scaling
        canvas.width = containerWidth * devicePixelRatio;
        canvas.height = containerHeight * devicePixelRatio;
        
        // Apply the scale to the context
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        console.log(`Canvas resized to ${containerWidth}x${containerHeight} (${canvas.width}x${canvas.height} at ${devicePixelRatio}x DPI)`);
        
        // Center the view
        if (mapData && mapData.length > 0) {
            centerMapView();
        } else {
            offsetX = containerWidth / 2;
            offsetY = containerHeight / 2;
        }
        
        drawGalaxyMap();
    }
}

// Add resize listener
window.addEventListener('resize', function() {
    console.log('Window resize detected, updating canvas size');
    updateCanvasSize();
    
    // Also update the preview canvas for high DPI
    if (previewCanvas && previewCtx) {
        setupHighDPICanvas(previewCanvas, previewCtx);
        // Redraw the preview if a system is selected
        if (selectedSystems.length > 0) {
            drawSystemPreview(selectedSystems[0]);
        }
    }
});

// Center map view
function centerMapView() {
    if (!canvas || !mapData || mapData.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Find bounds
    mapData.forEach(system => {
        if (system.coordinates && system.coordinates.length === 2) {
            minX = Math.min(minX, system.coordinates[0]);
            maxX = Math.max(maxX, system.coordinates[0]);
            minY = Math.min(minY, system.coordinates[1]);
            maxY = Math.max(maxY, system.coordinates[1]);
        }
    });
    
    if (minX === Infinity) return; // No valid systems
    
    // Calculate center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate scale
    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    const canvasWidth = parseInt(canvas.style.width || canvas.width);
    const canvasHeight = parseInt(canvas.style.height || canvas.height);
    
    // Use 80% of available space
    const scaleX = (canvasWidth * 0.8) / mapWidth;
    const scaleY = (canvasHeight * 0.8) / mapHeight;
    scale = Math.min(scaleX, scaleY);
    
    // Apply scale limits - match the limit in ui-handlers.js
    scale = Math.max(0.1, Math.min(scale, 500));
    
    // Set offsets to center the map
    offsetX = canvasWidth / 2 - centerX * scale;
    offsetY = canvasHeight / 2 + centerY * scale;
    
    // Force immediate redraw
    drawGalaxyMap();
}

// Main galaxy map drawing function
function drawGalaxyMap() {
    if (!canvas || !ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid only if enabled AND heatmap is not active
    // This prevents double grid lines when heatmap is on
    if (showGrid && !showResourceHeatmap) {
        drawGrid();
    }
    
    // Draw faction area
    if (showFactionArea) {
        drawFactionArea();
    }
    
    // Draw systems and links
    drawGalaxyLinks();
    drawRegionBlobs(); // Draw region blobs first (behind everything)
    drawRegionPolygons(); // Draw region polygons before systems
    drawSystems();
    
    // Draw resource heatmap if enabled (now on top of systems)
    if (showResourceHeatmap) {
        drawResourceHeatmap();
    }
    
    // Draw selection box if selecting
    if (isSelecting) {
        drawSelectionBox();
    }
    
    // Draw linking line if in linking mode
    if (isLinking && linkSourceSystem) {
        drawLinkingLine();
    }
    
    // Draw selection or hover indicators
    drawSelectionIndicators();
    
    // Draw region labels on top of everything else
    drawRegionLabels();
    
    // Update status info on map
    updateMouseCoordinates();
    
    // Update system counts
    updateSystemCount();
}

// Draw grid on galaxy map
function drawGrid() {
    if (!ctx) return;
    
    ctx.save();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 0.5;
    
    // Calculate grid boundaries
    const viewWidth = canvas.width;
    const viewHeight = canvas.height;
    const leftmostMapX = -offsetX / scale;
    const rightmostMapX = (viewWidth - offsetX) / scale;
    const topmostMapY = -offsetY / -scale;
    const bottommostMapY = (viewHeight - offsetY) / -scale;
    
    // Draw vertical grid lines
    const startX = Math.floor(leftmostMapX / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
    const endX = Math.ceil(rightmostMapX / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
    
    for (let x = startX; x <= endX; x += GALAXY_GRID_SPACING) {
        const screenX = x * scale + offsetX;
        
        // Special styling for Y-axis (where x = 0)
        if (x === 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, viewHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 0.5;
        } else {
            // Regular grid lines
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, viewHeight);
            ctx.stroke();
        }
        
        // Draw coordinate labels
        if (scale > 2 && x % 5 === 0) {
            ctx.fillStyle = '#777777';
            ctx.font = '10px Arial';
            ctx.fillText(x.toString(), screenX + 2, 12);
        }
    }
    
    // Draw horizontal grid lines
    const startY = Math.floor(bottommostMapY / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
    const endY = Math.ceil(topmostMapY / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
    
    for (let y = startY; y <= endY; y += GALAXY_GRID_SPACING) {
        const screenY = y * -scale + offsetY;
        
        // Special styling for X-axis (where y = 0)
        if (y === 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.moveTo(0, screenY);
            ctx.lineTo(viewWidth, screenY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 0.5;
        } else {
            // Regular grid lines
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(viewWidth, screenY);
            ctx.stroke();
        }
        
        // Draw coordinate labels
        if (scale > 2 && y % 5 === 0) {
            ctx.fillStyle = '#777777';
            ctx.font = '10px Arial';
            ctx.fillText(y.toString(), 2, screenY - 2);
        }
    }
    
    // Draw origin marker
    const originX = 0 * scale + offsetX;
    const originY = 0 * -scale + offsetY;
    
    ctx.beginPath();
    ctx.strokeStyle = '#FF5555';
    ctx.lineWidth = 1;
    ctx.arc(originX, originY, 5, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// Draw all systems on the galaxy map
function drawSystems() {
    if (!ctx) return;
    
    // Get the current search term
    const searchInput = document.getElementById('searchSystem');
    const searchTerm = searchInput && searchInput.value ? searchInput.value.toLowerCase() : '';
    
    // Check which regions match the search term
    const matchingRegionIds = new Set();
    if (searchTerm && regionDefinitions) {
        regionDefinitions.forEach(region => {
            if (region.name && region.name.toLowerCase().includes(searchTerm)) {
                matchingRegionIds.add(region.id);
            }
        });
    }
    
    mapData.forEach(system => {
        // Check if system matches search filter or belongs to a matching region
        const isVisible = !searchTerm || 
            (system.name && system.name.toLowerCase().includes(searchTerm)) ||
            (system.key && system.key.toLowerCase().includes(searchTerm)) ||
            (system.faction && system.faction.toLowerCase().includes(searchTerm)) ||
            (system.regionId && matchingRegionIds.has(system.regionId));
            
        // Only draw visible systems
        if (isVisible) {
            drawSystemNode(system);
        }
    });
}

// Draw system crown shape
function drawCrownShape(x, y, size, color) {
    if (!ctx) return;
    
    // Scale the size based on the system size multiplier
    const adjustedSize = size * systemSizeMultiplier;
    
    const crownPoints = [
        { x: -0.5, y: -1.0 },   // Left bottom
        { x: -0.5, y: -1.3 },   // Left inner peak
        { x: -0.3, y: -1.1 },   // Inner dip
        { x: 0.0, y: -1.5 },    // Center peak
        { x: 0.3, y: -1.1 },    // Inner dip
        { x: 0.5, y: -1.3 },    // Right inner peak
        { x: 0.5, y: -1.0 }     // Right bottom
    ];
    
    ctx.beginPath();
    ctx.moveTo(x + crownPoints[0].x * adjustedSize, y + crownPoints[0].y * adjustedSize);
    
    for (let i = 1; i < crownPoints.length; i++) {
        ctx.lineTo(x + crownPoints[i].x * adjustedSize, y + crownPoints[i].y * adjustedSize);
    }
    
    // Complete the shape
    ctx.lineTo(x + 0.6 * adjustedSize, y + adjustedSize * 0.2);
    ctx.lineTo(x - 0.6 * adjustedSize, y + adjustedSize * 0.2);
    ctx.closePath();
    
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Draw KING system shape - a star with a diamond center
function drawKingShape(x, y, size, color) {
    if (!ctx) return;
    
    // Scale the size based on the system size multiplier
    const adjustedSize = size * systemSizeMultiplier * 1.3; // Make KING systems 30% larger
    
    // Draw an 8-pointed star
    const outerRadius = adjustedSize;
    const innerRadius = adjustedSize * 0.5;
    const numPoints = 8;
    
    ctx.beginPath();
    for (let i = 0; i < numPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / numPoints;
        const pointX = x + Math.cos(angle) * radius;
        const pointY = y + Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(pointX, pointY);
        } else {
            ctx.lineTo(pointX, pointY);
        }
    }
    ctx.closePath();
    
    // Fill the star
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw dark outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw a diamond in the center
    const diamondSize = adjustedSize * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y - diamondSize); // Top
    ctx.lineTo(x + diamondSize, y); // Right
    ctx.lineTo(x, y + diamondSize); // Bottom
    ctx.lineTo(x - diamondSize, y); // Left
    ctx.closePath();
    
    // Fill diamond with a lighter shade
    const rgb = hexToRgb(color);
    ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 50)}, ${Math.min(255, rgb.g + 50)}, ${Math.min(255, rgb.b + 50)}, 1)`;
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Draw a single system node
function drawSystemNode(system) {
    if (!ctx || !system || !system.coordinates || system.coordinates.length !== 2) return;
    
    const x = system.coordinates[0] * scale + offsetX;
    const y = system.coordinates[1] * -1 * scale + offsetY;
    
    // Skip if outside viewport
    if (x < -20 || x > canvas.width + 20 || y < -20 || y > canvas.height + 20) return;
    
    // Determine color based on faction
    let fillColor = '#FFFFFF'; // Default white
    if (system.faction) {
        fillColor = getFactionColor(system.faction);
    }
    
    // Draw region indicator if system belongs to a region and indicators are enabled
    if (system.regionId && showRegions && resourceFilterState["RegionalIndicator"] !== false) {
        const regionColor = getRegionColor(system.regionId);
        if (regionColor) {
            if (system.isKing) {
                // Draw star-shaped region indicator for KING systems
                const numPoints = 8;
                const outerRadius = 20 * Math.sqrt(systemSizeMultiplier);
                const innerRadius = 12 * Math.sqrt(systemSizeMultiplier);
                
                ctx.beginPath();
                for (let i = 0; i < numPoints * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / numPoints;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        ctx.moveTo(pointX, pointY);
                    } else {
                        ctx.lineTo(pointX, pointY);
                    }
                }
                ctx.closePath();
                
                ctx.strokeStyle = regionColor;
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (system.isCore) {
                // Draw crown-shaped region indicator for core systems
                const crownPoints = [
                    { x: -0.5, y: -1.0 },   // Left bottom
                    { x: -0.5, y: -1.3 },   // Left inner peak
                    { x: -0.3, y: -1.1 },   // Inner dip
                    { x: 0.0, y: -1.5 },    // Center peak
                    { x: 0.3, y: -1.1 },    // Inner dip
                    { x: 0.5, y: -1.3 },    // Right inner peak
                    { x: 0.5, y: -1.0 }     // Right bottom
                ];
                
                // Adjust region size based on system size multiplier (but less so for clarity)
                const regionSize = 15 * Math.sqrt(systemSizeMultiplier); // Square root for milder scaling
                
                ctx.beginPath();
                ctx.moveTo(x + crownPoints[0].x * regionSize, y + crownPoints[0].y * regionSize);
                
                for (let i = 1; i < crownPoints.length; i++) {
                    ctx.lineTo(x + crownPoints[i].x * regionSize, y + crownPoints[i].y * regionSize);
                }
                
                // Complete the shape with wider bottom
                ctx.lineTo(x + 0.6 * regionSize, y + regionSize * 0.2);
                ctx.lineTo(x - 0.6 * regionSize, y + regionSize * 0.2);
                ctx.closePath();
                
                ctx.strokeStyle = regionColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Regular circle for non-core systems
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = regionColor;
                // Adjust region circle based on system size multiplier (but less so for clarity)
                const regionRadius = 10 * Math.sqrt(systemSizeMultiplier); // Square root for milder scaling
                ctx.arc(x, y, regionRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    // Draw system differently based on type
    if (system.isKing) {
        // Draw star shape for KING systems
        drawKingShape(x, y, 10, fillColor);
    } else if (system.isCore) {
        // Draw crown for core systems
        drawCrownShape(x, y, 10, fillColor);
    } else {
        // Draw regular circle for non-core systems
        // Apply system size multiplier to the radius
        const radius = 5 * systemSizeMultiplier;
        
        ctx.beginPath();
        ctx.fillStyle = fillColor;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw dark outline
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Only draw labels if enabled or if this system is hovered/selected
    const isSelected = selectedSystems.includes(system);
    const isHovered = system === hoveredSystem;
    
    if (showSystemLabels || isSelected || isHovered) {
        drawSystemLabel(system, x, y, isSelected, isHovered);
    }
    
    // Draw resource labels if enabled in resource filter
    if (resourceFilterState["Planets"]) {
        drawSystemResourceLabels(system, x, y, isSelected, isHovered);
    }
}

// Draw system label
function drawSystemLabel(system, x, y, isSelected, isHovered) {
    if (!ctx) return;
    
    const name = system.name || 'Unknown System';
    const showDetails = isSelected || isHovered || showSystemStats;
    
    // Only draw system name if enabled in filter or system is selected/hovered
    if (resourceFilterState["SystemName"] || isSelected || isHovered) {
        ctx.font = isSelected ? 'bold 12px Arial' : '12px Arial';
        
        // --- Add Lock Icon only if separate lock status filter is disabled --- 
        const shouldShowLockInName = !resourceFilterState["LockStatus"];
        const lockIcon = system.isLocked && shouldShowLockInName ? '🔒 ' : ''; // Only add lock icon if separate lock status is disabled
        const displayText = lockIcon + name;
        // --- End Add Lock Icon ---
        
        const metrics = ctx.measureText(displayText); // Use displayText for measurement
        const textWidth = metrics.width;
        
        // Background for text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - textWidth / 2 - 2, y - 20, textWidth + 4, 14);
        
        // Text
        ctx.fillStyle = isSelected ? '#FFFF00' : (isHovered ? '#FFDDDD' : '#FFFFFF');
        ctx.textAlign = 'center';
        ctx.fillText(displayText, x, y - 10); // Use displayText for drawing
    }
    
    // Draw lock status as a separate label if enabled
    if (system.isLocked && (resourceFilterState["LockStatus"] || isSelected || isHovered)) {
        const lockText = "🔒";
        const lockMetrics = ctx.measureText(lockText);
        
        // Position the lock icon above the system name
        const lockY = y - 35; // Position above system name
        
        // Background for lock icon
        ctx.fillStyle = 'rgba(255, 204, 0, 0.3)'; // Yellow background for lock
        ctx.fillRect(x - lockMetrics.width / 2 - 2, lockY - 10, lockMetrics.width + 4, 14);
        
        // Draw lock icon
        ctx.fillStyle = '#FFCC00'; // Yellow/gold color
        ctx.textAlign = 'center';
        ctx.fillText(lockText, x, lockY);
    }
    
    // Draw KING status as a separate label if enabled
    if (system.isKing && (resourceFilterState["KingStatus"] || isSelected || isHovered)) {
        const kingText = "👑 KING";
        ctx.font = 'bold 11px Arial';
        const kingMetrics = ctx.measureText(kingText);
        
        // Position the KING label
        const kingY = system.isLocked ? y - 50 : y - 35; // Position above lock if present
        
        // Background for KING label
        ctx.fillStyle = 'rgba(155, 89, 182, 0.5)'; // Purple background
        ctx.fillRect(x - kingMetrics.width / 2 - 4, kingY - 10, kingMetrics.width + 8, 16);
        
        // Draw KING text
        ctx.fillStyle = '#fff'; // White text
        ctx.textAlign = 'center';
        ctx.fillText(kingText, x, kingY);
        ctx.font = '12px Arial'; // Reset font
    }
    
    // Prepare stats text if any filters are enabled or system is selected/hovered
    let statsText = '';
    
    // Add faction if enabled in filter or selected/hovered
    if (system.faction && (resourceFilterState["FactionLabel"] || isSelected || isHovered)) {
        statsText += `${system.faction} `;
    }
    
    // Add planet count if enabled in filter or selected/hovered
    if (system.planets && system.planets.length > 0 && (resourceFilterState["PlanetCount"] || isSelected || isHovered)) {
        statsText += `P:${system.planets.length} `;
    }
    
    // Add star count if enabled in filter or selected/hovered
    if (system.stars && system.stars.length > 0 && (resourceFilterState["StarCount"] || isSelected || isHovered)) {
        statsText += `S:${system.stars.length} `;
    }
    
    // Add starbase tier if enabled in filter or selected/hovered
    if (system.starbase && system.starbase.tier > 0 && (resourceFilterState["StarbaseTier"] || isSelected || isHovered)) {
        statsText += `SB:T${system.starbase.tier}`;
    }
    
    // Draw stats if there's text to show
    if (statsText) {
        // Background for stats
        const statsMetrics = ctx.measureText(statsText);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - statsMetrics.width / 2 - 2, y + 6, statsMetrics.width + 4, 14);
        
        // Stats text
        ctx.fillStyle = isSelected ? '#FFFF00' : (isHovered ? '#FFDDDD' : '#CCCCCC');
        ctx.fillText(statsText, x, y + 16);
    }
}

// Draw resource labels under a system
function drawSystemResourceLabels(system, x, y, isSelected, isHovered) {
    if (!ctx) return;
    
    // Get all resources in the system
    const systemResources = window.getAllSystemResources ? window.getAllSystemResources(system) : [];
    
    if (!systemResources || systemResources.length === 0) return;
    
    // Filter resources based on resourceFilterState
    const filteredResources = systemResources.filter(resource => 
        resourceFilterState[resource.name] !== false
    );
    
    if (filteredResources.length === 0) return;
    
    // Text properties
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // Start position below the system stats (if shown)
    let labelY = y + 30;
    
    // If stats are shown, move down more
    if (isSelected || isHovered || showSystemStats) {
        labelY += 15;
    }
    
    // Draw each resource label
    filteredResources.forEach((resource, index) => {
        // Add richness value to the resource name
        const resourceName = resource.name || 'Unknown Resource';
        const displayText = `${resourceName} (R${resource.richness})`;
        const textWidth = ctx.measureText(displayText).width;
        
        // Get resource color
        const resourceColor = RESOURCE_COLORS[resourceName.toLowerCase()] || RESOURCE_COLORS.default;
        
        // Background for text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - textWidth / 2 - 2, labelY - 8, textWidth + 4, 12);
        
        // Draw the resource text
        ctx.fillStyle = resourceColor;
        ctx.fillText(displayText, x, labelY);
        
        // Move down for next resource
        labelY += 14;
    });
}

// Draw all system links
function drawGalaxyLinks() {
    if (!ctx) return;
    
    // Store processed links to avoid drawing duplicates
    const processedLinks = new Set();
    
    mapData.forEach(system => {
        if (!system.links || !system.coordinates) return;
        
        system.links.forEach(linkKey => {
            const targetSystem = systemLookup[linkKey];
            
            if (!targetSystem || !targetSystem.coordinates) return;
            
            // Create a unique key for the link
            const linkId = [system.key, linkKey].sort().join('-');
            
            // Skip if link already processed
            if (processedLinks.has(linkId)) return;
            processedLinks.add(linkId);
            
            // Get coordinates
            const x1 = system.coordinates[0] * scale + offsetX;
            const y1 = system.coordinates[1] * -1 * scale + offsetY;
            const x2 = targetSystem.coordinates[0] * scale + offsetX;
            const y2 = targetSystem.coordinates[1] * -1 * scale + offsetY;
            
            // Calculate distance
            const distance = Math.sqrt((targetSystem.coordinates[0] - system.coordinates[0]) ** 2 + 
                                    (targetSystem.coordinates[1] - system.coordinates[1]) ** 2);
            
            // Check if either system is selected
            const isSelected = selectedSystems.includes(system) || selectedSystems.includes(targetSystem);
            
            // Draw link
            ctx.beginPath();
            ctx.strokeStyle = isSelected ? '#FFFF00' : '#888888';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Draw distance if zoomed in enough
            if (scale > 3) {
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                const distText = distance.toFixed(2);
                
                ctx.font = '10px Arial';
                const metrics = ctx.measureText(distText);
                
                // Background for distance
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(midX - metrics.width / 2 - 2, midY - 6, metrics.width + 4, 12);
                
                // Distance text
                ctx.fillStyle = '#AAAAAA';
                ctx.textAlign = 'center';
                ctx.fillText(distText, midX, midY + 3);
            }
        });
    });
}

// Draw faction areas based on convex hull
function drawFactionArea() {
    if (!ctx) return;
    
    // Reset faction area stats
    factionAreaStats = {
        MUD: { area: 0, systems: 0 },
        ONI: { area: 0, systems: 0 },
        UST: { area: 0, systems: 0 }
    };
    
    // Group systems by faction
    const factionSystems = {
        MUD: [],
        ONI: [],
        UST: []
    };
    
    mapData.forEach(system => {
        if (!system.coordinates) return;
        
        const faction = system.faction;
        if (faction && factionSystems[faction]) {
            factionSystems[faction].push({
                x: system.coordinates[0],
                y: system.coordinates[1]
            });
            factionAreaStats[faction].systems++;
        }
    });
    
    // Draw area for each faction
    for (const faction in factionSystems) {
        const systems = factionSystems[faction];
        
        if (systems.length < 3) continue; // Need at least 3 points for convex hull
        
        // Calculate convex hull
        const hull = calculateConvexHull(systems);
        
        // Calculate area
        const area = calculatePolygonArea(hull);
        factionAreaStats[faction].area = area;
        
        // Draw filled polygon
        ctx.beginPath();
        ctx.moveTo(hull[0].x * scale + offsetX, hull[0].y * -1 * scale + offsetY);
        
        for (let i = 1; i < hull.length; i++) {
            ctx.lineTo(hull[i].x * scale + offsetX, hull[i].y * -1 * scale + offsetY);
        }
        
        ctx.closePath();
        
        const factionColor = getFactionColor(faction);
        const rgbColor = hexToRgb(factionColor);
        ctx.fillStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`;
        ctx.fill();
        
        ctx.strokeStyle = factionColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    // If faction area display is enabled, show stats directly on canvas
    if (showFactionArea) {
        drawFactionAreaStats();
    }
}

// Draw faction area statistics directly on canvas
function drawFactionAreaStats() {
    if (!ctx) return;
    
    // Initialize expanded faction statistics
    const expandedFactionStats = {
        MUD: { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, territory: 0 },
        ONI: { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, territory: 0 },
        UST: { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, territory: 0 }
    };
    
    // Populate faction stats
    mapData.forEach(system => {
        const faction = system.faction;
        if (faction && expandedFactionStats[faction]) {
            expandedFactionStats[faction].systems++;
            
            if (system.isCore) {
                expandedFactionStats[faction].core++;
            }
            
            // Count planets and resources
            if (system.planets) {
                expandedFactionStats[faction].planets += system.planets.length;
                
                // Count resources
                system.planets.forEach(planet => {
                    if (planet.resources) {
                        expandedFactionStats[faction].resources += planet.resources.length;
                    }
                });
            }
            
            // Count stars
            if (system.stars) {
                expandedFactionStats[faction].stars += system.stars.length;
            }
        }
    });
    
    // Set territory from faction area stats
    for (const faction in expandedFactionStats) {
        if (factionAreaStats[faction]) {
            expandedFactionStats[faction].territory = factionAreaStats[faction].area;
        }
    }
    
    // Set up stats box dimensions
    const padding = 15;
    const boxWidth = 350; // Wider box for more data
    const rowHeight = 22;
    const headerHeight = 40;
    const displayedFactions = Object.keys(expandedFactionStats).filter(f => expandedFactionStats[f].systems > 0);
    const rows = 8; // Fixed number of rows for our metrics
    const boxHeight = headerHeight + (rowHeight * rows) + (padding * 2) + 10;
    
    // Position in top left corner with padding (using CSS pixels)
    const boxX = padding;
    const boxY = padding;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    ctx.fill();
    ctx.stroke();
    
    // Draw title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Faction Areas', boxX + boxWidth / 2, boxY + 25);
    
    // Draw header divider
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(boxX + 10, boxY + headerHeight - 5);
    ctx.lineTo(boxX + boxWidth - 10, boxY + headerHeight - 5);
    ctx.stroke();
    
    // Draw faction stats table
    let y = boxY + headerHeight + 15;
    
    // Column widths
    const labelWidth = 120;
    const columnWidth = (boxWidth - labelWidth - padding * 2) / displayedFactions.length;
    
    // Column headers (faction names)
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    
    // Draw label column header
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('Statistic', boxX + 15, y);
    
    // Draw faction column headers
    displayedFactions.forEach((faction, index) => {
        const x = boxX + labelWidth + (columnWidth * index) + (columnWidth / 2);
        const color = faction === 'MUD' ? '#FF5722' : 
                     faction === 'ONI' ? '#2196F3' : 
                     faction === 'UST' ? '#FFC107' : 
                     '#7f8c8d';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(faction, x, y);
    });
    
    y += rowHeight;
    
    // Row labels and data
    const metrics = [
        { name: 'Systems', accessor: stats => stats.systems },
        { name: 'CORE Systems', accessor: stats => stats.core },
        { name: 'Planets', accessor: stats => stats.planets },
        { name: 'Stars', accessor: stats => stats.stars },
        { name: 'Resources', accessor: stats => stats.resources },
        { name: 'Territory', accessor: stats => stats.territory.toFixed(0) + ' sq' },
        { name: 'Planets/System', accessor: stats => (stats.systems > 0 ? (stats.planets / stats.systems).toFixed(1) : '0.0') },
        { name: 'Resources/Planet', accessor: stats => (stats.planets > 0 ? (stats.resources / stats.planets).toFixed(1) : '0.0') }
    ];
    
    // Draw row separators
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    for (let i = 0; i <= metrics.length; i++) {
        ctx.moveTo(boxX + 10, y + (rowHeight * i) - 5);
        ctx.lineTo(boxX + boxWidth - 10, y + (rowHeight * i) - 5);
    }
    ctx.stroke();
    
    // Draw each metric row
    metrics.forEach((metric, rowIndex) => {
        // Row label
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(metric.name, boxX + 15, y + (rowHeight * rowIndex));
        
        // Draw values for each faction
        displayedFactions.forEach((faction, colIndex) => {
            const x = boxX + labelWidth + (columnWidth * colIndex) + (columnWidth / 2);
            ctx.textAlign = 'center';
            ctx.fillText(metric.accessor(expandedFactionStats[faction]), x, y + (rowHeight * rowIndex));
        });
    });
}

// Toggle faction area display
function toggleFactionArea() {
    showFactionArea = !showFactionArea;
    const btn = document.getElementById('manageFactionAreaBtn');
    if (btn) {
        btn.classList.toggle('active', showFactionArea);
    }
    
    drawGalaxyMap();
}

// Helper function to prepare region data for drawing
function prepareRegionData() {
    if (!showRegions || !regionDefinitions || regionDefinitions.length === 0) return null;
    
    // Get the current search term
    const searchInput = document.getElementById('searchSystem');
    const searchTerm = searchInput && searchInput.value ? searchInput.value.toLowerCase() : '';
    
    // Check which regions match the search term
    const matchingRegionIds = new Set();
    if (searchTerm) {
        regionDefinitions.forEach(region => {
            if (region.name && region.name.toLowerCase().includes(searchTerm)) {
                matchingRegionIds.add(region.id);
            }
        });
    }
    
    // Group systems by region
    const regionSystems = {};
    regionDefinitions.forEach(region => {
        regionSystems[region.id] = [];
    });
    
    mapData.forEach(system => {
        if (!system.coordinates || !system.regionId) return;
        
        // Skip if region not defined in regionDefinitions
        if (!regionSystems[system.regionId]) return;
        
        // Add system if there's no search term, the region matches the search term,
        // or the system itself matches the search term
        const systemMatchesSearch = !searchTerm || 
            (system.name && system.name.toLowerCase().includes(searchTerm)) ||
            (system.key && system.key.toLowerCase().includes(searchTerm)) ||
            (system.faction && system.faction.toLowerCase().includes(searchTerm));
        
        const regionMatchesSearch = matchingRegionIds.has(system.regionId);
        
        if (!searchTerm || systemMatchesSearch || regionMatchesSearch) {
            regionSystems[system.regionId].push({
                x: system.coordinates[0],
                y: system.coordinates[1],
                system: system
            });
        }
    });
    
    return { regionSystems, matchingRegionIds, searchTerm };
}

// Draw regions on the galaxy map - split into polygons and labels
function drawRegionPolygons() {
    if (!ctx || !showRegions || !regionDefinitions || regionDefinitions.length === 0) return;
    
    // Check if region polygon display is enabled
    const showRegionalPolygon = resourceFilterState["RegionalPolygon"] !== false;
    if (!showRegionalPolygon) return;
    
    const regionData = prepareRegionData();
    if (!regionData) return;
    
    const { regionSystems, matchingRegionIds, searchTerm } = regionData;
    
    // Clear previous hull data
    window.regionHullData = {};
    
    // Draw polygon for each region
    for (const regionId in regionSystems) {
        const systems = regionSystems[regionId];
        
        if (systems.length < 3) continue; // Need at least 3 points for convex hull
        
        // Find region definition
        const regionDef = regionDefinitions.find(r => r.id === regionId);
        if (!regionDef) continue;
        
        // Skip if we have a search term and neither the region nor any of its systems match
        if (searchTerm && !matchingRegionIds.has(regionId) && systems.length === 0) continue;
        
        // Calculate convex hull
        const hull = calculateConvexHull(systems);
        
        // Store hull data
        window.regionHullData[regionId] = {
            hull,
            systems,
            regionDef
        };
        
        // Draw filled polygon
        ctx.beginPath();
        ctx.moveTo(hull[0].x * scale + offsetX, hull[0].y * -1 * scale + offsetY);
        
        for (let i = 1; i < hull.length; i++) {
            ctx.lineTo(hull[i].x * scale + offsetX, hull[i].y * -1 * scale + offsetY);
        }
        
        ctx.closePath();
        
        const rgbColor = hexToRgb(regionDef.color);
        ctx.fillStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.15)`;
        ctx.fill();
        
        ctx.strokeStyle = regionDef.color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Draw region labels on top of everything else
function drawRegionLabels() {
    if (!ctx || !showRegions || !regionDefinitions || regionDefinitions.length === 0) return;
    
    const regionData = prepareRegionData();
    if (!regionData) return;
    
    const { regionSystems, matchingRegionIds, searchTerm } = regionData;
    
    // Draw labels for each region
    for (const regionId in regionSystems) {
        const systems = regionSystems[regionId];
        
        if (systems.length === 0) continue;
        
        // Find region definition
        const regionDef = regionDefinitions.find(r => r.id === regionId);
        if (!regionDef || !regionDef.name) continue;
        
        // If we're searching and this region matches, highlight it more prominently
        const isHighlighted = searchTerm && matchingRegionIds.has(regionId);
        
        // Find centroid of systems for label placement
        let centerX = 0, centerY = 0;
        systems.forEach(point => {
            centerX += point.x;
            centerY += point.y;
        });
        centerX /= systems.length;
        centerY /= systems.length;
        
        const screenX = centerX * scale + offsetX;
        const screenY = centerY * -1 * scale + offsetY;
        
        // Draw region name if enabled
        if (resourceFilterState["RegionalName"] !== false) {
            ctx.font = isHighlighted ? 'bold 16px Arial' : 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            
            const regionMetrics = ctx.measureText(regionDef.name);
            ctx.fillRect(screenX - regionMetrics.width / 2 - 4, screenY - 20, regionMetrics.width + 8, 20);
            
            ctx.fillStyle = isHighlighted ? '#FFFFFF' : regionDef.color;
            ctx.fillText(regionDef.name, screenX, screenY - 5);
        }
        
        // Draw statistics if enabled
        if (regionDisplayState) {
            let statsY = screenY + 15;
            const statsX = screenX;
            
            // System count
            if (regionDisplayState.systemCount && resourceFilterState["RegionalSystems"] !== false) {
                drawRegionStat(`Systems: ${systems.length}`, statsX, statsY);
                statsY += 15;
            }
            
            // Core system count
            if (regionDisplayState.coreSystemCount && resourceFilterState["RegionalCore"] !== false) {
                const coreCount = countCoreSystemsInRegion(systems.map(s => s.system));
                drawRegionStat(`Core Systems: ${coreCount}`, statsX, statsY);
                statsY += 15;
            }
            
            // KING system count
            if (resourceFilterState["RegionalKing"] !== false) {
                const kingCount = systems.filter(s => s.system && s.system.isKing).length;
                if (kingCount > 0) {
                    drawRegionStat(`KING Systems: ${kingCount}`, statsX, statsY);
                    statsY += 15;
                }
            }
            
            // Area calculation - only if we have hull data
            if (regionDisplayState.area && window.regionHullData && window.regionHullData[regionId] && 
                window.regionHullData[regionId].hull.length > 2 && resourceFilterState["RegionalArea"] !== false) {
                const area = calculatePolygonArea(window.regionHullData[regionId].hull);
                drawRegionStat(`Area: ${area.toFixed(2)}`, statsX, statsY);
                statsY += 15;
            }
            
            // Average distance calculation
            if (regionDisplayState.avgDistance && systems.length > 1 && resourceFilterState["RegionalDistance"] !== false) {
                let totalDistance = 0;
                let pairCount = 0;
                
                for (let i = 0; i < systems.length; i++) {
                    for (let j = i + 1; j < systems.length; j++) {
                        const dist = Math.sqrt(
                            (systems[i].x - systems[j].x) ** 2 + 
                            (systems[i].y - systems[j].y) ** 2
                        );
                        totalDistance += dist;
                        pairCount++;
                    }
                }
                
                const avgDistance = totalDistance / pairCount;
                drawRegionStat(`Avg Distance: ${avgDistance.toFixed(2)}`, statsX, statsY);
            }
        }
    }
}

// Draw region blobs using grid-based filling (optimized)
function drawRegionBlobs() {
    if (!ctx || !showRegions || !regionDefinitions || regionDefinitions.length === 0) return;
    
    // Check if region blob display is enabled
    const showRegionalBlob = resourceFilterState["RegionalBlob"] === true;
    if (!showRegionalBlob) return;
    
    const regionData = prepareRegionData();
    if (!regionData) return;
    
    const { regionSystems, matchingRegionIds, searchTerm } = regionData;
    
    // Get viewport bounds
    const viewBounds = getViewportGridBounds();
    
    // Adaptive grid size based on zoom level
    const baseGridSize = GALAXY_GRID_SPACING / 2;
    // Use coarser grid at lower zoom levels for performance
    const gridSize = scale < 2 ? baseGridSize * 2 : 
                    scale < 5 ? baseGridSize : 
                    baseGridSize / 2;
    
    const maxDistanceFromSystem = GALAXY_GRID_SPACING * 10;
    
    // First, create a set of grid cells we need to check (only those near systems)
    const cellsToCheck = new Set();
    const maxGridDistance = Math.ceil(maxDistanceFromSystem / gridSize);
    
    // For each region, add grid cells near its systems
    for (const regionId in regionSystems) {
        const systems = regionSystems[regionId];
        if (systems.length === 0) continue;
        
        systems.forEach(system => {
            const gridX = Math.floor(system.x / gridSize);
            const gridY = Math.floor(system.y / gridSize);
            
            // Add cells in a square around this system
            for (let dx = -maxGridDistance; dx <= maxGridDistance; dx++) {
                for (let dy = -maxGridDistance; dy <= maxGridDistance; dy++) {
                    const checkX = gridX + dx;
                    const checkY = gridY + dy;
                    
                    // Only add if within viewport bounds (with some margin)
                    if (checkX >= Math.floor((viewBounds.minX * GALAXY_GRID_SPACING) / gridSize) - 2 &&
                        checkX <= Math.ceil((viewBounds.maxX * GALAXY_GRID_SPACING) / gridSize) + 2 &&
                        checkY >= Math.floor((viewBounds.minY * GALAXY_GRID_SPACING) / gridSize) - 2 &&
                        checkY <= Math.ceil((viewBounds.maxY * GALAXY_GRID_SPACING) / gridSize) + 2) {
                        cellsToCheck.add(`${checkX},${checkY}`);
                    }
                }
            }
        });
    }
    
    // Now process only the cells we need to check
    const gridCellOwnership = new Map();
    
    cellsToCheck.forEach(cellKey => {
        const [gridX, gridY] = cellKey.split(',').map(Number);
        const cellCenterX = gridX * gridSize;
        const cellCenterY = gridY * gridSize;
        
        let closestRegion = null;
        let closestDistance = Infinity;
        
        // Find the closest region to this grid cell
        for (const regionId in regionSystems) {
            const systems = regionSystems[regionId];
            if (systems.length === 0) continue;
            
            // Calculate distance to nearest system in this region
            let minDistance = Infinity;
            for (let i = 0; i < systems.length; i++) {
                const system = systems[i];
                const dist = Math.sqrt(
                    (cellCenterX - system.x) ** 2 + 
                    (cellCenterY - system.y) ** 2
                );
                minDistance = Math.min(minDistance, dist);
                
                // Early exit if we found a very close system
                if (minDistance < gridSize) break;
            }
            
            if (minDistance < closestDistance && minDistance <= maxDistanceFromSystem) {
                closestDistance = minDistance;
                closestRegion = regionId;
            }
        }
        
        if (closestRegion) {
            gridCellOwnership.set(cellKey, {
                regionId: closestRegion,
                distance: closestDistance
            });
        }
    });
    
    // Batch drawing operations for performance
    ctx.save();
    
    // Draw all cells of the same region together
    regionDefinitions.forEach(regionDef => {
        const regionId = regionDef.id;
        
        // Skip if we have a search term and this region doesn't match
        if (searchTerm && !matchingRegionIds.has(regionId) && (!regionSystems[regionId] || regionSystems[regionId].length === 0)) return;
        
        const rgbColor = hexToRgb(regionDef.color);
        
        gridCellOwnership.forEach((ownership, key) => {
            if (ownership.regionId !== regionId) return;
            
            const [gridX, gridY] = key.split(',').map(Number);
            const cellX = gridX * gridSize;
            const cellY = gridY * gridSize;
            
            // Convert to screen coordinates
            const screenX1 = (cellX - gridSize/2) * scale + offsetX;
            const screenY1 = (cellY + gridSize/2) * -scale + offsetY;
            const width = gridSize * scale;
            const height = gridSize * scale;
            
            // Calculate opacity based on distance (fade out near edges)
            const normalizedDistance = ownership.distance / maxDistanceFromSystem;
            const opacity = 0.25 * (1 - normalizedDistance * 0.5);
            
            ctx.fillStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`;
            ctx.fillRect(screenX1, screenY1, width, height);
        });
    });
    
    ctx.restore();
}



// Original drawRegions function (renamed to avoid conflicts)
function drawRegions() {
    drawRegionPolygons();
    drawRegionLabels();
}

// Helper function to draw region stats with background
function drawRegionStat(text, x, y) {
    if (!ctx) return;
    
    ctx.font = '12px Arial';
    const metrics = ctx.measureText(text);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - metrics.width / 2 - 2, y - 12, metrics.width + 4, 15);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}

// Draw selection indicators
function drawSelectionIndicators() {
    if (!ctx) return;
    
    // Draw hover indicator
    if (hoveredSystem && !selectedSystems.includes(hoveredSystem)) {
        drawSelectionCircle(hoveredSystem, 'rgba(255, 255, 255, 0.3)', 15);
    }
    
    // Draw selection indicators for all selected systems
    selectedSystems.forEach(system => {
        drawSelectionCircle(system, 'rgba(255, 255, 0, 0.5)', 12);
    });
}

// Draw selection circle around a system
function drawSelectionCircle(system, color, radius) {
    if (!ctx || !system || !system.coordinates) return;
    
    const x = system.coordinates[0] * scale + offsetX;
    const y = system.coordinates[1] * -1 * scale + offsetY;
    
    if (system.isCore) {
        // Draw selection around crown for core systems
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // Draw a slightly larger outline around the crown
        const crownPoints = [
            { x: -0.5, y: -1.0 },   // Left bottom
            { x: -0.5, y: -1.3 },   // Left inner peak
            { x: -0.3, y: -1.1 },   // Inner dip
            { x: 0.0, y: -1.5 },    // Center peak
            { x: 0.3, y: -1.1 },    // Inner dip
            { x: 0.5, y: -1.3 },    // Right inner peak
            { x: 0.5, y: -1.0 }     // Right bottom
        ];
        
        // Adjust selection size for crown based on system size multiplier
        const selectionSize = 13 * Math.sqrt(systemSizeMultiplier); // Square root for milder scaling
        
        ctx.beginPath();
        ctx.moveTo(x + crownPoints[0].x * selectionSize, y + crownPoints[0].y * selectionSize);
        
        for (let i = 1; i < crownPoints.length; i++) {
            ctx.lineTo(x + crownPoints[i].x * selectionSize, y + crownPoints[i].y * selectionSize);
        }
        
        // Complete the shape with wider bottom
        ctx.lineTo(x + 0.6 * selectionSize, y + selectionSize * 0.2);
        ctx.lineTo(x - 0.6 * selectionSize, y + selectionSize * 0.2);
        ctx.closePath();
        
        ctx.stroke();
    } else {
        // Regular circle selection for normal systems
        // Adjust selection radius based on system size multiplier
        const selectionRadius = radius * Math.sqrt(systemSizeMultiplier); // Square root for milder scaling
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.arc(x, y, selectionRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Draw selection box
function drawSelectionBox() {
    if (!ctx) return;
    
    const width = selectionEnd.x - selectionStart.x;
    const height = selectionEnd.y - selectionStart.y;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
    ctx.rect(selectionStart.x, selectionStart.y, width, height);
    ctx.fill();
    ctx.stroke();
}

// Draw linking line when in linking mode
function drawLinkingLine() {
    if (!ctx || !linkSourceSystem || !linkSourceSystem.coordinates) return;
    
    const sourceX = linkSourceSystem.coordinates[0] * scale + offsetX;
    const sourceY = linkSourceSystem.coordinates[1] * -1 * scale + offsetY;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Draw system preview
function drawSystemPreview(system, autoCenter = false) {
    if (!previewCanvas || !previewCtx) return;
    
    // Get display dimensions (CSS pixels) accounting for DPI
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = previewCanvas.clientWidth || (previewCanvas.width / dpr);
    const displayHeight = previewCanvas.clientHeight || (previewCanvas.height / dpr);
    
    // Clear the entire canvas including scaled areas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    if (!system) {
        // Draw black background
        previewCtx.fillStyle = '#000000';
        previewCtx.fillRect(0, 0, displayWidth, displayHeight);
        
        // Save context state before text operations
        previewCtx.save();
        
        // Reset any transforms that might affect text positioning
        previewCtx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Apply DPI scaling manually
        previewCtx.scale(dpr, dpr);
        
        // Set text properties
        const message = 'No System Selected';
        previewCtx.font = 'bold 16px Arial';
        previewCtx.textAlign = 'center';
        previewCtx.textBaseline = 'middle';
        
        // Position at center of visible canvas
        const centerX = displayWidth / 2;
        const centerY = displayHeight / 2;
        
        // Draw text background
        const textWidth = previewCtx.measureText(message).width;
        previewCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        previewCtx.fillRect(
            centerX - textWidth/2 - 10, 
            centerY - 15, 
            textWidth + 20, 
            30
        );
        
        // Draw text
        previewCtx.fillStyle = '#FFFFFF';
        previewCtx.fillText(message, centerX, centerY);
        
        // Restore context state
        previewCtx.restore();
        return;
    }
    
    // Draw background (space)
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Calculate optimal scale if auto-centering
    if (autoCenter) {
        // Reset offsets for auto-centering
        previewOffsetX = 0;
        previewOffsetY = 0;
        
        // Calculate the bounds of the system
        const planets = system.planets || [];
        const stars = system.stars || []; // Define stars here for auto-centering calculation
        let maxOrbitRadius = 0;
        
        // Check if starbase exists and include its orbit
        if (system.starbase && system.starbase.tier > 0) {
            const starbaseRadius = calculateStarbaseOrbitRadius(stars, 1); // Use scale 1 for base calculation
            maxOrbitRadius = Math.max(maxOrbitRadius, starbaseRadius);
        }
        
        if (planets.length > 0) {
            // Find the outermost planet
            planets.forEach(planet => {
                if (planet.orbit !== undefined) {
                    const orbitRadius = 50 + planet.orbit * 40;
                    maxOrbitRadius = Math.max(maxOrbitRadius, orbitRadius);
                }
            });
        }
        
        // If no planets and no starbase, use a default radius
        if (maxOrbitRadius === 0) {
            maxOrbitRadius = 100;
        }
        
        // Add padding for planet size and labels
        const systemRadius = maxOrbitRadius + 40;
        
        // Calculate scale to fit the system in the canvas with padding
        const padding = 60; // Leave space for labels
        const availableWidth = displayWidth - padding * 2;
        const availableHeight = displayHeight - padding * 2;
        
        const scaleX = availableWidth / (systemRadius * 2);
        const scaleY = availableHeight / (systemRadius * 2);
        
        // Use the smaller scale to ensure it fits
        previewScale = Math.min(scaleX, scaleY, 2.0); // Cap at 2.0 for reasonable size
        
        // Ensure minimum scale
        previewScale = Math.max(previewScale, 0.5);
    }
    
    // Calculate system center
    // Note: setupHighDPICanvas already handles DPI scaling, so we work in CSS pixels
    const centerX = displayWidth / 2 + previewOffsetX;
    const centerY = displayHeight / 2 + previewOffsetY;
    
    // Prepare scale for drawing
    let effectiveScale = previewScale;
    
    // Draw stars (1-3 stars)
    const stars = system.stars || [];
    if (stars.length > 0) {
        drawStarsInPreview(stars, centerX, centerY, effectiveScale);
    } else if (system.star) {
        // Legacy support for old format with single star
        drawStarsInPreview([system.star], centerX, centerY, effectiveScale);
    }
    
    // Draw orbital paths
    const planets = system.planets || [];
    if (planets.length > 0) {
        drawOrbitPathsInPreview(planets, centerX, centerY, effectiveScale);
    }
    
    // Draw starbase orbit if tier > 0
    if (system.starbase && system.starbase.tier > 0) {
        try {
            drawStarbaseOrbitInPreview(stars, centerX, centerY, effectiveScale);
        } catch (error) {
            console.error('Error drawing starbase orbit:', error);
        }
    }
    
    // Draw planets with resource labels if in expanded view
    if (planets.length > 0) {
        drawPlanetsInPreview(planets, centerX, centerY, effectiveScale, isSystemPreviewExpanded);
    }
    
    // Draw starbase if tier > 0
    if (system.starbase && system.starbase.tier > 0) {
        try {
            drawStarbaseInPreview(system.starbase, stars, centerX, centerY, effectiveScale);
        } catch (error) {
            console.error('Error drawing starbase:', error);
        }
    }
    
    // Draw system name at the top left
    previewCtx.fillStyle = '#FFFFFF';
    previewCtx.font = 'bold 16px Arial';
    previewCtx.textAlign = 'left';
    previewCtx.fillText(system.name || 'Unnamed System', 15, 25);
    
    // Draw faction if available
    if (system.faction) {
        previewCtx.fillStyle = getFactionColor(system.faction);
        previewCtx.font = '14px Arial';
        previewCtx.fillText(system.faction, 15, 45);
    }
    
    // Draw Core system indicator if applicable
    if (system.isCore) {
        previewCtx.fillStyle = '#FFD700'; // Gold
        previewCtx.font = 'bold 14px Arial';
        previewCtx.fillText('CORE', 15, 65);
    }
    
    // Draw coordinates at the bottom
    if (system.coordinates && system.coordinates.length === 2) {
        previewCtx.fillStyle = '#AAAAAA';
        previewCtx.font = '12px Arial';
        previewCtx.textAlign = 'center';
        previewCtx.fillText(
            `Coordinates: (${system.coordinates[0].toFixed(2)}, ${system.coordinates[1].toFixed(2)})`,
            displayWidth / 2,
            displayHeight - 15
        );
    }
}

// Draw stars in the system preview
function drawStarsInPreview(stars, centerX, centerY, scale) {
    if (!previewCtx) return;
    
    // Helper function to calculate star position
    function getStarPosition(index, count) {
        if (count === 1) {
            return { x: centerX, y: centerY };
        }
        
        const radius = 30 * scale;
        const angle = (index / count) * Math.PI * 2;
        
        return {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
        };
    }
    
    stars.forEach((star, index) => {
        const pos = getStarPosition(index, stars.length);
        const starColor = getStarColor(star);
        const starSize = ((star.scale || 1) * 25) * scale;
        
        // Draw star glow
        const gradient = previewCtx.createRadialGradient(
            pos.x, pos.y, 0,
            pos.x, pos.y, starSize * 2
        );
        gradient.addColorStop(0, starColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        previewCtx.beginPath();
        previewCtx.fillStyle = gradient;
        previewCtx.arc(pos.x, pos.y, starSize * 2, 0, Math.PI * 2);
        previewCtx.fill();
        
        // Draw star core
        previewCtx.beginPath();
        previewCtx.fillStyle = starColor;
        previewCtx.arc(pos.x, pos.y, starSize, 0, Math.PI * 2);
        previewCtx.fill();
        
        // Draw star name
        if (star.name) {
            previewCtx.fillStyle = '#FFFFFF';
            previewCtx.font = '12px Arial';
            previewCtx.textAlign = 'center';
            
            // Position text below or above star based on position
            const textY = pos.y > centerY ? pos.y + starSize + 20 : pos.y - starSize - 10;
            previewCtx.fillText(star.name, pos.x, textY);
        }
    });
}

// Draw orbital paths in the system preview
function drawOrbitPathsInPreview(planets, centerX, centerY, scale) {
    if (!previewCtx) return;
    
    previewCtx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    previewCtx.lineWidth = 1;
    
    planets.forEach(planet => {
        if (planet.orbit === undefined) return;
        
        const orbitRadius = (50 + planet.orbit * 40) * scale;
        
        previewCtx.beginPath();
        previewCtx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        previewCtx.stroke();
    });
}

// Draw planets in the system preview
function drawPlanetsInPreview(planets, centerX, centerY, scale, showResourceLabels = false) {
    if (!previewCtx) return;
    
    planets.forEach(planet => {
        if (planet.orbit === undefined) return;
        
        // Calculate planet position based on orbit
        const orbitRadius = (50 + planet.orbit * 40) * scale;
        const orbitAngle = ((planet.angle !== undefined ? planet.angle : Math.random() * 360) * Math.PI) / 180;
        
        const planetX = centerX + Math.cos(orbitAngle) * orbitRadius;
        const planetY = centerY + Math.sin(orbitAngle) * orbitRadius;
        
        // Determine planet size and color
        const planetSize = ((planet.scale || 1) * 10) * scale;
        let planetColor = getPlanetColor(planet.type);
        
        // Draw planet
        previewCtx.beginPath();
        previewCtx.fillStyle = planetColor;
        previewCtx.arc(planetX, planetY, planetSize, 0, Math.PI * 2);
        previewCtx.fill();
        
        // Draw planet outline
        previewCtx.strokeStyle = '#444444';
        previewCtx.lineWidth = 1;
        previewCtx.stroke();
        
        // Draw planet name if available
        if (planet.name) {
            previewCtx.fillStyle = '#DDDDDD';
            previewCtx.font = '12px Arial';
            previewCtx.textAlign = 'center';
            previewCtx.fillText(planet.name, planetX, planetY - planetSize - 5);
        }
        
        // Draw planet type if available and different from name
        const planetTypeName = getPlanetTypeName(planet.type);
        if (planetTypeName && planetTypeName !== planet.name) {
            previewCtx.fillStyle = '#AAAAAA';
            previewCtx.font = '10px Arial';
            previewCtx.fillText(planetTypeName, planetX, planetY + planetSize + 10);
        }
        
        // Draw resource labels if in expanded view
        if (showResourceLabels && planet.resources && planet.resources.length > 0) {
            drawPlanetResourceLabels(planet, planetX, planetY, planetSize, scale);
        }
    });
}

// Draw resource labels for a planet in the system preview
function drawPlanetResourceLabels(planet, planetX, planetY, planetSize, scale) {
    if (!previewCtx || !planet.resources || planet.resources.length === 0) return;
    
    // Filter resources based on resourceFilterState
    const filteredResources = planet.resources.filter(resource => 
        resourceFilterState[resource.name] !== false
    );
    
    if (filteredResources.length === 0) return;
    
    // Text properties - scale font size appropriately
    const fontSize = Math.min(12, Math.max(8, 10 * Math.sqrt(scale)));
    previewCtx.font = `${fontSize}px Arial`;
    previewCtx.textAlign = 'center';
    
    // Start position below the planet type
    let labelY = planetY + planetSize + 25;
    
    // Draw each resource label
    filteredResources.forEach((resource, index) => {
        // Add richness value to the resource name
        const resourceName = resource.name || 'Unknown Resource';
        const richness = resource.richness || 1;
        const displayText = `${resourceName} (R${richness.toFixed(1)})`;
        const textWidth = previewCtx.measureText(displayText).width;
        
        // Get resource color
        const resourceColor = RESOURCE_COLORS[resourceName.toLowerCase()] || RESOURCE_COLORS.default;
        
        // Background for text
        const bgPadding = 3;
        const bgHeight = fontSize + 2;
        previewCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        previewCtx.fillRect(
            planetX - textWidth / 2 - bgPadding, 
            labelY - bgHeight / 2 - 1, 
            textWidth + bgPadding * 2, 
            bgHeight
        );
        
        // Draw the resource text
        previewCtx.fillStyle = resourceColor;
        previewCtx.fillText(displayText, planetX, labelY);
        
        // Move down for next resource
        labelY += fontSize + 4;
    });
}

// Calculate starbase orbit radius based on star configuration
function calculateStarbaseOrbitRadius(stars, scale) {
    let baseRadius = 30 * scale; // Default radius
    
    if (!stars || stars.length === 0) {
        return baseRadius;
    }
    
    // Calculate the maximum extent of the star system
    if (stars.length === 1) {
        // Single star - orbit should be outside the star size + glow
        const starSize = ((stars[0].scale || 1) * 25) * scale;
        baseRadius = (starSize * 2) + (15 * scale); // Star size + glow + padding
    } else {
        // Multiple stars - orbit should be outside the star ring + largest star
        const starRingRadius = 30 * scale;
        let maxStarSize = 0;
        
        stars.forEach(star => {
            const starSize = ((star.scale || 1) * 25) * scale;
            maxStarSize = Math.max(maxStarSize, starSize);
        });
        
        baseRadius = starRingRadius + maxStarSize + (15 * scale); // Ring + star size + padding
    }
    
    return baseRadius;
}

// Draw starbase orbit in the system preview
function drawStarbaseOrbitInPreview(stars, centerX, centerY, scale) {
    if (!previewCtx) return;
    
    const orbitRadius = calculateStarbaseOrbitRadius(stars, scale);
    
    previewCtx.strokeStyle = 'rgba(0, 191, 255, 0.3)'; // Deep Sky Blue with transparency
    previewCtx.lineWidth = 2;
    previewCtx.setLineDash([5, 5]); // Dashed line to differentiate from planet orbits
    
    previewCtx.beginPath();
    previewCtx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    previewCtx.stroke();
    
    previewCtx.setLineDash([]); // Reset line dash
}

// Draw starbase in the system preview
function drawStarbaseInPreview(starbase, stars, centerX, centerY, scale) {
    if (!previewCtx) return;
    
    // Position starbase at a fixed angle on its orbit
    const orbitRadius = calculateStarbaseOrbitRadius(stars, scale);
    const angle = -Math.PI / 2; // Top of the orbit (12 o'clock position)
    
    const starbaseX = centerX + Math.cos(angle) * orbitRadius;
    const starbaseY = centerY + Math.sin(angle) * orbitRadius;
    
    const size = 8 * scale;
    
    // Draw starbase as a hexagon to differentiate from circular planets
    previewCtx.save();
    previewCtx.translate(starbaseX, starbaseY);
    
    // Draw hexagon shape
    previewCtx.beginPath();
    for (let i = 0; i < 6; i++) {
        const hexAngle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const x = Math.cos(hexAngle) * size;
        const y = Math.sin(hexAngle) * size;
        if (i === 0) {
            previewCtx.moveTo(x, y);
        } else {
            previewCtx.lineTo(x, y);
        }
    }
    previewCtx.closePath();
    
    // Fill with tier-based color gradient
    const gradient = previewCtx.createRadialGradient(0, 0, 0, 0, 0, size);
    const baseColor = '#00BFFF'; // Deep Sky Blue
    const tierIntensity = starbase.tier / 5; // Normalize tier to 0-1
    
    gradient.addColorStop(0, `rgba(0, 191, 255, ${0.8 + tierIntensity * 0.2})`);
    gradient.addColorStop(1, `rgba(0, 191, 255, ${0.3 + tierIntensity * 0.3})`);
    
    previewCtx.fillStyle = gradient;
    previewCtx.fill();
    
    // Draw outline
    previewCtx.strokeStyle = '#00BFFF';
    previewCtx.lineWidth = 2;
    previewCtx.stroke();
    
    // Draw tier number in center
    previewCtx.fillStyle = '#FFFFFF';
    previewCtx.font = `bold ${10 * scale}px Arial`;
    previewCtx.textAlign = 'center';
    previewCtx.textBaseline = 'middle';
    previewCtx.fillText(starbase.tier.toString(), 0, 0);
    
    previewCtx.restore();
    
    // Draw label
    previewCtx.fillStyle = '#00BFFF';
    previewCtx.font = '12px Arial';
    previewCtx.textAlign = 'center';
    previewCtx.fillText(`Starbase T${starbase.tier}`, starbaseX, starbaseY - size - 10);
}

// Get planet type name from type ID
function getPlanetTypeName(typeId) {
    if (typeof typeId === 'string') return typeId;
    
    const planetType = PLANET_TYPES.find(p => p.type === typeId);
    return planetType ? planetType.name : 'Unknown';
}

// Helper for galaxy canvas coordinates - adjusted for DPI
function getGalaxyCanvasCoords(event) {
    if (!canvas) return { x:0, y:0 };
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left),
        y: (event.clientY - rect.top)
    };
}

// Toggle expanded system preview
let isSystemPreviewExpanded = false;
let expandedPreviewSystem = null;
let originalGalaxyCanvasParent = null;
let originalPreviewCanvasParent = null;

function toggleExpandedSystemPreview(system) {
    // If no system provided, use the currently expanded system or selected system
    if (!system && isSystemPreviewExpanded) {
        system = expandedPreviewSystem;
    } else if (!system && selectedSystems.length === 1) {
        system = selectedSystems[0];
    } else if (!system) {
        return;
    }
    
    const galaxyContainer = document.getElementById('galaxyContainer');
    const detailsPanel = document.getElementById('detailsPanel');
    const systemPreviewContainer = document.querySelector('.system-preview-container');
    const systemTab = document.getElementById('system-tab');
    const expandBtn = document.getElementById('expandPreviewBtn');
    
    if (!isSystemPreviewExpanded) {
        // Expand the preview
        isSystemPreviewExpanded = true;
        expandedPreviewSystem = system;
        window.isSystemPreviewExpanded = true; // Ensure global state is updated
        
        // Store original parents
        originalGalaxyCanvasParent = canvas.parentElement;
        originalPreviewCanvasParent = previewCanvas.parentElement;
        
        // Hide the galaxy canvas
        canvas.style.display = 'none';
        
        // Create expanded preview container
        const expandedContainer = document.createElement('div');
        expandedContainer.id = 'expandedSystemPreview';
        expandedContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            background-color: #000;
            display: flex;
            flex-direction: column;
        `;
        
        // Create header with minimize button
        const header = document.createElement('div');
        header.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
            display: flex;
            gap: 8px;
        `;
        
        // Add system name display
        const systemNameDisplay = document.createElement('div');
        systemNameDisplay.style.cssText = `
            background: rgba(30, 30, 30, 0.9);
            padding: 8px 16px;
            border-radius: 4px;
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        systemNameDisplay.innerHTML = `
            <span>${system.name}</span>
            ${system.faction ? `<span style="color: ${getFactionColor(system.faction)}; font-weight: bold;">${system.faction}</span>` : ''}
        `;
        
        // Create minimize button
        const minimizeBtn = document.createElement('button');
        minimizeBtn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 4px;
            background: rgba(255,255,255,0.15);
            border: none;
            cursor: pointer;
            font-size: 0.9em;
            color: #fff;
        `;
        minimizeBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
            </svg>
            Minimize
        `;
        minimizeBtn.onclick = () => toggleExpandedSystemPreview();
        
        header.appendChild(systemNameDisplay);
        header.appendChild(minimizeBtn);
        
        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
        `;
        
        // Move preview canvas to expanded container
        canvasContainer.appendChild(previewCanvas);
        expandedContainer.appendChild(header);
        expandedContainer.appendChild(canvasContainer);
        
        // Replace galaxy container content
        galaxyContainer.innerHTML = '';
        galaxyContainer.appendChild(expandedContainer);
        
        // Update canvas size
        setTimeout(() => {
            const rect = canvasContainer.getBoundingClientRect();
            previewCanvas.style.width = rect.width + 'px';
            previewCanvas.style.height = rect.height + 'px';
            setupHighDPICanvas(previewCanvas, previewCtx);
            
            // Force immediate redraw with auto-center
            requestAnimationFrame(() => {
                drawSystemPreview(system, true);
            });
        }, 10);
        
        // Update button text
        if (expandBtn) {
            expandBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
                </svg>
                Minimize
            `;
        }
    } else {
        // Minimize back to normal
        isSystemPreviewExpanded = false;
        window.isSystemPreviewExpanded = false; // Ensure global state is updated
        const systemToRedraw = expandedPreviewSystem || system;
        
        // Restore canvas to original container
        const expandedContainer = document.getElementById('expandedSystemPreview');
        if (expandedContainer) {
            expandedContainer.remove();
        }
        
        // Restore galaxy canvas
        galaxyContainer.innerHTML = '';
        galaxyContainer.appendChild(canvas);
        canvas.style.display = 'block';
        
        // Restore preview canvas to its original location
        const previewWrapper = document.querySelector('.system-preview-wrapper');
        if (previewWrapper && previewCanvas) {
            previewWrapper.appendChild(previewCanvas);
            
            // Reset preview canvas size
            previewCanvas.style.width = '100%';
            previewCanvas.style.height = '300px';
            
            // Use setTimeout to ensure DOM updates are complete
            setTimeout(() => {
                setupHighDPICanvas(previewCanvas, previewCtx);
                
                // Redraw the system preview with auto-center
                if (systemToRedraw) {
                    drawSystemPreview(systemToRedraw, true);
                }
            }, 10);
        }
        
        // Update button text
        if (expandBtn) {
            expandBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
                Expand
            `;
        }
        
        // Redraw galaxy canvas
        updateCanvasSize();
        drawGalaxyMap();
        
        expandedPreviewSystem = null;
    }
}

// Make canvas drawing functions globally available
window.initCanvas = initCanvas;
window.updateCanvasSize = updateCanvasSize;
window.centerMapView = centerMapView;
window.drawGalaxyMap = drawGalaxyMap;
window.drawSystemPreview = drawSystemPreview;
window.findSystemAtCoords = findSystemAtCoords;
window.screenToMapCoords = screenToMapCoords;
window.getGalaxyCanvasCoords = getGalaxyCanvasCoords;
window.calculateConvexHull = calculateConvexHull;
window.calculatePolygonArea = calculatePolygonArea;
window.setupHighDPICanvas = setupHighDPICanvas;
window.drawRegionPolygons = drawRegionPolygons;
window.drawRegionLabels = drawRegionLabels;
window.drawRegions = drawRegions;
window.toggleExpandedSystemPreview = toggleExpandedSystemPreview;
window.drawResourceHeatmap = drawResourceHeatmap;
window.getHeatmapColor = getHeatmapColor;
window.drawHeatmapLegend = drawHeatmapLegend;
window.getViewportGridBounds = getViewportGridBounds;

// Draw resource heatmap
function drawResourceHeatmap() {
    if (!ctx || !mapData || mapData.length === 0) return;
    
    // Get visible resources from filter state
    const visibleResources = Object.keys(resourceFilterState).filter(key => {
        // Only include if it's not a system/region label filter and is visible (not false)
        return !['SystemName', 'FactionLabel', 'PlanetCount', 'StarCount', 'LockStatus', 
                                     'RegionalPolygon', 'RegionalBlob', 'RegionalName', 'RegionalSystems', 'RegionalCore', 
                 'RegionalArea', 'RegionalDistance', 'RegionalIndicator', 'Planets'].includes(key) && 
               resourceFilterState[key] !== false;
    });
    
    // If no visible resources, don't draw heatmap
    if (visibleResources.length === 0) return;
    
    // Define grid parameters - use exact grid spacing for 1:1 grid cells
    const gridSize = GALAXY_GRID_SPACING;
    const gridCells = {}; // Store cell data as "x,y" keys
    
    // Process each system to calculate abundance scores and assign to grid cells
    mapData.forEach(system => {
        if (!system.coordinates) return; // Skip systems without coordinates
        
        // Skip systems with no planets (this was a bug in previous version)
        if (!system.planets || system.planets.length === 0) {
            if (heatmapDebugMode) {
                console.log(`System ${system.name || system.key} has no planets, skipping for heatmap`);
            }
            return;
        }
        
        // Track resources by type for this cell to allow multiplication of colors
        const resourceTypeScores = {};
        let resourceTypesCount = 0;
        let totalCombinedAbundanceScore = 0; // Combined abundance across all resources
        
        // Process all planets in the system
        system.planets.forEach(planet => {
            if (!planet.resources) return;
            
            // Calculate abundance score for filtered resources
            planet.resources.forEach(resource => {
                // Skip if resource is not in visible resources filter
                if (!visibleResources.includes(resource.name)) return;
                
                // Convert richness to abundance (higher richness = higher abundance)
                // Richness values typically range from 0.1 to 10
                const abundanceScore = resource.richness ? resource.richness : 1;
                
                // Add to the combined total abundance
                totalCombinedAbundanceScore += abundanceScore;
                
                // Store scores by resource name for this system
                if (!resourceTypeScores[resource.name]) {
                    resourceTypeScores[resource.name] = {
                        totalScore: abundanceScore,
                        count: 1
                    };
                    resourceTypesCount++;
                } else {
                    resourceTypeScores[resource.name].totalScore += abundanceScore;
                    resourceTypeScores[resource.name].count++;
                }
            });
        });
        
        // If system has resources, add to grid cell
        if (resourceTypesCount > 0) {
            // Calculate coordinates for the grid cell
            const sysX = system.coordinates[0];
            const sysY = system.coordinates[1];
            
            // For X coordinates, normal grid cell calculation
            const cellX = Math.floor(sysX / gridSize);
            
            // For Y coordinates:
            // For both positive and negative Y values, shift up by 1 cell
            // This ensures grid cells align with systems properly
            const cellY = Math.floor(sysY / gridSize) + 1;
            
            const cellKey = `${cellX},${cellY}`;
            
            if (heatmapDebugMode) {
                console.log(`System "${system.name || system.key}" at (${sysX.toFixed(2)}, ${sysY.toFixed(2)}) maps to cell (${cellX}, ${cellY})`);
                console.log(`Cell bounds: X: ${cellX * gridSize} to ${(cellX + 1) * gridSize}, Y: ${cellY * gridSize} to ${(cellY + 1) * gridSize}`);
            }
            
            // Add system score to grid cell or create new cell
            if (!gridCells[cellKey]) {
                gridCells[cellKey] = {
                    x: cellX,
                    y: cellY,
                    minX: cellX * gridSize,
                    maxX: (cellX + 1) * gridSize, 
                    minY: cellY * gridSize,
                    maxY: (cellY + 1) * gridSize,
                    sysX: sysX,
                    sysY: sysY,
                    // Use the combined abundance score rather than the average
                    abundanceScore: totalCombinedAbundanceScore,
                    count: 1,
                    systems: [system.name || system.key],
                    resourceTypeScores: resourceTypeScores,
                    resourceTypesCount: resourceTypesCount
                };
            } else {
                // Add the combined abundance score to the cell
                gridCells[cellKey].abundanceScore += totalCombinedAbundanceScore;
                gridCells[cellKey].count++;
                gridCells[cellKey].systems.push(system.name || system.key);
                
                // Merge resource type scores
                for (const [resourceName, scoreData] of Object.entries(resourceTypeScores)) {
                    if (!gridCells[cellKey].resourceTypeScores[resourceName]) {
                        gridCells[cellKey].resourceTypeScores[resourceName] = { ...scoreData };
                        gridCells[cellKey].resourceTypesCount++;
                    } else {
                        gridCells[cellKey].resourceTypeScores[resourceName].totalScore += scoreData.totalScore;
                        gridCells[cellKey].resourceTypeScores[resourceName].count += scoreData.count;
                    }
                }
            }
        }
    });
    
    // Find min and max abundance scores for the legend
    let minScore = Infinity;
    let maxScore = -Infinity;
    
    Object.values(gridCells).forEach(cell => {
        if (cell.abundanceScore < minScore) minScore = cell.abundanceScore;
        if (cell.abundanceScore > maxScore) maxScore = cell.abundanceScore;
    });
    
    // If no valid scores, return
    if (minScore === Infinity || maxScore === -Infinity) return;
    
    if (heatmapDebugMode) {
        console.log(`Heatmap grid cells: ${Object.keys(gridCells).length}, Min score: ${minScore.toFixed(2)}, Max score: ${maxScore.toFixed(2)}`);
    }
    
    // Draw grid cells
    ctx.save();
    
    // Draw with slight transparency to show systems underneath
    ctx.globalAlpha = 0.7;
    
    // Fill in all grid cells in the visible area first
    // This ensures we don't miss any grid spaces
    const viewportBounds = getViewportGridBounds();
    
    if (heatmapDebugMode) {
        console.log("Viewport grid bounds:", viewportBounds);
        console.log("Grid cells with data:", Object.keys(gridCells).length);
    }
    
    // First pass: Draw grid lines for the entire visible grid
    // Use the same style as the main grid
    if (showGrid) {
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.5;
        
        // Draw vertical grid lines
        for (let gx = viewportBounds.minX; gx <= viewportBounds.maxX + 1; gx++) {
            const mapX = gx * gridSize;
            const x = mapX * scale + offsetX;
            
            ctx.beginPath();
            
            // Special styling for Y-axis (where x = 0)
            if (gx === 0) {
                ctx.strokeStyle = '#555555';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 3]);
            } else {
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([]);
            }
            
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let gy = viewportBounds.minY; gy <= viewportBounds.maxY + 1; gy++) {
            const mapY = gy * gridSize;
            const y = mapY * -1 * scale + offsetY;
            
            ctx.beginPath();
            
            // Special styling for X-axis (where y = 0)
            if (gy === 0) {
                ctx.strokeStyle = '#555555';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 3]);
            } else {
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([]);
            }
            
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // Second pass: Draw background cells for empty grid spaces
    for (let gx = viewportBounds.minX; gx <= viewportBounds.maxX; gx++) {
        for (let gy = viewportBounds.minY; gy <= viewportBounds.maxY; gy++) {
            const cellKey = `${gx},${gy}`;
            
            // Only draw background for cells that don't have resource data
            if (!gridCells[cellKey]) {
                // Calculate map coordinates for this grid cell
                const mapX = gx * gridSize;
                const mapY = gy * gridSize;
                
                // Convert to screen coordinates properly
                const x = mapX * scale + offsetX;
                const y = mapY * -1 * scale + offsetY;
                const size = gridSize * scale;
                
                // Draw an empty grid cell with very dark background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(x, y, size, size);
                
                // Debug grid coordinates if in debug mode
                if (heatmapDebugMode) {
                    ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
                    ctx.font = '8px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${gx},${gy}`, x + 2, y + 10);
                    
                    // Show the actual coordinate bounds for this cell
                    const minX = gx * gridSize;
                    const maxX = (gx + 1) * gridSize;
                    const minY = gy * gridSize;
                    const maxY = (gy + 1) * gridSize;
                    ctx.fillText(`${minX}→${maxX}, ${minY}→${maxY}`, x + 2, y + 20);
                }
            }
        }
    }
    
    // Third pass: Draw cells with resource data
    // Process high-abundance cells last to ensure they're on top
    const sortedCells = Object.values(gridCells).sort((a, b) => a.abundanceScore - b.abundanceScore);
    
    // Use fixed thresholds for abundance scale
    // These define absolute abundance scores that map to different colors
    const ABUNDANCE_SCALE = {
        LOW: 5,       // Blue
        MEDIUM: 15,   // Green
        HIGH: 30,     // Yellow
        VERY_HIGH: 50, // Orange
        EXTREME: 75,  // Red
        ULTRA: 100    // Bright Red
    };
    
    sortedCells.forEach(cell => {
        // Calculate map coordinates for this grid cell
        const mapX = cell.x * gridSize;
        const mapY = cell.y * gridSize;
        
        // Convert to screen coordinates properly
        const x = mapX * scale + offsetX;
        const y = mapY * -1 * scale + offsetY;
        const size = gridSize * scale;
        
        // Use absolute abundance score instead of relative normalization
        // This maps fixed abundance ranges to specific colors
        let normalizedScore;
        
        if (cell.abundanceScore <= ABUNDANCE_SCALE.LOW) {
            // 0-5: Blue range (0.0-0.16)
            normalizedScore = (cell.abundanceScore / ABUNDANCE_SCALE.LOW) * 0.16;
        } else if (cell.abundanceScore <= ABUNDANCE_SCALE.MEDIUM) {
            // 5-15: Blue to green range (0.16-0.33)
            normalizedScore = 0.16 + ((cell.abundanceScore - ABUNDANCE_SCALE.LOW) / 
                             (ABUNDANCE_SCALE.MEDIUM - ABUNDANCE_SCALE.LOW)) * 0.17;
        } else if (cell.abundanceScore <= ABUNDANCE_SCALE.HIGH) {
            // 15-30: Green to yellow range (0.33-0.5)
            normalizedScore = 0.33 + ((cell.abundanceScore - ABUNDANCE_SCALE.MEDIUM) / 
                             (ABUNDANCE_SCALE.HIGH - ABUNDANCE_SCALE.MEDIUM)) * 0.17;
        } else if (cell.abundanceScore <= ABUNDANCE_SCALE.VERY_HIGH) {
            // 30-50: Yellow to orange range (0.5-0.67)
            normalizedScore = 0.5 + ((cell.abundanceScore - ABUNDANCE_SCALE.HIGH) / 
                             (ABUNDANCE_SCALE.VERY_HIGH - ABUNDANCE_SCALE.HIGH)) * 0.17;
        } else if (cell.abundanceScore <= ABUNDANCE_SCALE.EXTREME) {
            // 50-75: Orange to red range (0.67-0.83)
            normalizedScore = 0.67 + ((cell.abundanceScore - ABUNDANCE_SCALE.VERY_HIGH) / 
                             (ABUNDANCE_SCALE.EXTREME - ABUNDANCE_SCALE.VERY_HIGH)) * 0.16;
        } else {
            // 75+: Red to bright red range (0.83-1.0)
            // Cap at 1.0 for scores above ULTRA
            const cappedScore = Math.min(cell.abundanceScore, ABUNDANCE_SCALE.ULTRA);
            normalizedScore = 0.83 + ((cappedScore - ABUNDANCE_SCALE.EXTREME) / 
                             (ABUNDANCE_SCALE.ULTRA - ABUNDANCE_SCALE.EXTREME)) * 0.17;
        }
        
        // Get color based on normalized score (blue to red heat scale)
        const baseColor = getHeatmapColor(normalizedScore);
        
        // Modify color intensity based on the number of different resource types
        // When multiple resource types are present, we intensify the color
        let color = baseColor;
        if (cell.resourceTypesCount > 1) {
            // Extract RGB components from the base color
            const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                
                // Apply a multiplier effect based on resource type count
                // Enhance the intensity factor for more dramatic effects
                const intensityFactor = Math.min(1.0 + ((cell.resourceTypesCount - 1) * 0.25), 2.0);
                
                // Intensify the color (brighten it)
                const newR = Math.min(Math.floor(r * intensityFactor), 255);
                const newG = Math.min(Math.floor(g * intensityFactor), 255);
                const newB = Math.min(Math.floor(b * intensityFactor), 255);
                
                color = `rgb(${newR}, ${newG}, ${newB})`;
            }
        }
        
        // For extremely high abundance (over EXTREME), add a white glow/pulse effect
        if (cell.abundanceScore > ABUNDANCE_SCALE.EXTREME) {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 8;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        // Draw filled square
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        // Reset shadow for text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Debug info for cell
        if (cell.systems && cell.systems.length > 0 && heatmapDebugMode) {
            // In debug mode, show the system name and coordinates
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            
            const shortName = cell.systems[0].substring(0, 6);
            ctx.fillText(shortName, x + size/2, y + size/2);
            ctx.fillText(`${cell.x},${cell.y}`, x + size/2, y + size/2 + 10);
            
            // Show the system coordinate and resource info
            ctx.fillText(`Sys: (${cell.sysX.toFixed(1)},${cell.sysY.toFixed(1)})`, x + size/2, y + size/2 + 20);
            ctx.fillText(`Resources: ${cell.resourceTypesCount}  Score: ${cell.abundanceScore.toFixed(1)}`, x + size/2, y + size/2 + 30);
            
            // Draw a marker where the system is
            const sysScreenX = cell.sysX * scale + offsetX;
            const sysScreenY = cell.sysY * -1 * scale + offsetY;
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(sysScreenX, sysScreenY, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Restore original alpha
    ctx.restore();
    
    // Draw heatmap legend with absolute scale instead of min/max
    drawHeatmapLegend(ABUNDANCE_SCALE.LOW, ABUNDANCE_SCALE.ULTRA);
}

// Get color for a heatmap value (normalized 0-1)
function getHeatmapColor(value) {
    // Enhanced color gradient from blue (low) to bright red (very high)
    let r, g, b;
    
    if (value < 0.16) {
        // Blue to cyan (0-0.16)
        const t = value * 6.25; // Scale to 0-1 for this segment
        r = 0;
        g = Math.floor(255 * t);
        b = 255;
    } else if (value < 0.33) {
        // Cyan to green (0.16-0.33)
        const t = (value - 0.16) * 5.88; // Scale to 0-1 for this segment
        r = 0;
        g = 255;
        b = Math.floor(255 * (1 - t));
    } else if (value < 0.5) {
        // Green to yellow (0.33-0.5)
        const t = (value - 0.33) * 5.88; // Scale to 0-1 for this segment
        r = Math.floor(255 * t);
        g = 255;
        b = 0;
    } else if (value < 0.67) {
        // Yellow to orange (0.5-0.67)
        const t = (value - 0.5) * 5.88; // Scale to 0-1 for this segment
        r = 255;
        g = Math.floor(255 * (1 - t * 0.5)); // Only reduce green by 50%
        b = 0;
    } else if (value < 0.83) {
        // Orange to red (0.67-0.83)
        const t = (value - 0.67) * 6.25; // Scale to 0-1 for this segment
        r = 255;
        g = Math.floor(127 * (1 - t)); // Finish reducing green
        b = 0;
    } else {
        // Red to bright red/white (0.83-1.0)
        const t = (value - 0.83) * 5.88; // Scale to 0-1 for this segment
        r = 255;
        g = Math.floor(t * 100); // Add a little green for brightness
        b = Math.floor(t * 100); // Add a little blue for brightness
    }
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Draw heatmap legend
function drawHeatmapLegend(minValue, maxValue) {
    if (!ctx) return;
    
    // Save current context state
    ctx.save();
    
    // Ensure the legend is drawn on top of everything
    // We'll use a higher global alpha to make it more visible
    ctx.globalAlpha = 1.0;
    
    const legendWidth = 360; // Make wider to fit more labels
    const legendHeight = 80; // Increased height further
    const barHeight = 30; 
    const padding = 15;
    
    // Position in top right with padding from edges
    const legendX = ctx.canvas.width / devicePixelRatio - legendWidth - padding;
    const legendY = padding;
    
    // Draw legend background with border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; // More opaque background
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // More visible border
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
    
    // Draw legend title at the top
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Resource Abundance Heatmap', legendX + legendWidth/2, legendY + 18);
    
    // Add subtitle about multiple resources
    ctx.font = '11px Arial';
    ctx.fillText('Brighter colors indicate multiple resource types', legendX + legendWidth/2, legendY + 35);
    
    // Draw color gradient bar
    const colorBarWidth = legendWidth - 30;
    const colorBarY = legendY + 45;
    
    for (let i = 0; i < colorBarWidth; i++) {
        const normalizedValue = i / colorBarWidth;
        ctx.fillStyle = getHeatmapColor(normalizedValue);
        ctx.fillRect(legendX + 15 + i, colorBarY, 1, barHeight - 10);
    }
    
    // Draw border around color bar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeRect(legendX + 15, colorBarY, colorBarWidth, barHeight - 10);
    
    // Draw value markers on the color bar for key thresholds
    const thresholds = [
        { value: 5, label: "Low (5)" },
        { value: 15, label: "Medium (15)" },
        { value: 30, label: "High (30)" },
        { value: 50, label: "Very High (50)" },
        { value: 75, label: "Extreme (75)" },
        { value: 100, label: "Ultra (100+)" }
    ];
    
    // Draw markers for each threshold
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    
    thresholds.forEach((threshold, index) => {
        // Calculate the position on the color bar (0-100 range maps to 0-colorBarWidth)
        const position = (threshold.value / 100) * colorBarWidth;
        const x = legendX + 15 + position;
        
        // Draw a marker line
        ctx.beginPath();
        ctx.moveTo(x, colorBarY - 2);
        ctx.lineTo(x, colorBarY + barHeight - 10 + 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw the threshold label below (spaced evenly)
        const labelX = legendX + 15 + (index * (colorBarWidth / (thresholds.length - 1)));
        ctx.fillText(threshold.label, labelX, colorBarY + barHeight + 5);
    });
    
    // Restore context state
    ctx.restore();
}

// Helper function to get grid bounds of the current viewport
function getViewportGridBounds() {
    // Convert screen coordinates to grid coordinates
    const gridSize = GALAXY_GRID_SPACING;
    
    // Get the visible map bounds in map coordinates
    const topLeft = screenToMapCoords(0, 0);
    const bottomRight = screenToMapCoords(canvas.width, canvas.height);
    
    // Function to adjust Y coordinate grid cell calculation - shift up by 1 cell
    const getYGridCell = (y) => Math.floor(y / gridSize) + 1;
    
    // Find min/max grid cell coordinates with extra padding
    // Adjust Y coordinate calculations to match the main grid cell calculation
    return {
        minX: Math.floor(Math.min(topLeft.x, bottomRight.x) / gridSize) - 1,
        maxX: Math.ceil(Math.max(topLeft.x, bottomRight.x) / gridSize) + 1,
        minY: getYGridCell(Math.min(topLeft.y, bottomRight.y)) - 1,
        maxY: getYGridCell(Math.max(topLeft.y, bottomRight.y)) + 1
    };
}