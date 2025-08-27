import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './RecipeTreeCanvas.css';

interface Recipe {
    id: string;
    name: string;
    type: string;
    tier: number;
    constructionTime: number;
    ingredients: { resource: string; quantity: number }[];
    output?: { resource: string; quantity: number } | null;
    requiredQuantity?: number;  // For raw resources - amount needed by parent recipe
    planetTypes?: string;  // Semicolon-separated list of planet types
    factions?: string;     // Semicolon-separated list of factions
}

interface TreeNode {
    id: string;
    recipe: Recipe;
    x: number;
    y: number;
    children: TreeNode[];
    depth: number;
    width?: number;
}

interface ResourceInfo {
    id: string;
    name: string;
    usageCount: number;
    recipes: string[];
    planets: string[];
    accessibility: number;
    value: number;
    tier: number;
}

interface TreeControls {
    resetView: () => void;
    centerTree: () => void;
    fitToScreen: () => void;
    setZoom: (zoom: number) => void;
    getZoom: () => number;
    exportImage: () => void;
}

interface RecipeTreeCanvasProps {
    recipe: Recipe | null;
    recipes: Recipe[];
    planets?: any[];
    resources?: any[];
    quantity?: number;
    viewMode?: 'simple' | 'detailed';
    onNodeClick?: (node: TreeNode) => void;
    onResourceAnalysis?: (info: ResourceInfo) => void;
    onControlsReady?: (controls: TreeControls) => void;
    maxDepth?: number;
}

