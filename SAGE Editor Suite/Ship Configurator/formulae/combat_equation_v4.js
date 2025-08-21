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
    
    // Get ship size from stats
    function getShipSize(fleet) {
        return fleet.ship_size || 100; // Default to 100 if not specified
    }
    
    // Calculate hit chance based on ship sizes (using actual size values)
    function calculateSizeBasedHitChance(attackerSize, defenderSize) {
        const baseHitChance = 0.85; // 85% base
        
        // Calculate size ratio
        const sizeRatio = attackerSize / defenderSize;
        
        // Size penalty/bonus calculation
        // If attacker is larger (ratio > 1), apply penalty
        // If attacker is smaller (ratio < 1), apply bonus
        let sizeModifier = 1;
        
        if (sizeRatio > 1) {
            // Larger attacker has harder time hitting smaller target
            // Every 2x size = -15% hit chance
            const scaleFactor = Math.log2(sizeRatio);
            sizeModifier = 1 - (scaleFactor * 0.15);
        } else if (sizeRatio < 1) {
            // Smaller attacker has easier time hitting larger target
            // Every 0.5x size = +5% hit chance
            const scaleFactor = Math.log2(1 / sizeRatio);
            sizeModifier = 1 + (scaleFactor * 0.05);
        }
        
        const hitChance = baseHitChance * sizeModifier;
        return Math.max(0.05, Math.min(1.0, hitChance)); // Clamp between 5% and 100%
    }
    
    // Combat configuration
    const config = {
        // Cooldown settings
        defaultAttackCooldown: 2,    // rounds
        cooldownTickPerRound: 1,
        
        // Alpha bonuses (by level 0-4)
        alphaStrikeBonuses: [0, 10, 20, 30, 40], // Percent damage bonus
        alphaShieldReductions: [0, 0.1, 0.2, 0.3, 0.4], // Damage reduction
        
        // Ammo
        ammoPerAttack: 1,
        
        // Combat limits
        maxRounds: 1000,
        minDamageFloor: 0.1
    };
    
    // Get parameters from window
    let firstStriker = window.combatFirstStriker || 'left';
    
    // Get alpha tier levels (0-4)
    let leftAlphaStrikeLevel = window.leftAlphaStrikeLevel || 0;
    let rightAlphaStrikeLevel = window.rightAlphaStrikeLevel || 0;
    let leftAlphaShieldLevel = window.leftAlphaShieldLevel || 0;
    let rightAlphaShieldLevel = window.rightAlphaShieldLevel || 0;
    
    // Calculate alpha bonuses from tier levels
    let leftAlphaStrikeBonus = config.alphaStrikeBonuses[leftAlphaStrikeLevel];
    let rightAlphaStrikeBonus = config.alphaStrikeBonuses[rightAlphaStrikeLevel];
    let leftAlphaShieldReduction = config.alphaShieldReductions[leftAlphaShieldLevel];
    let rightAlphaShieldReduction = config.alphaShieldReductions[rightAlphaShieldLevel];
    
    // Get skill levels (0-4)
    let leftFlightSpeedLevel = window.leftFlightSpeedLevel || 0;
    let rightFlightSpeedLevel = window.rightFlightSpeedLevel || 0;
    let leftManeuverabilityLevel = window.leftManeuverabilityLevel || 0;
    let rightManeuverabilityLevel = window.rightManeuverabilityLevel || 0;
    
    // Calculate skill bonuses
    let leftFlightSpeedBonus = 1 + (leftFlightSpeedLevel * 0.1);
    let rightFlightSpeedBonus = 1 + (rightFlightSpeedLevel * 0.1);
    let leftManeuverabilityBonus = leftManeuverabilityLevel * 0.05;
    let rightManeuverabilityBonus = rightManeuverabilityLevel * 0.05;
    
    log.push(`=== COMBAT CONFIGURATION ===`);
    log.push(`First striker: ${firstStriker}`);
    log.push(`Left: Alpha Strike Tier ${leftAlphaStrikeLevel} (+${leftAlphaStrikeBonus}%), Alpha Shield Tier ${leftAlphaShieldLevel} (-${(leftAlphaShieldReduction*100).toFixed(0)}%)`);
    log.push(`Right: Alpha Strike Tier ${rightAlphaStrikeLevel} (+${rightAlphaStrikeBonus}%), Alpha Shield Tier ${rightAlphaShieldLevel} (-${(rightAlphaShieldReduction*100).toFixed(0)}%)`);
    log.push(`Left skills: Flight Speed Lv${leftFlightSpeedLevel} (+${((leftFlightSpeedBonus-1)*100).toFixed(0)}%), Maneuverability Lv${leftManeuverabilityLevel} (+${(leftManeuverabilityBonus*100).toFixed(0)}% dodge)`);
    log.push(`Right skills: Flight Speed Lv${rightFlightSpeedLevel} (+${((rightFlightSpeedBonus-1)*100).toFixed(0)}%), Maneuverability Lv${rightManeuverabilityLevel} (+${(rightManeuverabilityBonus*100).toFixed(0)}% dodge)`);
    
    // Get ship sizes
    let leftShipSize = getShipSize(left);
    let rightShipSize = getShipSize(right);
    log.push(`Ship sizes: Left=${leftShipSize}, Right=${rightShipSize} (ratio: ${(leftShipSize/rightShipSize).toFixed(2)})`);
    
    // Calculate base damage types
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
    
    // Apply missile power to bomb damage
    let leftMissilePower = left.missile_power || 1;
    let rightMissilePower = right.missile_power || 1;
    let leftMissileCapacity = left.missile_capacity || 0;
    let rightMissileCapacity = right.missile_capacity || 0;
    
    if (leftMissileCapacity > 0 && leftDamages.bomb > 0) {
        let missileBoost = Math.min(leftMissilePower, leftMissileCapacity / 100);
        leftDamages.bomb *= missileBoost;
        log.push(`Left missile boost: x${missileBoost.toFixed(2)} on bomb damage`);
    }
    
    if (rightMissileCapacity > 0 && rightDamages.bomb > 0) {
        let missileBoost = Math.min(rightMissilePower, rightMissileCapacity / 100);
        rightDamages.bomb *= missileBoost;
        log.push(`Right missile boost: x${missileBoost.toFixed(2)} on bomb damage`);
    }
    
    // Calculate damage diversity bonus
    let leftDamageTypes = Object.values(leftDamages).filter(d => d > 0).length;
    let rightDamageTypes = Object.values(rightDamages).filter(d => d > 0).length;
    let leftDiversityBonus = 1 + Math.max(0, leftDamageTypes - 1) * 0.05;
    let rightDiversityBonus = 1 + Math.max(0, rightDamageTypes - 1) * 0.05;
    
    log.push(`Damage diversity: Left=${leftDamageTypes} types (+${((leftDiversityBonus-1)*100).toFixed(0)}%), Right=${rightDamageTypes} types (+${((rightDiversityBonus-1)*100).toFixed(0)}%)`);
    
    // Map counters
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
    
    // Stealth and scanner setup
    let leftStealth = left.stealth_power || 0;
    let rightStealth = right.stealth_power || 0;
    let leftScanPower = left.scan_power || 0;
    let rightScanPower = right.scan_power || 0;
    
    // Check if scanners break stealth
    let leftStealthBroken = rightScanPower >= leftStealth;
    let rightStealthBroken = leftScanPower >= rightStealth;
    
    // Track if stealth has been revealed (for first-strike auto-dodge)
    let leftStealthRevealed = leftStealthBroken;
    let rightStealthRevealed = rightStealthBroken;
    
    // Calculate dodge chance
    let leftSpeed = Math.max(left.subwarp_speed || 0, left.warp_speed || 0) * leftFlightSpeedBonus;
    let rightSpeed = Math.max(right.subwarp_speed || 0, right.warp_speed || 0) * rightFlightSpeedBonus;
    
    let leftBaseDodge = 0;
    let rightBaseDodge = 0;
    
    // Stealth dodge
    if (!leftStealthBroken && leftStealth > 0) {
        leftBaseDodge += Math.min(0.5, leftStealth / 100);
        log.push(`Left stealth active: ${(leftStealth/100*100).toFixed(0)}% dodge chance`);
    } else if (leftStealth > 0) {
        log.push(`Left stealth broken by scanners`);
    }
    
    if (!rightStealthBroken && rightStealth > 0) {
        rightBaseDodge += Math.min(0.5, rightStealth / 100);
        log.push(`Right stealth active: ${(rightStealth/100*100).toFixed(0)}% dodge chance`);
    } else if (rightStealth > 0) {
        log.push(`Right stealth broken by scanners`);
    }
    
    // Speed dodge
    leftBaseDodge += Math.min(0.2, Math.log10(1 + leftSpeed) / 20);
    rightBaseDodge += Math.min(0.2, Math.log10(1 + rightSpeed) / 20);
    
    // Maneuverability dodge
    leftBaseDodge += leftManeuverabilityBonus;
    rightBaseDodge += rightManeuverabilityBonus;
    
    // Cap dodge at 75%
    leftBaseDodge = Math.min(0.75, leftBaseDodge);
    rightBaseDodge = Math.min(0.75, rightBaseDodge);
    
    log.push(`Total dodge: Left=${(leftBaseDodge*100).toFixed(0)}%, Right=${(rightBaseDodge*100).toFixed(0)}%`);
    
    // Initialize defenses
    let leftHP = left.hit_points || 0;
    let rightHP = right.hit_points || 0;
    let leftShields = left.shield_points || 0;
    let rightShields = right.shield_points || 0;
    
    log.push(`\n=== INITIAL STATS ===`);
    log.push(`Left: ${leftHP.toFixed(0)} HP, ${leftShields.toFixed(0)} shields`);
    log.push(`Right: ${rightHP.toFixed(0)} HP, ${rightShields.toFixed(0)} shields`);
    
    // Initialize combat state
    let leftCurrentHP = leftHP;
    let rightCurrentHP = rightHP;
    let leftCurrentShields = leftShields;
    let rightCurrentShields = rightShields;
    
    // Ammo tracking
    let leftAmmo = left.ammo_capacity || Infinity;
    let rightAmmo = right.ammo_capacity || Infinity;
    log.push(`Ammo: Left=${leftAmmo === Infinity ? 'Unlimited' : leftAmmo}, Right=${rightAmmo === Infinity ? 'Unlimited' : rightAmmo}`);
    
    // Cooldown tracking
    let leftCooldownTimer = 0;
    let rightCooldownTimer = 0;
    let leftAttackCooldown = config.defaultAttackCooldown;
    let rightAttackCooldown = config.defaultAttackCooldown;
    
    // Alpha effect tracking
    let leftAlphaStrikeUsed = false;
    let rightAlphaStrikeUsed = false;
    let leftAlphaShieldUsed = false;
    let rightAlphaShieldUsed = false;
    
    // Track first attack attempts (not just hits)
    let leftFirstAttackAttempted = false;
    let rightFirstAttackAttempted = false;
    
    // Aim ability for offsetting size penalties
    let leftAimAbility = left.aim_ability || 0;
    let rightAimAbility = right.aim_ability || 0;
    
    // Hit chance stat
    let leftHitChanceStat = left.hit_chance || 1;
    let rightHitChanceStat = right.hit_chance || 1;
    
    // Combat tracking
    let round = 0;
    let leftTotalDamageDealt = 0;
    let rightTotalDamageDealt = 0;
    let leftAttacks = 0;
    let rightAttacks = 0;
    let leftHits = 0;
    let rightHits = 0;
    
    log.push(`\n=== TURN-BASED COMBAT SIMULATION ===`);
    log.push(`Cooldowns: ${config.defaultAttackCooldown} rounds`);
    log.push(`Ammo per attack: ${config.ammoPerAttack}`);
    
    // Main combat loop
    while (round < config.maxRounds && leftCurrentHP > 0 && rightCurrentHP > 0) {
        round++;
        log.push(`\n--- Round ${round} ---`);
        
        // Tick cooldowns
        if (leftCooldownTimer > 0) {
            leftCooldownTimer -= config.cooldownTickPerRound;
            log.push(`Left cooldown: ${leftCooldownTimer} rounds remaining`);
        }
        if (rightCooldownTimer > 0) {
            rightCooldownTimer -= config.cooldownTickPerRound;
            log.push(`Right cooldown: ${rightCooldownTimer} rounds remaining`);
        }
        
        // Determine who can attack this round
        let leftCanAttack = leftCooldownTimer <= 0 && leftAmmo >= config.ammoPerAttack;
        let rightCanAttack = rightCooldownTimer <= 0 && rightAmmo >= config.ammoPerAttack;
        
        if (!leftCanAttack && leftCooldownTimer <= 0 && leftAmmo < config.ammoPerAttack) {
            log.push(`Left out of ammo!`);
        }
        if (!rightCanAttack && rightCooldownTimer <= 0 && rightAmmo < config.ammoPerAttack) {
            log.push(`Right out of ammo!`);
        }
        
        // Build attack queue for simultaneous resolution
        let attacks = [];
        
        // Determine attack order based on first striker
        if (firstStriker === 'left') {
            if (leftCanAttack) attacks.push({attacker: 'left', target: 'right'});
            if (rightCanAttack) attacks.push({attacker: 'right', target: 'left'});
        } else {
            if (rightCanAttack) attacks.push({attacker: 'right', target: 'left'});
            if (leftCanAttack) attacks.push({attacker: 'left', target: 'right'});
        }
        
        // Process all attacks
        for (let attack of attacks) {
            let isLeftAttacking = attack.attacker === 'left';
            let damages = isLeftAttacking ? {...leftDamages} : {...rightDamages};
            let counters = isLeftAttacking ? rightCounters : leftCounters;
            let attackerSize = isLeftAttacking ? leftShipSize : rightShipSize;
            let defenderSize = isLeftAttacking ? rightShipSize : leftShipSize;
            let defenderDodge = isLeftAttacking ? rightBaseDodge : leftBaseDodge;
            let damageRange = isLeftAttacking ? (left.damage_range || 0) : (right.damage_range || 0);
            let aimAbility = isLeftAttacking ? leftAimAbility : rightAimAbility;
            let hitChanceStat = isLeftAttacking ? leftHitChanceStat : rightHitChanceStat;
            
            // Track attack attempt
            if (isLeftAttacking) {
                leftAttacks++;
                leftFirstAttackAttempted = true;
            } else {
                rightAttacks++;
                rightFirstAttackAttempted = true;
            }
            
            // Consume ammo and set cooldown BEFORE checking hit/miss
            if (isLeftAttacking) {
                leftAmmo -= config.ammoPerAttack;
                leftCooldownTimer = leftAttackCooldown;
            } else {
                rightAmmo -= config.ammoPerAttack;
                rightCooldownTimer = rightAttackCooldown;
            }
            
            // Check for alpha strike (on first ATTEMPT, not first hit)
            let alphaStrikeMultiplier = 1;
            if (isLeftAttacking && !leftAlphaStrikeUsed && leftFirstAttackAttempted && firstStriker === 'left') {
                alphaStrikeMultiplier = 1 + leftAlphaStrikeBonus / 100;
                leftAlphaStrikeUsed = true;
                if (leftAlphaStrikeBonus > 0) {
                    log.push(`Left ALPHA STRIKE! +${leftAlphaStrikeBonus}% damage`);
                }
            } else if (!isLeftAttacking && !rightAlphaStrikeUsed && rightFirstAttackAttempted && firstStriker === 'right') {
                alphaStrikeMultiplier = 1 + rightAlphaStrikeBonus / 100;
                rightAlphaStrikeUsed = true;
                if (rightAlphaStrikeBonus > 0) {
                    log.push(`Right ALPHA STRIKE! +${rightAlphaStrikeBonus}% damage`);
                }
            }
            
            // Calculate size-based hit chance
            let sizeHitChance = calculateSizeBasedHitChance(attackerSize, defenderSize);
            
            // Apply aim ability to reduce size penalty
            if (aimAbility > 0 && attackerSize > defenderSize) {
                let aimReduction = aimAbility / 100;
                sizeHitChance = sizeHitChance + (1 - sizeHitChance) * aimReduction * 0.5;
            }
            
            // Apply hit chance stat
            sizeHitChance *= hitChanceStat;
            
            // Check for first-strike stealth auto-dodge
            let defenderHasStealth = isLeftAttacking ? 
                (!rightStealthBroken && rightStealth > 0) : 
                (!leftStealthBroken && leftStealth > 0);
            let stealthRevealed = isLeftAttacking ? rightStealthRevealed : leftStealthRevealed;
            
            if (defenderHasStealth && !stealthRevealed) {
                log.push(`${attack.target} stealth field deflects initial ${attack.attacker} attack!`);
                if (isLeftAttacking) {
                    rightStealthRevealed = true;
                } else {
                    leftStealthRevealed = true;
                }
                continue; // Skip damage calculation
            }
            
            // Roll for hit/miss based on size
            if (!rollChance(sizeHitChance)) {
                log.push(`${attack.attacker} MISSED due to size difference! (${(sizeHitChance*100).toFixed(0)}% hit chance)`);
                continue;
            }
            
            // Roll for dodge
            if (rollChance(defenderDodge)) {
                log.push(`${attack.attacker} attack DODGED!`);
                continue;
            }
            
            // Track successful hit
            if (isLeftAttacking) {
                leftHits++;
            } else {
                rightHits++;
            }
            
            // Calculate damage with RNG
            let attackDamage = 0;
            let blockedDamage = 0;
            
            for (let dmgType in damages) {
                if (damages[dmgType] > 0) {
                    // Apply damage range RNG
                    let baseDmg = damages[dmgType];
                    let minDmg = baseDmg * (1 - damageRange);
                    let maxDmg = baseDmg * (1 + damageRange);
                    let rolledDmg = randomRange(minDmg, maxDmg) * alphaStrikeMultiplier;
                    
                    // Apply countermeasures
                    let counterValue = counters[dmgType] || 0;
                    let absorbed = Math.min(rolledDmg, counterValue);
                    let effectiveDmg = rolledDmg - absorbed;
                    
                    attackDamage += effectiveDmg;
                    blockedDamage += absorbed;
                    
                    if (absorbed > 0) {
                        log.push(`  ${dmgType}: ${rolledDmg.toFixed(1)} - ${absorbed.toFixed(1)} absorbed = ${effectiveDmg.toFixed(1)}`);
                    }
                }
            }
            
            // Apply diversity bonus
            let diversityBonus = isLeftAttacking ? leftDiversityBonus : rightDiversityBonus;
            attackDamage *= diversityBonus;
            
            // Check for alpha shield on defender (first incoming attack)
            let alphaShieldReduction = 1;
            if (isLeftAttacking && !rightAlphaShieldUsed && round === 1) {
                alphaShieldReduction = 1 - rightAlphaShieldReduction;
                rightAlphaShieldUsed = true;
                if (rightAlphaShieldReduction > 0) {
                    log.push(`Right ALPHA SHIELD! -${(rightAlphaShieldReduction*100).toFixed(0)}% damage`);
                }
            } else if (!isLeftAttacking && !leftAlphaShieldUsed && round === 1) {
                alphaShieldReduction = 1 - leftAlphaShieldReduction;
                leftAlphaShieldUsed = true;
                if (leftAlphaShieldReduction > 0) {
                    log.push(`Left ALPHA SHIELD! -${(leftAlphaShieldReduction*100).toFixed(0)}% damage`);
                }
            }
            
            // Apply alpha shield reduction
            attackDamage *= alphaShieldReduction;
            
            // Apply damage
            let targetShields = isLeftAttacking ? rightCurrentShields : leftCurrentShields;
            let targetHP = isLeftAttacking ? rightCurrentHP : leftCurrentHP;
            
            let shieldDamage = Math.min(attackDamage, targetShields);
            let hullDamage = attackDamage - shieldDamage;
            
            if (isLeftAttacking) {
                rightCurrentShields -= shieldDamage;
                rightCurrentHP -= hullDamage;
                leftTotalDamageDealt += attackDamage;
            } else {
                leftCurrentShields -= shieldDamage;
                leftCurrentHP -= hullDamage;
                rightTotalDamageDealt += attackDamage;
            }
            
            log.push(`${attack.attacker} deals ${attackDamage.toFixed(1)} damage (${blockedDamage.toFixed(1)} blocked)`);
            if (shieldDamage > 0) log.push(`  Shield damage: ${shieldDamage.toFixed(1)}`);
            if (hullDamage > 0) log.push(`  Hull damage: ${hullDamage.toFixed(1)}`);
        }
        
        // Check for deaths after all attacks resolved (mutual destruction possible)
        if (leftCurrentHP <= 0 && rightCurrentHP <= 0) {
            log.push(`\nBoth fleets destroyed in mutual destruction!`);
            break;
        } else if (leftCurrentHP <= 0) {
            log.push(`\nLeft fleet destroyed!`);
            break;
        } else if (rightCurrentHP <= 0) {
            log.push(`\nRight fleet destroyed!`);
            break;
        }
        
        // Shield regeneration
        let leftShieldRegen = left.shield_recharge_rate || 0;
        let rightShieldRegen = right.shield_recharge_rate || 0;
        
        if (leftCurrentShields > 0 || round > (left.shield_break_delay || 0)) {
            leftCurrentShields = Math.min(leftShields, leftCurrentShields + leftShieldRegen);
            if (leftShieldRegen > 0) log.push(`Left shields regenerate ${leftShieldRegen.toFixed(1)}`);
        }
        
        if (rightCurrentShields > 0 || round > (right.shield_break_delay || 0)) {
            rightCurrentShields = Math.min(rightShields, rightCurrentShields + rightShieldRegen);
            if (rightShieldRegen > 0) log.push(`Right shields regenerate ${rightShieldRegen.toFixed(1)}`);
        }
        
        log.push(`End of round: Left ${leftCurrentHP.toFixed(1)} HP / ${leftCurrentShields.toFixed(1)} shields, Right ${rightCurrentHP.toFixed(1)} HP / ${rightCurrentShields.toFixed(1)} shields`);
        
        // Check for stalemate (both alive but out of ammo)
        if (leftCurrentHP > 0 && rightCurrentHP > 0 && 
            leftAmmo < config.ammoPerAttack && rightAmmo < config.ammoPerAttack) {
            log.push(`\nSTALEMATE - Both fleets out of ammo!`);
            break;
        }
    }
    
    // Determine result
    let result;
    if (leftCurrentHP <= 0 && rightCurrentHP <= 0) {
        result = "MUTUAL DESTRUCTION";
    } else if (leftCurrentHP <= 0) {
        result = "RIGHT WINS";
    } else if (rightCurrentHP <= 0) {
        result = "LEFT WINS";
    } else if (leftAmmo < config.ammoPerAttack && rightAmmo < config.ammoPerAttack) {
        result = "STALEMATE";
    } else if (round >= config.maxRounds) {
        result = leftCurrentHP > rightCurrentHP ? "LEFT WINS (TIMEOUT)" : 
                 rightCurrentHP > leftCurrentHP ? "RIGHT WINS (TIMEOUT)" : "DRAW (TIMEOUT)";
    } else {
        result = "DRAW";
    }
    
    // Calculate accuracy
    let leftAccuracy = leftAttacks > 0 ? (leftHits / leftAttacks * 100) : 0;
    let rightAccuracy = rightAttacks > 0 ? (rightHits / rightAttacks * 100) : 0;
    
    // Summary
    log.push(`\n=== BATTLE SUMMARY ===`);
    log.push(`Result: ${result}`);
    log.push(`Total rounds: ${round}`);
    log.push(`Left: ${leftTotalDamageDealt.toFixed(1)} damage dealt, ${leftAttacks} attacks, ${leftHits} hits (${leftAccuracy.toFixed(0)}% accuracy)`);
    log.push(`Right: ${rightTotalDamageDealt.toFixed(1)} damage dealt, ${rightAttacks} attacks, ${rightHits} hits (${rightAccuracy.toFixed(0)}% accuracy)`);
    log.push(`Left ammo remaining: ${leftAmmo === Infinity ? 'Unlimited' : leftAmmo}`);
    log.push(`Right ammo remaining: ${rightAmmo === Infinity ? 'Unlimited' : rightAmmo}`);
    
    // Key factors
    let factors = [];
    if (leftAlphaStrikeUsed && leftAlphaStrikeBonus > 0) factors.push("Left alpha strike");
    if (rightAlphaStrikeUsed && rightAlphaStrikeBonus > 0) factors.push("Right alpha strike");
    if (leftAlphaShieldUsed && leftAlphaShieldReduction > 0) factors.push("Left alpha shield");
    if (rightAlphaShieldUsed && rightAlphaShieldReduction > 0) factors.push("Right alpha shield");
    if (leftAccuracy < 50) factors.push("Left poor accuracy");
    if (rightAccuracy < 50) factors.push("Right poor accuracy");
    let sizeRatio = leftShipSize / rightShipSize;
    if (sizeRatio > 1.5) factors.push("Left struggled to hit smaller target");
    if (sizeRatio < 0.67) factors.push("Right struggled to hit smaller target");
    if (leftBaseDodge > 0.5) factors.push("Left high evasion");
    if (rightBaseDodge > 0.5) factors.push("Right high evasion");
    if (result === "STALEMATE") factors.push("Ammo depletion");
    if (result === "MUTUAL DESTRUCTION") factors.push("Simultaneous destruction");
    
    log.push("KEY FACTORS: " + (factors.length > 0 ? factors.join(", ") : "Evenly matched"));
    
    // Format HTML results
    let htmlResult = '<div class="combat-results">';
    
    // Winner section
    let winnerColor = '#4CAF50';
    if (result.includes('RIGHT WINS')) winnerColor = '#ff6b6b';
    else if (result.includes('DRAW') || result.includes('STALEMATE')) winnerColor = '#FFA500';
    else if (result.includes('MUTUAL')) winnerColor = '#ff00ff';
    
    htmlResult += `
        <div class="winner-section" style="text-align: center; margin-bottom: 20px; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 8px;">
            <h1 style="color: ${winnerColor}; font-size: 36px; margin: 0; text-shadow: 0 0 10px ${winnerColor};">
                ${result}
            </h1>
        </div>
    `;
    
    // Quick Summary
    htmlResult += `
        <div class="summary-section" style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
            <h3 style="color: #FFD700; margin-top: 0;">⚡ Battle Summary</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <strong style="color: #4CAF50;">Left Fleet</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Size: <span style="color: #4CAF50;">${leftShipSize}</span></li>
                        <li>Damage Dealt: <span style="color: #4CAF50;">${leftTotalDamageDealt.toFixed(1)}</span></li>
                        <li>Accuracy: <span style="color: #4CAF50;">${leftAccuracy.toFixed(0)}%</span> (${leftHits}/${leftAttacks})</li>
                        <li>HP Remaining: <span style="color: ${leftCurrentHP > 0 ? '#4CAF50' : '#ff6b6b'}">${leftCurrentHP.toFixed(1)}</span></li>
                        <li>Shields: <span style="color: #3498db;">${leftCurrentShields.toFixed(1)}</span></li>
                        <li>Ammo: <span style="color: ${leftAmmo < 10 ? '#ff6b6b' : '#4CAF50'}">${leftAmmo === Infinity ? '∞' : leftAmmo}</span></li>
                    </ul>
                </div>
                <div>
                    <strong style="color: #ff6b6b;">Right Fleet</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Size: <span style="color: #ff6b6b;">${rightShipSize}</span></li>
                        <li>Damage Dealt: <span style="color: #ff6b6b;">${rightTotalDamageDealt.toFixed(1)}</span></li>
                        <li>Accuracy: <span style="color: #ff6b6b;">${rightAccuracy.toFixed(0)}%</span> (${rightHits}/${rightAttacks})</li>
                        <li>HP Remaining: <span style="color: ${rightCurrentHP > 0 ? '#4CAF50' : '#ff6b6b'}">${rightCurrentHP.toFixed(1)}</span></li>
                        <li>Shields: <span style="color: #3498db;">${rightCurrentShields.toFixed(1)}</span></li>
                        <li>Ammo: <span style="color: ${rightAmmo < 10 ? '#ff6b6b' : '#4CAF50'}">${rightAmmo === Infinity ? '∞' : rightAmmo}</span></li>
                    </ul>
                </div>
            </div>
            <div style="margin-top: 10px;">
                <strong>Total Rounds:</strong> ${round} | 
                <strong>Combat System:</strong> Cooldown-based (${config.defaultAttackCooldown} rounds)
            </div>
        </div>
    `;
    
    // Key Factors
    if (factors.length > 0) {
        htmlResult += `
            <div class="factors-section" style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <h3 style="color: #FFD700; margin-top: 0;">🔑 Key Factors</h3>
                <ul style="margin: 5px 0; padding-left: 20px;">
        `;
        factors.forEach(factor => {
            htmlResult += `<li>${factor}</li>`;
        });
        htmlResult += `
                </ul>
            </div>
        `;
    }
    
    // Configuration (Collapsible)
    htmlResult += `
        <details style="margin-bottom: 10px;">
            <summary style="cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; color: #FFD700; font-weight: bold;">
                ⚙️ Combat Configuration
            </summary>
            <div style="padding: 15px; background: rgba(0,0,0,0.1); margin-top: 5px; border-radius: 8px; font-family: monospace; font-size: 12px;">
    `;
    
    // Add configuration info
    let configEnd = log.findIndex(line => line.includes('=== INITIAL STATS ==='));
    if (configEnd > 0) {
        log.slice(0, configEnd).forEach(line => {
            if (line.trim()) {
                let coloredLine = line
                    .replace(/Left/g, '<span style="color: #4CAF50;">Left</span>')
                    .replace(/Right/g, '<span style="color: #ff6b6b;">Right</span>')
                    .replace(/(\d+\.?\d*)%/g, '<span style="color: #3498db;">$1%</span>')
                    .replace(/Tier (\d+)/g, '<span style="color: #FFD700;">Tier $1</span>')
                    .replace(/active:/g, '<span style="color: #FFD700;">active:</span>');
                htmlResult += coloredLine + '<br>';
            }
        });
    }
    
    htmlResult += `
            </div>
        </details>
    `;
    
    // Combat Log (Collapsible)
    htmlResult += `
        <details style="margin-bottom: 10px;">
            <summary style="cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; color: #FFD700; font-weight: bold;">
                ⚔️ Round-by-Round Combat Log
            </summary>
            <div style="padding: 15px; background: rgba(0,0,0,0.1); margin-top: 5px; border-radius: 8px; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;">
    `;
    
    // Add combat log
    let combatStart = log.findIndex(line => line.includes('=== TURN-BASED COMBAT SIMULATION ==='));
    let summaryStart = log.findIndex(line => line.includes('=== BATTLE SUMMARY ==='));
    
    if (combatStart >= 0 && summaryStart > combatStart) {
        log.slice(combatStart + 1, summaryStart).forEach(line => {
            if (line.includes('--- Round')) {
                htmlResult += `<div style="color: #FFD700; font-weight: bold; margin-top: 10px;">${line}</div>`;
            } else if (line.includes('ALPHA')) {
                htmlResult += `<div style="color: #FFD700;">${line}</div>`;
            } else if (line.includes('DODGED') || line.includes('MISSED')) {
                htmlResult += `<div style="color: #3498db;">${line}</div>`;
            } else if (line.includes('deflects')) {
                htmlResult += `<div style="color: #9b59b6;">${line}</div>`;
            } else if (line.includes('out of ammo')) {
                htmlResult += `<div style="color: #ff6b6b;">${line}</div>`;
            } else if (line.includes('cooldown:')) {
                htmlResult += `<div style="color: #95a5a6;">${line}</div>`;
            } else if (line.includes('deals')) {
                let attackColor = line.includes('left deals') || line.includes('Left deals') ? '#4CAF50' : '#ff6b6b';
                htmlResult += `<div style="color: ${attackColor};">${line}</div>`;
            } else if (line.trim()) {
                let coloredLine = line
                    .replace(/(\d+\.?\d*)/g, '<span style="color: #3498db;">$1</span>')
                    .replace(/damage/g, '<span style="color: #FFA500;">damage</span>')
                    .replace(/blocked/g, '<span style="color: #9b59b6;">blocked</span>')
                    .replace(/absorbed/g, '<span style="color: #9b59b6;">absorbed</span>')
                    .replace(/Shield/g, '<span style="color: #3498db;">Shield</span>')
                    .replace(/Hull/g, '<span style="color: #e74c3c;">Hull</span>');
                htmlResult += `<div style="color: #ccc;">${coloredLine}</div>`;
            }
        });
    }
    
    htmlResult += `
            </div>
        </details>
    `;
    
    htmlResult += '</div>';
    
    // Add CSS if needed
    if (!window.combatResultsStyleAdded) {
        let style = document.createElement('style');
        style.textContent = `
            .combat-results {
                color: #fff;
                line-height: 1.5;
            }
            .combat-results h1, .combat-results h3 {
                font-family: 'Orbitron', sans-serif;
            }
            .combat-results details summary:hover {
                background: rgba(0,0,0,0.3) !important;
            }
            .combat-results details[open] summary {
                border-bottom: 1px solid #444;
                margin-bottom: 10px;
                border-radius: 8px 8px 0 0;
            }
        `;
        document.head.appendChild(style);
        window.combatResultsStyleAdded = true;
    }
    
    return htmlResult;
})()
