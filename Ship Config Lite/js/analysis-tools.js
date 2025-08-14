// ===========================
// ANALYSIS TOOLS MODULE
// ===========================
// Module for analysis tools functionality in Ship Config Lite
// Including markdown export and other analysis features

// Initialize analysis tools when the module loads
(function() {
    'use strict';
    
    // Store current tab state
    let currentTab = 'config-markdown';
    
    // Wait for DOM to be ready before initializing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalysisTools);
    } else {
        initAnalysisTools();
    }
    
    // Initialize analysis tools functionality
    function initAnalysisTools() {
        console.log('🔬 Initializing Analysis Tools module');
        
        // Set up analysis tools dropdown
        setupAnalysisToolsDropdown();
        
        // Set up analysis modal functionality
        setupAnalysisModal();
        
        // Set up tab functionality
        setupTabNavigation();
    }
    
    // Set up the analysis tools dropdown menu
    function setupAnalysisToolsDropdown() {
        console.log('Setting up analysis tools dropdown');
        
        const analysisToolsBtn = document.getElementById('analysis-tools-button');
        if (!analysisToolsBtn) {
            console.error('Analysis tools button not found');
            return;
        }
        
        // Create dropdown menu for analysis tools button
        const analysisToolsMenu = document.createElement('div');
        analysisToolsMenu.className = 'actions-dropdown-menu';
        analysisToolsMenu.id = 'analysis-tools-menu';
        analysisToolsMenu.style.display = 'none';
        
        // Create analysis menu item for opening the suite
        const createAnalysisMenuItem = (text, handler, color = null) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'actions-menu-item';
            menuItem.textContent = text;
            
            if (color) {
                menuItem.style.color = color;
            }
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                handler();
                analysisToolsMenu.style.display = 'none';
            });
            
            return menuItem;
        };
        
        // Create single menu item for Analysis Suite
        const analysisSuiteItem = createAnalysisMenuItem('Open Analysis Suite', openAnalysisSuite, '#4CAF50'); // Green
        analysisSuiteItem.setAttribute('data-action', 'open-analysis-suite');
        analysisToolsMenu.appendChild(analysisSuiteItem);
        
        // Add the dropdown menu to the document
        document.body.appendChild(analysisToolsMenu);
        
        // Toggle menu display on click
        analysisToolsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Position the menu below the analysis tools button
            const rect = this.getBoundingClientRect();
            analysisToolsMenu.style.top = `${rect.bottom + 5}px`;
            analysisToolsMenu.style.left = `${rect.left - 144 + rect.width/2}px`; // Center menu under the button
            
            // Toggle visibility
            if (analysisToolsMenu.style.display === 'none') {
                // Hide all other menus first
                document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                    if (menu.id !== 'analysis-tools-menu') {
                        menu.style.display = 'none';
                    }
                });
                
                analysisToolsMenu.style.display = 'block';
                
                // Close when clicking outside
                const closeMenu = function() {
                    analysisToolsMenu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                };
                
                // Add slight delay to avoid immediate closing
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 10);
            } else {
                analysisToolsMenu.style.display = 'none';
            }
        });
    }
    
    // Set up analysis modal functionality
    function setupAnalysisModal() {
        console.log('Setting up analysis modal');
        
        const modal = document.getElementById('analysisModal');
        const copyBtn = document.getElementById('copyAnalysisBtn');
        const closeBtns = [
            document.getElementById('closeAnalysisBtn'),
            document.getElementById('closeAnalysisModalBtn')
        ];
        
        // Close modal when clicking close buttons
        closeBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('show');
                });
            }
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
        
        // Copy markdown text to clipboard
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const analysisText = document.getElementById('analysisText');
                if (!analysisText) return;
                
                // Get the markdown from the data attribute instead of the displayed content
                const markdownContent = analysisText.getAttribute('data-markdown') || analysisText.textContent;
                
                navigator.clipboard.writeText(markdownContent)
                    .then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy to Clipboard';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Could not copy text: ', err);
                        // Fallback for browsers that don't support clipboard API
                        const textarea = document.createElement('textarea');
                        textarea.value = markdownContent;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy to Clipboard';
                        }, 2000);
                    });
            });
        }
    }
    
    // Set up tab navigation
    function setupTabNavigation() {
        console.log('Setting up tab navigation');
        
        const tabs = document.querySelectorAll('.analysis-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Get the tab type
                currentTab = tab.getAttribute('data-tab');
                
                // Generate content for the selected tab
                generateTabContent(currentTab);
            });
        });
    }
    
    // Open the analysis suite modal
    function openAnalysisSuite() {
        console.log('🚀 Opening Analysis Suite');
        
        const modal = document.getElementById('analysisModal');
        if (modal) {
            modal.classList.add('show');
            
            // Load the default tab content
            generateTabContent(currentTab);
        }
    }
    
    // Generate content based on selected tab
    function generateTabContent(tabType) {
        console.log(`Generating content for tab: ${tabType}`);
        
        let markdown = '';
        
        switch(tabType) {
            case 'config-markdown':
                markdown = generateShipConfigMarkdown();
                break;
            case 'config-names':
                markdown = generateShipConfigNameMarkdown();
                break;
            case 'config-uniqueness':
                markdown = generateConfigUniquenessAnalysis();
                break;
            case 'component-usage':
                markdown = generateComponentUsageAnalysis();
                break;
            case 'config-similarity':
                markdown = generateConfigSimilarityAnalysis();
                break;
            case 'performance-matrix':
                markdown = generatePerformanceMatrixAnalysis();
                break;
            case 'slot-utilization':
                markdown = generateSlotUtilizationAnalysis();
                break;
            case 'validation-report':
                markdown = generateValidationReport();
                break;
            case 'drone-port-ships':
                markdown = generateDronePortAnalysis();
                break;
            case 'stat-impact':
                markdown = generateStatImpactAnalysis();
                break;
            case 'component-stats-table':
                markdown = generateComponentStatsTable();
                break;
            default:
                markdown = '# Error\n\nUnknown analysis type selected.';
        }
        
        // Convert markdown to HTML and display
        const html = convertMarkdownToHTML(markdown);
        const analysisText = document.getElementById('analysisText');
        
        if (analysisText) {
            analysisText.innerHTML = html;
            analysisText.setAttribute('data-markdown', markdown);
        }
    }
    
    // Export ship configurations as markdown
    function exportConfigMarkdown() {
        console.log('📄 Generating ship configuration markdown');
        
        // Generate both markdown and HTML content
        const markdown = generateShipConfigMarkdown();
        const html = convertMarkdownToHTML(markdown);
        
        // Display HTML in modal but store markdown for copying
        const markdownText = document.getElementById('configMarkdownText');
        const modal = document.getElementById('configMarkdownModal');
        
        if (markdownText && modal) {
            markdownText.innerHTML = html; // Display as HTML
            markdownText.setAttribute('data-markdown', markdown); // Store markdown for copying
            modal.classList.add('show');
        } else {
            console.error('Markdown modal elements not found');
        }
    }
    
    // Export ship configuration names as simplified markdown
    function exportConfigNameMarkdown() {
        console.log('📝 Generating simplified ship configuration name markdown');
        
        // Generate both markdown and HTML content
        const markdown = generateShipConfigNameMarkdown();
        const html = convertMarkdownToHTML(markdown);
        
        // Display HTML in modal but store markdown for copying
        const markdownText = document.getElementById('configMarkdownText');
        const modal = document.getElementById('configMarkdownModal');
        
        if (markdownText && modal) {
            markdownText.innerHTML = html; // Display as HTML
            markdownText.setAttribute('data-markdown', markdown); // Store markdown for copying
            modal.classList.add('show');
        } else {
            console.error('Markdown modal elements not found');
        }
    }
    
    // Export configuration uniqueness analysis
    function exportConfigUniqueness() {
        console.log('🔍 Analyzing configuration uniqueness across ships');
        
        // Generate both markdown and HTML content
        const markdown = generateConfigUniquenessAnalysis();
        const html = convertMarkdownToHTML(markdown);
        
        // Display HTML in modal but store markdown for copying
        const markdownText = document.getElementById('configMarkdownText');
        const modal = document.getElementById('configMarkdownModal');
        
        if (markdownText && modal) {
            markdownText.innerHTML = html; // Display as HTML
            markdownText.setAttribute('data-markdown', markdown); // Store markdown for copying
            modal.classList.add('show');
        } else {
            console.error('Markdown modal elements not found');
        }
    }
    
    // Generate markdown content for ship configurations
    function generateShipConfigMarkdown() {
        console.log('Generating markdown for ship configurations');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Ship Configurations\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        let markdown = '# Ship Configurations\n\n';
        
        // Add summary
        const totalShips = addedShips.length;
        const totalConfigs = Object.values(shipConfigurations).reduce((sum, configs) => sum + configs.length, 0);
        
        markdown += `**Summary**: ${totalShips} ships with ${totalConfigs} total configurations\n\n`;
        
        // Process each ship
        addedShips.forEach((ship, index) => {
            // Skip placeholder ships
            if (ship['Ship Name'] === 'Select Ship to Configure') {
                return;
            }
            
            const shipIdentifier = getShipIdentifier(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            // Add ship header
            markdown += `## ${getShipDisplayName(ship)}\n\n`;
            
            // Add ship details
            markdown += `- **Class**: ${getClassNameFromNumber(ship.Class)}\n`;
            if (ship.Spec) {
                markdown += `- **Specialization**: ${ship.Spec}\n`;
            }
            markdown += `- **Manufacturer**: ${ship.Manufacturer}\n`;
            markdown += `- **Configurations**: ${configs.length}\n\n`;
            
            // Process each configuration for this ship
            if (configs.length > 0) {
                configs.forEach((config, configIndex) => {
                    markdown += `### ${config.name || `Configuration ${configIndex + 1}`}\n\n`;
                    
                    // Check if configuration is locked
                    if (config.locked) {
                        markdown += `*🔒 This configuration is locked*\n\n`;
                    }
                    
                    // Count total components
                    let totalComponents = 0;
                    const componentsByCategory = {};
                    
                    Object.keys(config.components).forEach(category => {
                        const categoryComponents = config.components[category];
                        let categoryCount = 0;
                        
                        Object.keys(categoryComponents).forEach(componentType => {
                            const componentIds = categoryComponents[componentType];
                            if (Array.isArray(componentIds)) {
                                categoryCount += componentIds.filter(id => id !== '').length;
                            } else if (componentIds && componentIds !== '') {
                                categoryCount += 1;
                            }
                        });
                        
                        if (categoryCount > 0) {
                            componentsByCategory[category] = categoryCount;
                            totalComponents += categoryCount;
                        }
                    });
                    
                    if (totalComponents === 0) {
                        markdown += `*No components configured*\n\n`;
                    } else {
                        markdown += `**Components** (${totalComponents} total):\n\n`;
                        
                        // List components by category
                        Object.keys(componentsByCategory).forEach(category => {
                            const count = componentsByCategory[category];
                            markdown += `- **${category}**: ${count} component${count > 1 ? 's' : ''}\n`;
                            
                            // List specific components
                            const categoryComponents = config.components[category];
                            Object.keys(categoryComponents).forEach(componentType => {
                                const componentIds = categoryComponents[componentType];
                                const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                                
                                idsArray.forEach(componentId => {
                                    if (componentId && componentId !== '') {
                                        const component = findComponentById ? findComponentById(componentId) : null;
                                        if (component) {
                                            const componentName = component.name || 'Unknown Component';
                                            const tier = component.properties?.Tier || '';
                                            const classSize = component.properties?.Class || '';
                                            
                                            let componentInfo = `  - ${componentName}`;
                                            if (tier || classSize) {
                                                componentInfo += ` (${[tier, classSize].filter(Boolean).join(' ')})`;
                                            }
                                            markdown += `${componentInfo}\n`;
                                        } else {
                                            markdown += `  - Component ID: ${componentId}\n`;
                                        }
                                    }
                                });
                            });
                        });
                        
                        markdown += '\n';
                    }
                    
                    // Add configuration stats if available
                    if (typeof calculateModifiedStats === 'function') {
                        const modifiedStats = calculateModifiedStats(ship, config.components);
                        const baseStatValues = [];
                        const modifiedStatValues = [];
                        const changedStats = [];
                        
                        // Get relevant stats
                        const relevantStats = typeof getRelevantStats === 'function' ? getRelevantStats() : [];
                        
                        relevantStats.forEach(statName => {
                            const baseValue = ship[statName];
                            const modifiedValue = modifiedStats[statName];
                            
                            if (baseValue !== modifiedValue && modifiedValue !== baseValue) {
                                const change = modifiedValue - baseValue;
                                const changeStr = change >= 0 ? `+${change}` : `${change}`;
                                changedStats.push(`- **${statName}**: ${baseValue} → ${modifiedValue} (${changeStr})`);
                            }
                        });
                        
                        if (changedStats.length > 0) {
                            markdown += `**Stat Modifications**:\n\n${changedStats.join('\n')}\n\n`;
                        }
                    }
                });
            } else {
                markdown += `*No configurations available*\n\n`;
            }
            
            // Add separator between ships (except for last ship)
            if (index < addedShips.length - 1) {
                markdown += '---\n\n';
            }
        });
        
        // Add footer with generation timestamp
        const now = new Date();
        markdown += `\n---\n\n*Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()} by Ship Config Lite*\n`;
        
        return markdown;
    }
    
    // Generate simplified markdown content with just ship and config names
    function generateShipConfigNameMarkdown() {
        console.log('Generating simplified markdown for ship and configuration names');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Ship Configuration Names\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        let markdown = '# Ship Configuration Names\n\n';
        
        // Add summary
        const totalShips = addedShips.filter(ship => ship['Ship Name'] !== 'Select Ship to Configure').length;
        const totalConfigs = Object.values(shipConfigurations).reduce((sum, configs) => sum + configs.length, 0);
        
        markdown += `**Summary**: ${totalShips} ships with ${totalConfigs} total configurations\n\n`;
        
        // Process each ship
        addedShips.forEach((ship, index) => {
            // Skip placeholder ships
            if (ship['Ship Name'] === 'Select Ship to Configure') {
                return;
            }
            
            const shipIdentifier = getShipIdentifier(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            // Add ship header
            markdown += `## ${getShipDisplayName(ship)}\n\n`;
            
            // Add ship basic info
            markdown += `- **Class**: ${getClassNameFromNumber(ship.Class)}\n`;
            if (ship.Spec) {
                markdown += `- **Specialization**: ${ship.Spec}\n`;
            }
            markdown += `- **Manufacturer**: ${ship.Manufacturer}\n\n`;
            
            // List configuration names
            if (configs.length > 0) {
                markdown += `**Configurations** (${configs.length}):\n\n`;
                
                configs.forEach((config, configIndex) => {
                    const configName = config.name || `Configuration ${configIndex + 1}`;
                    const lockStatus = config.locked ? ' 🔒' : '';
                    markdown += `${configIndex + 1}. ${configName}${lockStatus}\n`;
                });
                
                markdown += '\n';
            } else {
                markdown += `*No configurations available*\n\n`;
            }
            
            // Add separator between ships (except for last ship)
            const remainingShips = addedShips.slice(index + 1).filter(s => s['Ship Name'] !== 'Select Ship to Configure');
            if (remainingShips.length > 0) {
                markdown += '---\n\n';
            }
        });
        
        // Add footer with generation timestamp
        const now = new Date();
        markdown += `\n---\n\n*Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()} by Ship Config Lite*\n`;
        
        return markdown;
    }
    
    // Generate configuration uniqueness analysis
    function generateConfigUniquenessAnalysis() {
        console.log('Analyzing configuration uniqueness across all ships');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Configuration Uniqueness Analysis\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        // Build a map of config names to ships that use them
        const configToShips = new Map();
        let totalConfigs = 0;
        
        // Analyze all ships and their configurations
        addedShips.forEach(ship => {
            // Skip placeholder ships
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') {
                return;
            }
            
            const shipIdentifier = getShipIdentifier(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            configs.forEach(config => {
                if (!config || !config.name) return;
                
                totalConfigs++;
                const configName = config.name;
                
                if (!configToShips.has(configName)) {
                    configToShips.set(configName, []);
                }
                
                const shipInfo = {
                    shipName: getShipDisplayName(ship),
                    shipId: shipIdentifier,
                    isLocked: config.locked || false
                };
                
                // Check if this ship is already in the list for this config
                const existingEntry = configToShips.get(configName).find(s => s.shipId === shipIdentifier);
                if (!existingEntry) {
                    configToShips.get(configName).push(shipInfo);
                }
            });
        });
        
        // Categorize configs by uniqueness
        const uniqueConfigs = [];
        const sharedConfigs = [];
        
        configToShips.forEach((ships, configName) => {
            if (ships.length === 1) {
                uniqueConfigs.push({ configName, ship: ships[0] });
            } else {
                sharedConfigs.push({ configName, ships, totalInstances: ships.length });
            }
        });
        
        // Sort for better readability
        uniqueConfigs.sort((a, b) => a.ship.shipName.localeCompare(b.ship.shipName));
        sharedConfigs.sort((a, b) => b.ships.length - a.ships.length || a.configName.localeCompare(b.configName));
        
        // Generate markdown
        let markdown = '# Configuration Uniqueness Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary statistics
        markdown += '## Summary\n\n';
        markdown += `- **Total Ships**: ${addedShips.filter(s => s['Ship Name'] !== 'Select Ship to Configure').length}\n`;
        markdown += `- **Total Configurations**: ${totalConfigs}\n`;
        markdown += `- **Unique Configuration Names**: ${configToShips.size}\n`;
        markdown += `- **Ship-Exclusive Configs**: ${uniqueConfigs.length} (${configToShips.size > 0 ? Math.round(uniqueConfigs.length / configToShips.size * 100) : 0}%)\n`;
        markdown += `- **Shared Configs**: ${sharedConfigs.length} (${configToShips.size > 0 ? Math.round(sharedConfigs.length / configToShips.size * 100) : 0}%)\n\n`;
        
        markdown += '---\n\n';
        
        // Unique configurations section
        markdown += '## Ship-Exclusive Configurations\n\n';
        markdown += '*These configuration names are used by only one ship:*\n\n';
        
        if (uniqueConfigs.length === 0) {
            markdown += '*(No exclusive configurations found)*\n\n';
        } else {
            let currentShip = '';
            uniqueConfigs.forEach(({ configName, ship }) => {
                if (ship.shipName !== currentShip) {
                    if (currentShip) markdown += '\n';
                    markdown += `### ${ship.shipName}\n`;
                    currentShip = ship.shipName;
                }
                markdown += `- ${configName}${ship.isLocked ? ' 🔒' : ''}\n`;
            });
            markdown += '\n';
        }
        
        markdown += '---\n\n';
        
        // Shared configurations section
        markdown += '## Shared Configurations\n\n';
        markdown += '*These configuration names are used by multiple ships:*\n\n';
        
        if (sharedConfigs.length === 0) {
            markdown += '*(No shared configurations found)*\n\n';
        } else {
            // Count total instances of each shared config name across all ships
            const configInstanceCounts = new Map();
            
            // Count how many times each config name appears total
            addedShips.forEach(ship => {
                if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
                
                const shipIdentifier = getShipIdentifier(ship);
                const configs = shipConfigurations[shipIdentifier] || [];
                
                configs.forEach(config => {
                    if (!config || !config.name) return;
                    
                    const configName = config.name;
                    configInstanceCounts.set(configName, (configInstanceCounts.get(configName) || 0) + 1);
                });
            });
            
            // Create a concise list of shared configs
            markdown += '| Configuration Name | Ships Using | Total Instances |\n';
            markdown += '|-------------------|-------------|----------------|\n';
            
            sharedConfigs.forEach(({ configName, ships }) => {
                const totalInstances = configInstanceCounts.get(configName) || ships.length;
                markdown += `| ${configName} | ${ships.length} | ${totalInstances} |\n`;
            });
            
            markdown += '\n';
            
            // Add expandable details section
            markdown += '### Detailed Ship Usage\n\n';
            markdown += '*Click to expand each configuration for ship details:*\n\n';
            
            sharedConfigs.forEach(({ configName, ships }) => {
                const totalInstances = configInstanceCounts.get(configName) || ships.length;
                markdown += `<details>\n<summary><strong>${configName}</strong> (${ships.length} ships, ${totalInstances} total instances)</summary>\n\n`;
                
                // Group ships by how many times they use this config
                const shipUsageCounts = new Map();
                
                ships.forEach(ship => {
                    const configs = shipConfigurations[ship.shipId] || [];
                    const count = configs.filter(c => c.name === configName).length;
                    
                    if (!shipUsageCounts.has(count)) {
                        shipUsageCounts.set(count, []);
                    }
                    shipUsageCounts.get(count).push(ship);
                });
                
                // Sort by usage count (highest first)
                const sortedCounts = Array.from(shipUsageCounts.keys()).sort((a, b) => b - a);
                
                sortedCounts.forEach(count => {
                    const shipsWithCount = shipUsageCounts.get(count);
                    shipsWithCount.sort((a, b) => a.shipName.localeCompare(b.shipName));
                    
                    shipsWithCount.forEach(ship => {
                        const lockIndicator = ship.isLocked ? ' 🔒' : '';
                        if (count > 1) {
                            markdown += `- ${ship.shipName} (×${count})${lockIndicator}\n`;
                        } else {
                            markdown += `- ${ship.shipName}${lockIndicator}\n`;
                        }
                    });
                });
                
                markdown += '\n</details>\n\n';
            });
        }
        
        markdown += '---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Helper function to get ship display name
    function getShipDisplayName(ship) {
        if (!ship || !ship['Ship Name']) return 'Unknown Ship';
        
        const manufacturer = ship.Manufacturer || 'Unknown';
        const shipName = ship['Ship Name'];
        
        // Don't add manufacturer prefix if it's already part of the ship name or if it's "Custom"
        if (shipName.toLowerCase().includes(manufacturer.toLowerCase()) || manufacturer === 'Custom') {
            return shipName;
        }
        
        return `${manufacturer} ${shipName}`;
    }
    
    // Helper function to get class name from number
    function getClassNameFromNumber(classNumber) {
        const classNames = ["", "XXS", "XS", "Small", "Medium", "Large", "Capital", "Commander", "Class 8", "Titan"];
        return classNames[classNumber] || classNumber.toString();
    }
    
    // Helper function to get ship identifier
    function getShipIdentifier(ship) {
        if (!ship || !ship['Ship Name'] || !ship.Manufacturer) {
            console.error("Invalid ship object for identifier:", ship);
            return "unknown-ship";
        }
        return `${ship['Ship Name']}-${ship.Manufacturer}`.replace(/\s+/g, '-').toLowerCase();
    }
    
    // Convert markdown to HTML for display
    function convertMarkdownToHTML(markdown) {
        let html = markdown;
        
        // Convert headers
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Convert bold text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert italic text (but not within bold text)
        html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
        
        // Convert horizontal rules
        html = html.replace(/^---$/gm, '<hr>');
        
        // Convert markdown tables - improved handling for complex tables
        const tableLines = [];
        let inTable = false;
        let tableStart = -1;
        
        const lines = html.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('|') && lines[i].endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableStart = i;
                }
            } else if (inTable) {
                // Process the table
                const tableEndIndex = i;
                const tableContent = lines.slice(tableStart, tableEndIndex);
                
                // Check if second line is separator line
                let isTable = false;
                let headerRowIndex = 0;
                if (tableContent.length > 1 && tableContent[1].match(/^\|[\s\-:|]+\|$/)) {
                    isTable = true;
                    headerRowIndex = 0;
                }
                
                if (isTable) {
                    let tableHtml = '<table class="analysis-table">';
                    
                    // Process header
                    const headerCells = tableContent[headerRowIndex].split('|').slice(1, -1).map(cell => cell.trim());
                    tableHtml += '<thead><tr>';
                    headerCells.forEach(cell => {
                        tableHtml += '<th>' + cell + '</th>';
                    });
                    tableHtml += '</tr></thead>';
                    
                    // Process body rows
                    tableHtml += '<tbody>';
                    for (let j = 2; j < tableContent.length; j++) {
                        if (tableContent[j].startsWith('|') && tableContent[j].endsWith('|')) {
                            const cells = tableContent[j].split('|').slice(1, -1).map(cell => cell.trim());
                            tableHtml += '<tr>';
                            cells.forEach(cell => {
                                tableHtml += '<td>' + cell + '</td>';
                            });
                            tableHtml += '</tr>';
                        }
                    }
                    tableHtml += '</tbody></table>';
                    
                    // Replace the table lines with the HTML
                    lines.splice(tableStart, tableEndIndex - tableStart, tableHtml);
                    i = tableStart;
                }
                
                inTable = false;
            }
        }
        
        html = lines.join('\n');
        
        // Convert lists (unordered)
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        
        // Convert numbered lists
        html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
        
        // Wrap consecutive list items in ul/ol tags
        html = html.replace(/(<li>.*?<\/li>[\s\n]*)+/gs, function(match) {
            // Simple check - if any li contains a number prefix in the original, it's ordered
            if (match.includes('1.') || match.includes('2.') || match.includes('3.')) {
                return '<ol>' + match + '</ol>';
            } else {
                return '<ul>' + match + '</ul>';
            }
        });
        
        // Convert line breaks to paragraph breaks for better formatting (less aggressive)
        html = html.replace(/\n\n+/g, '</p><p>'); // Only convert double+ line breaks to paragraph breaks
        
        // Wrap in paragraphs and clean up
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, ''); // Remove empty paragraphs
        html = html.replace(/<p>(<h[1-6]>)/g, '$1').replace(/(<\/h[1-6]>)<\/p>/g, '$1'); // Don't wrap headers in paragraphs
        html = html.replace(/<p>(<hr>)<\/p>/g, '$1'); // Don't wrap hr in paragraphs
        html = html.replace(/<p>(<[ou]l>)/g, '$1').replace(/(<\/[ou]l>)<\/p>/g, '$1'); // Don't wrap lists in paragraphs
        html = html.replace(/<p>(<table)/g, '$1').replace(/(<\/table>)<\/p>/g, '$1'); // Don't wrap tables in paragraphs
        html = html.replace(/<p>(<details)/g, '$1').replace(/(<\/details>)<\/p>/g, '$1'); // Don't wrap details in paragraphs
        
        return html;
    }
    
    // Generate Component Usage Analysis
    function generateComponentUsageAnalysis() {
        console.log('Analyzing component usage across all configurations');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined' || typeof components === 'undefined') {
            console.error('Required ship or component data not available');
            return '# Component Usage Analysis\n\nNo data available. Please ensure ships and components are loaded.';
        }
        
        // Build component usage statistics
        const componentUsage = new Map();
        const componentsByCategory = new Map();
        let totalSlots = 0;
        let filledSlots = 0;
        
        // Analyze all configurations
        addedShips.forEach(ship => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
            
            const shipIdentifier = getShipIdentifier(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            configs.forEach(config => {
                if (!config || !config.components) return;
                
                Object.keys(config.components).forEach(category => {
                    const categoryComponents = config.components[category];
                    
                    Object.keys(categoryComponents).forEach(componentType => {
                        const componentIds = categoryComponents[componentType];
                        const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                        
                        idsArray.forEach(componentId => {
                            totalSlots++;
                            if (componentId && componentId !== '') {
                                filledSlots++;
                                
                                // Track component usage
                                if (!componentUsage.has(componentId)) {
                                    componentUsage.set(componentId, {
                                        count: 0,
                                        ships: new Set(),
                                        component: findComponentById ? findComponentById(componentId) : null
                                    });
                                }
                                
                                const usage = componentUsage.get(componentId);
                                usage.count++;
                                usage.ships.add(getShipDisplayName(ship));
                                
                                // Track by category
                                if (!componentsByCategory.has(category)) {
                                    componentsByCategory.set(category, new Map());
                                }
                                componentsByCategory.get(category).set(componentId, usage);
                            }
                        });
                    });
                });
            });
        });
        
        // Generate markdown
        let markdown = '# Component Usage Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary
        markdown += '## Summary\n\n';
        markdown += `- **Total Component Slots**: ${totalSlots}\n`;
        markdown += `- **Filled Slots**: ${filledSlots} (${totalSlots > 0 ? Math.round(filledSlots / totalSlots * 100) : 0}%)\n`;
        markdown += `- **Unique Components Used**: ${componentUsage.size}\n`;
        markdown += `- **Categories Analyzed**: ${componentsByCategory.size}\n\n`;
        
        // Most popular components
        markdown += '## Top 20 Most Used Components\n\n';
        const sortedComponents = Array.from(componentUsage.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20);
        
        markdown += '| Component Name | Category | Times Used | Ships Using |\n';
        markdown += '|----------------|----------|------------|-------------|\n';
        
        sortedComponents.forEach(([componentId, usage]) => {
            const comp = usage.component;
            const name = comp?.name || componentId;
            const category = comp?.properties?.category || 'Unknown';
            markdown += `| ${name} | ${category} | ${usage.count} | ${usage.ships.size} |\n`;
        });
        
        markdown += '\n';
        
        // Usage by category
        markdown += '## Usage by Category\n\n';
        componentsByCategory.forEach((categoryComponents, category) => {
            const sortedCategoryComps = Array.from(categoryComponents.entries())
                .sort((a, b) => b[1].count - a[1].count);
            
            markdown += `### ${category} (${categoryComponents.size} components)\n\n`;
            
            const topFive = sortedCategoryComps.slice(0, 5);
            topFive.forEach(([componentId, usage]) => {
                const comp = usage.component;
                const name = comp?.name || componentId;
                markdown += `- **${name}**: ${usage.count} uses across ${usage.ships.size} ships\n`;
            });
            
            if (sortedCategoryComps.length > 5) {
                markdown += `- *...and ${sortedCategoryComps.length - 5} more*\n`;
            }
            
            markdown += '\n';
        });
        
        // Unused components
        if (typeof components !== 'undefined' && components) {
            const componentArray = components.allComponents || components;
            if (Array.isArray(componentArray) && componentArray.length > 0) {
                const usedIds = new Set(componentUsage.keys());
                const unusedComponents = componentArray.filter(comp => !usedIds.has(comp.id));
            
            markdown += '## Unused Components\n\n';
            markdown += `*${unusedComponents.length} components are loaded but not used in any configuration:*\n\n`;
            
            if (unusedComponents.length > 0) {
                const byCategory = {};
                unusedComponents.forEach(comp => {
                    const category = comp.properties?.category || 'Unknown';
                    if (!byCategory[category]) byCategory[category] = [];
                    byCategory[category].push(comp.name || comp.id);
                });
                
                Object.keys(byCategory).sort().forEach(category => {
                    markdown += `### ${category}\n`;
                    byCategory[category].sort().forEach(name => {
                        markdown += `- ${name}\n`;
                    });
                    markdown += '\n';
                });
            }
            }
        }
        
        markdown += '---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Configuration Similarity Analysis
    function generateConfigSimilarityAnalysis() {
        console.log('Analyzing configuration similarities');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Configuration Similarity Analysis\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        // Collect all configurations with their component sets
        const allConfigs = [];
        
        addedShips.forEach(ship => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
            
            const shipIdentifier = getShipIdentifier(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            configs.forEach((config, index) => {
                const componentSet = new Set();
                
                // Extract all component IDs into a set
                if (config.components) {
                    Object.values(config.components).forEach(category => {
                        Object.values(category).forEach(componentIds => {
                            const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                            idsArray.forEach(id => {
                                if (id && id !== '') componentSet.add(id);
                            });
                        });
                    });
                }
                
                allConfigs.push({
                    shipName: getShipDisplayName(ship),
                    configName: config.name || `Configuration ${index + 1}`,
                    componentSet: componentSet,
                    componentCount: componentSet.size,
                    config: config
                });
            });
        });
        
        // Calculate similarities between all configurations
        const similarities = [];
        
        for (let i = 0; i < allConfigs.length; i++) {
            for (let j = i + 1; j < allConfigs.length; j++) {
                const config1 = allConfigs[i];
                const config2 = allConfigs[j];
                
                // Calculate Jaccard similarity
                const intersection = new Set([...config1.componentSet].filter(x => config2.componentSet.has(x)));
                const union = new Set([...config1.componentSet, ...config2.componentSet]);
                
                if (union.size > 0) {
                    const similarity = intersection.size / union.size;
                    const differenceCount = union.size - intersection.size;
                    
                    similarities.push({
                        config1: config1,
                        config2: config2,
                        similarity: similarity,
                        sharedComponents: intersection.size,
                        totalComponents: union.size,
                        differenceCount: differenceCount
                    });
                }
            }
        }
        
        // Sort by similarity
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Generate markdown
        let markdown = '# Configuration Similarity Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary
        markdown += '## Summary\n\n';
        markdown += `- **Total Configurations Analyzed**: ${allConfigs.length}\n`;
        markdown += `- **Configuration Pairs Compared**: ${similarities.length}\n\n`;
        
        // Near-identical configurations (>90% similar)
        const nearIdentical = similarities.filter(s => s.similarity >= 0.9 && s.differenceCount > 0);
        markdown += '## Near-Identical Configurations\n\n';
        markdown += `*Configurations with 90%+ similarity but not exact duplicates:*\n\n`;
        
        if (nearIdentical.length === 0) {
            markdown += '*(No near-identical configurations found)*\n\n';
        } else {
            nearIdentical.slice(0, 20).forEach(sim => {
                const percent = Math.round(sim.similarity * 100);
                markdown += `### ${sim.config1.shipName} - "${sim.config1.configName}" ↔ ${sim.config2.shipName} - "${sim.config2.configName}"\n`;
                markdown += `- **Similarity**: ${percent}%\n`;
                markdown += `- **Shared Components**: ${sim.sharedComponents}/${sim.totalComponents}\n`;
                markdown += `- **Differences**: ${sim.differenceCount} component${sim.differenceCount > 1 ? 's' : ''}\n\n`;
            });
            
            if (nearIdentical.length > 20) {
                markdown += `*...and ${nearIdentical.length - 20} more near-identical pairs*\n\n`;
            }
        }
        
        // Exact duplicates
        const exactDuplicates = similarities.filter(s => s.similarity === 1.0 && s.sharedComponents > 0);
        markdown += '## Exact Duplicate Configurations\n\n';
        
        if (exactDuplicates.length === 0) {
            markdown += '*(No exact duplicates found)*\n\n';
        } else {
            markdown += '| Ship 1 | Config 1 | Ship 2 | Config 2 | Components |\n';
            markdown += '|--------|----------|--------|----------|------------|\n';
            
            exactDuplicates.forEach(dup => {
                markdown += `| ${dup.config1.shipName} | ${dup.config1.configName} | ${dup.config2.shipName} | ${dup.config2.configName} | ${dup.sharedComponents} |\n`;
            });
            
            markdown += '\n';
        }
        
        // Configuration clusters
        markdown += '## Configuration Diversity by Ship\n\n';
        
        const shipDiversity = new Map();
        allConfigs.forEach(config => {
            if (!shipDiversity.has(config.shipName)) {
                shipDiversity.set(config.shipName, []);
            }
            shipDiversity.get(config.shipName).push(config);
        });
        
        const diversityStats = [];
        shipDiversity.forEach((configs, shipName) => {
            if (configs.length > 1) {
                let totalSimilarity = 0;
                let comparisons = 0;
                
                for (let i = 0; i < configs.length; i++) {
                    for (let j = i + 1; j < configs.length; j++) {
                        const sim = similarities.find(s => 
                            (s.config1 === configs[i] && s.config2 === configs[j]) ||
                            (s.config1 === configs[j] && s.config2 === configs[i])
                        );
                        if (sim) {
                            totalSimilarity += sim.similarity;
                            comparisons++;
                        }
                    }
                }
                
                if (comparisons > 0) {
                    diversityStats.push({
                        shipName: shipName,
                        configCount: configs.length,
                        avgSimilarity: totalSimilarity / comparisons
                    });
                }
            }
        });
        
        diversityStats.sort((a, b) => a.avgSimilarity - b.avgSimilarity);
        
        markdown += '*Ships with the most diverse configurations:*\n\n';
        diversityStats.slice(0, 10).forEach(stat => {
            const diversity = Math.round((1 - stat.avgSimilarity) * 100);
            markdown += `- **${stat.shipName}**: ${stat.configCount} configs with ${diversity}% average diversity\n`;
        });
        
        markdown += '\n---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Performance Matrix Analysis
    function generatePerformanceMatrixAnalysis() {
        console.log('Generating performance matrix analysis');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Performance Matrix Analysis\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        // Collect all configurations with their stats
        const configStats = [];
        const statNames = typeof getRelevantStats === 'function' ? getRelevantStats() : [];
        
        addedShips.forEach(ship => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
            
            const shipIdentifier = getShipIdentifier(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            configs.forEach((config, index) => {
                const stats = typeof calculateModifiedStats === 'function' 
                    ? calculateModifiedStats(ship, config.components)
                    : ship;
                
                configStats.push({
                    shipName: getShipDisplayName(ship),
                    configName: config.name || `Configuration ${index + 1}`,
                    shipClass: getClassNameFromNumber(ship.Class),
                    stats: stats,
                    baseStats: ship
                });
            });
        });
        
        // Generate markdown
        let markdown = '# Performance Matrix Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary
        markdown += '## Summary\n\n';
        markdown += `- **Configurations Analyzed**: ${configStats.length}\n`;
        markdown += `- **Stats Tracked**: ${statNames.length}\n\n`;
        
        // Top performers by stat
        markdown += '## Top Performers by Stat\n\n';
        
        const performanceStats = [
            'subwarp_speed',
            'warp_speed',
            'warp_distance',
            'cargo_capacity',
            'fuel_capacity',
            'ammo_capacity',
            'crew',
            'respawn_time',
            'scan_resolution',
            'passive_radar'
        ];
        
        performanceStats.forEach(statName => {
            if (!statNames.includes(statName)) return;
            
            const sorted = configStats
                .filter(c => c.stats[statName] > 0)
                .sort((a, b) => b.stats[statName] - a.stats[statName])
                .slice(0, 5);
            
            if (sorted.length > 0) {
                markdown += `### ${statName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;
                sorted.forEach((config, i) => {
                    const improvement = config.stats[statName] - config.baseStats[statName];
                    const improvementStr = improvement !== 0 ? ` (${improvement >= 0 ? '+' : ''}${improvement})` : '';
                    markdown += `${i + 1}. **${config.shipName}** - ${config.configName}: ${config.stats[statName]}${improvementStr}\n`;
                });
                markdown += '\n';
            }
        });
        
        // Performance categories
        markdown += '## Performance Categories\n\n';
        
        // Categorize builds
        const categories = {
            speedBuilds: [],
            cargoBuilds: [],
            combatBuilds: [],
            balancedBuilds: []
        };
        
        configStats.forEach(config => {
            const stats = config.stats;
            
            // Calculate performance scores
            const speedScore = (stats.subwarp_speed || 0) + (stats.warp_speed || 0) * 2;
            const cargoScore = (stats.cargo_capacity || 0) + (stats.fuel_capacity || 0) * 0.5;
            const combatScore = (stats.ammo_capacity || 0) + (stats.respawn_time ? 1000 / stats.respawn_time : 0) * 100;
            
            // Categorize
            const scores = { speed: speedScore, cargo: cargoScore, combat: combatScore };
            const maxScore = Math.max(...Object.values(scores));
            const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 3;
            
            // Check if balanced (all scores within 20% of average)
            const isBalanced = Object.values(scores).every(score => 
                Math.abs(score - avgScore) / avgScore < 0.2
            );
            
            if (isBalanced && avgScore > 0) {
                categories.balancedBuilds.push({ ...config, scores });
            } else if (maxScore === speedScore && speedScore > 0) {
                categories.speedBuilds.push({ ...config, scores });
            } else if (maxScore === cargoScore && cargoScore > 0) {
                categories.cargoBuilds.push({ ...config, scores });
            } else if (maxScore === combatScore && combatScore > 0) {
                categories.combatBuilds.push({ ...config, scores });
            }
        });
        
        // Display categories
        markdown += '### Speed Builds\n';
        markdown += `*${categories.speedBuilds.length} configurations optimized for speed*\n\n`;
        categories.speedBuilds.slice(0, 5).forEach(config => {
            markdown += `- **${config.shipName}** - ${config.configName}\n`;
        });
        if (categories.speedBuilds.length > 5) {
            markdown += `- *...and ${categories.speedBuilds.length - 5} more*\n`;
        }
        markdown += '\n';
        
        markdown += '### Cargo Builds\n';
        markdown += `*${categories.cargoBuilds.length} configurations optimized for cargo*\n\n`;
        categories.cargoBuilds.slice(0, 5).forEach(config => {
            markdown += `- **${config.shipName}** - ${config.configName}\n`;
        });
        if (categories.cargoBuilds.length > 5) {
            markdown += `- *...and ${categories.cargoBuilds.length - 5} more*\n`;
        }
        markdown += '\n';
        
        markdown += '### Combat Builds\n';
        markdown += `*${categories.combatBuilds.length} configurations optimized for combat*\n\n`;
        categories.combatBuilds.slice(0, 5).forEach(config => {
            markdown += `- **${config.shipName}** - ${config.configName}\n`;
        });
        if (categories.combatBuilds.length > 5) {
            markdown += `- *...and ${categories.combatBuilds.length - 5} more*\n`;
        }
        markdown += '\n';
        
        markdown += '### Balanced Builds\n';
        markdown += `*${categories.balancedBuilds.length} well-rounded configurations*\n\n`;
        categories.balancedBuilds.slice(0, 5).forEach(config => {
            markdown += `- **${config.shipName}** - ${config.configName}\n`;
        });
        if (categories.balancedBuilds.length > 5) {
            markdown += `- *...and ${categories.balancedBuilds.length - 5} more*\n`;
        }
        
        markdown += '\n---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Slot Utilization Analysis
    function generateSlotUtilizationAnalysis() {
        console.log('Analyzing slot utilization across configurations');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Slot Utilization Analysis\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        // Analyze slot usage
        const slotUsageByShip = new Map();
        const slotUsageByCategory = new Map();
        let totalSlots = 0;
        let filledSlots = 0;
        
        addedShips.forEach(ship => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
            
            const shipIdentifier = getShipIdentifier(ship);
            const shipName = getShipDisplayName(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            const shipSlotData = {
                shipName: shipName,
                configs: []
            };
            
            configs.forEach((config, index) => {
                const configData = {
                    configName: config.name || `Configuration ${index + 1}`,
                    slotsByCategory: new Map(),
                    totalSlots: 0,
                    filledSlots: 0
                };
                
                if (config.components) {
                    Object.keys(config.components).forEach(category => {
                        const categoryData = {
                            totalSlots: 0,
                            filledSlots: 0,
                            emptySlots: []
                        };
                        
                        const categoryComponents = config.components[category];
                        Object.keys(categoryComponents).forEach(componentType => {
                            const componentIds = categoryComponents[componentType];
                            const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                            
                            idsArray.forEach((id, idx) => {
                                categoryData.totalSlots++;
                                configData.totalSlots++;
                                totalSlots++;
                                
                                if (id && id !== '') {
                                    categoryData.filledSlots++;
                                    configData.filledSlots++;
                                    filledSlots++;
                                } else {
                                    const slotName = Array.isArray(componentIds) 
                                        ? `${componentType} ${idx + 1}`
                                        : componentType;
                                    categoryData.emptySlots.push(slotName);
                                }
                            });
                        });
                        
                        configData.slotsByCategory.set(category, categoryData);
                        
                        // Track overall category usage
                        if (!slotUsageByCategory.has(category)) {
                            slotUsageByCategory.set(category, {
                                totalSlots: 0,
                                filledSlots: 0
                            });
                        }
                        const catStats = slotUsageByCategory.get(category);
                        catStats.totalSlots += categoryData.totalSlots;
                        catStats.filledSlots += categoryData.filledSlots;
                    });
                }
                
                shipSlotData.configs.push(configData);
            });
            
            slotUsageByShip.set(shipName, shipSlotData);
        });
        
        // Generate markdown
        let markdown = '# Slot Utilization Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Overall summary
        markdown += '## Overall Summary\n\n';
        markdown += `- **Total Slots Across All Configs**: ${totalSlots}\n`;
        markdown += `- **Filled Slots**: ${filledSlots} (${totalSlots > 0 ? Math.round(filledSlots / totalSlots * 100) : 0}%)\n`;
        markdown += `- **Empty Slots**: ${totalSlots - filledSlots} (${totalSlots > 0 ? Math.round((totalSlots - filledSlots) / totalSlots * 100) : 0}%)\n\n`;
        
        // Category breakdown
        markdown += '## Utilization by Category\n\n';
        markdown += '| Category | Total Slots | Filled | Empty | Fill Rate |\n';
        markdown += '|----------|-------------|--------|--------|----------|\n';
        
        Array.from(slotUsageByCategory.entries())
            .sort((a, b) => b[1].totalSlots - a[1].totalSlots)
            .forEach(([category, stats]) => {
                const fillRate = stats.totalSlots > 0 
                    ? Math.round(stats.filledSlots / stats.totalSlots * 100) 
                    : 0;
                const empty = stats.totalSlots - stats.filledSlots;
                markdown += `| ${category} | ${stats.totalSlots} | ${stats.filledSlots} | ${empty} | ${fillRate}% |\n`;
            });
        
        markdown += '\n';
        
        // Ships with most empty slots
        markdown += '## Ships with Most Empty Slots\n\n';
        
        const shipEmptySlots = [];
        slotUsageByShip.forEach(shipData => {
            let totalEmpty = 0;
            let totalSlots = 0;
            
            shipData.configs.forEach(config => {
                totalEmpty += (config.totalSlots - config.filledSlots);
                totalSlots += config.totalSlots;
            });
            
            if (totalSlots > 0) {
                shipEmptySlots.push({
                    shipName: shipData.shipName,
                    emptySlots: totalEmpty,
                    totalSlots: totalSlots,
                    fillRate: Math.round((totalSlots - totalEmpty) / totalSlots * 100)
                });
            }
        });
        
        shipEmptySlots
            .sort((a, b) => b.emptySlots - a.emptySlots)
            .slice(0, 10)
            .forEach(ship => {
                markdown += `- **${ship.shipName}**: ${ship.emptySlots} empty slots (${ship.fillRate}% fill rate)\n`;
            });
        
        markdown += '\n';
        
        // Commonly empty slot types
        markdown += '## Commonly Empty Slot Types\n\n';
        
        const emptySlotTypes = new Map();
        slotUsageByShip.forEach(shipData => {
            shipData.configs.forEach(config => {
                config.slotsByCategory.forEach((categoryData, category) => {
                    categoryData.emptySlots.forEach(slotType => {
                        const key = `${category} - ${slotType}`;
                        emptySlotTypes.set(key, (emptySlotTypes.get(key) || 0) + 1);
                    });
                });
            });
        });
        
        const sortedEmptyTypes = Array.from(emptySlotTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);
        
        if (sortedEmptyTypes.length > 0) {
            markdown += '*Most frequently empty slot types:*\n\n';
            sortedEmptyTypes.forEach(([slotType, count]) => {
                markdown += `- ${slotType}: Empty in ${count} configurations\n`;
            });
        } else {
            markdown += '*All slots are filled across all configurations!*\n';
        }
        
        markdown += '\n---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Validation Report
    function generateValidationReport() {
        console.log('Generating configuration validation report');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Configuration Validation Report\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        // Validation issues
        const issues = {
            critical: [],
            warnings: [],
            suggestions: []
        };
        
        // Essential component categories
        const essentialCategories = ['Reactors', 'Shields', 'Thrusters'];
        
        addedShips.forEach(ship => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
            
            const shipIdentifier = getShipIdentifier(ship);
            const shipName = getShipDisplayName(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            configs.forEach((config, index) => {
                const configName = config.name || `Configuration ${index + 1}`;
                const fullConfigName = `${shipName} - ${configName}`;
                
                // Check for empty configurations
                let hasAnyComponents = false;
                
                if (config.components) {
                    // Check essential components
                    essentialCategories.forEach(category => {
                        if (!config.components[category]) {
                            issues.warnings.push({
                                config: fullConfigName,
                                issue: `Missing ${category} category`
                            });
                        } else {
                            // Check if category has any filled components
                            let categoryFilled = false;
                            Object.values(config.components[category]).forEach(componentIds => {
                                const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                                if (idsArray.some(id => id && id !== '')) {
                                    categoryFilled = true;
                                    hasAnyComponents = true;
                                }
                            });
                            
                            if (!categoryFilled) {
                                issues.critical.push({
                                    config: fullConfigName,
                                    issue: `No ${category} equipped`
                                });
                            }
                        }
                    });
                    
                    // Check for tier mismatches
                    const componentTiers = [];
                    Object.values(config.components).forEach(category => {
                        Object.values(category).forEach(componentIds => {
                            const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                            idsArray.forEach(id => {
                                if (id && id !== '') {
                                    const component = findComponentById ? findComponentById(id) : null;
                                    if (component?.properties?.Tier) {
                                        componentTiers.push(component.properties.Tier);
                                    }
                                }
                            });
                        });
                    });
                    
                    // Check tier consistency
                    if (componentTiers.length > 0) {
                        const uniqueTiers = [...new Set(componentTiers)];
                        if (uniqueTiers.length > 2) {
                            issues.warnings.push({
                                config: fullConfigName,
                                issue: `Mixed component tiers: ${uniqueTiers.join(', ')}`
                            });
                        }
                    }
                    
                    // Count total components
                    let totalComponents = 0;
                    Object.values(config.components).forEach(category => {
                        Object.values(category).forEach(componentIds => {
                            const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                            totalComponents += idsArray.filter(id => id && id !== '').length;
                        });
                    });
                    
                    // Suggest optimization for low component count
                    if (totalComponents > 0 && totalComponents < 5) {
                        issues.suggestions.push({
                            config: fullConfigName,
                            issue: `Only ${totalComponents} components equipped - consider adding more`
                        });
                    }
                } else {
                    hasAnyComponents = false;
                }
                
                // Check for completely empty configs
                if (!hasAnyComponents) {
                    issues.critical.push({
                        config: fullConfigName,
                        issue: 'Configuration has no components'
                    });
                }
                
                // Check naming
                if (config.name && (config.name === 'Default' || config.name.match(/^Configuration \d+$/))) {
                    issues.suggestions.push({
                        config: fullConfigName,
                        issue: 'Consider a more descriptive configuration name'
                    });
                }
                
                // Check for extreme stat modifications if available
                if (typeof calculateModifiedStats === 'function') {
                    const modifiedStats = calculateModifiedStats(ship, config.components);
                    
                    // Check for stats that are reduced to 0 or negative
                    Object.keys(modifiedStats).forEach(statName => {
                        if (modifiedStats[statName] <= 0 && ship[statName] > 0) {
                            issues.warnings.push({
                                config: fullConfigName,
                                issue: `${statName} reduced to ${modifiedStats[statName]}`
                            });
                        }
                    });
                }
            });
        });
        
        // Generate markdown report
        let markdown = '# Configuration Validation Report\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary
        const totalIssues = issues.critical.length + issues.warnings.length + issues.suggestions.length;
        markdown += '## Summary\n\n';
        markdown += `- **Critical Issues**: ${issues.critical.length}\n`;
        markdown += `- **Warnings**: ${issues.warnings.length}\n`;
        markdown += `- **Suggestions**: ${issues.suggestions.length}\n`;
        markdown += `- **Total Issues**: ${totalIssues}\n\n`;
        
        // Critical issues
        markdown += '## 🚨 Critical Issues\n\n';
        if (issues.critical.length === 0) {
            markdown += '*No critical issues found!*\n\n';
        } else {
            markdown += '*These issues may prevent configurations from functioning properly:*\n\n';
            issues.critical.forEach(issue => {
                markdown += `- **${issue.config}**: ${issue.issue}\n`;
            });
            markdown += '\n';
        }
        
        // Warnings
        markdown += '## ⚠️ Warnings\n\n';
        if (issues.warnings.length === 0) {
            markdown += '*No warnings found!*\n\n';
        } else {
            markdown += '*These issues may impact performance or balance:*\n\n';
            issues.warnings.forEach(issue => {
                markdown += `- **${issue.config}**: ${issue.issue}\n`;
            });
            markdown += '\n';
        }
        
        // Suggestions
        markdown += '## 💡 Suggestions\n\n';
        if (issues.suggestions.length === 0) {
            markdown += '*No suggestions!*\n\n';
        } else {
            markdown += '*Consider these improvements:*\n\n';
            issues.suggestions.forEach(issue => {
                markdown += `- **${issue.config}**: ${issue.issue}\n`;
            });
            markdown += '\n';
        }
        
        // Health score
        const totalConfigs = addedShips.reduce((sum, ship) => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return sum;
            const shipId = getShipIdentifier(ship);
            return sum + (shipConfigurations[shipId]?.length || 0);
        }, 0);
        
        const healthScore = totalConfigs > 0 
            ? Math.max(0, 100 - (issues.critical.length * 10) - (issues.warnings.length * 5) - (issues.suggestions.length * 2))
            : 100;
        
        markdown += '## Configuration Health Score\n\n';
        markdown += `### Overall Score: ${healthScore}/100\n\n`;
        
        if (healthScore >= 90) {
            markdown += '*Excellent! Your configurations are well-optimized.*\n';
        } else if (healthScore >= 70) {
            markdown += '*Good configuration health with some room for improvement.*\n';
        } else if (healthScore >= 50) {
            markdown += '*Several issues need attention for optimal performance.*\n';
        } else {
            markdown += '*Critical issues detected. Review and fix configurations.*\n';
        }
        
        markdown += '\n---\n';
        markdown += `*Validation complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Drone Port Analysis
    function generateDronePortAnalysis() {
        console.log('Analyzing ships with drone ports equipped');
        
        // Check if we have access to the global variables
        if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
            console.error('Required ship data not available');
            return '# Drone Port Analysis\n\nNo ship data available. Please ensure ships are loaded in the comparison table.';
        }
        
        // Track ships with drone ports
        const shipsWithDronePorts = new Map();
        let totalDronePorts = 0;
        let totalShips = 0;
        let totalConfigs = 0;
        
        // Analyze all ships and configurations
        addedShips.forEach(ship => {
            if (!ship || ship['Ship Name'] === 'Select Ship to Configure') return;
            
            totalShips++;
            const shipIdentifier = getShipIdentifier(ship);
            const shipName = getShipDisplayName(ship);
            const configs = shipConfigurations[shipIdentifier] || [];
            
            const shipDronePortData = {
                shipName: shipName,
                shipClass: getClassNameFromNumber(ship.Class),
                manufacturer: ship.Manufacturer,
                configs: []
            };
            
            configs.forEach((config, index) => {
                totalConfigs++;
                const configName = config.name || `Configuration ${index + 1}`;
                const dronePorts = [];
                
                // Check Ship Component category for drone ports
                if (config.components && config.components['Ship Component']) {
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
                                        componentType.toLowerCase().includes('drone port') ||
                                        (component.properties && 
                                         Object.values(component.properties).some(val => 
                                             typeof val === 'string' && val.toLowerCase().includes('drone port')
                                         ))) {
                                        dronePorts.push({
                                            name: componentName,
                                            tier: component.properties?.Tier || 'Unknown',
                                            class: component.properties?.Class || 'Unknown',
                                            componentId: componentId
                                        });
                                        totalDronePorts++;
                                    }
                                }
                            }
                        });
                    });
                }
                
                // If this config has drone ports, add it
                if (dronePorts.length > 0) {
                    shipDronePortData.configs.push({
                        configName: configName,
                        dronePorts: dronePorts,
                        isLocked: config.locked || false
                    });
                }
            });
            
            // If this ship has any configs with drone ports, add it
            if (shipDronePortData.configs.length > 0) {
                shipsWithDronePorts.set(shipName, shipDronePortData);
            }
        });
        
        // Generate markdown report
        let markdown = '# Drone Port Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary
        markdown += '## Summary\n\n';
        markdown += `- **Total Ships Analyzed**: ${totalShips}\n`;
        markdown += `- **Ships with Drone Ports**: ${shipsWithDronePorts.size} (${totalShips > 0 ? Math.round(shipsWithDronePorts.size / totalShips * 100) : 0}%)\n`;
        markdown += `- **Total Configurations**: ${totalConfigs}\n`;
        markdown += `- **Total Drone Ports Equipped**: ${totalDronePorts}\n\n`;
        
        if (shipsWithDronePorts.size === 0) {
            markdown += '### No ships have drone ports equipped!\n\n';
            markdown += '*None of the analyzed ships have drone ports in any of their configurations.*\n';
        } else {
            // List ships with drone ports
            markdown += '## Ships with Drone Ports\n\n';
            
            // Sort by ship name
            const sortedShips = Array.from(shipsWithDronePorts.values())
                .sort((a, b) => a.shipName.localeCompare(b.shipName));
            
            sortedShips.forEach(shipData => {
                markdown += `### ${shipData.shipName}\n`;
                markdown += `- **Class**: ${shipData.shipClass}\n`;
                markdown += `- **Manufacturer**: ${shipData.manufacturer}\n`;
                markdown += `- **Configs with Drone Ports**: ${shipData.configs.length}\n\n`;
                
                shipData.configs.forEach(configData => {
                    const lockIcon = configData.isLocked ? ' 🔒' : '';
                    markdown += `#### ${configData.configName}${lockIcon}\n`;
                    
                    configData.dronePorts.forEach(dronePort => {
                        markdown += `- **${dronePort.name}**`;
                        if (dronePort.tier !== 'Unknown' || dronePort.class !== 'Unknown') {
                            markdown += ` (${dronePort.tier} ${dronePort.class})`;
                        }
                        markdown += '\n';
                    });
                    
                    markdown += '\n';
                });
            });
            
            // Quick reference list
            markdown += '## Quick Reference\n\n';
            markdown += '*Ships with drone ports (alphabetical):*\n\n';
            
            sortedShips.forEach(shipData => {
                const totalDronePortConfigs = shipData.configs.length;
                const totalDronePortsOnShip = shipData.configs.reduce((sum, config) => 
                    sum + config.dronePorts.length, 0
                );
                markdown += `- **${shipData.shipName}**: ${totalDronePortsOnShip} drone port${totalDronePortsOnShip > 1 ? 's' : ''} across ${totalDronePortConfigs} config${totalDronePortConfigs > 1 ? 's' : ''}\n`;
            });
            
            // Drone port tier distribution
            markdown += '\n## Drone Port Distribution by Tier\n\n';
            const tierCounts = new Map();
            
            shipsWithDronePorts.forEach(shipData => {
                shipData.configs.forEach(configData => {
                    configData.dronePorts.forEach(dronePort => {
                        const tier = dronePort.tier || 'Unknown';
                        tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
                    });
                });
            });
            
            if (tierCounts.size > 0) {
                markdown += '| Tier | Count |\n';
                markdown += '|------|-------|\n';
                
                Array.from(tierCounts.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .forEach(([tier, count]) => {
                        markdown += `| ${tier} | ${count} |\n`;
                    });
            }
        }
        
        markdown += '\n---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Stat Impact Analysis
    function generateStatImpactAnalysis() {
        console.log('Analyzing stat impacts from components');
        
        // Check if we have access to the required data
        if ((typeof components === 'undefined' || !components) && typeof componentAttributes === 'undefined') {
            console.error('Required component or attribute data not available');
            return '# Stat Impact Analysis\n\nNo component or attribute data available. Please ensure components are loaded.';
        }
        
        if (typeof getRelevantStats !== 'function') {
            console.error('getRelevantStats function not available');
            return '# Stat Impact Analysis\n\nRequired functions not available.';
        }
        
        // Get the components array from the correct location
        let componentArray = [];
        
        // Try different ways to get the component array
        if (components.allComponents && Array.isArray(components.allComponents)) {
            componentArray = components.allComponents;
            console.log('Using components.allComponents');
        } else if (components.rewardTree && Array.isArray(components.rewardTree)) {
            // For reward tree structure, we'll traverse it to get all components
            componentArray = components.rewardTree;
            console.log('Using components.rewardTree');
        } else if (Array.isArray(components)) {
            componentArray = components;
            console.log('Components is already an array');
        } else {
            console.error('Components is not in expected format:', components);
            return '# Stat Impact Analysis\n\nComponent data is not in the expected format. Please reload components.';
        }
        
        // Get all relevant stats
        const allStats = getRelevantStats();
        
        // Track stat impacts
        const statImpacts = new Map();
        const unusedStats = new Set(allStats);
        const componentStatEffects = new Map();
        
        // Also track all unique property names found in components for debugging
        const allComponentProperties = new Set();
        
        // Initialize stat impact tracking
        allStats.forEach(stat => {
            statImpacts.set(stat, {
                totalComponents: 0,
                positiveEffects: 0,
                negativeEffects: 0,
                neutralComponents: 0,
                totalPositiveValue: 0,
                totalNegativeValue: 0,
                componentBreakdown: new Map(),
                affectingComponents: []
            });
        });
        
        // Check if we have componentAttributes to analyze
        const hasComponentAttributes = typeof componentAttributes !== 'undefined' && componentAttributes;
        console.log('Component attributes available:', hasComponentAttributes);
        
        // Analyze componentAttributes structure if available
        if (hasComponentAttributes) {
            console.log('Analyzing componentAttributes structure...');
            
            // Iterate through categories in componentAttributes
            Object.keys(componentAttributes).forEach(category => {
                const categoryData = componentAttributes[category];
                if (!categoryData || typeof categoryData !== 'object') return;
                
                // Iterate through component groups
                Object.keys(categoryData).forEach(componentGroup => {
                    const groupData = categoryData[componentGroup];
                    if (!groupData || typeof groupData !== 'object') return;
                    
                    // Iterate through stats
                    Object.keys(groupData).forEach(statName => {
                        const statData = groupData[statName];
                        if (!statData || typeof statData !== 'object') return;
                        
                        // Track this as a component property
                        allComponentProperties.add(statName);
                        
                        // Check if this stat has any non-zero effects
                        const baseValue = statData.baseValue || 0;
                        const hasValues = statData.values && Object.keys(statData.values).length > 0;
                        
                        if (baseValue !== 0 || hasValues) {
                            // This component group affects this stat
                            const impactData = statImpacts.get(statName);
                            if (impactData) {
                                unusedStats.delete(statName);
                                impactData.totalComponents++;
                                
                                // Calculate average effect
                                let totalEffect = baseValue;
                                let effectCount = 1;
                                
                                if (hasValues) {
                                    const values = Object.values(statData.values);
                                    totalEffect = values.reduce((sum, val) => sum + val, baseValue);
                                    effectCount = values.length + 1;
                                }
                                
                                const avgEffect = totalEffect / effectCount;
                                
                                if (avgEffect > 0) {
                                    impactData.positiveEffects++;
                                    impactData.totalPositiveValue += Math.abs(avgEffect);
                                } else if (avgEffect < 0) {
                                    impactData.negativeEffects++;
                                    impactData.totalNegativeValue += Math.abs(avgEffect);
                                }
                                
                                // Track by category
                                if (!impactData.componentBreakdown.has(category)) {
                                    impactData.componentBreakdown.set(category, {
                                        count: 0,
                                        positiveCount: 0,
                                        negativeCount: 0
                                    });
                                }
                                const catData = impactData.componentBreakdown.get(category);
                                catData.count++;
                                if (avgEffect > 0) catData.positiveCount++;
                                else if (avgEffect < 0) catData.negativeCount++;
                                
                                // Add to affecting components
                                impactData.affectingComponents.push({
                                    name: `${category} - ${componentGroup}`,
                                    effect: avgEffect,
                                    category: category,
                                    tier: 'Various'
                                });
                                
                                // Track component effects
                                const componentKey = `${category} - ${componentGroup}`;
                                if (!componentStatEffects.has(componentKey)) {
                                    componentStatEffects.set(componentKey, {
                                        component: { name: componentGroup, category: category },
                                        effects: new Map(),
                                        totalStats: 0
                                    });
                                }
                                const compEffects = componentStatEffects.get(componentKey);
                                compEffects.effects.set(statName, avgEffect);
                                compEffects.totalStats = compEffects.effects.size;
                            }
                        }
                    });
                });
            });
            
            console.log('Component attributes analysis complete');
            console.log('Stats found in componentAttributes:', Array.from(allComponentProperties).sort());
        } else {
            console.log('No componentAttributes found, falling back to component property analysis');
            
            // Original component property collection logic as fallback
            function collectComponentProperties(component) {
                if (!component) return;
                
                // Check for properties at different levels
                const propsToCheck = [
                    component.properties,
                    component.attributes,
                    component
                ];
                
                for (const propSource of propsToCheck) {
                    if (propSource && typeof propSource === 'object') {
                        Object.keys(propSource).forEach(prop => {
                            const value = propSource[prop];
                            
                            // Skip non-stat properties
                            if (['id', 'name', 'children', 'properties', 'attributes', 'category', 'type'].includes(prop)) {
                                return;
                            }
                            
                            // Track numeric properties or properties that look like stats
                            if (typeof value === 'number' || 
                                !isNaN(parseFloat(value)) ||
                                (typeof value === 'string' && !isNaN(parseFloat(value)))) {
                                allComponentProperties.add(prop);
                            }
                        });
                    }
                }
                
                // Also check children if this is a category node
                if (component.children && Array.isArray(component.children)) {
                    component.children.forEach(child => collectComponentProperties(child));
                }
            }
            
            // If componentArray is actually the reward tree structure, traverse it
            if (components && components.rewardTree && Array.isArray(components.rewardTree)) {
                console.log('Traversing rewardTree structure...');
                components.rewardTree.forEach(node => collectComponentProperties(node));
            } else if (componentArray.length > 0) {
                // Otherwise use the component array
                componentArray.forEach(component => collectComponentProperties(component));
            }
        }
        
        console.log('Found component properties:', Array.from(allComponentProperties).sort());
        console.log('Looking for ship stats:', allStats);
        
        // Only analyze individual components if we don't have componentAttributes
        if (!hasComponentAttributes && componentArray.length > 0) {
            console.log('Analyzing individual components as fallback...');
            
            function analyzeComponent(component) {
                if (!component) return;
                
                // Get properties from wherever they are stored
                const componentProps = component.properties || component.attributes || component;
                if (!componentProps || typeof componentProps !== 'object') return;
                
                const componentEffects = new Map();
                let hasAnyEffect = false;
                
                // Check each stat for this component
                allStats.forEach(stat => {
                    const statData = statImpacts.get(stat);
                    let hasEffect = false;
                    let totalEffect = 0;
                    
                    // Create various possible stat property names
                    const possibleNames = [
                        stat,
                        stat.toLowerCase(),
                        stat.replace(/_/g, ''),
                        stat.replace(/_/g, '-'),
                        stat.replace(/-/g, '_'),
                        stat.replace(/[_-]/g, ''),
                        // Handle cases like warp_cool_down vs warp_cooldown
                        stat.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase()),
                        // Handle cases like warpCoolDown
                        stat.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
                    ];
                    
                    // Also check for various modifier/bonus/multiplier suffixes
                    const suffixes = ['', '_modifier', '_bonus', '_multiplier', 'Modifier', 'Bonus', 'Multiplier'];
                    
                    // Check all possible property names
                    for (const possibleName of possibleNames) {
                        for (const suffix of suffixes) {
                            const propName = possibleName + suffix;
                            
                            if (componentProps[propName] !== undefined) {
                                const value = parseFloat(componentProps[propName]);
                                
                                if (!isNaN(value)) {
                                    // Check if it's a meaningful value
                                    if (suffix.toLowerCase().includes('multiplier')) {
                                        // For multipliers, only count if different from 1
                                        if (value !== 1) {
                                            hasEffect = true;
                                            totalEffect += (value - 1) * 100; // Convert to percentage
                                        }
                                    } else {
                                        // For other properties, only count if not 0
                                        if (value !== 0) {
                                            hasEffect = true;
                                            totalEffect += value;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if (hasEffect) {
                        hasAnyEffect = true;
                        unusedStats.delete(stat);
                        statData.totalComponents++;
                        
                        if (totalEffect > 0) {
                            statData.positiveEffects++;
                            statData.totalPositiveValue += totalEffect;
                        } else if (totalEffect < 0) {
                            statData.negativeEffects++;
                            statData.totalNegativeValue += Math.abs(totalEffect);
                        }
                        
                        // Track component effect
                        componentEffects.set(stat, totalEffect);
                        
                        // Add to affecting components list
                        statData.affectingComponents.push({
                            name: component.name || component.id || 'Unknown Component',
                            effect: totalEffect,
                            category: componentProps.category || 'Unknown',
                            tier: componentProps.Tier || componentProps.tier || 'Unknown'
                        });
                        
                        // Track by category
                        const category = componentProps.category || 'Unknown';
                        if (!statData.componentBreakdown.has(category)) {
                            statData.componentBreakdown.set(category, {
                                count: 0,
                                positiveCount: 0,
                                negativeCount: 0
                            });
                        }
                        const catData = statData.componentBreakdown.get(category);
                        catData.count++;
                        if (totalEffect > 0) catData.positiveCount++;
                        else if (totalEffect < 0) catData.negativeCount++;
                    }
                });
                
                // Store component's overall effects
                if (hasAnyEffect) {
                    const componentName = component.name || component.id || 'Unknown Component';
                    componentStatEffects.set(componentName, {
                        component: component,
                        effects: componentEffects,
                        totalStats: componentEffects.size
                    });
                }
                
                // Process children if this is a category node
                if (component.children && Array.isArray(component.children)) {
                    component.children.forEach(child => analyzeComponent(child));
                }
            }
            
            // Process all components
            componentArray.forEach(component => analyzeComponent(component));
        }
        
        // Generate markdown report
        let markdown = '# Stat Impact Analysis\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Summary
        markdown += '## Summary\n\n';
        markdown += `- **Total Stats Analyzed**: ${allStats.length}\n`;
        markdown += `- **Stats with Component Effects**: ${allStats.length - unusedStats.size} (${allStats.length > 0 ? Math.round((allStats.length - unusedStats.size) / allStats.length * 100) : 0}%)\n`;
        markdown += `- **Unused Stats**: ${unusedStats.size} (${allStats.length > 0 ? Math.round(unusedStats.size / allStats.length * 100) : 0}%)\n`;
        markdown += `- **Components with Stat Effects**: ${componentStatEffects.size}\n\n`;
        
        // Unused stats section
        markdown += '## Unused Stats\n\n';
        if (unusedStats.size === 0) {
            markdown += '*All stats are affected by at least one component!*\n\n';
        } else {
            markdown += '*These stats are not modified by any components:*\n\n';
            Array.from(unusedStats).sort().forEach(stat => {
                markdown += `- **${stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**\n`;
            });
            markdown += '\n';
        }
        
        // Most impacted stats
        markdown += '## Most Impacted Stats\n\n';
        markdown += '*Stats affected by the most components:*\n\n';
        
        const sortedStats = Array.from(statImpacts.entries())
            .filter(([stat, data]) => data.totalComponents > 0)
            .sort((a, b) => b[1].totalComponents - a[1].totalComponents)
            .slice(0, 10);
        
        markdown += '| Stat | Total Components | Positive | Negative | Avg Positive | Avg Negative |\n';
        markdown += '|------|-----------------|----------|----------|--------------|---------------|\n';
        
        sortedStats.forEach(([stat, data]) => {
            const avgPositive = data.positiveEffects > 0 
                ? (data.totalPositiveValue / data.positiveEffects).toFixed(1)
                : '0';
            const avgNegative = data.negativeEffects > 0
                ? (data.totalNegativeValue / data.negativeEffects).toFixed(1)
                : '0';
            
            markdown += `| ${stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} | ${data.totalComponents} | ${data.positiveEffects} | ${data.negativeEffects} | ${avgPositive} | ${avgNegative} |\n`;
        });
        
        markdown += '\n';
        
        // Stat balance analysis
        markdown += '## Stat Balance Analysis\n\n';
        markdown += '*Distribution of positive vs negative effects:*\n\n';
        
        const balancedStats = [];
        const positiveHeavyStats = [];
        const negativeHeavyStats = [];
        
        statImpacts.forEach((data, stat) => {
            if (data.totalComponents === 0) return;
            
            const positiveRatio = data.positiveEffects / data.totalComponents;
            const negativeRatio = data.negativeEffects / data.totalComponents;
            
            const statInfo = {
                stat: stat,
                positiveRatio: positiveRatio,
                negativeRatio: negativeRatio,
                totalComponents: data.totalComponents
            };
            
            if (Math.abs(positiveRatio - negativeRatio) < 0.2) {
                balancedStats.push(statInfo);
            } else if (positiveRatio > negativeRatio) {
                positiveHeavyStats.push(statInfo);
            } else {
                negativeHeavyStats.push(statInfo);
            }
        });
        
        if (positiveHeavyStats.length > 0) {
            markdown += '### Mostly Positive Stats\n';
            positiveHeavyStats
                .sort((a, b) => b.positiveRatio - a.positiveRatio)
                .slice(0, 5)
                .forEach(info => {
                    const percent = Math.round(info.positiveRatio * 100);
                    markdown += `- **${info.stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**: ${percent}% positive effects\n`;
                });
            markdown += '\n';
        }
        
        if (negativeHeavyStats.length > 0) {
            markdown += '### Mostly Negative Stats\n';
            negativeHeavyStats
                .sort((a, b) => b.negativeRatio - a.negativeRatio)
                .slice(0, 5)
                .forEach(info => {
                    const percent = Math.round(info.negativeRatio * 100);
                    markdown += `- **${info.stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**: ${percent}% negative effects\n`;
                });
            markdown += '\n';
        }
        
        if (balancedStats.length > 0) {
            markdown += '### Balanced Stats\n';
            markdown += '*Stats with roughly equal positive and negative effects:*\n\n';
            balancedStats.slice(0, 5).forEach(info => {
                const posPercent = Math.round(info.positiveRatio * 100);
                const negPercent = Math.round(info.negativeRatio * 100);
                markdown += `- **${info.stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**: ${posPercent}% positive, ${negPercent}% negative\n`;
            });
            markdown += '\n';
        }
        
        // Component category impact breakdown
        markdown += '## Impact by Component Category\n\n';
        
        const categoryStats = new Map();
        statImpacts.forEach((data, stat) => {
            data.componentBreakdown.forEach((catData, category) => {
                if (!categoryStats.has(category)) {
                    categoryStats.set(category, new Map());
                }
                categoryStats.get(category).set(stat, catData);
            });
        });
        
        const sortedCategories = Array.from(categoryStats.entries())
            .sort((a, b) => b[1].size - a[1].size)
            .slice(0, 10);
        
        sortedCategories.forEach(([category, stats]) => {
            const totalEffects = Array.from(stats.values()).reduce((sum, data) => sum + data.count, 0);
            const totalPositive = Array.from(stats.values()).reduce((sum, data) => sum + data.positiveCount, 0);
            const totalNegative = Array.from(stats.values()).reduce((sum, data) => sum + data.negativeCount, 0);
            
            markdown += `### ${category}\n`;
            markdown += `- **Total Stat Effects**: ${totalEffects}\n`;
            markdown += `- **Positive/Negative**: ${totalPositive}/${totalNegative}\n`;
            markdown += `- **Stats Affected**: ${stats.size}\n\n`;
        });
        
        // Components with most stat effects
        markdown += '## Components with Most Stat Effects\n\n';
        const sortedComponents = Array.from(componentStatEffects.entries())
            .sort((a, b) => b[1].totalStats - a[1].totalStats)
            .slice(0, 15);
        
        markdown += '| Component | Category | Stats Affected | Net Effect |\n';
        markdown += '|-----------|----------|----------------|------------|\n';
        
                        sortedComponents.forEach(([name, data]) => {
                    const netEffect = Array.from(data.effects.values()).reduce((sum, val) => sum + val, 0);
                    const netEffectStr = netEffect > 0 ? `+${netEffect.toFixed(1)}` : netEffect.toFixed(1);
                    const componentProps = data.component.properties || data.component.attributes || data.component;
                    markdown += `| ${name} | ${componentProps.category || 'Unknown'} | ${data.totalStats} | ${netEffectStr} |\n`;
                });
        
        // Debug section: Show unmapped component properties
        markdown += '\n## Debug: Unmapped Component Properties\n\n';
        markdown += '*Component properties that might be stats but don\'t match ship stat names:*\n\n';
        
        const unmappedProperties = [];
        allComponentProperties.forEach(prop => {
            // Check if this property maps to any stat
            let isMapped = false;
            for (const stat of allStats) {
                const possibleNames = [
                    stat,
                    stat.toLowerCase(),
                    stat.replace(/_/g, ''),
                    stat.replace(/_/g, '-'),
                    stat.replace(/-/g, '_'),
                    stat.replace(/[_-]/g, ''),
                    stat.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase()),
                    stat.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
                ];
                
                if (possibleNames.includes(prop) || 
                    possibleNames.some(name => prop.startsWith(name) && 
                        (prop.endsWith('_modifier') || prop.endsWith('_bonus') || prop.endsWith('_multiplier') ||
                         prop.endsWith('Modifier') || prop.endsWith('Bonus') || prop.endsWith('Multiplier')))) {
                    isMapped = true;
                    break;
                }
            }
            
            if (!isMapped && !['id', 'name', 'category', 'tier', 'Tier', 'class', 'Class', 'type', 'Ship Component', 'Ship Module', 'Ship Weapons'].includes(prop)) {
                unmappedProperties.push(prop);
            }
        });
        
        if (unmappedProperties.length > 0) {
            unmappedProperties.sort().forEach(prop => {
                markdown += `- ${prop}\n`;
            });
            markdown += '\n*These properties might need to be mapped to ship stats or represent different game mechanics.*\n';
        } else {
            markdown += '*All component properties are successfully mapped to ship stats.*\n';
        }
        
        markdown += '\n---\n';
        markdown += `*Analysis complete: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Generate Component Stats Table
    function generateComponentStatsTable() {
        console.log('Generating component stats table');
        
        // Check if we have componentAttributes
        if (typeof componentAttributes === 'undefined' || !componentAttributes) {
            console.error('Component attributes not available');
            return '# Component Stats Table\n\nNo component attribute data available. Please ensure components are loaded and stats have been edited.';
        }
        
        // Collect all stats that have any non-zero effects
        const allStatsWithEffects = new Set();
        const componentData = new Map();
        
        // First pass: collect all data and determine which stats to show
        Object.keys(componentAttributes).forEach(category => {
            const categoryData = componentAttributes[category];
            if (!categoryData || typeof categoryData !== 'object') return;
            
            Object.keys(categoryData).forEach(componentGroup => {
                const groupData = categoryData[componentGroup];
                if (!groupData || typeof groupData !== 'object') return;
                
                const componentKey = `${category}|${componentGroup}`;
                const statEffects = new Map();
                
                Object.keys(groupData).forEach(statName => {
                    const statData = groupData[statName];
                    if (!statData || typeof statData !== 'object') return;
                    
                    const baseValue = statData.baseValue || 0;
                    
                    // Just use the base value, not tier-specific values
                    if (baseValue !== 0) {
                        allStatsWithEffects.add(statName);
                        statEffects.set(statName, baseValue);
                    }
                });
                
                if (statEffects.size > 0) {
                    componentData.set(componentKey, {
                        category: category,
                        name: componentGroup,
                        effects: statEffects
                    });
                }
            });
        });
        
        // Handle Ship Weapons specially - differentiate by firing cadence if possible
        const weaponComponents = new Map();
        if (components && components.allComponents) {
            components.allComponents.forEach(comp => {
                if (comp.properties && comp.properties.category === 'Ship Weapons') {
                    // Try to identify firing cadence from properties
                    let firingType = 'Standard';
                    if (comp.properties['Ship Weapons']) {
                        const weaponType = comp.properties['Ship Weapons'];
                        if (weaponType.includes('Beam')) firingType = 'Beam';
                        else if (weaponType.includes('Burst')) firingType = 'Burst';
                        else if (weaponType.includes('Rapid')) firingType = 'Rapid';
                        else if (weaponType.includes('Cannon')) firingType = 'Cannon';
                        else if (weaponType.includes('Missile')) firingType = 'Missile';
                    }
                    
                    const weaponKey = `Ship Weapons|${comp.name} (${firingType})`;
                    if (!weaponComponents.has(weaponKey)) {
                        weaponComponents.set(weaponKey, comp);
                    }
                }
            });
        }
        
        // Sort stats alphabetically for consistent column order
        const sortedStats = Array.from(allStatsWithEffects).sort();
        
        // Sort components by category and name
        const sortedComponents = Array.from(componentData.entries()).sort((a, b) => {
            const catCompare = a[1].category.localeCompare(b[1].category);
            if (catCompare !== 0) return catCompare;
            return a[1].name.localeCompare(b[1].name);
        });
        
        // Generate markdown table
        let markdown = '# Component Stats Table\n\n';
        markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        if (sortedStats.length === 0 || sortedComponents.length === 0) {
            markdown += '*No component stat effects found. Please edit component attributes in the component editor first.*\n';
            return markdown;
        }
        
        // Create table header
        markdown += '| Component | Category |';
        sortedStats.forEach(stat => {
            // Shorten stat names for better table display
            const shortName = stat.replace(/_/g, ' ')
                .replace(/asteroid mining /g, 'AM ')
                .replace(/damage /g, 'dmg ')
                .replace(/counter /g, 'ctr ')
                .replace(/warp /g, 'wrp ')
                .replace(/subwarp /g, 'sub ')
                .replace(/capacity/g, 'cap')
                .replace(/consumption/g, 'cons')
                .replace(/recharge/g, 'rchg');
            markdown += ` ${shortName} |`;
        });
        markdown += '\n';
        
        // Create separator row
        markdown += '|-----------|----------|';
        sortedStats.forEach(() => {
            markdown += '----------|';
        });
        markdown += '\n';
        
        // Create data rows
        sortedComponents.forEach(([key, data]) => {
            markdown += `| ${data.name} | ${data.category} |`;
            
            sortedStats.forEach(stat => {
                const value = data.effects.get(stat);
                if (value !== undefined) {
                    // Format the value nicely
                    if (Math.abs(value) >= 100) {
                        markdown += ` ${value.toFixed(0)} |`;
                    } else if (Math.abs(value) >= 10) {
                        markdown += ` ${value.toFixed(1)} |`;
                    } else if (Math.abs(value) >= 1) {
                        markdown += ` ${value.toFixed(2)} |`;
                    } else {
                        markdown += ` ${value.toFixed(3)} |`;
                    }
                } else {
                    markdown += ' - |';
                }
            });
            
            markdown += '\n';
        });
        
        markdown += '\n## Legend\n\n';
        markdown += '- Values shown are base effects (not tier-specific)\n';
        markdown += '- "-" indicates no effect on that stat\n';
        markdown += '- Positive values increase the stat\n';
        markdown += '- Negative values decrease the stat\n';
        
        // Add stat name reference
        markdown += '\n## Stat Abbreviations\n\n';
        markdown += '| Abbreviation | Full Name |\n';
        markdown += '|--------------|------------|\n';
        
        const abbreviations = [
            ['AM', 'Asteroid Mining'],
            ['dmg', 'Damage'],
            ['ctr', 'Counter'],
            ['wrp', 'Warp'],
            ['sub', 'Subwarp'],
            ['cap', 'Capacity'],
            ['cons', 'Consumption'],
            ['rchg', 'Recharge']
        ];
        
        abbreviations.forEach(([abbr, full]) => {
            markdown += `| ${abbr} | ${full} |\n`;
        });
        
        markdown += '\n---\n';
        markdown += `*Table generated: ${new Date().toLocaleString()}*`;
        
        return markdown;
    }
    
    // Make functions available globally if needed
    window.exportConfigMarkdown = exportConfigMarkdown;
    window.exportConfigNameMarkdown = exportConfigNameMarkdown;
    window.exportConfigUniqueness = exportConfigUniqueness;
    window.generateShipConfigMarkdown = generateShipConfigMarkdown;
    window.generateShipConfigNameMarkdown = generateShipConfigNameMarkdown;
    window.generateConfigUniquenessAnalysis = generateConfigUniquenessAnalysis;
    window.generateComponentUsageAnalysis = generateComponentUsageAnalysis;
    window.generateConfigSimilarityAnalysis = generateConfigSimilarityAnalysis;
    window.generatePerformanceMatrixAnalysis = generatePerformanceMatrixAnalysis;
    window.generateSlotUtilizationAnalysis = generateSlotUtilizationAnalysis;
    window.generateValidationReport = generateValidationReport;
    window.generateDronePortAnalysis = generateDronePortAnalysis;
    window.generateStatImpactAnalysis = generateStatImpactAnalysis;
    window.generateComponentStatsTable = generateComponentStatsTable;
    window.openAnalysisSuite = openAnalysisSuite;
})(); 