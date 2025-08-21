(function() {
    // Initialize battle log
    let log = [];
    
    // RNG helper function
    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Roll for percentage chance (returns true/false)
    function rollChance(chance) {
        return Math.random() < chance;
    }
    
    // Calculate individual damage types for each fleet with RNG
    let leftDamages = {
        base: left.damage || 0,
        kinetic: left.damage_kinetic || 0,
        energy: left.damage_energy || 0,
        emp: left.damage_emp || 0,
        superchill: left.damage_superchill || 0,
        graygoo: left.damage_graygoo || 0,
        shockwave: left.damage_shockwave || 0,
        heat: left.damage_heat || 0,
        bomb: left.damage_bomb || 0
    };
    
    let rightDamages = {
        base: right.damage || 0,
        kinetic: right.damage_kinetic || 0,
        energy: right.damage_energy || 0,
        emp: right.damage_emp || 0,
        superchill: right.damage_superchill || 0,
        graygoo: right.damage_graygoo || 0,
        shockwave: right.damage_shockwave || 0,
        heat: right.damage_heat || 0,
        bomb: right.damage_bomb || 0
    };
    
    // Apply damage range RNG to each damage type
    let leftDamageRange = left.damage_range || 0;
    let rightDamageRange = right.damage_range || 0;
    
    for (let dmgType in leftDamages) {
        if (leftDamages[dmgType] > 0) {
            let baseValue = leftDamages[dmgType];
            let minDmg = baseValue * (1 - leftDamageRange);
            let maxDmg = baseValue * (1 + leftDamageRange);
            leftDamages[dmgType] = randomRange(minDmg, maxDmg);
            log.push(`Left ${dmgType} rolled: ${leftDamages[dmgType].toFixed(1)} (base: ${baseValue}, range: ±${(leftDamageRange*100).toFixed(0)}%)`);
        }
        
        if (rightDamages[dmgType] > 0) {
            let baseValue = rightDamages[dmgType];
            let minDmg = baseValue * (1 - rightDamageRange);
            let maxDmg = baseValue * (1 + rightDamageRange);
            rightDamages[dmgType] = randomRange(minDmg, maxDmg);
            log.push(`Right ${dmgType} rolled: ${rightDamages[dmgType].toFixed(1)} (base: ${baseValue}, range: ±${(rightDamageRange*100).toFixed(0)}%)`);
        }
    }
    
    // Calculate damage type diversity bonus
    let leftDamageTypes = Object.values(leftDamages).filter(d => d > 0).length;
    let rightDamageTypes = Object.values(rightDamages).filter(d => d > 0).length;
    let leftDiversityBonus = 1 + Math.max(0, leftDamageTypes - 1) * 0.05;
    let rightDiversityBonus = 1 + Math.max(0, rightDamageTypes - 1) * 0.05;
    
    log.push(`Left damage diversity: ${leftDamageTypes} types (${((leftDiversityBonus-1)*100).toFixed(0)}% bonus)`);
    log.push(`Right damage diversity: ${rightDamageTypes} types (${((rightDiversityBonus-1)*100).toFixed(0)}% bonus)`);
    
    // Map counters to their damage types
    let leftCounters = {
        kinetic: left.counter_flare || 0,
        energy: left.counter_energy_capacitor || 0,
        emp: left.counter_faraday_shielding || 0,
        superchill: left.counter_warming_plates || 0,
        graygoo: left.counter_healing_nanobots || 0,
        shockwave: left.counter_negative_rem_plating || 0,
        heat: left.counter_fire_suppressor || 0,
        bomb: left.counter_mine || 0,
        base: left.counter_decoy || 0
    };
    
    let rightCounters = {
        kinetic: right.counter_flare || 0,
        energy: right.counter_energy_capacitor || 0,
        emp: right.counter_faraday_shielding || 0,
        superchill: right.counter_warming_plates || 0,
        graygoo: right.counter_healing_nanobots || 0,
        shockwave: right.counter_negative_rem_plating || 0,
        heat: right.counter_fire_suppressor || 0,
        bomb: right.counter_mine || 0,
        base: right.counter_decoy || 0
    };
    
    // Apply counters with RNG effectiveness (80-100% of stated value)
    let leftEffectiveDamages = {};
    let rightEffectiveDamages = {};
    let leftTotalDamage = 0;
    let rightTotalDamage = 0;
    
    for (let dmgType in leftDamages) {
        let leftDmg = leftDamages[dmgType];
        let rightDmg = rightDamages[dmgType];
        let leftCounter = rightCounters[dmgType];
        let rightCounter = leftCounters[dmgType];
        
        // Add RNG to counter effectiveness (80-100% of counter value)
        let leftCounterEffectiveness = leftCounter * randomRange(0.8, 1.0);
        let rightCounterEffectiveness = rightCounter * randomRange(0.8, 1.0);
        
        // Counters reduce damage of their type by up to 90%
        let leftReduction = Math.min(0.9, leftCounterEffectiveness / (leftDmg + 1));
        let rightReduction = Math.min(0.9, rightCounterEffectiveness / (rightDmg + 1));
        
        leftEffectiveDamages[dmgType] = leftDmg * (1 - leftReduction);
        rightEffectiveDamages[dmgType] = rightDmg * (1 - rightReduction);
        
        leftTotalDamage += leftEffectiveDamages[dmgType];
        rightTotalDamage += rightEffectiveDamages[dmgType];
        
        if (leftDmg > 0) log.push(`Left ${dmgType}: ${leftDmg.toFixed(1)} → ${leftEffectiveDamages[dmgType].toFixed(1)} (blocked ${(leftReduction*100).toFixed(0)}%)`);
        if (rightDmg > 0) log.push(`Right ${dmgType}: ${rightDmg.toFixed(1)} → ${rightEffectiveDamages[dmgType].toFixed(1)} (blocked ${(rightReduction*100).toFixed(0)}%)`);
    }
    
    // Apply diversity bonus to total damage
    leftTotalDamage *= leftDiversityBonus;
    rightTotalDamage *= rightDiversityBonus;
    
    // Apply critical strikes with actual RNG rolls
    let leftCritChance = left.crit_chance || 0;
    let rightCritChance = right.crit_chance || 0;
    let leftCritMult = left.crit_multiplier || 1;
    let rightCritMult = right.crit_multiplier || 1;
    
    // Roll for critical hits
    let leftCrit = rollChance(leftCritChance);
    let rightCrit = rollChance(rightCritChance);
    
    let leftCritBonus = leftCrit ? leftCritMult : 1;
    let rightCritBonus = rightCrit ? rightCritMult : 1;
    
    leftTotalDamage *= leftCritBonus;
    rightTotalDamage *= rightCritBonus;
    
    log.push(`Left crit: ${leftCrit ? 'YES!' : 'no'} (${(leftCritChance*100).toFixed(0)}% chance, x${leftCritMult} mult) → x${leftCritBonus}`);
    log.push(`Right crit: ${rightCrit ? 'YES!' : 'no'} (${(rightCritChance*100).toFixed(0)}% chance, x${rightCritMult} mult) → x${rightCritBonus}`);
    
    // Calculate defenses with slight RNG variation (±5%)
    let leftHP = (left.hit_points || 0) * randomRange(0.95, 1.05);
    let rightHP = (right.hit_points || 0) * randomRange(0.95, 1.05);
    let leftShields = (left.shield_points || 0) * randomRange(0.95, 1.05);
    let rightShields = (right.shield_points || 0) * randomRange(0.95, 1.05);
    let leftDefense = leftHP + leftShields;
    let rightDefense = rightHP + rightShields;
    
    log.push(`Left defense: ${leftDefense.toFixed(0)} (${leftHP.toFixed(0)} HP + ${leftShields.toFixed(0)} shields)`);
    log.push(`Right defense: ${rightDefense.toFixed(0)} (${rightHP.toFixed(0)} HP + ${rightShields.toFixed(0)} shields)`);
    
    // Calculate time to kill
    let leftTTK = rightDefense / Math.max(0.1, leftTotalDamage);
    let rightTTK = leftDefense / Math.max(0.1, rightTotalDamage);
    
    log.push(`Left deals ${leftTotalDamage.toFixed(1)} DPS, kills right in ${leftTTK.toFixed(1)}s`);
    log.push(`Right deals ${rightTotalDamage.toFixed(1)} DPS, kills left in ${rightTTK.toFixed(1)}s`);
    
    // Factor in shield regeneration with RNG (80-120% effectiveness)
    let combatDuration = Math.min(leftTTK, rightTTK);
    let leftShieldRegen = (left.shield_recharge_rate || 0) * Math.max(0, combatDuration - (left.shield_break_delay || 0)) * randomRange(0.8, 1.2);
    let rightShieldRegen = (right.shield_recharge_rate || 0) * Math.max(0, combatDuration - (right.shield_break_delay || 0)) * randomRange(0.8, 1.2);
    
    if (leftShieldRegen > 0) log.push(`Left regenerates ${leftShieldRegen.toFixed(0)} shields`);
    if (rightShieldRegen > 0) log.push(`Right regenerates ${rightShieldRegen.toFixed(0)} shields`);
    
    leftDefense += leftShieldRegen;
    rightDefense += rightShieldRegen;
    
    // Action points determine attack speed with slight variance
    let leftAPRate = (left.max_ap || 1) / Math.max(1, left.ap_recharge_time || 1) * randomRange(0.9, 1.1);
    let rightAPRate = (right.max_ap || 1) / Math.max(1, right.ap_recharge_time || 1) * randomRange(0.9, 1.1);
    
    leftTotalDamage *= (1 + leftAPRate / 10);
    rightTotalDamage *= (1 + rightAPRate / 10);
    
    log.push(`Left AP rate: ${leftAPRate.toFixed(2)} (${(leftAPRate/10*100).toFixed(0)}% damage bonus)`);
    log.push(`Right AP rate: ${rightAPRate.toFixed(2)} (${(rightAPRate/10*100).toFixed(0)}% damage bonus)`);
    
    // Fleet size with diminishing returns (use fourth root instead of square root)
    let leftFleetPower = Math.pow(left.ship_size_value || 1, 0.25) * (1 + (left.required_crew || 0) / 1000);
    let rightFleetPower = Math.pow(right.ship_size_value || 1, 0.25) * (1 + (right.required_crew || 0) / 1000);
    
    log.push(`Left fleet power: ${leftFleetPower.toFixed(2)} (from size ${left.ship_size_value})`);
    log.push(`Right fleet power: ${rightFleetPower.toFixed(2)} (from size ${right.ship_size_value})`);
    
    let leftLogistics = 1 + Math.log10(1 + (left.cargo_capacity || 0)) / 10;
    let rightLogistics = 1 + Math.log10(1 + (right.cargo_capacity || 0)) / 10;
    
    // Enhanced repair effectiveness with repair ability factored in
    let leftRepairScore = (left.repair_rate || 0) * (left.repair_efficiency || 0) * (1 + (left.repair_ability || 0) / 100);
    let rightRepairScore = (right.repair_rate || 0) * (right.repair_efficiency || 0) * (1 + (right.repair_ability || 0) / 100);
    let leftRepairFactor = 1 + (leftRepairScore * randomRange(0.7, 1.3)) / 10000;
    let rightRepairFactor = 1 + (rightRepairScore * randomRange(0.7, 1.3)) / 10000;
    
    // Mining and economy advantage (better economy = better equipment)
    let leftEconomy = 1 + ((left.asteroid_mining_rate || 0) * (left.loot_rate || 0)) / 10;
    let rightEconomy = 1 + ((right.asteroid_mining_rate || 0) * (right.loot_rate || 0)) / 10;
    
    // Enhanced speed advantage calculation
    let leftSpeed = Math.max(left.subwarp_speed || 0, left.warp_speed || 0) * randomRange(0.9, 1.1);
    let rightSpeed = Math.max(right.subwarp_speed || 0, right.warp_speed || 0) * randomRange(0.9, 1.1);
    
    // Speed advantage based on speed ratio with logarithmic scaling
    let speedRatio = leftSpeed / Math.max(0.001, rightSpeed);
    let leftSpeedAdvantage = speedRatio > 1 ? 1 + Math.log(speedRatio) * 0.2 : 1;
    let rightSpeedAdvantage = speedRatio < 1 ? 1 + Math.log(1/speedRatio) * 0.2 : 1;
    
    log.push(`Left speed advantage: x${leftSpeedAdvantage.toFixed(3)} (speed ${leftSpeed.toFixed(3)})`);
    log.push(`Right speed advantage: x${rightSpeedAdvantage.toFixed(3)} (speed ${rightSpeed.toFixed(3)})`);
    
    // Scan power affects targeting accuracy
    let leftScanBonus = 1 + Math.log10(1 + (left.scan_power || 0)) / 30;
    let rightScanBonus = 1 + Math.log10(1 + (right.scan_power || 0)) / 30;
    
    log.push(`Left scan bonus: x${leftScanBonus.toFixed(3)} (scan power ${left.scan_power || 0})`);
    log.push(`Right scan bonus: x${rightScanBonus.toFixed(3)} (scan power ${right.scan_power || 0})`);
    
    // Loading rate affects sustained combat (reload speed)
    let leftLoadingBonus = 1 + (left.loading_rate || 0) / 200;
    let rightLoadingBonus = 1 + (right.loading_rate || 0) / 200;
    
    // Add "luck factor" - small random modifier representing pilot skill, positioning, etc.
    let leftLuck = randomRange(0.95, 1.05);
    let rightLuck = randomRange(0.95, 1.05);
    log.push(`Left luck factor: ${leftLuck.toFixed(3)}`);
    log.push(`Right luck factor: ${rightLuck.toFixed(3)}`);
    
    // Final combat scores
    let leftFinalDamage = leftTotalDamage * leftFleetPower * leftLogistics * leftRepairFactor * leftEconomy * leftSpeedAdvantage * leftScanBonus * leftLoadingBonus * leftLuck;
    let rightFinalDamage = rightTotalDamage * rightFleetPower * rightLogistics * rightRepairFactor * rightEconomy * rightSpeedAdvantage * rightScanBonus * rightLoadingBonus * rightLuck;
    
    let leftScore = leftFinalDamage / Math.max(1, rightDefense);
    let rightScore = rightFinalDamage / Math.max(1, leftDefense);
    
    log.push(`FINAL SCORES: Left=${leftScore.toFixed(3)}, Right=${rightScore.toFixed(3)}`);
    
    // Determine winner with more nuanced thresholds
    let result;
    let ratio = leftScore / rightScore;
    
    if (Math.abs(leftScore - rightScore) < 0.01) {
        result = "DRAW";
        log.push("Result: Draw - perfectly matched!");
    } else if (ratio > 5) {
        result = "LEFT ANNIHILATES";
        log.push("Result: Left fleet completely annihilates opposition!");
    } else if (ratio < 0.2) {
        result = "RIGHT ANNIHILATES";
        log.push("Result: Right fleet completely annihilates opposition!");
    } else if (ratio > 3) {
        result = "LEFT DOMINATES";
        log.push("Result: Left fleet dominates the battlefield!");
    } else if (ratio < 0.33) {
        result = "RIGHT DOMINATES";
        log.push("Result: Right fleet dominates the battlefield!");
    } else if (ratio > 1.5) {
        result = "LEFT WINS DECISIVELY";
        log.push("Result: Left wins with clear advantage");
    } else if (ratio < 0.67) {
        result = "RIGHT WINS DECISIVELY";
        log.push("Result: Right wins with clear advantage");
    } else if (ratio > 1.1) {
        result = "LEFT WINS";
        log.push("Result: Left wins in close battle");
    } else if (ratio < 0.91) {
        result = "RIGHT WINS";
        log.push("Result: Right wins in close battle");
    } else {
        result = "VERY CLOSE - " + (leftScore > rightScore ? "LEFT EDGES OUT" : "RIGHT EDGES OUT");
        log.push("Result: Extremely close battle!");
    }
    
    // Key factors
    let factors = [];
    if (leftCrit && !rightCrit) factors.push("Left landed critical hit!");
    if (rightCrit && !leftCrit) factors.push("Right landed critical hit!");
    if (leftTotalDamage > rightTotalDamage * 1.2) factors.push("Left has superior firepower");
    if (rightTotalDamage > leftTotalDamage * 1.2) factors.push("Right has superior firepower");
    if (leftDefense > rightDefense * 1.2) factors.push("Left has stronger defenses");
    if (rightDefense > leftDefense * 1.2) factors.push("Right has stronger defenses");
    if (leftSpeed > rightSpeed * 1.2) factors.push("Left has speed advantage");
    if (rightSpeed > leftSpeed * 1.2) factors.push("Right has speed advantage");
    if (leftDamageTypes > rightDamageTypes) factors.push("Left has damage type diversity");
    if (rightDamageTypes > leftDamageTypes) factors.push("Right has damage type diversity");
    if (leftScanBonus > rightScanBonus * 1.05) factors.push("Left has superior targeting");
    if (rightScanBonus > leftScanBonus * 1.05) factors.push("Right has superior targeting");
    if (leftLuck > 1.03) factors.push("Left had excellent positioning");
    if (rightLuck > 1.03) factors.push("Right had excellent positioning");
    
    log.push("KEY FACTORS: " + (factors.length > 0 ? factors.join(", ") : "Evenly matched"));
    
    // Return result with breakdown
    return result + "\n\n=== BATTLE BREAKDOWN ===\n" + log.join("\n");
})() 