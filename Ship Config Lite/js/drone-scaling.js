// === MODULE: Drone Port Scaling ===
// This module handles scaling of drone stats based on drone port capacity
// Different sized drone ports can hold different numbers of drones

(function() {
    'use strict';
    
    // Define drone capacity for each drone port size
    const DRONE_PORT_CAPACITY = {
        'XXS': 2,
        'XS': 4,
        'Small': 8,
        'Medium': 12,
        'Large': 16,
        'Capital': 24,
        'Commander': 32,
        'Class 8': 40,
        'Titan': 48
    };
    
    // Load saved capacities from localStorage if available
    const savedCapacities = localStorage.getItem('dronePortCapacities');
    if (savedCapacities) {
        try {
            const parsedCapacities = JSON.parse(savedCapacities);
            Object.assign(DRONE_PORT_CAPACITY, parsedCapacities);
            console.log('Loaded custom drone port capacities from localStorage');
        } catch (e) {
            console.error('Failed to load saved drone port capacities:', e);
        }
    }
    
    // Get the capacity of a drone port based on its class
    function getDronePortCapacity(dronePortClass) {
        if (!dronePortClass) return 1;
        
        // Handle both string and numeric class representations
        let className = dronePortClass;
        if (typeof dronePortClass === 'number') {
            className = getClassNameFromNumber(dronePortClass);
        }
        
        // Map abbreviated class names to full names
        const classMapping = {
            'XXS': 'XXS',
            'XS': 'XS',
            'S': 'Small',
            'M': 'Medium',
            'L': 'Large',
            'CAP': 'Capital',
            'CMD': 'Commander',
            'Class 8': 'Class 8',
            'TTN': 'Titan',
            // Also include full names for direct lookup
            'Small': 'Small',
            'Medium': 'Medium',
            'Large': 'Large',
            'Capital': 'Capital',
            'Commander': 'Commander',
            'Titan': 'Titan'
        };
        
        // Convert abbreviated name to full name
        const fullClassName = classMapping[className] || className;
        
        return DRONE_PORT_CAPACITY[fullClassName] || 1;
    }
    
    // Find all drone ports in a ship configuration
    function findDronePorts(config) {
        const dronePorts = [];
        
        if (!config || !config.components || !config.components['Ship Component']) {
            return dronePorts;
        }
        
        const shipComponents = config.components['Ship Component'];
        
        Object.keys(shipComponents).forEach(componentType => {
            const componentIds = shipComponents[componentType];
            const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
            
            idsArray.forEach(componentId => {
                if (componentId && componentId !== '') {
                    const component = findComponentById ? findComponentById(componentId) : null;
                    if (component) {
                        const componentName = component.name || '';
                        const componentType = component.properties?.['Ship Component'] || '';
                        
                        // Check if this is a drone port
                        if (componentName.toLowerCase().includes('drone port') || 
                            componentType.toLowerCase().includes('drone port')) {
                            dronePorts.push({
                                id: componentId,
                                name: componentName,
                                class: component.properties?.Class || '',
                                tier: component.properties?.Tier || '',
                                capacity: getDronePortCapacity(component.properties?.Class)
                            });
                        }
                    }
                }
            });
        });
        
        return dronePorts;
    }
    
    // Find all equipped drones in a configuration
    function findEquippedDrones(config) {
        const drones = [];
        
        if (!config || !config.components || !config.components['Drones']) {
            return drones;
        }
        
        const droneComponents = config.components['Drones'];
        
        Object.keys(droneComponents).forEach(droneType => {
            const droneIds = droneComponents[droneType];
            const idsArray = Array.isArray(droneIds) ? droneIds : [droneIds];
            
            idsArray.forEach(droneId => {
                if (droneId && droneId !== '') {
                    const drone = findComponentById ? findComponentById(droneId) : null;
                    if (drone) {
                        drones.push({
                            id: droneId,
                            name: drone.name || 'Unknown Drone',
                            properties: drone.properties || {}
                        });
                    }
                }
            });
        });
        
        return drones;
    }
    
    // Calculate drone scaling factor based on drone ports and equipped drones
    function calculateDroneScaling(config) {
        const dronePorts = findDronePorts(config);
        const equippedDrones = findEquippedDrones(config);
        
        if (dronePorts.length === 0 || equippedDrones.length === 0) {
            return {
                totalCapacity: 0,
                equippedCount: equippedDrones.length,
                scalingFactor: 0,
                droneAllocation: []
            };
        }
        
        // Calculate total drone capacity
        const totalCapacity = dronePorts.reduce((sum, port) => sum + port.capacity, 0);
        
        // If only one type of drone, it gets all slots
        if (equippedDrones.length === 1) {
            return {
                totalCapacity: totalCapacity,
                equippedCount: 1,
                scalingFactor: totalCapacity,
                droneAllocation: [{
                    drone: equippedDrones[0],
                    count: totalCapacity
                }],
                dronePorts: dronePorts
            };
        }
        
        // Multiple drone types - distribute proportionally
        const droneAllocation = equippedDrones.map((drone, index) => {
            // Calculate proportion for each drone type
            const proportion = 1 / equippedDrones.length;
            const allocatedSlots = Math.floor(totalCapacity * proportion);
            
            return {
                drone: drone,
                count: allocatedSlots,
                proportion: proportion
            };
        });
        
        // Distribute any remaining slots to the first drone type
        const allocatedTotal = droneAllocation.reduce((sum, alloc) => sum + alloc.count, 0);
        const remainingSlots = totalCapacity - allocatedTotal;
        if (remainingSlots > 0 && droneAllocation.length > 0) {
            droneAllocation[0].count += remainingSlots;
        }
        
        return {
            totalCapacity: totalCapacity,
            equippedCount: equippedDrones.length,
            scalingFactor: totalCapacity / equippedDrones.length,
            droneAllocation: droneAllocation,
            dronePorts: dronePorts
        };
    }
    
    // Apply drone scaling to stat modifications
    function applyDroneScaling(statValue, droneId, scalingInfo) {
        if (!scalingInfo || !scalingInfo.droneAllocation) {
            return statValue;
        }
        
        // Find the allocation for this specific drone
        const allocation = scalingInfo.droneAllocation.find(alloc => alloc.drone.id === droneId);
        if (!allocation) {
            return statValue;
        }
        
        // The stat value should be multiplied by the number of drones
        return statValue * allocation.count;
    }
    
    // Get drone scaling details for stat modification tooltip
    function getDroneScalingDetails(droneId, scalingInfo) {
        if (!scalingInfo || !scalingInfo.droneAllocation) {
            return null;
        }
        
        const allocation = scalingInfo.droneAllocation.find(alloc => alloc.drone.id === droneId);
        if (!allocation) {
            return null;
        }
        
        return {
            droneCount: allocation.count,
            totalCapacity: scalingInfo.totalCapacity,
            dronePorts: scalingInfo.dronePorts,
            proportion: allocation.proportion
        };
    }
    
    // Helper function to get class name from number
    function getClassNameFromNumber(classNumber) {
        const classNames = ["", "XXS", "XS", "Small", "Medium", "Large", "Capital", "Commander", "Class 8", "Titan"];
        return classNames[classNumber] || classNumber.toString();
    }
    
    // Export functions
    window.DroneScaling = {
        getDronePortCapacity: getDronePortCapacity,
        findDronePorts: findDronePorts,
        findEquippedDrones: findEquippedDrones,
        calculateDroneScaling: calculateDroneScaling,
        applyDroneScaling: applyDroneScaling,
        getDroneScalingDetails: getDroneScalingDetails,
        DRONE_PORT_CAPACITY: DRONE_PORT_CAPACITY
    };
    
    console.log('Drone Scaling module loaded successfully');
})(); 