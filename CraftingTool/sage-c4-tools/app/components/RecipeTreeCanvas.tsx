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

interface RecipeTreeCanvasProps {
    recipe: Recipe | null;
    recipes: Recipe[];
    planets?: any[];
    resources?: any[];
    quantity?: number;
    viewMode?: 'simple' | 'detailed' | 'efficiency';
    onNodeClick?: (node: TreeNode) => void;
    onResourceAnalysis?: (info: ResourceInfo) => void;
}

function RecipeTreeCanvasComponent({
    recipe,
    recipes = [],
    planets = [],
    resources = [],
    quantity = 1,
    viewMode = 'simple',
    onNodeClick,
    onResourceAnalysis
}: RecipeTreeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
    const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
    const [viewport, setViewport] = useState({
        x: 0,
        y: 0,
        scale: 1,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        lastPos: { x: 0, y: 0 }
    });

    // Use RAF for smooth animations
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Memoize recipe map for faster lookups
    const recipeMap = useMemo(() => {
        const map = new Map<string, Recipe>();
        recipes.forEach(r => {
            map.set(r.id, r);
            if (r.output?.resource) {
                map.set(r.output.resource, r);
                map.set(`recipe_${r.output.resource}`, r);
            }
        });
        return map;
    }, [recipes]);

    // Build tree with memoization
    const buildRecipeTree = useCallback((recipeId: string, depth = 0, visited = new Set<string>()): TreeNode | null => {
        if (visited.has(recipeId) || depth > 8) return null;
        visited.add(recipeId);

        const rec = recipeMap.get(recipeId) || recipes.find(r => r.id === recipeId);
        if (!rec) return null;

        const children: TreeNode[] = [];

        if (rec.ingredients && Array.isArray(rec.ingredients)) {
            rec.ingredients.forEach(ingredient => {
                // Use map for faster lookup
                const producerRecipe = recipeMap.get(ingredient.resource) ||
                    recipeMap.get(`recipe_${ingredient.resource}`) ||
                    recipes.find(r =>
                        r.output?.resource === ingredient.resource ||
                        r.output?.resource === `recipe_${ingredient.resource}` ||
                        `recipe_${r.output?.resource}` === ingredient.resource
                    );

                if (producerRecipe) {
                    const childNode = buildRecipeTree(producerRecipe.id, depth + 1, new Set(visited));
                    if (childNode) children.push(childNode);
                } else {
                    // Raw resources don't have an output - they need to be extracted/obtained
                    children.push({
                        id: `raw_${ingredient.resource}`,
                        recipe: {
                            id: `raw_${ingredient.resource}`,
                            name: ingredient.resource,
                            tier: 0,
                            type: 'raw',
                            constructionTime: 0,
                            ingredients: [],
                            output: null,  // Raw resources don't produce anything
                            requiredQuantity: ingredient.quantity  // Amount needed by parent recipe
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
    }, [recipeMap, recipes]);

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
                ctx.fillText('RAW', node.x, node.y - 15);
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

            node.children.forEach(drawNode);
        };

        drawNode(treeRoot);
        ctx.restore();

        // Draw controls hint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px Exo 2';
        ctx.textAlign = 'left';
        ctx.fillText('Scroll: Zoom | Drag: Pan | Click: Select', 10, canvas.height - 10);
    }, [treeRoot, hoveredNode, selectedNode, viewport]);

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
        const checkNodeClick = (node: TreeNode) => {
            if (isPointInNode(worldX, worldY, node)) {
                clickedNode = node;

                // Analyze resource if it's a raw material
                if (node.recipe.type === 'raw') {
                    analyzeResource(node.recipe.name);
                }
            }
            node.children.forEach(checkNodeClick);
        };

        checkNodeClick(treeRoot);

        if (clickedNode) {
            setSelectedNode(clickedNode);
            if (onNodeClick) onNodeClick(clickedNode);
        } else {
            setViewport(prev => ({
                ...prev,
                isDragging: true,
                dragStart: { x: mouseX, y: mouseY },
                lastPos: { x: prev.x, y: prev.y }
            }));
        }
    }, [treeRoot, viewport, onNodeClick, isPointInNode, analyzeResource]);

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

    // Build tree when recipe changes
    useEffect(() => {
        if (recipe) {
            const tree = buildRecipeTree(recipe.id);
            if (tree && canvasRef.current) {
                calculateNodePositions(tree, canvasRef.current.width, canvasRef.current.height);
                setTreeRoot(tree);
                setViewport(prev => ({ ...prev, x: 0, y: 0, scale: 1 }));
            }
        } else {
            setTreeRoot(null);
        }
    }, [recipe, buildRecipeTree, calculateNodePositions]);

    // Draw when state changes
    useEffect(() => {
        drawTree();
    }, [drawTree]);

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
                calculateNodePositions(treeRoot, canvas.width, canvas.height);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [treeRoot, calculateNodePositions]);

    return (
        <div className="recipe-tree-canvas-container">
            <canvas
                ref={canvasRef}
                className="recipe-tree-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />

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
                            <div className="resource-details">
                                <p className="extraction-note">
                                    <em>This is a raw material that needs to be:</em>
                                </p>
                                <ul className="extraction-methods">
                                    <li>Extracted from planets with this resource</li>
                                    <li>Purchased from markets</li>
                                    <li>Obtained through other means</li>
                                </ul>
                            </div>
                            <button
                                className="btn btn-small"
                                onClick={() => analyzeResource(selectedNode.recipe.name)}
                            >
                                📊 Analyze Resource
                            </button>
                        </>
                    ) : (
                        <>
                            <p>Tier {selectedNode.recipe.tier}</p>
                            {selectedNode.recipe.constructionTime > 0 && (
                                <p>Time: {selectedNode.recipe.constructionTime}s</p>
                            )}
                            {selectedNode.recipe.ingredients.length > 0 && (
                                <div>
                                    <h4>Requires:</h4>
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