function RecipeTreeCanvasComponent({
    recipe,
    recipes = [],
    planets = [],
    resources = [],
    quantity = 1,
    viewMode = 'simple',
    onNodeClick,
    onResourceAnalysis,
    onControlsReady,
    maxDepth = 10
}: RecipeTreeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
    const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const treeCache = useRef<Map<string, TreeNode>>(new Map());
    const buildTimeoutRef = useRef<NodeJS.Timeout>();
    const [viewport, setViewport] = useState({
        x: 0,
        y: 0,
        scale: 1,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        lastPos: { x: 0, y: 0 }
    });

    // Use ref to access viewport without causing re-renders
    const viewportRef = useRef(viewport);
    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);

    // Use RAF for smooth animations
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Memoize recipe map for faster lookups - only rebuild when recipes count changes
    const recipeMap = useMemo(() => {
        const map = new Map<string, Recipe>();
        if (!recipes || recipes.length === 0) return map;

        recipes.forEach(r => {
            // Map by id
            map.set(r.id, r);

            // Map by outputId if it exists (from recipes.json)
            if ((r as any).outputId) {
                map.set((r as any).outputId, r);
            }

            // Map by outputName if it exists (from recipes.json)  
            if ((r as any).outputName) {
                map.set((r as any).outputName, r);
                map.set((r as any).outputName.toLowerCase(), r);
            }

            // Map by output.resource (old format)
            if (r.output?.resource) {
                map.set(r.output.resource, r);
                map.set(`recipe_${r.output.resource}`, r);
            }

            // Map by name
            if (r.name) {
                map.set(r.name, r);
                map.set(r.name.toLowerCase(), r);
            }
        });
        return map;
    }, [recipes.length]);

    // Build tree with memoization
    const buildRecipeTree = useCallback((recipeId: string, depth = 0, visited = new Set<string>()): TreeNode | null => {
        // Use maxDepth prop for performance control
        if (visited.has(recipeId) || depth >= maxDepth) return null;
        visited.add(recipeId);

        const rec = recipeMap.get(recipeId);
        if (!rec) return null;

        const children: TreeNode[] = [];

        if (rec.ingredients && Array.isArray(rec.ingredients)) {
            rec.ingredients.forEach(ingredient => {
                // Handle both 'resource' and 'name' fields for ingredients
                const ingredientName = ingredient.resource || ingredient.name;

                // Try multiple lookups to find the producer recipe
                // Also try converting spaces to hyphens and vice versa
                const hyphenated = ingredientName.replace(/\s+/g, '-').toLowerCase();
                const spaced = ingredientName.replace(/-/g, ' ');

                const producerRecipe = recipeMap.get(ingredientName) ||
                    recipeMap.get(ingredientName.toLowerCase()) ||
                    recipeMap.get(hyphenated) ||
                    recipeMap.get(spaced) ||
                    recipeMap.get(spaced.toLowerCase()) ||
                    recipeMap.get(`recipe_${ingredientName}`) ||
                    recipeMap.get(`cargo-${ingredientName}`) ||
                    recipes.find(r =>
                        (r as any).outputName === ingredientName ||
                        (r as any).outputName?.toLowerCase() === ingredientName.toLowerCase() ||
                        (r as any).outputId === hyphenated
                    );

                if (producerRecipe) {
                    const childNode = buildRecipeTree(producerRecipe.id, depth + 1, new Set(visited));
                    if (childNode) children.push(childNode);
                } else {
                    // This ingredient doesn't have a recipe, so check if it's truly a raw material
                    // A raw material either has no recipe that produces it, or has a recipe with empty ingredients
                    const rawMaterialRecipe = recipes.find(r =>
                        ((r as any).outputName === ingredientName ||
                            (r as any).outputId === ingredientName?.toLowerCase().replace(/\s+/g, '-') ||
                            r.output?.resource === ingredientName ||
                            r.name === ingredientName) &&
                        (!r.ingredients || r.ingredients.length === 0)
                    );

                    const isRawMaterial = rawMaterialRecipe || !recipes.some(r =>
                        (r as any).outputName === ingredientName ||
                        (r as any).outputId === ingredientName?.toLowerCase().replace(/\s+/g, '-') ||
                        r.output?.resource === ingredientName ||
                        r.name === ingredientName
                    );

                    if (!isRawMaterial) {
                        // This should have a recipe but we couldn't find it
                        // Log for debugging  
                        console.warn(`Could not find recipe for ${ingredientName}, but it's not a raw material`);
                    }

                    // Find recipes that use this raw material to determine where it can be extracted
                    const recipesUsingRaw = recipes.filter(r =>
                        r.ingredients?.some(ing => (ing.resource || ing.name) === ingredientName)
                    );

                    // Also check if this raw material produces something (like iron-ore -> iron)
                    // This would give us the planet types where it can be extracted
                    const processedMaterialName = ingredientName.replace('-ore', '').replace('cargo-', '');
                    const processingRecipes = recipes.filter(r => {
                        const outputName = (r as any).outputName || r.output?.resource || '';
                        return outputName === `cargo-${processedMaterialName}` ||
                            outputName === processedMaterialName ||
                            (r.ingredients?.length === 1 && (r.ingredients[0].resource || r.ingredients[0].name) === ingredientName);
                    });

                    // Aggregate planet types and factions from all recipes using this raw material
                    const planetTypesSet = new Set<string>();
                    const factionsSet = new Set<string>();

                    // Debug log
                    if (recipesUsingRaw.length > 0 || processingRecipes.length > 0) {
                        console.log(`Raw material ${ingredientName}:`,
                            'Used in:', recipesUsingRaw.map(r => r.name),
                            'Processed by:', processingRecipes.map(r => r.name));
                    }

                    // Combine both sets of recipes to get planet types
                    [...recipesUsingRaw, ...processingRecipes].forEach(r => {
                        if (r.planetTypes) {
                            if (Array.isArray(r.planetTypes)) {
                                r.planetTypes.forEach(pt => planetTypesSet.add(pt));
                            } else if (typeof r.planetTypes === 'string') {
                                r.planetTypes.split(';').forEach(pt => planetTypesSet.add(pt.trim()));
                            }
                        }
                        if (r.factions && r.factions !== 'All') {
                            if (Array.isArray(r.factions)) {
                                r.factions.forEach(f => factionsSet.add(f));
                            } else if (typeof r.factions === 'string') {
                                r.factions.split(';').forEach(f => factionsSet.add(f.trim()));
                            }
                        }
                    });

                    // More debug logging
                    if (planetTypesSet.size > 0) {
                        console.log(`Planet types for ${ingredientName}:`, Array.from(planetTypesSet));
                    }

                    // Get tier from raw material recipe if it exists
                    const rawTier = rawMaterialRecipe ?
                        ((rawMaterialRecipe as any).outputTier || rawMaterialRecipe.tier || 0) : 0;

                    children.push({
                        id: `raw_${ingredientName}`,
                        recipe: {
                            id: `raw_${ingredientName}`,
                            name: ingredientName,
                            tier: rawTier,
                            type: 'raw',
                            constructionTime: 0,
                            ingredients: [],
                            output: { resource: ingredientName, quantity: 1 },  // Set output for consistency
                            requiredQuantity: ingredient.quantity,  // Amount needed by parent recipe
                            planetTypes: planetTypesSet.size > 0 ? Array.from(planetTypesSet).join(';') : undefined,
                            factions: factionsSet.size > 0 && factionsSet.size < 3 ? Array.from(factionsSet).join(';') : undefined
                        },
                        x: 0,
                        y: 0,
                        children: [],
                        depth: depth + 1
                    });
                }
            });
        }

        return {
            id: recipeId,
            recipe: rec,
            x: 0,
            y: 0,
            children,
            depth
        };
    }, [recipeMap, recipes, maxDepth]);

    // Calculate positions
    const calculateNodePositions = useCallback((root: TreeNode, canvasWidth: number, canvasHeight: number) => {
        const levelHeight = 150;
        const minNodeSpacing = 120;

        const calculateWidth = (node: TreeNode): number => {
            if (node.children.length === 0) {
                node.width = minNodeSpacing;
                return minNodeSpacing;
            }

            let totalWidth = 0;
            node.children.forEach(child => {
                totalWidth += calculateWidth(child);
            });

            node.width = Math.max(minNodeSpacing, totalWidth);
            return node.width;
        };

        calculateWidth(root);

        const positionNode = (node: TreeNode, x: number, y: number) => {
            node.x = x;
            node.y = y;

            if (node.children.length > 0) {
                let childX = x - (node.width! / 2);
                node.children.forEach(child => {
                    const childWidth = child.width || minNodeSpacing;
                    positionNode(child, childX + (childWidth / 2), y + levelHeight);
                    childX += childWidth;
                });
            }
        };

        positionNode(root, canvasWidth / 2, 100);
    }, []);

    // Draw tree
    const drawTree = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !treeRoot) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        ctx.translate(viewport.x, viewport.y);
        ctx.scale(viewport.scale, viewport.scale);

        // Draw connections
        const drawConnections = (node: TreeNode) => {
            node.children.forEach(child => {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);

                const controlY = (node.y + child.y) / 2;
                ctx.bezierCurveTo(
                    node.x, controlY,
                    child.x, controlY,
                    child.x, child.y
                );

                const alpha = 0.3 + (node.depth * 0.1);
                if (child.recipe.type === 'raw') {
                    ctx.strokeStyle = `rgba(0, 200, 150, ${alpha})`;
                } else {
                    ctx.strokeStyle = `rgba(255, 107, 53, ${alpha})`;
                }

                ctx.lineWidth = 2 / viewport.scale;
                ctx.stroke();

                drawConnections(child);
            });
        };

        drawConnections(treeRoot);

        // Draw nodes
        const drawNode = (node: TreeNode) => {
            const isHovered = hoveredNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            const isRaw = node.recipe.type === 'raw';
            const nodeRadius = 45 + (isHovered ? 10 : 0) + (isSelected ? 5 : 0);

            // Shadow
            if (isHovered || isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y + 3, nodeRadius + 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fill();
            }

            // Node background
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);

            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius);
            if (isRaw) {
                gradient.addColorStop(0, `rgba(0, 200, 150, ${isHovered ? 0.95 : 0.8})`);
                gradient.addColorStop(1, `rgba(0, 150, 100, ${isHovered ? 0.7 : 0.5})`);
            } else {
                gradient.addColorStop(0, `rgba(255, 107, 53, ${isHovered ? 0.95 : 0.8})`);
                gradient.addColorStop(1, `rgba(200, 70, 30, ${isHovered ? 0.7 : 0.5})`);
            }
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border
            ctx.strokeStyle = isSelected ? '#FFD700' : (isRaw ? '#00C896' : '#FF6B35');
            ctx.lineWidth = (isHovered ? 4 : 2) / viewport.scale;
            ctx.stroke();

            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${20 / viewport.scale}px Orbitron`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isRaw) {
                // Show tier for raw materials if they have one, otherwise show RAW
                const rawTier = node.recipe.tier || 0;
                ctx.fillText(rawTier > 0 ? `T${rawTier}` : 'RAW', node.x, node.y - 15);
            } else {
                ctx.fillText(`T${node.recipe.tier}`, node.x, node.y - 15);
            }

            // Name with text wrapping
            ctx.font = `${12 / viewport.scale}px Exo 2`;
            const maxWidth = nodeRadius * 1.8;
            const words = node.recipe.name.split(' ');
            let line = '';
            let lines: string[] = [];

            for (let word of words) {
                const testLine = line + (line ? ' ' : '') + word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line) {
                    lines.push(line);
                    line = word;
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            lines.forEach((text, index) => {
                ctx.fillText(text, node.x, node.y + (index * 12));
            });

            // Detailed mode - show additional info
            if (viewMode === 'detailed' && !isRaw) {
                ctx.font = `${10 / viewport.scale}px Exo 2`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

                // Show construction time
                ctx.fillText(`${node.recipe.constructionTime}s`, node.x, node.y + 25);

                // Show quantity if greater than 1
                if (node.recipe.output?.quantity && node.recipe.output.quantity > 1) {
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText(`x${node.recipe.output.quantity}`, node.x, node.y + 35);
                }
            }

            node.children.forEach(drawNode);
        };

        drawNode(treeRoot);
        ctx.restore();

        // Draw controls hint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px Exo 2';
        ctx.textAlign = 'left';
        ctx.fillText('Scroll: Zoom | Drag: Pan | Click: Select', 10, canvas.height - 10);
    }, [treeRoot, hoveredNode, selectedNode, viewport, viewMode]);

    // Handle wheel
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, viewport.scale * scaleFactor));

        const worldX = (mouseX - viewport.x) / viewport.scale;
        const worldY = (mouseY - viewport.y) / viewport.scale;

        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        setViewport(prev => ({
            ...prev,
            scale: newScale,
            x: newX,
            y: newY
        }));
    }, [viewport]);

    // Improved hit detection with proper circular hitbox
    const isPointInNode = useCallback((x: number, y: number, node: TreeNode, radius: number = 45) => {
        const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        return distance <= radius;
    }, []);

    // Resource analysis
    const analyzeResource = useCallback((resourceId: string) => {
        const usedInRecipes = recipes.filter(r =>
            r.ingredients?.some(ing => ing.resource === resourceId)
        );

        const producedBy = recipes.filter(r =>
            r.output?.resource === resourceId
        );

        const availableOnPlanets = planets.filter(p =>
            p.resources?.includes(resourceId)
        );

        const info: ResourceInfo = {
            id: resourceId,
            name: resourceId,
            usageCount: usedInRecipes.length,
            recipes: usedInRecipes.map(r => r.name),
            planets: availableOnPlanets.map((p: any) => p.name || p.id),
            accessibility: availableOnPlanets.length / Math.max(1, planets.length),
            value: usedInRecipes.length * 100 + producedBy.length * 50,
            tier: Math.max(...usedInRecipes.map(r => r.tier || 0), 0)
        };

        if (onResourceAnalysis) {
            onResourceAnalysis(info);
        }

        return info;
    }, [recipes, planets, onResourceAnalysis]);

    // Mouse handlers
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !treeRoot) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - viewport.x) / viewport.scale;
        const worldY = (mouseY - viewport.y) / viewport.scale;

        let clickedNode: TreeNode | null = null;
        let closestDistance = Infinity;

        // Find the closest node to the click
        const checkNodeClick = (node: TreeNode) => {
            const distance = Math.sqrt(Math.pow(worldX - node.x, 2) + Math.pow(worldY - node.y, 2));
            const radius = node.recipe.type === 'raw' ? 50 : 45; // Slightly larger hitbox for raw materials

            if (distance <= radius && distance < closestDistance) {
                closestDistance = distance;
                clickedNode = node;
            }

            node.children.forEach(checkNodeClick);
        };

        checkNodeClick(treeRoot);

        if (clickedNode) {
            setSelectedNode(clickedNode);

            // Analyze resource if it's a raw material
            if (clickedNode.recipe.type === 'raw') {
                console.log('Raw material clicked:', clickedNode.recipe.name);
                analyzeResource(clickedNode.recipe.name);
            }

            if (onNodeClick) onNodeClick(clickedNode);
        } else {
            setViewport(prev => ({
                ...prev,
                isDragging: true,
                dragStart: { x: mouseX, y: mouseY },
                lastPos: { x: prev.x, y: prev.y }
            }));
        }
    }, [treeRoot, viewport, onNodeClick, analyzeResource]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !treeRoot) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (viewport.isDragging) {
            const dx = mouseX - viewport.dragStart.x;
            const dy = mouseY - viewport.dragStart.y;

            setViewport(prev => ({
                ...prev,
                x: prev.lastPos.x + dx,
                y: prev.lastPos.y + dy
            }));
        } else {
            const worldX = (mouseX - viewport.x) / viewport.scale;
            const worldY = (mouseY - viewport.y) / viewport.scale;

            let foundNode: TreeNode | null = null;
            const checkNodeHover = (node: TreeNode) => {
                if (isPointInNode(worldX, worldY, node)) {
                    foundNode = node;
                }
                node.children.forEach(checkNodeHover);
            };

            checkNodeHover(treeRoot);
            setHoveredNode(foundNode);

            canvas.style.cursor = foundNode ? 'pointer' : viewport.isDragging ? 'grabbing' : 'grab';
        }
    }, [treeRoot, viewport, isPointInNode]);

    const handleMouseUp = useCallback(() => {
        setViewport(prev => ({
            ...prev,
            isDragging: false
        }));
    }, []);

    // Tree control methods
    const resetView = useCallback(() => {
        setViewport({
            x: 0,
            y: 0,
            scale: 1,
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            lastPos: { x: 0, y: 0 }
        });
    }, []);

    const centerTree = useCallback(() => {
        if (!treeRoot || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Find the bounds of the tree
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const findBounds = (node: TreeNode) => {
            minX = Math.min(minX, node.x - 40);
            maxX = Math.max(maxX, node.x + 40);
            minY = Math.min(minY, node.y - 30);
            maxY = Math.max(maxY, node.y + 30);
            node.children.forEach(findBounds);
        };
        findBounds(treeRoot);

        const treeCenterX = (minX + maxX) / 2;
        const treeCenterY = (minY + maxY) / 2;

        setViewport(prev => ({
            ...prev,
            x: centerX - treeCenterX * prev.scale,
            y: centerY - treeCenterY * prev.scale
        }));
    }, [treeRoot]);

    const fitToScreen = useCallback(() => {
        if (!treeRoot || !canvasRef.current) return;

        const canvas = canvasRef.current;

        // Find the bounds of the tree
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const findBounds = (node: TreeNode) => {
            minX = Math.min(minX, node.x - 40);
            maxX = Math.max(maxX, node.x + 40);
            minY = Math.min(minY, node.y - 30);
            maxY = Math.max(maxY, node.y + 30);
            node.children.forEach(findBounds);
        };
        findBounds(treeRoot);

        const treeWidth = maxX - minX;
        const treeHeight = maxY - minY;
        const padding = 50;

        const scaleX = (canvas.width - padding * 2) / treeWidth;
        const scaleY = (canvas.height - padding * 2) / treeHeight;
        const newScale = Math.min(scaleX, scaleY, 2);

        const treeCenterX = (minX + maxX) / 2;
        const treeCenterY = (minY + maxY) / 2;

        setViewport({
            x: canvas.width / 2 - treeCenterX * newScale,
            y: canvas.height / 2 - treeCenterY * newScale,
            scale: newScale,
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            lastPos: { x: 0, y: 0 }
        });
    }, [treeRoot]);

    const setZoom = useCallback((zoom: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const newScale = Math.max(0.5, Math.min(3, zoom));

        setViewport(prev => {
            const scaleDiff = newScale - prev.scale;
            const offsetX = -(centerX * scaleDiff) / newScale;
            const offsetY = -(centerY * scaleDiff) / newScale;

            return {
                ...prev,
                x: prev.x + offsetX,
                y: prev.y + offsetY,
                scale: newScale
            };
        });
    }, []);

    const getZoom = useCallback(() => {
        return viewportRef.current.scale;
    }, []);

    const exportImage = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a link element and trigger download
        const link = document.createElement('a');
        link.download = `${recipe?.name || 'recipe'}-tree.png`;
        link.href = canvas.toDataURL();
        link.click();
    }, [recipe]);

    // Expose controls to parent - only call once on mount
    useEffect(() => {
        if (onControlsReady) {
            onControlsReady({
                resetView,
                centerTree,
                fitToScreen,
                setZoom,
                getZoom,
                exportImage
            });
        }
        // Only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Build tree when recipe changes - only depend on recipe ID to avoid rebuilding on every render
    useEffect(() => {
        if (recipe?.id && recipes.length > 0) {
            setIsLoading(true);
            // Use requestAnimationFrame to prevent flashing
            const frameId = requestAnimationFrame(() => {
                const tree = buildRecipeTree(recipe.id);
                if (tree && canvasRef.current) {
                    calculateNodePositions(tree, canvasRef.current.width, canvasRef.current.height);
                    setTreeRoot(tree);
                    setViewport(prev => ({ ...prev, x: 0, y: 0, scale: 1 }));
                }
                setIsLoading(false);
            });
            return () => {
                cancelAnimationFrame(frameId);
                setIsLoading(false);
            };
        } else {
            setTreeRoot(null);
            setIsLoading(false);
        }
    }, [recipe?.id, recipes.length]); // Removed function dependencies to prevent re-renders

    // Draw when state changes (viewport, hovering, selection)
    useEffect(() => {
        if (treeRoot) {
            // Use requestAnimationFrame to prevent flashing
            const frameId = requestAnimationFrame(() => {
                drawTree();
            });
            return () => cancelAnimationFrame(frameId);
        }
    }, [treeRoot, hoveredNode, selectedNode, viewport.x, viewport.y, viewport.scale, quantity, viewMode]); // Removed drawTree from deps

    // Canvas event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const container = canvas.parentElement;
            if (!container) return;

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            if (treeRoot) {
                // Recalculate positions on resize
                const recalculate = () => {
                    calculateNodePositions(treeRoot, canvas.width, canvas.height);
                };
                requestAnimationFrame(recalculate);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [treeRoot]); // Removed calculateNodePositions from deps

    return (
        <div className="recipe-tree-canvas-container">
            {isLoading && (
                <div className="tree-loading-indicator">
                    <span>Building recipe tree...</span>
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="recipe-tree-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />

            <div className="canvas-controls-overlay">
                <button className="canvas-control" onClick={resetView} title="Reset View">⟲</button>
                <button className="canvas-control" onClick={centerTree} title="Center Tree">⊕</button>
                <button className="canvas-control" onClick={fitToScreen} title="Fit to Screen">⛶</button>
                <button className="canvas-control" onClick={exportImage} title="Export Image">📷</button>
            </div>

            {selectedNode && (
                <div className="node-info-panel">
                    <h3>{selectedNode.recipe.name}</h3>
                    {selectedNode.recipe.type === 'raw' ? (
                        <>
                            <p className="resource-type">Raw Material</p>
                            {selectedNode.recipe.requiredQuantity && (
                                <p className="required-amount">
                                    <strong>Amount needed:</strong> {selectedNode.recipe.requiredQuantity}x
                                </p>
                            )}

                            {selectedNode.recipe.planetTypes && (
                                <div className="planet-types-info">
                                    <strong>CAN BE EXTRACTED FROM:</strong>
                                    <div className="planet-types-list">
                                        {(Array.isArray(selectedNode.recipe.planetTypes)
                                            ? selectedNode.recipe.planetTypes
                                            : selectedNode.recipe.planetTypes.split(';')
                                        ).map((planet, idx) => (
                                            <span key={idx} className="planet-type-tag">
                                                {typeof planet === 'string' ? planet.trim() : planet}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedNode.recipe.factions && selectedNode.recipe.factions !== 'All' && (
                                <div className="factions-info">
                                    <strong>FACTION REGIONS:</strong>
                                    <div className="factions-list">
                                        {(Array.isArray(selectedNode.recipe.factions)
                                            ? selectedNode.recipe.factions
                                            : selectedNode.recipe.factions.split(';')
                                        ).map((faction, idx) => {
                                            const factionStr = typeof faction === 'string' ? faction.trim() : faction;
                                            return (
                                                <span key={idx} className={`faction-tag faction-${factionStr.toLowerCase()}`}>
                                                    {factionStr}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <p>Tier {selectedNode.recipe.tier}</p>
                            {selectedNode.recipe.constructionTime > 0 && (
                                <p>Time: {selectedNode.recipe.constructionTime}s</p>
                            )}

                            {selectedNode.recipe.planetTypes && (
                                <div className="planet-types-info">
                                    <strong>CAN BE CRAFTED ON:</strong>
                                    <div className="planet-types-list">
                                        {(Array.isArray(selectedNode.recipe.planetTypes)
                                            ? selectedNode.recipe.planetTypes
                                            : selectedNode.recipe.planetTypes.split(';')
                                        ).map((planet, idx) => (
                                            <span key={idx} className="planet-type-tag">
                                                {typeof planet === 'string' ? planet.trim() : planet}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedNode.recipe.factions && selectedNode.recipe.factions !== 'All' && selectedNode.recipe.factions !== 'MUD;ONI;UST' && (
                                <div className="factions-info">
                                    <strong>LIMITED TO FACTIONS:</strong>
                                    <div className="factions-list">
                                        {(Array.isArray(selectedNode.recipe.factions)
                                            ? selectedNode.recipe.factions
                                            : selectedNode.recipe.factions.split(';')
                                        ).map((faction, idx) => {
                                            const factionStr = typeof faction === 'string' ? faction.trim() : faction;
                                            return (
                                                <span key={idx} className={`faction-tag faction-${factionStr.toLowerCase()}`}>
                                                    {factionStr}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedNode.recipe.ingredients.length > 0 && (
                                <div>
                                    <h4>REQUIRES:</h4>
                                    <ul>
                                        {selectedNode.recipe.ingredients.map((ing, i) => (
                                            <li key={i}>
                                                {ing.quantity}x {ing.resource}
                                                <button
                                                    className="btn-link"
                                                    onClick={() => analyzeResource(ing.resource)}
                                                    style={{ marginLeft: '8px', fontSize: '0.85rem' }}
                                                >
                                                    (analyze)
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {selectedNode.recipe.output && (
                                <p>Produces: {selectedNode.recipe.output.quantity}x {selectedNode.recipe.output.resource}</p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export const RecipeTreeCanvas = React.memo(RecipeTreeCanvasComponent); 