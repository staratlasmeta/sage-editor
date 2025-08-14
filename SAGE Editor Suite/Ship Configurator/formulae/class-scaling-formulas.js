/**
 * Class Scaling Formulas for Ship Configuration
 * 
 * These formulas determine how ship attributes scale based on class size.
 * All formulas take 'base' (the base value) and 'classIndex' (0-7 for XXS to Titan)
 * 
 * The golden ratio (φ = 1.61803398875) and √5 (2.2360679775) are used in several formulas
 * 
 * FORMULA REFERENCE:
 * 
 * === EXPONENTIAL GROWTH FORMULAS (Higher classes get MORE benefit) ===
 * 
 * Current Formula:
 * base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )
 * 
 * Option 1 - Logarithmic Dampening:
 * base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 - classIndex * 0.15 )
 * 
 * Option 2 - Inverse Square Root Scaling:
 * base * pow( 1.61803398875 , (classIndex + 1) / sqrt(classIndex + 2) )
 * 
 * Option 3 - Piecewise Scaling:
 * base * (classIndex < 3 ? 
 *   pow( pow(1.61803398875, classIndex+1) / 2.2360679775, 2.5 ) : 
 *   pow( pow(1.61803398875, classIndex+1) / 2.2360679775, 2 - (classIndex-3) * 0.2 ))
 * 
 * Option 4 - Exponential Decay:
 * base * pow( pow(1.61803398875, classIndex+1) / 2.2360679775, 2 ) * pow(0.9, classIndex)
 * 
 * Option 5 - Logarithmic Growth (Recommended):
 * base * pow( 1.61803398875, log(classIndex + 2) * 2.5 )
 * 
 * === DIMINISHING RETURNS FORMULAS (Higher classes get LESS benefit) ===
 * 
 * Diminishing Option 1 - Simple Inverse (Strongest diminishing returns):
 * base / (classIndex + 1)
 * 
 * Diminishing Option 2 - Gentle Inverse (Moderate diminishing returns):
 * base / sqrt(classIndex + 1)
 * 
 * Diminishing Option 3 - Linear Decrease (Mild diminishing returns):
 * base * (10 - classIndex) / 10
 * 
 * Diminishing Option 4 - Exponential Decay (Customizable diminishing returns):
 * base * pow(0.85, classIndex)
 * 
 * Diminishing Option 5 - Logarithmic Decrease (Very gentle diminishing returns):
 * base * (2 - log(classIndex + 2))
 * 
 * Diminishing Option 6 - Golden Ratio Inverse (Balanced diminishing returns):
 * base * pow(1.61803398875, -(classIndex * 0.3))
 */

// Current Formula - Uses golden ratio with quadratic scaling
// Provides exponential growth across all ship classes
function currentFormula(base, classIndex) {
    return base * Math.pow(Math.pow(1.61803398875, classIndex + 1) / 2.2360679775, 2);
}

// Option 1: Logarithmic Dampening
// Reduces the scaling more dramatically for larger classes
// The exponent decreases as classIndex increases (2.0 → 1.0 for Titan)
function logarithmicDampening(base, classIndex) {
    return base * Math.pow(Math.pow(1.61803398875, classIndex + 1) / 2.2360679775, 2 - classIndex * 0.15);
}

// Option 2: Inverse Square Root Scaling
// Provides aggressive scaling for small ships that quickly tapers off
// Uses square root in denominator to create diminishing returns
function inverseSquareRootScaling(base, classIndex) {
    return base * Math.pow(1.61803398875, (classIndex + 1) / Math.sqrt(classIndex + 2));
}

// Option 3: Piecewise Scaling with Smooth Transition
// Different scaling rules for small (0-2) vs large (3+) ships
// Small ships get more aggressive scaling (exponent 2.5)
// Large ships get progressively dampened scaling
function piecewiseScaling(base, classIndex) {
    return base * (classIndex < 3 ? 
        Math.pow(Math.pow(1.61803398875, classIndex + 1) / 2.2360679775, 2.5) : 
        Math.pow(Math.pow(1.61803398875, classIndex + 1) / 2.2360679775, 2 - (classIndex - 3) * 0.2));
}

// Option 4: Exponential Decay Factor
// Applies the original formula but multiplies by a decay factor (0.9^classIndex)
// Each class step reduces the effective scaling by 10%
function exponentialDecay(base, classIndex) {
    return base * Math.pow(Math.pow(1.61803398875, classIndex + 1) / 2.2360679775, 2) * Math.pow(0.9, classIndex);
}

// Option 5: Logarithmic Growth (Recommended)
// Uses natural logarithm for smooth, controlled growth
// Provides the smoothest transition from aggressive to gentle scaling
// Naturally tapers off for larger ships while maintaining good scaling for smaller ones
function logarithmicGrowth(base, classIndex) {
    return base * Math.pow(1.61803398875, Math.log(classIndex + 2) * 2.5);
}

// === DIMINISHING RETURNS FORMULAS ===
// These formulas provide LESS benefit to higher class ships
// Useful for component scaling where you want smaller ships to benefit more

// Diminishing Option 1: Simple Inverse (Strongest diminishing returns)
// Higher classes get dramatically less benefit
// XXS gets 100%, XS gets 50%, Medium gets 25%, Titan gets 11%
function simpleInverse(base, classIndex) {
    return base / (classIndex + 1);
}

