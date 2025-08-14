// === MODULE: Canvas Manager ===
// Handles canvas setup, resizing, camera controls, and coordinate transformations

/**
 * Setup canvas and handle resizing
 */
function setupCanvas(editor) {
    resizeCanvas(editor);
    window.addEventListener('resize', () => resizeCanvas(editor));
}

/**
 * Resize canvas to match container with high DPI support
 */
function resizeCanvas(editor) {
    const container = editor.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Update stored DPR
    editor.dpr = dpr;
    
    editor.canvas.width = rect.width * dpr;
    editor.canvas.height = rect.height * dpr;
    editor.canvas.style.width = rect.width + 'px';
    editor.canvas.style.height = rect.height + 'px';
    
    editor.ctx.scale(dpr, dpr);
    editor.width = rect.width;
    editor.height = rect.height;
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Convert screen coordinates to world coordinates
 */
function screenToWorld(editor, x, y) {
    return {
        x: (x - editor.camera.x) / editor.camera.zoom,
        y: (y - editor.camera.y) / editor.camera.zoom
    };
}

/**
 * Convert world coordinates to screen coordinates
 */
function worldToScreen(editor, x, y) {
    return {
        x: x * editor.camera.zoom + editor.camera.x,
        y: y * editor.camera.zoom + editor.camera.y
    };
}

/**
 * Reset camera to default position
 */
function resetView(editor) {
    editor.camera = { x: editor.width / 2, y: editor.height / 2, zoom: 1 };
    
    // Update zoom slider and label
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomLabel = document.querySelector('.zoom-label');
    if (zoomSlider) zoomSlider.value = 100;
    if (zoomLabel) zoomLabel.textContent = '100%';
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Fit all nodes to screen
 */
function fitToScreen(editor) {
    if (editor.nodes.size === 0) return;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    editor.nodes.forEach(node => {
        minX = Math.min(minX, node.x - node.width / 2);
        minY = Math.min(minY, node.y - node.height / 2);
        maxX = Math.max(maxX, node.x + node.width / 2);
        maxY = Math.max(maxY, node.y + node.height / 2);
    });
    
    const padding = 100;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    
    const scaleX = editor.width / contentWidth;
    const scaleY = editor.height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 2);
    
    editor.camera.zoom = scale;
    editor.camera.x = editor.width / 2 - (minX + maxX) / 2 * scale;
    editor.camera.y = editor.height / 2 - (minY + maxY) / 2 * scale;
    
    // Update zoom slider and label
    const zoomPercent = Math.round(scale * 100);
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomLabel = document.querySelector('.zoom-label');
    if (zoomSlider) zoomSlider.value = zoomPercent;
    if (zoomLabel) zoomLabel.textContent = zoomPercent + '%';
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Set zoom level
 */
function setZoom(editor, zoom) {
    editor.camera.zoom = Math.max(0.1, Math.min(5, zoom));
    // Zoom label is now updated in main.js via event listener
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Handle mouse wheel for zooming
 */
function handleWheel(editor, e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = editor.camera.zoom * delta;
    
    // Clamp zoom
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    
    // Get mouse position for zoom center
    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate world position before zoom
    const worldBefore = screenToWorld(editor, x, y);
    
    // Apply zoom
    editor.camera.zoom = clampedZoom;
    
    // Calculate world position after zoom
    const worldAfter = screenToWorld(editor, x, y);
    
    // Adjust camera to keep mouse position fixed
    editor.camera.x += (worldAfter.x - worldBefore.x) * editor.camera.zoom;
    editor.camera.y += (worldAfter.y - worldBefore.y) * editor.camera.zoom;
    
    // Update zoom slider and label
    const zoomPercent = Math.round(clampedZoom * 100);
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomLabel = document.querySelector('.zoom-label');
    if (zoomSlider) zoomSlider.value = zoomPercent;
    if (zoomLabel) zoomLabel.textContent = zoomPercent + '%';
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

// === MODULE EXPORT ===
window.CanvasManager = {
    setupCanvas,
    resizeCanvas,
    screenToWorld,
    worldToScreen,
    resetView,
    fitToScreen,
    setZoom,
    handleWheel
};

// Backward compatibility
window.setupCanvas = setupCanvas;
window.resizeCanvas = resizeCanvas;
window.screenToWorld = screenToWorld;
window.worldToScreen = worldToScreen;
window.resetView = resetView;
window.fitToScreen = fitToScreen;
window.setZoom = setZoom;

console.log('Canvas Manager module loaded successfully'); 