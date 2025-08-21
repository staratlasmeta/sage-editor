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
    
    // Get first striker from parameters (default to left if not specified)
    let firstStriker = window.combatFirstStriker || 'left';
    
    // Placeholder values for player bonuses (will be replaced with actual values)
    let leftAlphaStrikeBonus = window.leftAlphaStrikeBonus || 0; // Percent bonus damage on first strike
    let rightAlphaStrikeBonus = window.rightAlphaStrikeBonus || 0;
    let leftAlphaShieldBonus = window.leftAlphaShieldBonus || 0; // Percent bonus shield on defense
    let rightAlphaShieldBonus = window.rightAlphaShieldBonus || 0;
    
    // Placeholder values for skills (0-4 levels)
    let leftFlightSpeedLevel = window.leftFlightSpeedLevel || 0;
    let rightFlightSpeedLevel = window.rightFlightSpeedLevel || 0;
    let leftManeuverabilityLevel = window.leftManeuverabilityLevel || 0;
    let rightManeuverabilityLevel = window.rightManeuverabilityLevel || 0;
    
    // Calculate skill bonuses
    let leftFlightSpeedBonus = 1 + (leftFlightSpeedLevel * 0.1); // 10% per level
    let rightFlightSpeedBonus = 1 + (rightFlightSpeedLevel * 0.1);
    let leftManeuverabilityBonus = leftManeuverabilityLevel * 0.05; // 5% dodge per level
    let rightManeuverabilityBonus = rightManeuverabilityLevel * 0.05;
    
    log.push(`First striker: ${firstStriker}`);
    log.push(`Left skills: Flight Speed Lv${leftFlightSpeedLevel} (${((leftFlightSpeedBonus-1)*100).toFixed(0)}%), Maneuverability Lv${leftManeuverabilityLevel} (${(leftManeuverabilityBonus*100).toFixed(0)}% dodge)`);
    log.push(`Right skills: Flight Speed Lv${rightFlightSpeedLevel} (${((rightFlightSpeedBonus-1)*100).toFixed(0)}%), Maneuverability Lv${rightManeuverabilityLevel} (${(rightManeuverabilityBonus*100).toFixed(0)}% dodge)`);
    
    // Calculate base damage types for each fleet (no RNG yet)
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
    
    // Apply missile power multiplier (up to missile capacity)
    let leftMissilePower = left.missile_power || 1;
    let rightMissilePower = right.missile_power || 1;
    let leftMissileCapacity = left.missile_capacity || 0;
    let rightMissileCapacity = right.missile_capacity || 0;
    
    // Missiles boost bomb damage up to capacity
    if (leftMissileCapacity > 0 && leftDamages.bomb > 0) {
        let missileBoost = Math.min(leftMissilePower, leftMissileCapacity / 100); // Cap at capacity/100
        leftDamages.bomb *= missileBoost;
        log.push(`Left missile boost: x${missileBoost.toFixed(2)} on bomb damage (capacity: ${leftMissileCapacity})`);
    }
    
    if (rightMissileCapacity > 0 && rightDamages.bomb > 0) {
        let missileBoost = Math.min(rightMissilePower, rightMissileCapacity / 100);
        rightDamages.bomb *= missileBoost;
        log.push(`Right missile boost: x${missileBoost.toFixed(2)} on bomb damage (capacity: ${rightMissileCapacity})`);
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
    
    // Calculate stealth and scanner interaction
    let leftStealth = left.stealth_power || 0;
    let rightStealth = right.stealth_power || 0;
    let leftScanPower = left.scan_power || 0;
    let rightScanPower = right.scan_power || 0;
    
    // Check if scanners can break stealth
    let leftStealthBroken = rightScanPower >= leftStealth;
    let rightStealthBroken = leftScanPower >= rightStealth;
    
    // Calculate dodge chance from stealth (if not broken), speed, and maneuverability
    let leftSpeed = Math.max(left.subwarp_speed || 0, left.warp_speed || 0) * leftFlightSpeedBonus;
    let rightSpeed = Math.max(right.subwarp_speed || 0, right.warp_speed || 0) * rightFlightSpeedBonus;
    
    let leftBaseDodge = 0;
    let rightBaseDodge = 0;
    
    // Stealth provides dodge if not broken
    if (!leftStealthBroken && leftStealth > 0) {
        leftBaseDodge += Math.min(0.5, leftStealth / 100); // Max 50% from stealth
        log.push(`Left stealth active: ${(leftStealth/100*100).toFixed(0)}% dodge chance`);
    } else if (leftStealth > 0) {
        log.push(`Left stealth broken by enemy scanners (${rightScanPower} vs ${leftStealth})`);
    }
    
    if (!rightStealthBroken && rightStealth > 0) {
        rightBaseDodge += Math.min(0.5, rightStealth / 100);
        log.push(`Right stealth active: ${(rightStealth/100*100).toFixed(0)}% dodge chance`);
    } else if (rightStealth > 0) {
        log.push(`Right stealth broken by enemy scanners (${leftScanPower} vs ${rightStealth})`);
    }
    
    // Speed provides dodge chance (logarithmic scaling)
    leftBaseDodge += Math.min(0.2, Math.log10(1 + leftSpeed) / 20);
    rightBaseDodge += Math.min(0.2, Math.log10(1 + rightSpeed) / 20);
    
    // Add maneuverability bonus
    leftBaseDodge += leftManeuverabilityBonus;
    rightBaseDodge += rightManeuverabilityBonus;
    
    // Cap total dodge at 75%
    leftBaseDodge = Math.min(0.75, leftBaseDodge);
    rightBaseDodge = Math.min(0.75, rightBaseDodge);
    
    log.push(`Left total dodge chance: ${(leftBaseDodge*100).toFixed(0)}%`);
    log.push(`Right total dodge chance: ${(rightBaseDodge*100).toFixed(0)}%`);
    
    // Calculate defenses (no RNG)
    let leftHP = left.hit_points || 0;
    let rightHP = right.hit_points || 0;
    let leftShields = left.shield_points || 0;
    let rightShields = right.shield_points || 0;
    
    // Apply alpha shield bonus if defending first
    if (firstStriker === 'right') {
        leftShields *= (1 + leftAlphaShieldBonus / 100);
        log.push(`Left alpha shield bonus: +${leftAlphaShieldBonus}% (defending first)`);
    } else {
        rightShields *= (1 + rightAlphaShieldBonus / 100);
        log.push(`Right alpha shield bonus: +${rightAlphaShieldBonus}% (defending first)`);
    }
    
    let leftDefense = leftHP + leftShields;
    let rightDefense = rightHP + rightShields;
    
    log.push(`Left defense: ${leftDefense.toFixed(0)} (${leftHP.toFixed(0)} HP + ${leftShields.toFixed(0)} shields)`);
    log.push(`Right defense: ${rightDefense.toFixed(0)} (${rightHP.toFixed(0)} HP + ${rightShields.toFixed(0)} shields)`);
    
    // Calculate action points for turn order
    let leftMaxAP = left.max_ap || 1;
    let rightMaxAP = right.max_ap || 1;
    let leftAPRecharge = left.ap_recharge_time || 1;
    let rightAPRecharge = right.ap_recharge_time || 1;
    
    // AP determines number of actions per "round"
    let leftActionsPerRound = Math.floor(leftMaxAP);
    let rightActionsPerRound = Math.floor(rightMaxAP);
    
    log.push(`Left actions per round: ${leftActionsPerRound} (${leftMaxAP} AP)`);
    log.push(`Right actions per round: ${rightActionsPerRound} (${rightMaxAP} AP)`);
    
    // Check ammo capacity constraints
    let leftAmmoCapacity = left.ammo_capacity || Infinity;
    let rightAmmoCapacity = right.ammo_capacity || Infinity;
    
    // Calculate max rounds based on ammo (assume 10 ammo per attack)
    let leftMaxRounds = Math.floor(leftAmmoCapacity / 10);
    let rightMaxRounds = Math.floor(rightAmmoCapacity / 10);
    
    log.push(`Left ammo for ${leftMaxRounds} rounds (${leftAmmoCapacity} capacity)`);
    log.push(`Right ammo for ${rightMaxRounds} rounds (${rightAmmoCapacity} capacity)`);
    
    // Simulate turn-based combat
    let round = 0;
    let leftCurrentHP = leftHP;
    let rightCurrentHP = rightHP;
    let leftCurrentShields = leftShields;
    let rightCurrentShields = rightShields;
    let leftTotalDamageDealt = 0;
    let rightTotalDamageDealt = 0;
    
    // Declare these outside the loop for scope access
    let leftCanFire = true;
    let rightCanFire = true;
    
    log.push("\n=== TURN-BASED COMBAT SIMULATION ===");
    
    while (round < 100 && leftCurrentHP > 0 && rightCurrentHP > 0) {
        round++;
        log.push(`\n--- Round ${round} ---`);
        
        // Check ammo constraints
        leftCanFire = round <= leftMaxRounds;
        rightCanFire = round <= rightMaxRounds;
        
        if (!leftCanFire) log.push("Left out of ammo!");
        if (!rightCanFire) log.push("Right out of ammo!");
        
        // Process actions based on who strikes first
        let attackers = firstStriker === 'left' ? 
            [{fleet: 'left', actions: leftActionsPerRound, canFire: leftCanFire}, 
             {fleet: 'right', actions: rightActionsPerRound, canFire: rightCanFire}] :
            [{fleet: 'right', actions: rightActionsPerRound, canFire: rightCanFire}, 
             {fleet: 'left', actions: leftActionsPerRound, canFire: leftCanFire}];
        
        for (let attacker of attackers) {
            if (leftCurrentHP <= 0 || rightCurrentHP <= 0) break;
            
            for (let action = 0; action < attacker.actions; action++) {
                if (!attacker.canFire) continue;
                
                let isLeft = attacker.fleet === 'left';
                let damages = isLeft ? {...leftDamages} : {...rightDamages};
                let counters = isLeft ? rightCounters : leftCounters;
                let dodge = isLeft ? rightBaseDodge : leftBaseDodge;
                let damageRange = isLeft ? (left.damage_range || 0) : (right.damage_range || 0);
                
                // Apply alpha strike bonus on first round, first action
                let alphaBonus = 1;
                if (round === 1 && action === 0 && 
                    ((isLeft && firstStriker === 'left') || (!isLeft && firstStriker === 'right'))) {
                    alphaBonus = 1 + (isLeft ? leftAlphaStrikeBonus : rightAlphaStrikeBonus) / 100;
                    log.push(`${attacker.fleet} alpha strike! +${((alphaBonus-1)*100).toFixed(0)}% damage`);
                }
                
                // Roll for dodge
                if (rollChance(dodge)) {
                    log.push(`${attacker.fleet} attack ${action+1} DODGED!`);
                    continue;
                }
                
                // Calculate damage for this attack with damage_range RNG
                let attackDamage = 0;
                let blockedDamage = 0;
                
                for (let dmgType in damages) {
                    if (damages[dmgType] > 0) {
                        // Apply damage range RNG
                        let baseDmg = damages[dmgType];
                        let minDmg = baseDmg * (1 - damageRange);
                        let maxDmg = baseDmg * (1 + damageRange);
                        let rolledDmg = randomRange(minDmg, maxDmg) * alphaBonus;
                        
                        // Apply countermeasures - direct absorption
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
                let diversityBonus = isLeft ? leftDiversityBonus : rightDiversityBonus;
                attackDamage *= diversityBonus;
                
                // Apply damage to target
                let targetShields = isLeft ? rightCurrentShields : leftCurrentShields;
                let targetHP = isLeft ? rightCurrentHP : leftCurrentHP;
                
                let shieldDamage = Math.min(attackDamage, targetShields);
                let hullDamage = attackDamage - shieldDamage;
                
                if (isLeft) {
                    rightCurrentShields -= shieldDamage;
                    rightCurrentHP -= hullDamage;
                    leftTotalDamageDealt += attackDamage;
                } else {
                    leftCurrentShields -= shieldDamage;
                    leftCurrentHP -= hullDamage;
                    rightTotalDamageDealt += attackDamage;
                }
                
                log.push(`${attacker.fleet} attack ${action+1}: ${attackDamage.toFixed(1)} damage (${blockedDamage.toFixed(1)} blocked)`);
                if (shieldDamage > 0) log.push(`  Shield damage: ${shieldDamage.toFixed(1)}`);
                if (hullDamage > 0) log.push(`  Hull damage: ${hullDamage.toFixed(1)}`);
            }
        }
        
        // Shield regeneration at end of round
        let leftShieldRegen = (left.shield_recharge_rate || 0);
        let rightShieldRegen = (right.shield_recharge_rate || 0);
        
        // Only regen if shields aren't fully depleted (respecting break delay)
        if (leftCurrentShields > 0 || round > (left.shield_break_delay || 0)) {
            leftCurrentShields = Math.min(leftShields, leftCurrentShields + leftShieldRegen);
            if (leftShieldRegen > 0) log.push(`Left shields regenerate ${leftShieldRegen.toFixed(1)}`);
        }
        
        if (rightCurrentShields > 0 || round > (right.shield_break_delay || 0)) {
            rightCurrentShields = Math.min(rightShields, rightCurrentShields + rightShieldRegen);
            if (rightShieldRegen > 0) log.push(`Right shields regenerate ${rightShieldRegen.toFixed(1)}`);
        }
        
        log.push(`End of round: Left ${leftCurrentHP.toFixed(1)} HP / ${leftCurrentShields.toFixed(1)} shields, Right ${rightCurrentHP.toFixed(1)} HP / ${rightCurrentShields.toFixed(1)} shields`);
        
        // Check for timeout
        if (round >= 100) {
            log.push("\nBattle timeout after 100 rounds!");
            break;
        }
    }
    
    // Determine winner
    let result;
    if (leftCurrentHP > 0 && rightCurrentHP <= 0) {
        result = "LEFT WINS";
        log.push(`\nLeft wins with ${leftCurrentHP.toFixed(1)} HP remaining!`);
    } else if (rightCurrentHP > 0 && leftCurrentHP <= 0) {
        result = "RIGHT WINS";
        log.push(`\nRight wins with ${rightCurrentHP.toFixed(1)} HP remaining!`);
    } else if (leftCurrentHP > rightCurrentHP) {
        result = "LEFT WINS (TIMEOUT)";
        log.push(`\nTimeout - Left wins with more HP (${leftCurrentHP.toFixed(1)} vs ${rightCurrentHP.toFixed(1)})`);
    } else if (rightCurrentHP > leftCurrentHP) {
        result = "RIGHT WINS (TIMEOUT)";
        log.push(`\nTimeout - Right wins with more HP (${rightCurrentHP.toFixed(1)} vs ${leftCurrentHP.toFixed(1)})`);
    } else {
        result = "DRAW";
        log.push(`\nDraw - both fleets have equal HP (${leftCurrentHP.toFixed(1)})`);
    }
    
    // Summary statistics
    log.push(`\n=== BATTLE SUMMARY ===`);
    log.push(`Total rounds: ${round}`);
    log.push(`Left total damage dealt: ${leftTotalDamageDealt.toFixed(1)}`);
    log.push(`Right total damage dealt: ${rightTotalDamageDealt.toFixed(1)}`);
    log.push(`Left DPS: ${(leftTotalDamageDealt/round).toFixed(1)}`);
    log.push(`Right DPS: ${(rightTotalDamageDealt/round).toFixed(1)}`);
    
    // Key factors
    let factors = [];
    if (firstStriker === 'left' && leftAlphaStrikeBonus > 0) factors.push("Left alpha strike advantage");
    if (firstStriker === 'right' && rightAlphaStrikeBonus > 0) factors.push("Right alpha strike advantage");
    if (leftBaseDodge > rightBaseDodge) factors.push("Left superior evasion");
    if (rightBaseDodge > leftBaseDodge) factors.push("Right superior evasion");
    if (!leftCanFire && round > leftMaxRounds) factors.push("Left ran out of ammo");
    if (!rightCanFire && round > rightMaxRounds) factors.push("Right ran out of ammo");
    if (leftActionsPerRound > rightActionsPerRound) factors.push("Left more actions per round");
    if (rightActionsPerRound > leftActionsPerRound) factors.push("Right more actions per round");
    if (leftDamageTypes > rightDamageTypes) factors.push("Left damage diversity");
    if (rightDamageTypes > leftDamageTypes) factors.push("Right damage diversity");
    
    log.push("KEY FACTORS: " + (factors.length > 0 ? factors.join(", ") : "Evenly matched"));
    
    // Format the results as HTML for better readability
    let htmlResult = '<div class="combat-results">';
    
    // Winner section with large, colored text
    let winnerColor = '#4CAF50';
    if (result.includes('RIGHT WINS')) winnerColor = '#ff6b6b';
    else if (result.includes('DRAW')) winnerColor = '#FFA500';
    
    htmlResult += `
        <div class="winner-section" style="text-align: center; margin-bottom: 20px; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 8px;">
            <h1 style="color: ${winnerColor}; font-size: 36px; margin: 0; text-shadow: 0 0 10px ${winnerColor};">
                ${result}
            </h1>
        </div>
    `;
    
    // Quick Summary Section
    htmlResult += `
        <div class="summary-section" style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
            <h3 style="color: #FFD700; margin-top: 0;">⚡ Battle Summary</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <strong style="color: #4CAF50;">Left Fleet</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Total Damage: <span style="color: #4CAF50;">${leftTotalDamageDealt.toFixed(1)}</span></li>
                        <li>DPS: <span style="color: #4CAF50;">${(leftTotalDamageDealt/round).toFixed(1)}</span></li>
                        <li>HP Remaining: <span style="color: ${leftCurrentHP > 0 ? '#4CAF50' : '#ff6b6b'}">${leftCurrentHP.toFixed(1)}</span></li>
                        <li>Shields: <span style="color: #3498db;">${leftCurrentShields.toFixed(1)}</span></li>
                    </ul>
                </div>
                <div>
                    <strong style="color: #ff6b6b;">Right Fleet</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Total Damage: <span style="color: #ff6b6b;">${rightTotalDamageDealt.toFixed(1)}</span></li>
                        <li>DPS: <span style="color: #ff6b6b;">${(rightTotalDamageDealt/round).toFixed(1)}</span></li>
                        <li>HP Remaining: <span style="color: ${rightCurrentHP > 0 ? '#4CAF50' : '#ff6b6b'}">${rightCurrentHP.toFixed(1)}</span></li>
                        <li>Shields: <span style="color: #3498db;">${rightCurrentShields.toFixed(1)}</span></li>
                    </ul>
                </div>
            </div>
            <div style="margin-top: 10px;">
                <strong>Total Rounds:</strong> ${round}
            </div>
        </div>
    `;
    
    // Key Factors Section
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
    
    // Pre-Battle Setup (Collapsible)
    htmlResult += `
        <details style="margin-bottom: 10px;">
            <summary style="cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; color: #FFD700; font-weight: bold;">
                ⚙️ Pre-Battle Setup
            </summary>
            <div style="padding: 15px; background: rgba(0,0,0,0.1); margin-top: 5px; border-radius: 8px; font-family: monospace; font-size: 12px;">
    `;
    
    // Add pre-battle info from log
    let preBattleEnd = log.findIndex(line => line.includes('=== TURN-BASED COMBAT SIMULATION ==='));
    if (preBattleEnd > 0) {
        log.slice(0, preBattleEnd).forEach(line => {
            if (line.trim()) {
                // Color-code different types of information
                let coloredLine = line
                    .replace(/Left/g, '<span style="color: #4CAF50;">Left</span>')
                    .replace(/Right/g, '<span style="color: #ff6b6b;">Right</span>')
                    .replace(/(\d+\.?\d*)%/g, '<span style="color: #3498db;">$1%</span>')
                    .replace(/active:/g, '<span style="color: #FFD700;">active:</span>')
                    .replace(/broken/g, '<span style="color: #FFA500;">broken</span>');
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
    
    // Add combat rounds from log
    let combatStart = log.findIndex(line => line.includes('=== TURN-BASED COMBAT SIMULATION ==='));
    let summaryStart = log.findIndex(line => line.includes('=== BATTLE SUMMARY ==='));
    
    if (combatStart >= 0 && summaryStart > combatStart) {
        log.slice(combatStart + 1, summaryStart).forEach(line => {
            if (line.includes('--- Round')) {
                htmlResult += `<div style="color: #FFD700; font-weight: bold; margin-top: 10px;">${line}</div>`;
            } else if (line.includes('alpha strike!')) {
                htmlResult += `<div style="color: #FFD700;">${line}</div>`;
            } else if (line.includes('DODGED!')) {
                htmlResult += `<div style="color: #3498db;">${line}</div>`;
            } else if (line.includes('wins')) {
                htmlResult += `<div style="color: ${winnerColor}; font-weight: bold;">${line}</div>`;
            } else if (line.includes('attack')) {
                // Color attacks based on who's attacking
                let attackColor = line.includes('left attack') || line.includes('Left attack') ? '#4CAF50' : '#ff6b6b';
                htmlResult += `<div style="color: ${attackColor};">${line}</div>`;
            } else if (line.trim()) {
                // Color-code numbers and keywords
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
    
    // Add CSS for better styling
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
    
    // Return formatted HTML
    return htmlResult;
})() 