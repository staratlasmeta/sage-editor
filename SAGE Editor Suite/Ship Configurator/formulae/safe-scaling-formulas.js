/**
 * Safe Scaling Formulas for Ship Configuration
 * 
 * These formulas ensure that results are never negative by:
 * 1. Validating input values
 * 2. Using inherently positive mathematical operations
 * 3. Applying post-processing safeguards
 */

// ============================================
// SAFEGUARD STRATEGIES
// ============================================

/**
 * Strategy 1: Pre-validation
 * Ensure base value is positive before calculations
 */
function ensurePositiveBase(base, defaultValue = 1) {
    // Option 1: Use absolute value
    // return Math.abs(base);
    
    // Option 2: Use max with 0
    // return Math.max(0, base);
    
    // Option 3: Use default if invalid
    return (base > 0) ? base : defaultValue;
}

/**
 * Strategy 2: Post-validation
 * Ensure result is positive after calculations
 */
function ensurePositiveResult(result, minValue = 0) {
    return Math.max(minValue, result);
}

/**
 * Strategy 3: Safe Wrapper
 * Wraps any formula to guarantee positive output
 */
function safeScalingFormula(formula, base, index, minOutput = 0) {
    try {
        // Ensure positive base
        const safeBase = ensurePositiveBase(base);
        
        // Evaluate formula
        const result = formula(safeBase, index);
        
        // Ensure positive result
        return ensurePositiveResult(result, minOutput);
    } catch (error) {
        console.error('Formula evaluation error:', error);
        return ensurePositiveBase(base); // Fallback to base value
    }
}

// ============================================
// SAFE CLASS SCALING FORMULAS
// ============================================

/**
 * Safe Current Formula
 * Always positive because:
 * - Powers of positive numbers are always positive
 * - Division by positive constant is safe
 */
function safeCurrentFormula(base, classIndex) {
    const safeBase = Math.max(0, base);
    return safeBase * Math.pow(Math.pow(1.61803398875, classIndex + 1) / 2.2360679775, 2);
}

/**
 * Safe Logarithmic Growth
 * Prevents negative results from log function
 */
function safeLogarithmicGrowth(base, classIndex) {
    const safeBase = Math.max(0, base);
    // Ensure classIndex + 2 is always > 0 for valid log
    const safeIndex = Math.max(0, classIndex);
    return safeBase * Math.pow(1.61803398875, Math.log(safeIndex + 2) * 2.5);
}

/**
 * Safe Exponential with Floor
 * Ensures minimum scaling factor
 */
function safeExponentialWithFloor(base, classIndex, minMultiplier = 0.1) {
    const safeBase = Math.max(0, base);
    const multiplier = Math.pow(1.61803398875, classIndex);
    const safeMultiplier = Math.max(minMultiplier, multiplier);
    return safeBase * safeMultiplier;
}

/**
 * Safe Bounded Scaling
 * Provides both minimum and maximum bounds
 */
function safeBoundedScaling(base, classIndex, minMultiplier = 1, maxMultiplier = 1000) {
    const safeBase = Math.max(0, base);
    const rawMultiplier = Math.pow(1.61803398875, classIndex + 1) / 2.2360679775;
    const boundedMultiplier = Math.min(maxMultiplier, Math.max(minMultiplier, rawMultiplier));
    return safeBase * boundedMultiplier;
}

// ============================================
// SAFE TIER SCALING FORMULAS
// ============================================

/**
 * Safe Tier Formula
 * Ensures positive tier scaling
 */
function safeTierFormula(base, tierIndex) {
    const safeBase = Math.max(0, base);
    return safeBase * Math.pow(1.61803398875, tierIndex) / 2.2360679775;
}

/**
 * Safe Linear Tier Scaling
 * Simple, predictable, always positive
 */
function safeLinearTierScaling(base, tierIndex, tierBonus = 0.2) {
    const safeBase = Math.max(0, base);
    const multiplier = 1 + (tierIndex - 1) * tierBonus;
    return safeBase * Math.max(1, multiplier);
}

// ============================================
// FORMULA STRING GENERATORS
// ============================================

/**
 * Generate safe formula strings for use in the UI
 * These include built-in safeguards
 */
const safeFormulaStrings = {
    // Class formulas with safeguards
    classFormulas: {
        // Ensures base is positive
        positiveBase: "max(0, base) * pow(pow(1.61803398875, classIndex + 1) / 2.2360679775, 2)",
        
        // Ensures minimum multiplier
        withFloor: "max(0, base) * max(1, pow(1.61803398875, classIndex))",
        
        // Bounded scaling
        bounded: "max(0, base) * min(1000, max(1, pow(1.61803398875, classIndex + 1) / 2.2360679775))",
        
        // Safe logarithmic (prevents log of negative/zero)
        safeLog: "max(0, base) * pow(1.61803398875, max(0, log(max(1, classIndex + 2))) * 2.5)",
        
        // Linear fallback (simple and safe)
        linear: "max(0, base) * (1 + classIndex * 0.5)",
        
        // Diminishing returns (always positive, caps growth)
        diminishing: "max(0, base) * (1 + sqrt(classIndex) * 2)"
    },
    
    // Tier formulas with safeguards
    tierFormulas: {
        // Ensures base is positive
        positiveBase: "max(0, base) * pow(1.61803398875, tierIndex) / 2.2360679775",
        
        // Linear tier scaling (predictable)
        linear: "max(0, base) * (1 + (tierIndex - 1) * 0.2)",
        
        // Percentage based (always positive)
        percentage: "max(0, base) * (1 + (tierIndex - 1) * 0.15)",
        
        // Capped exponential
        cappedExponential: "max(0, base) * min(5, pow(1.3, tierIndex - 1))",
        
        // Square root progression (gentler scaling)
        sqrtProgression: "max(0, base) * (1 + sqrt(tierIndex - 1) * 0.5)"
    }
};

