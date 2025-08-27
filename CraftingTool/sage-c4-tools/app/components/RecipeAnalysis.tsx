import React, { useMemo } from 'react';
import './RecipeAnalysis.css';

interface Recipe {
    id: string;
    name: string;
    type: string;
    tier: number;
    constructionTime: number;
    ingredients: { resource: string; quantity: number }[];
    output: { resource: string; quantity: number };
}

interface RecipeAnalysisProps {
    recipe: Recipe | null;
    recipes: Recipe[];
    planets: any[];
    quantity: number;
    starbaseInventory: Record<string, number>;
    resources?: any[];
}

export function RecipeAnalysis({
    recipe,
    recipes,
    planets,
    quantity,
    starbaseInventory,
    resources = []
}: RecipeAnalysisProps) {
    if (!recipe) return null;

    const analysis = useMemo(() => {
        const totalResources: Record<string, number> = {};
        const productionChain: Recipe[] = [];
        const criticalPath: string[] = [];
        let totalTime = 0;
        let totalComplexity = 0;
        const bottlenecksSet = new Set<string>();

        // Recursively analyze the production chain
        const analyzeChain = (r: Recipe, qty: number, depth = 0) => {
            const outputQty = r.output?.quantity || 1;
            const multiplier = Math.ceil(qty / outputQty);

            totalTime += r.constructionTime * multiplier;
            productionChain.push(r);
            criticalPath.push(r.name);
            totalComplexity += depth + 1;

            if (r.ingredients && Array.isArray(r.ingredients)) {
                r.ingredients.forEach(ing => {
                    const requiredQty = ing.quantity * multiplier;

                    // Find recipe that produces this
                    const producer = recipes.find(rec =>
                        rec.output?.resource === ing.resource
                    );

                    if (producer) {
                        analyzeChain(producer, requiredQty, depth + 1);
                    } else {
                        // It's a raw resource
                        totalResources[ing.resource] =
                            (totalResources[ing.resource] || 0) + requiredQty;

                        // Check if it's a bottleneck (scarce raw resource)
                        // Only check raw materials, not components
                        const resourceData = resources.find((r: any) => r.id === ing.resource);
                        if (resourceData && resourceData.category === 'raw') {
                            // Check availability by looking at recipes that extract this raw material
                            const extractionRecipes = recipes.filter(r =>
                                r.output?.resource === ing.resource ||
                                (r.ingredients?.length === 1 && r.ingredients[0].resource === ing.resource)
                            );

                            // Count unique planet types where this can be extracted
                            const planetTypesSet = new Set<string>();
                            extractionRecipes.forEach(r => {
                                if (r.planetTypes) {
                                    if (Array.isArray(r.planetTypes)) {
                                        r.planetTypes.forEach(pt => planetTypesSet.add(pt));
                                    } else if (typeof r.planetTypes === 'string') {
                                        r.planetTypes.split(';').forEach(pt => planetTypesSet.add(pt.trim()));
                                    }
                                }
                            });

                            if (planetTypesSet.size < 3) {
                                bottlenecksSet.add(ing.resource);
                            }
                        }
                    }
                });
            }
        };

        analyzeChain(recipe, quantity);

        // Convert Set to Array for bottlenecks (removes duplicates)
        const bottlenecks = Array.from(bottlenecksSet);

        // Calculate efficiency metrics
        const chainLength = productionChain.length;
        const uniqueResources = Object.keys(totalResources).length;
        const averageComplexity = totalComplexity / chainLength;

        // Efficiency calculation explained:
        // Base efficiency: 100%
        // -5% for each production step (complexity penalty)
        // -10% for each bottleneck resource
        // -2% for each unique resource type needed
        let efficiency = 100;
        efficiency -= chainLength * 5;
        efficiency -= bottlenecks.length * 10;
        efficiency -= uniqueResources * 2;
        efficiency = Math.max(0, Math.min(100, efficiency));

        // Calculate parallel production potential
        const parallelPotential = Math.min(
            ...Object.entries(totalResources).map(([resource, needed]) => {
                const available = starbaseInventory[resource] || 0;
                return Math.floor(available / needed);
            })
        );

        // Time with different production strategies
        const serialTime = totalTime;
        const parallelTime = totalTime / Math.min(chainLength, 4); // Assume max 4 parallel stations
        const optimalTime = parallelTime * 0.8; // With bonuses and optimization

        return {
            totalResources,
            productionChain,
            criticalPath,
            totalTime,
            efficiency,
            chainLength,
            uniqueResources,
            averageComplexity,
            bottlenecks,
            parallelPotential,
            serialTime,
            parallelTime,
            optimalTime
        };
    }, [recipe, recipes, planets, quantity, starbaseInventory, resources]);

    // Check resource availability
    const resourceAvailability = useMemo(() => {
        return Object.entries(analysis.totalResources).map(([resource, needed]) => {
            const available = starbaseInventory[resource] || 0;
            const sufficient = available >= needed;
            const percentage = (available / needed) * 100;

            return {
                resource,
                needed,
                available,
                sufficient,
                percentage: Math.min(100, percentage)
            };
        });
    }, [analysis.totalResources, starbaseInventory]);

    return (
        <div className="recipe-analysis">
            <h3>Recipe Analysis: {recipe.name}</h3>

            {/* Efficiency Breakdown */}
            <div className="efficiency-section">
                <h4>Efficiency Metrics</h4>
                <div className="efficiency-breakdown">
                    <div className="efficiency-score">
                        <div className="score-circle">
                            <svg viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="rgba(255, 107, 53, 0.2)"
                                    strokeWidth="5"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="var(--primary-orange)"
                                    strokeWidth="5"
                                    strokeDasharray={`${analysis.efficiency * 2.83} 283`}
                                    strokeDashoffset="0"
                                    transform="rotate(-90 50 50)"
                                />
                                <text
                                    x="50"
                                    y="50"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="white"
                                    fontSize="20"
                                    fontWeight="600"
                                >
                                    {analysis.efficiency.toFixed(0)}%
                                </text>
                            </svg>
                        </div>
                        <div className="score-label">Overall Efficiency</div>
                    </div>

                    <div className="efficiency-details">
                        <div className="detail-item">
                            <span className="label">Production Steps:</span>
                            <span className="value">{analysis.chainLength}</span>
                            <span className="impact negative">-{analysis.chainLength * 5}%</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Unique Resources:</span>
                            <span className="value">{analysis.uniqueResources}</span>
                            <span className="impact negative">-{analysis.uniqueResources * 2}%</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Bottlenecks:</span>
                            <span className="value">{analysis.bottlenecks.length}</span>
                            <span className="impact negative">-{analysis.bottlenecks.length * 10}%</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Complexity:</span>
                            <span className="value">{analysis.averageComplexity.toFixed(1)}</span>
                            <span className="complexity-bar">
                                <div
                                    className="complexity-fill"
                                    style={{ width: `${Math.min(100, analysis.averageComplexity * 20)}%` }}
                                />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="efficiency-explanation">
                    <h5>What does efficiency mean?</h5>
                    <p>
                        Efficiency measures how streamlined this recipe's production chain is.
                        Higher efficiency means fewer steps, fewer unique resources, and less complexity.
                    </p>
                    <ul>
                        <li><strong>100%:</strong> Direct crafting, no dependencies</li>
                        <li><strong>70-99%:</strong> Simple chain, readily available resources</li>
                        <li><strong>40-69%:</strong> Complex chain, some bottlenecks</li>
                        <li><strong>0-39%:</strong> Very complex, many scarce resources</li>
                    </ul>
                </div>
            </div>

            {/* Time Analysis */}
            <div className="time-section">
                <h4>Production Time Analysis</h4>
                <div className="time-strategies">
                    <div className="strategy">
                        <div className="strategy-name">Serial Production</div>
                        <div className="strategy-time">{Math.ceil(analysis.serialTime)}s</div>
                        <div className="strategy-desc">One station, sequential crafting</div>
                    </div>
                    <div className="strategy recommended">
                        <div className="strategy-name">Parallel Production</div>
                        <div className="strategy-time">{Math.ceil(analysis.parallelTime)}s</div>
                        <div className="strategy-desc">Multiple stations working together</div>
                    </div>
                    <div className="strategy optimal">
                        <div className="strategy-name">Optimized</div>
                        <div className="strategy-time">{Math.ceil(analysis.optimalTime)}s</div>
                        <div className="strategy-desc">With bonuses and perfect timing</div>
                    </div>
                </div>
            </div>

            {/* Resource Requirements */}
            <div className="resources-section">
                <h4>Resource Requirements</h4>
                <div className="resource-list">
                    {resourceAvailability.map(item => (
                        <div key={item.resource} className={`resource-item ${item.sufficient ? 'sufficient' : 'insufficient'}`}>
                            <div className="resource-header">
                                <span className="resource-name">{item.resource}</span>
                                <span className="resource-status">
                                    {item.sufficient ? '✓' : '✗'}
                                </span>
                            </div>
                            <div className="resource-amounts">
                                <span className="needed">Need: {item.needed}</span>
                                <span className="available">Have: {item.available}</span>
                            </div>
                            <div className="resource-bar">
                                <div
                                    className="resource-fill"
                                    style={{
                                        width: `${item.percentage}%`,
                                        background: item.sufficient ?
                                            'linear-gradient(90deg, #2ECC40, #00C896)' :
                                            'linear-gradient(90deg, #FF4136, #FF851B)'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {analysis.parallelPotential > 0 && (
                    <div className="parallel-potential">
                        <strong>Parallel Production Potential:</strong>
                        <span className="potential-value">
                            Can craft {analysis.parallelPotential}x simultaneously with current resources
                        </span>
                    </div>
                )}
            </div>

            {/* Bottlenecks */}
            {analysis.bottlenecks.length > 0 && (
                <div className="bottlenecks-section">
                    <h4>⚠️ Resource Bottlenecks</h4>
                    <p>These raw materials are scarce and may limit production:</p>
                    <div className="bottleneck-list">
                        {analysis.bottlenecks.map(resource => {
                            // Find extraction recipes for this raw material to get planet types
                            const extractionRecipes = recipes.filter(r =>
                                r.output?.resource === resource ||
                                (r.ingredients?.length === 1 && r.ingredients[0].resource === resource)
                            );

                            const planetTypesSet = new Set<string>();
                            extractionRecipes.forEach(r => {
                                if (r.planetTypes) {
                                    if (Array.isArray(r.planetTypes)) {
                                        r.planetTypes.forEach(pt => planetTypesSet.add(pt));
                                    } else if (typeof r.planetTypes === 'string') {
                                        r.planetTypes.split(';').forEach(pt => planetTypesSet.add(pt.trim()));
                                    }
                                }
                            });

                            return (
                                <div key={resource} className="bottleneck-item">
                                    <span className="resource-name">{resource}</span>
                                    <span className="scarcity-indicator">
                                        Available on {planetTypesSet.size} planet {planetTypesSet.size === 1 ? 'type' : 'types'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Optimization Tips */}
            <div className="tips-section">
                <h4>💡 Optimization Tips</h4>
                <ul>
                    {analysis.chainLength > 3 && (
                        <li>This recipe has a long production chain. Consider pre-crafting intermediate components.</li>
                    )}
                    {analysis.bottlenecks.length > 0 && (
                        <li>Focus on securing bottleneck resources first, as they limit production capacity.</li>
                    )}
                    {analysis.parallelPotential > 1 && (
                        <li>You have resources for {analysis.parallelPotential} parallel crafts. Use multiple stations!</li>
                    )}
                    {analysis.efficiency < 50 && (
                        <li>Low efficiency recipe. Consider alternative recipes or stockpile components.</li>
                    )}
                    <li>Tier {recipe.tier} crafting stations provide speed bonuses for this recipe.</li>
                </ul>
            </div>
        </div>
    );
}