// Diminishing Option 2: Gentle Inverse (Moderate diminishing returns)
// Uses square root to soften the inverse effect
// XXS gets 100%, XS gets 71%, Medium gets 50%, Titan gets 33%
function gentleInverse(base, classIndex) {
    return base / Math.sqrt(classIndex + 1);
}

// Diminishing Option 3: Linear Decrease (Mild diminishing returns)
// Linear reduction in benefit as class increases
// XXS gets 90%, XS gets 80%, Medium gets 60%, Titan gets 10%
function linearDecrease(base, classIndex) {
    return base * (10 - classIndex) / 10;
}

// Diminishing Option 4: Exponential Decay (Customizable diminishing returns)
// Each class step reduces benefit by a percentage (default 15%)
// XXS gets 100%, XS gets 85%, Medium gets 72%, Titan gets 47%
function exponentialDecayDiminishing(base, classIndex) {
    return base * Math.pow(0.85, classIndex);
}

// Diminishing Option 5: Logarithmic Decrease (Very gentle diminishing returns)
// Natural logarithm creates gentle tapering
// Provides smooth transition with mild diminishing returns
function logarithmicDecrease(base, classIndex) {
    return base * (2 - Math.log(classIndex + 2));
}

// Diminishing Option 6: Golden Ratio Inverse (Balanced diminishing returns)
// Uses golden ratio in inverse for aesthetic mathematical balance
// Provides moderate diminishing returns with mathematical elegance
function goldenRatioInverse(base, classIndex) {
    return base * Math.pow(1.61803398875, -(classIndex * 0.3));
}

// Test function to compare all formulas
function compareFormulas(base = 1) {
    const classNames = ['XXS', 'XS', 'Small', 'Medium', 'Large', 'Capital', 'Commander', 'Titan'];
    
    console.log('Class Scaling Formula Comparison (base = ' + base + ')');
    console.log('==================================================');
    console.log('EXPONENTIAL GROWTH FORMULAS:');
    console.log('Class\t\tCurrent\tOpt1\tOpt2\tOpt3\tOpt4\tOpt5');
    console.log('--------------------------------------------------');
    
    for (let i = 0; i < 8; i++) {
        const current = currentFormula(base, i).toFixed(2);
        const opt1 = logarithmicDampening(base, i).toFixed(2);
        const opt2 = inverseSquareRootScaling(base, i).toFixed(2);
        const opt3 = piecewiseScaling(base, i).toFixed(2);
        const opt4 = exponentialDecay(base, i).toFixed(2);
        const opt5 = logarithmicGrowth(base, i).toFixed(2);
        
        console.log(`${classNames[i]}\t\t${current}\t${opt1}\t${opt2}\t${opt3}\t${opt4}\t${opt5}`);
    }
    
    console.log('\n');
    console.log('DIMINISHING RETURNS FORMULAS:');
    console.log('Class\t\tSimple\tGentle\tLinear\tExpDecay\tLogDec\tGolden');
    console.log('--------------------------------------------------');
    
    for (let i = 0; i < 8; i++) {
        const simple = simpleInverse(base, i).toFixed(2);
        const gentle = gentleInverse(base, i).toFixed(2);
        const linear = linearDecrease(base, i).toFixed(2);
        const expDecay = exponentialDecayDiminishing(base, i).toFixed(2);
        const logDec = logarithmicDecrease(base, i).toFixed(2);
        const golden = goldenRatioInverse(base, i).toFixed(2);
        
        console.log(`${classNames[i]}\t\t${simple}\t${gentle}\t${linear}\t${expDecay}\t${logDec}\t${golden}`);
    }
}

// Export all formulas for use in other modules
const classScalingFormulas = {
    // Exponential Growth Formulas (higher classes get MORE benefit)
    current: currentFormula,
    logarithmicDampening: logarithmicDampening,
    inverseSquareRootScaling: inverseSquareRootScaling,
    piecewiseScaling: piecewiseScaling,
    exponentialDecay: exponentialDecay,
    logarithmicGrowth: logarithmicGrowth,
    
    // Diminishing Returns Formulas (higher classes get LESS benefit)
    simpleInverse: simpleInverse,
    gentleInverse: gentleInverse,
    linearDecrease: linearDecrease,
    exponentialDecayDiminishing: exponentialDecayDiminishing,
    logarithmicDecrease: logarithmicDecrease,
    goldenRatioInverse: goldenRatioInverse,
    
    // Utility
    compare: compareFormulas
};

// Example usage:
// classScalingFormulas.compare(100); // Compare all formulas with base value of 100
// 
// EXPONENTIAL GROWTH EXAMPLES (higher classes get MORE benefit):
// const scaledValue = classScalingFormulas.logarithmicGrowth(100, 3); // Scale base 100 for Medium ship
// const scaledValue = classScalingFormulas.current(100, 7); // Use current formula for Titan
// 
// DIMINISHING RETURNS EXAMPLES (higher classes get LESS benefit):
// const scaledValue = classScalingFormulas.gentleInverse(100, 3); // Moderate diminishing returns for Medium ship
// const scaledValue = classScalingFormulas.exponentialDecayDiminishing(100, 7); // Customizable diminishing returns for Titan
// const scaledValue = classScalingFormulas.linearDecrease(100, 0); // Linear decrease for XXS ship 