// ============================================
// VALIDATION AND TESTING
// ============================================

/**
 * Validate a formula string for potential negative results
 */
function validateFormula(formulaString, testCases = null) {
    const defaultTestCases = [
        { base: -10, index: 1 },    // Negative base
        { base: 0, index: 1 },      // Zero base
        { base: 0.001, index: 1 },  // Very small base
        { base: 100, index: 0 },    // Zero index
        { base: 100, index: 8 },    // Max class index
        { base: 100, index: -1 }    // Negative index (edge case)
    ];
    
    const cases = testCases || defaultTestCases;
    const results = [];
    
    cases.forEach(testCase => {
        try {
            // Create safe evaluation context
            const context = {
                base: testCase.base,
                classIndex: testCase.index,
                tierIndex: testCase.index,
                // Safe math functions
                abs: Math.abs,
                ceil: Math.ceil,
                floor: Math.floor,
                max: Math.max,
                min: Math.min,
                pow: Math.pow,
                round: Math.round,
                sqrt: Math.sqrt,
                log: (x) => Math.log(Math.max(0.000001, x)) // Safe log
            };
            
            // Evaluate formula
            const func = new Function(...Object.keys(context), `return ${formulaString};`);
            const result = func(...Object.values(context));
            
            results.push({
                ...testCase,
                result: result,
                isNegative: result < 0,
                isValid: !isNaN(result) && isFinite(result)
            });
        } catch (error) {
            results.push({
                ...testCase,
                result: null,
                isNegative: false,
                isValid: false,
                error: error.message
            });
        }
    });
    
    return {
        formula: formulaString,
        hasNegativeResults: results.some(r => r.isNegative),
        hasInvalidResults: results.some(r => !r.isValid),
        testResults: results
    };
}

/**
 * Suggest fixes for formulas that can produce negative values
 */
function suggestFormulaSafeguards(formulaString) {
    const suggestions = [];
    
    // Check if formula has max() safeguard on base
    if (!formulaString.includes('max(0, base)') && !formulaString.includes('max(1, base)')) {
        suggestions.push({
            issue: 'Base value not protected',
            fix: formulaString.replace(/\bbase\b/, 'max(0, base)'),
            description: 'Wrap base value in max(0, base) to ensure it\'s never negative'
        });
    }
    
    // Check for potential division by zero
    if (formulaString.includes('/') && !formulaString.includes('max(')) {
        suggestions.push({
            issue: 'Potential division by zero',
            fix: 'Add max() around divisor to prevent division by zero',
            description: 'Example: value / divisor → value / max(0.000001, divisor)'
        });
    }
    
    // Check for unprotected logarithm
    if (formulaString.includes('log(') && !formulaString.includes('max(1,')) {
        suggestions.push({
            issue: 'Unprotected logarithm',
            fix: formulaString.replace(/log\(([^)]+)\)/g, 'log(max(1, $1))'),
            description: 'Logarithm of non-positive numbers is undefined'
        });
    }
    
    // Suggest wrapping entire formula in max() for absolute safety
    if (!formulaString.startsWith('max(0,')) {
        suggestions.push({
            issue: 'No final result protection',
            fix: `max(0, ${formulaString})`,
            description: 'Wrap entire formula in max(0, ...) to guarantee positive result'
        });
    }
    
    return suggestions;
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Using safe formula functions directly
console.log('Safe Current Formula:', safeCurrentFormula(100, 3)); // Medium ship
console.log('Safe Log Growth:', safeLogarithmicGrowth(100, 3));
console.log('Safe Bounded:', safeBoundedScaling(100, 7, 1, 500)); // Titan with max cap

// Example 2: Using formula strings in the UI
console.log('\nRecommended Safe Formula Strings:');
console.log('Class:', safeFormulaStrings.classFormulas.bounded);
console.log('Tier:', safeFormulaStrings.tierFormulas.linear);

// Example 3: Validating a formula
const validation = validateFormula("base * pow(1.61803398875, classIndex)");
console.log('\nFormula Validation:', validation);

// Example 4: Getting suggestions for unsafe formula
const unsafe = "base * pow(1.61803398875, log(classIndex))";
const safeguards = suggestFormulaSafeguards(unsafe);
console.log('\nSafeguard Suggestions for:', unsafe);
safeguards.forEach(s => console.log(`- ${s.issue}: ${s.description}`));

// Export for use in other modules
const safeScalingFormulas = {
    // Safe formula functions
    formulas: {
        safeCurrentFormula,
        safeLogarithmicGrowth,
        safeExponentialWithFloor,
        safeBoundedScaling,
        safeTierFormula,
        safeLinearTierScaling
    },
    
    // Safe formula strings
    strings: safeFormulaStrings,
    
    // Utility functions
    utils: {
        ensurePositiveBase,
        ensurePositiveResult,
        safeScalingFormula,
        validateFormula,
        suggestFormulaSafeguards
    }
};

// Make available globally if needed
if (typeof window !== 'undefined') {
    window.safeScalingFormulas = safeScalingFormulas;
} 