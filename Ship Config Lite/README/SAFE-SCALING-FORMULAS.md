# Safe Scaling Formulas Guide

## Overview

This guide explains how to create and use scaling formulas that **never produce negative values** in Ship Config Lite. Negative values can break game balance and cause errors in calculations.

## Quick Start - Safe Formula Templates

### Class Scaling Formulas

```javascript
// RECOMMENDED - Bounded with safeguards
max(0, base) * min(1000, max(1, pow(1.61803398875, classIndex + 1) / 2.2360679775))

// Linear (simple and predictable)
max(0, base) * (1 + classIndex * 0.5)

// Diminishing returns
max(0, base) * (1 + sqrt(classIndex) * 2)

// Safe logarithmic
max(0, base) * pow(1.61803398875, max(0, log(max(1, classIndex + 2))) * 2.5)
```

### Tier Scaling Formulas

```javascript
// Linear tier scaling (predictable 20% per tier)
max(0, base) * (1 + (tierIndex - 1) * 0.2)

// Percentage based (15% per tier)
max(0, base) * (1 + (tierIndex - 1) * 0.15)

// Capped exponential (max 5x multiplier)
max(0, base) * min(5, pow(1.3, tierIndex - 1))

// Square root progression (gentler scaling)
max(0, base) * (1 + sqrt(tierIndex - 1) * 0.5)
```

## Why Formulas Can Go Negative

1. **Negative Base Values** - If a stat starts negative
2. **Mathematical Operations** - log() of zero/negative, negative exponents
3. **Formula Errors** - Division by zero, undefined operations
4. **Edge Cases** - Unexpected index values

## Protection Strategies

### 1. Pre-Validation (Protect Inputs)

Always ensure base values are positive:

```javascript
// Instead of: base * formula
// Use: max(0, base) * formula

// Or with a minimum threshold:
max(1, base) * formula
```

### 2. Post-Validation (Protect Results)

Wrap entire formula to guarantee positive output:

```javascript
// Ensure result is never negative
max(0, your_formula_here)

// Ensure minimum value
max(10, your_formula_here)  // Minimum of 10
```

### 3. Safe Mathematical Functions

```javascript
// Safe logarithm (prevents log of zero/negative)
log(max(1, value))

// Safe division (prevents divide by zero)
value / max(0.001, divisor)

// Safe power (ensure positive base for fractional exponents)
pow(max(0, base), exponent)
```

## Common Formula Patterns

### Pattern 1: Golden Ratio Scaling (Protected)

```javascript
// Original (can be negative if base < 0)
base * pow(1.61803398875, classIndex)

// Safe version
max(0, base) * pow(1.61803398875, classIndex)
```

### Pattern 2: Exponential with Bounds

```javascript
// Ensures result is between min and max
max(0, base) * min(maxMultiplier, max(minMultiplier, pow(1.618, classIndex)))

// Example with 1x to 100x bounds
max(0, base) * min(100, max(1, pow(1.618, classIndex)))
```

### Pattern 3: Linear Scaling (Foolproof)

```javascript
// Simple linear scaling - easy to understand and control
max(0, base) * (1 + (classIndex - 1) * scaleFactor)

// Example: 50% increase per class
max(0, base) * (1 + (classIndex - 1) * 0.5)
```

### Pattern 4: Diminishing Returns

```javascript
// Growth slows down for higher indices
max(0, base) * (1 + sqrt(classIndex) * multiplier)

// Example with 2x multiplier
max(0, base) * (1 + sqrt(classIndex) * 2)
```

## Testing Your Formulas

Before using a formula, test it with edge cases:

```javascript
// Test cases to check:
base = -10, classIndex = 1    // Negative base
base = 0, classIndex = 1      // Zero base
base = 0.001, classIndex = 1  // Very small base
base = 100, classIndex = 0    // Zero index
base = 100, classIndex = 8    // Maximum index
```

## Implementation in Ship Config Lite

### Step 1: Open Scaling Formulas Panel

1. Go to Attributes Editor (wrench icon)
2. Select a category (e.g., "Ship Component")
3. Click "Scaling Formulas" button

### Step 2: Enter Safe Formula

Replace the default formula with a safe version:

```javascript
// Default (potentially unsafe)
base * pow(1.61803398875, classIndex)

// Safe replacement
max(0, base) * pow(1.61803398875, classIndex)
```

### Step 3: Apply and Test

1. Click "Apply Formula"
2. Check the attribute values in the table
3. Verify all values are positive

## Advanced Safeguards

### Custom Minimum Values

Set different minimum values for different stats:

```javascript
// Health should never be less than 100
max(100, base * pow(1.618, classIndex))

// Damage should never be less than 1
max(1, base * pow(1.618, classIndex))

// Speed can be 0 but not negative
max(0, base * pow(1.618, classIndex))
```

### Conditional Formulas

Different behavior based on conditions:

```javascript
// Different scaling for small vs large ships
(classIndex < 4) ? 
  max(0, base * pow(1.8, classIndex)) :      // Aggressive for small
  max(0, base * pow(1.3, classIndex))        // Gentle for large
```

### Error Handling

Fallback to safe values on error:

```javascript
// If formula fails, use base value
max(base, <complex_formula_that_might_fail>)
```

## Best Practices

1. **Always use max(0, base)** at minimum
2. **Test with edge cases** before applying
3. **Document your formulas** with comments
4. **Use simple formulas** when possible
5. **Set reasonable bounds** (min/max limits)

## Troubleshooting

### Formula produces NaN or Infinity

```javascript
// Add finite check
isFinite(result) ? result : base
```

### Formula is too aggressive

```javascript
// Add dampening factor
max(0, base) * pow(1.618, classIndex * 0.7)  // 0.7 dampens growth
```

### Formula is too complex

```javascript
// Simplify to linear
max(0, base) * (1 + classIndex * 0.4)  // 40% per class
```

## Examples by Stat Type

### Combat Stats (Health, Shield, Armor)
```javascript
// Never allow less than 10% of base
max(base * 0.1, base * pow(1.618, classIndex))
```

### Speed Stats
```javascript
// Cap maximum speed to prevent issues
max(0, min(1000, base * pow(1.4, classIndex)))
```

### Damage Stats
```javascript
// Ensure minimum damage of 1
max(1, base * pow(1.618, classIndex))
```

### Capacity Stats
```javascript
// Linear scaling often better for capacities
max(0, base * (1 + classIndex * 0.3))
```

## Quick Reference

| Operation | Unsafe | Safe |
|-----------|--------|------|
| Base value | `base` | `max(0, base)` |
| Logarithm | `log(x)` | `log(max(1, x))` |
| Division | `a / b` | `a / max(0.001, b)` |
| Square root | `sqrt(x)` | `sqrt(max(0, x))` |
| Power with fraction | `pow(x, 0.5)` | `pow(max(0, x), 0.5)` |
| Final result | `formula` | `max(0, formula)` |

## Conclusion

Using safe scaling formulas ensures your ship configurations never have negative values, preventing game-breaking bugs and maintaining balance. Always wrap your formulas with appropriate safeguards and test thoroughly before applying to production data. 