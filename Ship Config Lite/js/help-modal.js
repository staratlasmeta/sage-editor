// Global variable to track help modal
let helpModalOverlay = null;

// Function to create and show the help modal
function showHelpModal() {
    // If modal already exists, just show it
    if (helpModalOverlay) {
        helpModalOverlay.classList.add('active');
        return;
    }

    // Create modal overlay
    helpModalOverlay = document.createElement('div');
    helpModalOverlay.className = 'help-modal-overlay';
    
    // Create modal dialog
    const modalDialog = document.createElement('div');
    modalDialog.className = 'help-modal-dialog';
    
    // Create modal content
    modalDialog.innerHTML = `
        <div class="help-modal-content">
            <h3>Ship Config Lite Help</h3>
            
            <div class="help-tabs">
                <button class="help-tab active" data-tab="quickstart">Quick Start</button>
                <button class="help-tab" data-tab="features">Features</button>
                <button class="help-tab" data-tab="shortcuts">Keyboard Shortcuts</button>
                <button class="help-tab" data-tab="workflows">Workflows</button>
            </div>
            
            <div class="help-content">
                <div id="quickstart-content" class="tab-content active">
                    <h4>Getting Started</h4>
                    <div class="help-section">
                        <h5>Basic Workflow</h5>
                        <ol>
                            <li><strong>Load Data Files</strong>: Use "File ▾" menu to load ship stats CSV and components JSON</li>
                            <li><strong>Add Ships</strong>: Click "Add Ship" to add ships to the comparison table</li>
                            <li><strong>Create Configurations</strong>: Click on ship name → "Add Configuration" to create builds</li>
                            <li><strong>Edit Configurations</strong>: Click "Edit Config" to open the component editor</li>
                            <li><strong>Save Your Work</strong>: Click "Save Configs" to download your configurations</li>
                        </ol>
                    </div>
                    
                    <div class="help-section">
                        <h5>Key Features</h5>
                        <ul>
                            <li><strong>Ship Comparison</strong>: Compare unlimited ships side-by-side with real-time stat updates</li>
                            <li><strong>Configuration System</strong>: Create multiple named configurations per ship</li>
                            <li><strong>Pattern Builder</strong>: Automate configuration creation with reusable patterns</li>
                            <li><strong>Combat Simulator</strong>: Test fleet battles with custom formulas</li>
                            <li><strong>Analysis Tools</strong>: Comprehensive analysis suite for optimization</li>
                            <li><strong>Import/Export</strong>: CSV and JSON support for sharing configurations</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h5>Tips</h5>
                        <ul>
                            <li>Use <strong>Drag Handles (⋮⋮)</strong> to reorder ships and attributes</li>
                            <li>Click <strong>ship scores</strong> to see detailed breakdowns</li>
                            <li>Hold <strong>Shift</strong> while clicking components to multi-select</li>
                            <li>Use <strong>Pattern Builder</strong> for consistent fleet configurations</li>
                            <li>Enable <strong>Refresh Mode</strong> when making many changes</li>
                        </ul>
                    </div>
                </div>
                
                <div id="features-content" class="tab-content">
                    <div class="help-section">
                        <h4>Ship Management</h4>
                        <ul>
                            <li><strong>Add Ship</strong>: Add individual ships from dropdown</li>
                            <li><strong>Bulk Add</strong>: Add next 5, all remaining, or all ships</li>
                            <li><strong>Reorder</strong>: Drag ship columns to rearrange</li>
                            <li><strong>Remove</strong>: Click × on ships or remove all at once</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Configuration Management</h4>
                        <ul>
                            <li><strong>Multiple Configs</strong>: Unlimited configurations per ship</li>
                            <li><strong>Copy/Paste</strong>: Transfer configs between ships</li>
                            <li><strong>Duplicate</strong>: Create variations quickly</li>
                            <li><strong>Import CSV</strong>: Load configs from spreadsheets</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Component System</h4>
                        <ul>
                            <li><strong>Categories</strong>: Components, Modules, Weapons, Countermeasures, Missiles, Drones</li>
                            <li><strong>Visual Feedback</strong>: Green = equipped, Gray = available</li>
                            <li><strong>Smart Filtering</strong>: Only shows compatible components</li>
                            <li><strong>Tier System</strong>: T1-T5 component progression</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Analysis & Scoring</h4>
                        <ul>
                            <li><strong>Ship Scores</strong>: 6-category evaluation (Combat, Mobility, Defense, Utility, Economy, Versatility)</li>
                            <li><strong>Analysis Tools</strong>: 11 different analysis types</li>
                            <li><strong>Validation</strong>: Configuration error checking</li>
                            <li><strong>Performance Matrix</strong>: Detailed stat comparisons</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Combat Simulator</h4>
                        <ul>
                            <li><strong>Fleet Battles</strong>: Build fleets from your configured ships</li>
                            <li><strong>Custom Formulas</strong>: JavaScript-based combat resolution</li>
                            <li><strong>Autocomplete</strong>: Type @ to see available stats</li>
                            <li><strong>Save Formulas</strong>: Reuse combat equations</li>
                        </ul>
                    </div>
                </div>
                
                <div id="shortcuts-content" class="tab-content">
                    <div class="shortcut-section">
                        <h4>Navigation</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Escape</span>
                                <span class="shortcut-description">Close open panels/modals</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Tab</span>
                                <span class="shortcut-description">Navigate between inputs</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Enter</span>
                                <span class="shortcut-description">Confirm input/selection</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>Configuration Editor</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">←/→ Arrow</span>
                                <span class="shortcut-description">Navigate between configs</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">↑/↓ Arrow</span>
                                <span class="shortcut-description">Navigate between ships</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Shift + Click</span>
                                <span class="shortcut-description">Multi-select components</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>Combat Simulator</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">@</span>
                                <span class="shortcut-description">Trigger stat autocomplete</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">↑/↓ Arrow</span>
                                <span class="shortcut-description">Navigate autocomplete</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Enter</span>
                                <span class="shortcut-description">Insert selected stat</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="workflows-content" class="tab-content">
                    <div class="help-section">
                        <h4>Creating Your First Configuration</h4>
                        <ol>
                            <li><strong>Add a ship</strong> to the comparison table</li>
                            <li>Click on the <strong>ship name/image</strong></li>
                            <li>Select <strong>"Add Configuration"</strong> and name it</li>
                            <li>Click <strong>"Edit Config"</strong> to open the editor</li>
                            <li><strong>Click components</strong> to add/remove them</li>
                            <li>Changes save automatically</li>
                        </ol>
                    </div>
                    
                    <div class="help-section">
                        <h4>Using Pattern Builder</h4>
                        <ol>
                            <li>Create a <strong>"Tier One"</strong> configuration with all slots</li>
                            <li>Open any config and click <strong>"🔧 Pattern Builder"</strong></li>
                            <li>Click <strong>"+ New Pattern"</strong> and name it</li>
                            <li>Add actions like "Remove all weapons" or "Fill empty modules"</li>
                            <li>Test with <strong>"🧪 Test Pattern"</strong> before applying</li>
                            <li>Use <strong>"Generate All Patterns"</strong> for standard builds</li>
                        </ol>
                    </div>
                    
                    <div class="help-section">
                        <h4>Running Combat Simulations</h4>
                        <ol>
                            <li>Click <strong>"Combat Simulator"</strong> button</li>
                            <li>Add ships to left and right fleets</li>
                            <li>Write a formula using <strong>left.stat</strong> and <strong>right.stat</strong></li>
                            <li>Use <strong>@ autocomplete</strong> to see available stats</li>
                            <li>Click <strong>⚔️ FIGHT!</strong> to see results</li>
                        </ol>
                        <div class="help-code">
// Example formula:
left.damage > right.hit_points ? "left wins" : "right wins"</div>
                    </div>
                    
                    <div class="help-section">
                        <h4>Batch Processing</h4>
                        <ol>
                            <li><strong>Import Multiple Configs</strong>: Use CSV import</li>
                            <li><strong>Apply Patterns to All</strong>: Use "Apply to All Ships"</li>
                            <li><strong>Generate Fleet Patterns</strong>: Use "Generate for All Ships"</li>
                            <li><strong>Export Everything</strong>: Save all configs at once</li>
                        </ol>
                    </div>
                </div>
            </div>
            
            <div class="help-button-row">
                <button id="closeHelpBtn">Close</button>
            </div>
        </div>
    `;
    
    helpModalOverlay.appendChild(modalDialog);
    document.body.appendChild(helpModalOverlay);
    
    // Show modal with animation
    setTimeout(() => {
        helpModalOverlay.classList.add('active');
    }, 10);
    
    // Set up tab switching
    const tabs = helpModalOverlay.querySelectorAll('.help-tab');
    const contents = helpModalOverlay.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const contentId = tab.dataset.tab + '-content';
            helpModalOverlay.querySelector('#' + contentId).classList.add('active');
        });
    });
    
    // Set up event handlers
    document.getElementById('closeHelpBtn').addEventListener('click', closeHelpModal);
    
    // Close on click outside
    helpModalOverlay.addEventListener('click', (e) => {
        if (e.target === helpModalOverlay) {
            closeHelpModal();
        }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && helpModalOverlay && helpModalOverlay.classList.contains('active')) {
            closeHelpModal();
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Store handler for cleanup
    helpModalOverlay.escapeHandler = escapeHandler;
}

// Function to close the help modal
function closeHelpModal() {
    if (helpModalOverlay) {
        helpModalOverlay.classList.remove('active');
        
        // Remove escape handler
        if (helpModalOverlay.escapeHandler) {
            document.removeEventListener('keydown', helpModalOverlay.escapeHandler);
        }
        
        // Remove modal after animation
        setTimeout(() => {
            if (helpModalOverlay && !helpModalOverlay.classList.contains('active')) {
                document.body.removeChild(helpModalOverlay);
                helpModalOverlay = null;
            }
        }, 300);
    }
}

// Initialize help button when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const helpButton = document.getElementById('help-button');
    if (helpButton) {
        helpButton.addEventListener('click', showHelpModal);
    }
    
    // Add keyboard shortcut for help (H key)
    document.addEventListener('keydown', (e) => {
        // Don't trigger if user is typing in an input
        const activeElement = document.activeElement;
        const isEditing = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.contentEditable === 'true'
        );
        
        if (!isEditing && e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            showHelpModal();
        }
    });
});
