// Global state for the application
const appState = {
    rewardTree: [],
    categories: {},
    selectedItem: null,
    nextId: 1,
    dragging: null,
    lastSaved: null,
    autoSaveTimer: null,
    hasUnsavedChanges: false,
    dropTarget: null,
    dropPosition: null,
    currentFilename: null, // Track the current filename
    undoStack: [], // Stack for undo operations
    redoStack: [], // Stack for redo operations
    selectedItems: [], // For multi-select
    theme: 'light', // Theme preference
    commandHistory: [], // Command palette history
    autoBackups: [], // Auto backup versions
    backupInterval: 300000, // 5 minutes in milliseconds
    backupTimer: null,
    
    // Global drag state (moved from local scope)
    isDragging: false,
    draggedItem: null,
    draggedElement: null,
    dragOffsetY: 0,
    dragPlaceholder: null,
    clipboardData: null, // Added this line
};

// DOM elements
const elements = {
    tabs: document.querySelectorAll('.tab-button'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    treeContainer: document.getElementById('rewardTreeContainer'),
    propertiesForm: document.getElementById('propertiesForm'),
    addRootItemButton: document.getElementById('addRootItem'),
    headerRow: document.getElementById('headerRow'),
    tableBody: document.getElementById('tableBody'),
    addColumnButton: document.getElementById('addColumn'),
    addRowButton: document.getElementById('addRow'),
    importCSV: document.getElementById('importCSV'),
    exportCSV: document.getElementById('exportCategoriesCSV'),
    exportMarkdown: document.getElementById('exportMarkdown'),
    csvFileInput: document.getElementById('csvFileInput'),
    newButton: document.getElementById('newButton'),
    saveButton: document.getElementById('saveButton'),
    loadButton: document.getElementById('loadButton'),
    fileInput: document.getElementById('fileInput'),
    expandAllButton: document.getElementById('expandAllButton'),
    collapseAllButton: document.getElementById('collapseAllButton'),
    autoSaveStatus: document.getElementById('autoSaveStatus'),
    keyboardHint: document.getElementById('keyboardHint'),
    keyboardShortcutsModal: document.getElementById('keyboardShortcutsModal'),
    closeModal: document.getElementById('closeModal'),
    contextMenuTemplate: document.getElementById('contextMenuTemplate'),
    documentName: document.getElementById('documentName'),
    resizeHandle: document.getElementById('panelResizeHandle'),
    spreadsheetContainer: document.querySelector('.spreadsheet-container'),
    topScrollContainer: document.querySelector('.top-scroll-container'),
    topScrollContent: document.querySelector('.top-scroll-content'),
    processCategoryPromotions: document.getElementById('processCategoryPromotions'),
    // Markdown export modal elements
    markdownModal: document.getElementById('markdownModal'),
    markdownText: document.getElementById('markdownText'),
    copyMarkdownBtn: document.getElementById('copyMarkdownBtn'),
    closeMarkdownBtn: document.getElementById('closeMarkdownBtn'),
    closeMarkdownModalBtn: document.getElementById('closeMarkdownModalBtn'),
    // New elements for enhancements
    themeSwitch: document.getElementById('themeSwitch'),
    widthSwitch: document.getElementById('widthSwitch'),
    selectAllButton: document.getElementById('selectAllButton'),
    deselectAllButton: document.getElementById('deselectAllButton'),
    bulkOperationsButton: document.getElementById('bulkOperationsButton'),
    commandPalette: document.getElementById('commandPalette'),
    commandInput: document.getElementById('commandInput'),
    commandResults: document.getElementById('commandResults'),
    autoBackupNotification: document.getElementById('autoBackupNotification'),
    backupStatus: document.getElementById('backupStatus'),
    backupTime: document.getElementById('backupTime'),
    restoreBackup: document.getElementById('restoreBackup'),
    closeBackupNotification: document.getElementById('closeBackupNotification'),
    scrollTopButton: document.getElementById('scrollTopButton'),
    keyboardHintButton: document.getElementById('keyboardHintButton'),
    // Static backup notification
    backupNotification: document.getElementById('backupNotification'),
    closeBackupNotificationBtn: document.querySelector('#backupNotification button')
};

// Initialize the application
function init() {
    setupEventListeners();
    
    // No longer initialize with default categories, only if no data exists
    
    // Render the UI
    renderCategoriesTable();
    
    // Set up auto-save
    setupAutoSave();
    
    // Set up auto-backup
    setupAutoBackup();
    
    // Load saved data if available
    loadFromLocalStorage();
    
    // If no data was loaded, then set up default categories
    if (Object.keys(appState.categories).length === 0) {
        setupDefaultCategories();
        renderCategoriesTable();
    }
    
    // Initialize unsaved changes indicator
    updateUnsavedChangesIndicator();
    
    // Apply saved panel sizes
    applySavedPanelSizes();
    
    // Apply saved theme
    applyTheme();
    
    // Apply saved width preference
    applyWidthPreference();
    
    // Set up command palette
    setupCommandPalette();
    
    // Set up scroll button functionality
    setupScrollButton();
    
    // Make sure scrollbars are set up correctly after everything is loaded
    window.addEventListener('load', setupSynchronizedScrollbars);
    
    // Handle window resize for scrollbars
    window.addEventListener('resize', setupSynchronizedScrollbars);
    
    // Add button to process category promotions
    const processButton = document.createElement('button');
    processButton.textContent = 'Process Category Promotions';
    processButton.className = 'header-button';
    processButton.addEventListener('click', processCategoryPromotions);
    document.querySelector('.header-controls').appendChild(processButton);
}

// Set up event listeners for the application
function setupEventListeners() {
    // Tab navigation
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Add root item button
    elements.addRootItemButton.addEventListener('click', addRootItem);
    
    // Add column button
    elements.addColumnButton.addEventListener('click', addColumn);
    
    // Add row button
    elements.addRowButton.addEventListener('click', addRow);
    
    // Import CSV button
    elements.importCSV.addEventListener('click', () => {
        console.log('Import CSV button clicked');
        openCSVFileDialog();
    });
    
    // Export CSV button
    elements.exportCSV.addEventListener('click', () => {
        console.log('Export CSV button clicked');
        exportCategoriesToCSV();
    });
    
    // CSV File input change
    elements.csvFileInput.addEventListener('change', (event) => {
        console.log('CSV file selected:', event.target.files[0]?.name);
        importCategoriesFromCSV(event);
    });
    
    // Theme toggle
    elements.themeSwitch.addEventListener('change', toggleTheme);
    
    // Width toggle
    elements.widthSwitch.addEventListener('change', toggleWidth);
    
    // Select All button
    elements.selectAllButton.addEventListener('click', selectAllItems);
    
    // Deselect All button
    elements.deselectAllButton.addEventListener('click', deselectAllItems);
    
    // Command palette activation (Ctrl+P)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            showCommandPalette();
        }
    });
    
    // Auto-backup notification
    elements.closeBackupNotification.addEventListener('click', () => {
        elements.autoBackupNotification.style.display = 'none';
    });
    
    // Static backup notification
    if (elements.closeBackupNotificationBtn) {
        elements.closeBackupNotificationBtn.addEventListener('click', () => {
            if (elements.backupNotification) {
                elements.backupNotification.style.display = 'none';
            }
        });
    }
    
    elements.restoreBackup.addEventListener('click', restoreFromBackup);
    
    // Panel resize handle
    elements.resizeHandle.addEventListener('mousedown', initPanelResize);
    
    // New document button
    elements.newButton.addEventListener('click', newDocument);
    
    // Save button
    elements.saveButton.addEventListener('click', saveData);
    
    // Load button
    elements.loadButton.addEventListener('click', () => elements.fileInput.click());
    
    // File input change
    elements.fileInput.addEventListener('change', loadData);
    
    // Listen for paste events on the table
    document.getElementById('categoriesTable').addEventListener('paste', handleTablePaste);
    
    // Expand/collapse all buttons
    elements.expandAllButton.addEventListener('click', expandAllItems);
    elements.collapseAllButton.addEventListener('click', collapseAllItems);
    
    // Keyboard shortcut info - update to use the new button
    elements.keyboardHintButton.addEventListener('click', showShortcutsModal);
    elements.closeModal.addEventListener('click', hideShortcutsModal);
    
    // Custom context menu for the table headers
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', hideContextMenu);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window events
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
    
    // Add event listener for process category promotions
    elements.processCategoryPromotions.addEventListener('click', processCategoryPromotions);
    
    // Export Markdown button
    if (elements.exportMarkdown) {
        elements.exportMarkdown.addEventListener('click', () => {
            initMarkdownExport();
        });
    }
    
    // Copy markdown text to clipboard
    if (elements.copyMarkdownBtn) {
        elements.copyMarkdownBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(elements.markdownText.textContent)
                .then(() => {
                    elements.copyMarkdownBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        elements.copyMarkdownBtn.textContent = 'Copy to Clipboard';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    // Fallback for browsers that don't support clipboard API
                    const textarea = document.createElement('textarea');
                    textarea.value = elements.markdownText.textContent;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    elements.copyMarkdownBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        elements.copyMarkdownBtn.textContent = 'Copy to Clipboard';
                    }, 2000);
                });
        });
    }
    
    // Close markdown modal
    if (elements.closeMarkdownBtn) {
        elements.closeMarkdownBtn.addEventListener('click', () => {
            elements.markdownModal.classList.remove('show');
        });
    }
    
    if (elements.closeMarkdownModalBtn) {
        elements.closeMarkdownModalBtn.addEventListener('click', () => {
            elements.markdownModal.classList.remove('show');
        });
    }
}

// Initialize panel resize functionality
function initPanelResize(e) {
    e.preventDefault();
    
    const resizeHandle = document.getElementById('panelResizeHandle');
    const splitView = document.querySelector('.split-view');
    const leftPanel = document.querySelector('.reward-tree');
    const rightPanel = document.querySelector('.properties-panel');
    const startX = e.clientX;
    const startWidth = leftPanel.offsetWidth;
    const splitViewWidth = splitView.offsetWidth;
    
    resizeHandle.classList.add('dragging');
    
    // Add temporary styles during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    function handleMouseMove(e) {
        const offsetX = e.clientX - startX;
        const newLeftWidth = Math.max(200, Math.min(splitViewWidth - 200, startWidth + offsetX));
        const leftPercent = (newLeftWidth / splitViewWidth) * 100;
        
        // Use width property instead of flex to maintain the resize handle
        leftPanel.style.width = `${newLeftWidth}px`;
        leftPanel.style.minWidth = `${newLeftWidth}px`;
        leftPanel.style.flexGrow = 0;
        leftPanel.style.flexShrink = 0;
        
        // Let the right panel fill the remaining space
        rightPanel.style.flexGrow = 1;
        rightPanel.style.flexShrink = 1;
        rightPanel.style.width = 'auto';
    }
    
    function handleMouseUp() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Remove temporary styles
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        resizeHandle.classList.remove('dragging');
        
        // Save panel sizes in localStorage for persistence
        // Get the current width since it may have changed during the drag
        const currentWidth = leftPanel.offsetWidth;
        const currentSplitViewWidth = splitView.offsetWidth;
        const leftPercent = (currentWidth / currentSplitViewWidth) * 100;
        
        localStorage.setItem('panelSizes', JSON.stringify({
            leftPanelWidth: currentWidth,
            leftPercent: leftPercent
        }));
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// Apply saved panel sizes
function applySavedPanelSizes() {
    try {
        const savedSizes = localStorage.getItem('panelSizes');
        if (savedSizes) {
            const sizes = JSON.parse(savedSizes);
            const leftPanel = document.querySelector('.reward-tree');
            const rightPanel = document.querySelector('.properties-panel');
            
            if (leftPanel && rightPanel) {
                if (sizes.leftPanelWidth) {
                    // New format
                    leftPanel.style.width = `${sizes.leftPanelWidth}px`;
                    leftPanel.style.minWidth = `${sizes.leftPanelWidth}px`;
                    leftPanel.style.flexGrow = 0;
                    leftPanel.style.flexShrink = 0;
                    
                    rightPanel.style.flexGrow = 1;
                    rightPanel.style.flexShrink = 1;
                    rightPanel.style.width = 'auto';
                } else if (sizes.leftPanel) {
                    // Old format for backward compatibility
                    const leftPanel = document.querySelector('.reward-tree');
                    const rightPanel = document.querySelector('.properties-panel');
                    
                    const leftWidth = (sizes.leftPanel / 100) * document.querySelector('.split-view').offsetWidth;
                    
                    leftPanel.style.width = `${leftWidth}px`;
                    leftPanel.style.minWidth = `${leftWidth}px`;
                    leftPanel.style.flexGrow = 0;
                    leftPanel.style.flexShrink = 0;
                    
                    rightPanel.style.flexGrow = 1;
                    rightPanel.style.flexShrink = 1;
                    rightPanel.style.width = 'auto';
                }
            }
        }
    } catch (e) {
        console.error('Error applying saved panel sizes:', e);
    }
}

// Setup auto-save functionality
function setupAutoSave() {
    // Auto-save every 30 seconds
    appState.autoSaveTimer = setInterval(() => {
        if (hasUnsavedChanges()) {
            saveToLocalStorage();
            updateAutoSaveStatus('Auto-saved at ' + new Date().toLocaleTimeString());
        }
    }, 30000);
}

// Update auto-save status display
function updateAutoSaveStatus(message) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const status = `${message} at ${timeString}`;
    elements.autoSaveStatus.textContent = status;
    
    // Update the duplicate in Categories tab
    if (document.getElementById('autoSaveStatus2')) {
        document.getElementById('autoSaveStatus2').textContent = status;
    }
    
    // Add 'saved' class if this was a save event
    if (message.includes('Saved') || message.includes('saved') || message.includes('Auto-saved')) {
        elements.autoSaveStatus.classList.add('saved');
        if (document.getElementById('autoSaveStatus2')) {
            document.getElementById('autoSaveStatus2').classList.add('saved');
        }
    } else {
        elements.autoSaveStatus.classList.remove('saved');
        if (document.getElementById('autoSaveStatus2')) {
            document.getElementById('autoSaveStatus2').classList.remove('saved');
        }
    }
}

// Update the unsaved changes indicator
function updateUnsavedChangesIndicator() {
    if (hasUnsavedChanges()) {
        elements.autoSaveStatus.textContent = "Unsaved changes";
        elements.autoSaveStatus.className = "unsaved";
    } else {
        elements.autoSaveStatus.textContent = "";
        elements.autoSaveStatus.className = "";
    }
}

// Check if there are unsaved changes
function hasUnsavedChanges() {
    if (!appState.lastSaved) return true;
    
    const currentState = JSON.stringify({
        rewardTree: appState.rewardTree,
        categories: appState.categories,
        nextId: appState.nextId
    });
    
    return currentState !== appState.lastSaved;
}

// Save current state to localStorage
function saveToLocalStorage() {
    try {
        const data = {
            rewardTree: appState.rewardTree,
            categories: appState.categories,
            nextId: appState.nextId,
            documentName: elements.documentName.textContent,
            currentFilename: appState.currentFilename
        };
        
        localStorage.setItem('rewardSelectorData', JSON.stringify(data));
        appState.lastSaved = JSON.stringify(data);
        updateUnsavedChangesIndicator();
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

// Load state from localStorage
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('rewardSelectorData');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            appState.rewardTree = data.rewardTree || [];
            appState.categories = data.categories || {};
            appState.nextId = data.nextId || 1;
            appState.selectedItem = null;
            appState.lastSaved = savedData;
            
            // Restore current filename if available
            if (data.currentFilename) {
                appState.currentFilename = data.currentFilename;
            }
            
            // Restore document name if available
            if (data.documentName) {
                elements.documentName.textContent = data.documentName;
            }
            
            renderRewardTree();
            renderCategoriesTable();
            elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
            
            updateAutoSaveStatus('Loaded from local storage');
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // '?' key for shortcuts help
    if (e.key === '?' && !isInputFocused()) {
        showShortcutsModal();
        e.preventDefault();
        return;
    }
    
    // Ctrl+P for command palette
    if (e.key === 'p' && (e.ctrlKey || e.metaKey) && !isInputFocused()) {
        showCommandPalette();
        e.preventDefault();
        return;
    }
    
    // Ctrl+S for save
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && !isInputFocused()) {
        saveData();
        e.preventDefault();
        return;
    }
    
    // Ctrl+N for new document
    if (e.key === 'n' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !isInputFocused()) {
        newDocument();
        e.preventDefault();
        return;
    }
    
    // Ctrl+Shift+N for new blank document (keeping for backward compatibility)
    if (e.key === 'n' && (e.ctrlKey || e.metaKey) && e.shiftKey && !isInputFocused()) {
        newDocument(); // Both shortcuts do the same thing now
        e.preventDefault();
        return;
    }
    
    // Ctrl+Z for undo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !isInputFocused()) {
        undo();
        e.preventDefault();
        return;
    }
    
    // Ctrl+A for select all
    if (e.key === 'a' && (e.ctrlKey || e.metaKey) && !isInputFocused()) {
        selectAllItems();
        e.preventDefault();
        return;
    }
    
    // Escape to deselect all
    if (e.key === 'Escape' && !isInputFocused()) {
        deselectAllItems();
        return;
    }
    
    // Shift+Click for multi-select (handled in item click event)
    
    // Alt+N for new item (changed from Ctrl+N to avoid browser conflict)
    if (e.key === 'n' && e.altKey && !isInputFocused()) {
        if (appState.selectedItem) {
            addChildItem(appState.selectedItem);
        } else {
            addRootItem();
        }
        e.preventDefault();
        return;
    }
    
    // Delete key to remove selected item(s)
    if (e.key === 'Delete' && !isInputFocused()) {
        if (appState.selectedItems.length > 1) {
            // Delete multiple selected items
            if (confirm(`Delete ${appState.selectedItems.length} selected items?`)) {
                deleteSelectedItems();
            }
        } else if (appState.selectedItem) {
            deleteItem(appState.selectedItem);
        }
        e.preventDefault();
        return;
    }
    
    // If no item is selected, skip remaining shortcuts
    if (!appState.selectedItem) return;
    
    // Right arrow to expand
    if (e.key === 'ArrowRight' && !isInputFocused()) {
        if (!appState.selectedItem.expanded) {
            toggleExpand(appState.selectedItem);
        }
        e.preventDefault();
    }
    
    // Left arrow to collapse
    if (e.key === 'ArrowLeft' && !isInputFocused()) {
        if (appState.selectedItem.expanded) {
            toggleExpand(appState.selectedItem);
        }
        e.preventDefault();
    }
    
    // Up and down arrows for navigation
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputFocused()) {
        navigateItems(e.key === 'ArrowUp' ? -1 : 1);
        e.preventDefault();
    }
}

// Delete multiple selected items
function deleteSelectedItems() {
    // Store items for potential undo
    const deletedItemsInfo = appState.selectedItems.map(item => ({
        item: JSON.parse(JSON.stringify(item)),
        parentId: findParentItem(appState.rewardTree, item.id)?.id || null,
        position: -1
    }));
    
    // Find positions for each item
    deletedItemsInfo.forEach(info => {
        if (info.parentId === null) {
            // Item is at root level
            info.position = appState.rewardTree.findIndex(i => i.id === info.item.id);
        } else {
            // Item is in a parent's children
            const parent = findItemById(appState.rewardTree, info.parentId);
            if (parent && parent.children) {
                info.position = parent.children.findIndex(i => i.id === info.item.id);
            }
        }
    });
    
    // Add to undo stack
    appState.undoStack.push({
        type: 'bulk-delete',
        data: deletedItemsInfo
    });
    
    // Clear redo stack
    appState.redoStack = [];
    
    // Delete all selected items
    let itemsDeleted = 0;
    
    // We delete them in reverse order of depth to avoid issues with nested deletions
    const itemsToDelete = [...appState.selectedItems].sort((a, b) => {
        // Calculate depths
        const getDepth = (item) => {
            let depth = 0;
            let parent = findParentItem(appState.rewardTree, item.id);
            while (parent) {
                depth++;
                parent = findParentItem(appState.rewardTree, parent.id);
            }
            return depth;
        };
        
        return getDepth(b) - getDepth(a); // Reverse sort by depth
    });
    
    // Now delete the items in the sorted order
    for (const item of itemsToDelete) {
        const removed = removeItemFromTree(item.id);
        if (removed) itemsDeleted++;
    }
    
    // Update the UI
    appState.selectedItems = [];
    appState.selectedItem = null;
    elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
    elements.bulkOperationsButton.style.display = 'none';
    
    // Show notification
    showUndoNotification(`${itemsDeleted} items deleted`);
    
    // Update UI
    renderRewardTree();
    appState.hasUnsavedChanges = true;
    updateUnsavedChangesIndicator();
}

// Check if an input element is focused
function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'SELECT' || 
           activeElement.tagName === 'TEXTAREA' ||
           activeElement.contentEditable === 'true';
}

// Navigate between items with keyboard
function navigateItems(direction) {
    if (!appState.selectedItem) return;
    
    // Flatten the tree for navigation
    const flattenedItems = [];
    const flattenTree = (items, level = 0) => {
        items.forEach(item => {
            flattenedItems.push(item);
            if (item.children && item.expanded) {
                flattenTree(item.children, level + 1);
            }
        });
    };
    
    flattenTree(appState.rewardTree);
    
    // Find current index
    const currentIndex = flattenedItems.findIndex(item => item.id === appState.selectedItem.id);
    if (currentIndex === -1) return;
    
    // Find next or previous visible item
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < flattenedItems.length) {
        selectItem(flattenedItems[newIndex]);
    }
}

// Show keyboard shortcuts modal
function showShortcutsModal() {
    elements.keyboardShortcutsModal.style.display = 'block';
}

// Hide keyboard shortcuts modal
function hideShortcutsModal() {
    elements.keyboardShortcutsModal.style.display = 'none';
}

// Expand all items in the tree
function expandAllItems() {
    const expandItems = (items) => {
        items.forEach(item => {
            item.expanded = true;
            if (item.children && item.children.length > 0) {
                expandItems(item.children);
            }
        });
    };
    
    expandItems(appState.rewardTree);
    renderRewardTree();
}

// Collapse all items in the tree
function collapseAllItems() {
    const collapseItems = (items) => {
        items.forEach(item => {
            item.expanded = false;
            if (item.children && item.children.length > 0) {
                collapseItems(item.children);
            }
        });
    };
    
    collapseItems(appState.rewardTree);
    renderRewardTree();
}

// Search within reward items
function searchRewards(query) {
    if (!query || query.trim() === '') {
        // Clear search results
        appState.searchResults = [];
        renderRewardTree();
        return;
    }
    
    // Parse advanced search query
    const searchTerms = parseAdvancedSearch(query);
    
    // Get all items
    const allItems = flattenTree(appState.rewardTree);
    
    // Filter items based on search terms
    appState.searchResults = allItems.filter(item => {
        return matchesSearchTerms(item, searchTerms);
    });
    
    // Render search results
    renderRewardTree();
}

// Parse advanced search query into usable search terms
function parseAdvancedSearch(query) {
    const result = {
        required: [],
        excluded: [],
        exact: [],
        properties: {},
        normal: []
    };
    
    // Helper to extract quoted phrases
    const extractQuotes = (text) => {
        const phrases = [];
        const regex = /"([^"]*)"/g;
        let match;
        let modifiedText = text;
        
        while ((match = regex.exec(text)) !== null) {
            phrases.push(match[1]);
            modifiedText = modifiedText.replace(match[0], '');
        }
        
        return { phrases, modifiedText };
    };
    
    // Extract exact phrases
    const { phrases, modifiedText } = extractQuotes(query);
    result.exact = phrases;
    
    // Split the remaining text into tokens
    const tokens = modifiedText.split(/\s+/).filter(t => t.trim() !== '');
    
    // Process each token
    tokens.forEach(token => {
        if (token.startsWith('+')) {
            result.required.push(token.substring(1).toLowerCase());
        } else if (token.startsWith('-')) {
            result.excluded.push(token.substring(1).toLowerCase());
        } else if (token.includes(':')) {
            const [property, value] = token.split(':');
            result.properties[property.toLowerCase()] = value.toLowerCase();
        } else {
            result.normal.push(token.toLowerCase());
        }
    });
    
    return result;
}

// Check if an item matches the search terms
function matchesSearchTerms(item, searchTerms) {
    // Helper to check if a text contains a term
    const contains = (text, term) => {
        return text.toLowerCase().includes(term.toLowerCase());
    };
    
    // Check if the item meets all required terms
    for (const term of searchTerms.required) {
        if (!contains(item.name, term) && 
            !Object.values(item.properties).some(value => contains(value, term))) {
            return false;
        }
    }
    
    // Check if the item meets none of the excluded terms
    for (const term of searchTerms.excluded) {
        if (contains(item.name, term) || 
            Object.values(item.properties).some(value => contains(value, term))) {
            return false;
        }
    }
    
    // Check for exact phrases
    for (const phrase of searchTerms.exact) {
        if (!contains(item.name, phrase) && 
            !Object.values(item.properties).some(value => contains(value, phrase))) {
            return false;
        }
    }
    
    // Check for property-specific searches
    for (const [property, value] of Object.entries(searchTerms.properties)) {
        // Special case for searching in the name
        if (property === 'name') {
            if (!contains(item.name, value)) {
                return false;
            }
        } else {
            // Check in property values
            const propertyValue = item.properties[property];
            if (!propertyValue || !contains(propertyValue, value)) {
                return false;
            }
        }
    }
    
    // If it has normal search terms and no other terms, check against them
    if (searchTerms.normal.length > 0 && 
        searchTerms.required.length === 0 && 
        searchTerms.excluded.length === 0 && 
        searchTerms.exact.length === 0 && 
        Object.keys(searchTerms.properties).length === 0) {
        
        // At least one normal term must match
        return searchTerms.normal.some(term => 
            contains(item.name, term) || 
            Object.values(item.properties).some(value => contains(value, term))
        );
    }
    
    // If we have specific search criteria but no normal terms, we're done
    if (searchTerms.required.length > 0 || 
        searchTerms.excluded.length > 0 || 
        searchTerms.exact.length > 0 || 
        Object.keys(searchTerms.properties).length > 0) {
        return true;
    }
    
    // If we have no search criteria, don't match anything
    return false;
}

// Filter categories table
function filterCategoriesTable(query) {
    if (!query.trim()) {
        // Show all rows
        const rows = elements.tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.display = '';
            row.classList.remove('highlight-row');
        });
        return;
    }
    
    query = query.trim().toLowerCase();
    const rows = elements.tableBody.querySelectorAll('tr');
    let hasVisibleRows = false;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let showRow = false;
        let hasMatch = false;
        
        cells.forEach(cell => {
            const text = cell.textContent.toLowerCase();
            
            // Remove any existing highlights
            if (cell.innerHTML.includes('<mark class="highlight-match">')) {
                cell.innerHTML = cell.textContent;
            }
            
            if (text.includes(query)) {
                showRow = true;
                hasMatch = true;
                
                // Highlight the matching text
                const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
                cell.innerHTML = cell.textContent.replace(regex, '<mark class="highlight-match">$1</mark>');
            }
        });
        
        row.style.display = showRow ? '' : 'none';
        row.classList.toggle('highlight-row', hasMatch);
        
        if (showRow) {
            hasVisibleRows = true;
        }
    });
    
    // Show a message if no rows match
    let noResultsMsg = elements.tableBody.querySelector('.search-no-results');
    if (!hasVisibleRows) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('tr');
            noResultsMsg.className = 'search-no-results';
            const td = document.createElement('td');
            td.colSpan = elements.headerRow.children.length;
            td.textContent = 'No matching items found';
            noResultsMsg.appendChild(td);
            elements.tableBody.appendChild(noResultsMsg);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// Escape special characters for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Switch between tabs
function switchTab(tabId) {
    elements.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    
    elements.tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });
}

// Setup default categories and values for testing
function setupDefaultCategories() {
    appState.categories = {
        'Category': ['Ship', 'Crew', 'Weapon', 'Resource', 'Collectible', 'Misc', 'Charm'],
        'Class': ['XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'TTN'],
        'Rarity': ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly'],
        'Tier': ['0', '1', '2', '3', '4', '5', '6', 'Exotic'],
        'Item Type': ['Skin', 'Equipment', 'Resource', 'Crew', 'Ship', 'Misc', 'Charm'],
        'Ships': ['Fimbul Airbike', 'Pearce X4', 'Opal Jet', 'VZUS solos', 'Ogrika Ruch', 'Busan Pulse', 'Fimbul ECOS Unibomba', 'Tufa Spark', 'Opal Jetjet', 'Fimbul Airbike EX', 'Fimbul Lowbie', 'Ogrika Niruch', 'Pearce X5', 'Calico Scud', 'Calico Maxhog', 'Fimbul Chickun', 'Busan EFAM', 'XXS Only', 'XS Only', 'ANY']
    };
    
    // Add example items to the table
    addShipComponents();
}

// Add example ship components for demo
function addShipComponents() {
    const shipComponents = [
        { name: 'Shield Generator', tier: '0', rarity: 'Common', class: 'XXS', category: 'Ship', itemType: 'Skin', ships: 'Fimbul Airbike' },
        { name: 'Maneuvering Thrusters', tier: '1', rarity: 'Uncommon', class: 'XS', category: 'Crew', itemType: 'Equipment', ships: 'Pearce X4' },
        { name: 'Power Core', tier: '2', rarity: 'Rare', class: 'S', category: 'Resource', itemType: 'Resource', ships: 'Opal Jet' },
        { name: 'Subwarp Engine', tier: '3', rarity: 'Epic', class: 'M', category: 'Resource', itemType: 'Crew', ships: 'VZUS solos' },
        { name: 'Warp Drive', tier: '4', rarity: 'Legendary', class: 'L', category: 'Collectible', itemType: 'Ship', ships: 'Ogrika Ruch' },
        { name: 'Scanner Array', tier: '5', rarity: 'Anomaly', class: 'CAP', category: 'Misc', itemType: 'Misc', ships: 'Busan Pulse' },
        { name: 'Tractor Beam', tier: '6', rarity: '', class: 'CMD', category: '', itemType: 'Charm', ships: 'Fimbul ECOS Unibomba' },
        { name: 'Kinetic Rapidfire', tier: 'Exotic', rarity: '', class: '', category: '8', itemType: '', ships: 'Tufa Spark' },
        { name: 'Heat Sink', tier: '', rarity: '', class: 'TTN', category: '', itemType: '', ships: 'Opal Jetjet' },
        { name: 'Hull Reinforcement', tier: '', rarity: '', class: '', category: '', itemType: '', ships: 'Fimbul Airbike EX' }
    ];
    
    shipComponents.forEach(component => {
        const rowData = {
            name: component.name,
            tier: component.tier,
            rarity: component.rarity,
            class: component.class,
            category: component.category,
            itemType: component.itemType,
            ships: component.ships
        };
        
        appState.categories['Ship Component'] = appState.categories['Ship Component'] || [];
        if (!appState.categories['Ship Component'].includes(component.name)) {
            appState.categories['Ship Component'].push(component.name);
        }
    });
}

// Render the categories table
function renderCategoriesTable() {
    // Clear existing headers
    elements.headerRow.innerHTML = '';
    
    // Add category headers
    Object.keys(appState.categories).forEach(category => {
        const th = document.createElement('th');
        th.textContent = category;
        th.className = 'editable';
        th.contentEditable = true;
        th.addEventListener('blur', () => {
            const oldCategory = category;
            const newCategory = th.textContent.trim();
            if (oldCategory !== newCategory && newCategory !== '') {
                updateCategoryName(oldCategory, newCategory);
            }
        });
        
        // Add context menu for column headers
        th.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, category);
        });
        
        elements.headerRow.appendChild(th);
    });
    
    // Clear existing rows
    elements.tableBody.innerHTML = '';
    
    // Determine the maximum number of items in any category
    let maxItems = 0;
    Object.values(appState.categories).forEach(items => {
        maxItems = Math.max(maxItems, items.length);
    });
    
    // Add rows for each item
    for (let i = 0; i < maxItems; i++) {
        const tr = document.createElement('tr');
        
        // Add cells for each category
        Object.keys(appState.categories).forEach(category => {
            const td = document.createElement('td');
            if (i < appState.categories[category].length) {
                td.textContent = appState.categories[category][i];
            } else {
                td.textContent = '';
            }
            td.className = 'editable';
            td.contentEditable = true;
            td.dataset.category = category;
            td.dataset.index = i;
            td.addEventListener('blur', () => updateCategoryItem(category, i, td.textContent.trim()));
            tr.appendChild(td);
        });
        
        elements.tableBody.appendChild(tr);
    }
    
    // Set up synchronized scrollbars
    setupSynchronizedScrollbars();
}

// Set up synchronized scrollbars for the categories table
function setupSynchronizedScrollbars() {
    // Make sure the scrollable content is properly sized
    function updateScrollWidth() {
        // Get the actual table width
        const table = elements.spreadsheetContainer.querySelector('table');
        if (!table) return;
        
        const tableWidth = table.offsetWidth;
        const containerWidth = elements.spreadsheetContainer.offsetWidth;
        
        // Only make scrollable if table is wider than container
        if (tableWidth > containerWidth) {
            elements.topScrollContent.style.width = `${tableWidth}px`;
            elements.topScrollContainer.style.display = 'block';
            
            // Add a small label to make the scrollbar more obvious
            if (!document.getElementById('scrollLabel')) {
                const scrollLabel = document.createElement('div');
                scrollLabel.id = 'scrollLabel';
                scrollLabel.className = 'scroll-label';
                scrollLabel.textContent = 'Scroll →';
                elements.topScrollContainer.appendChild(scrollLabel);
            }
        } else {
            // Hide the scrollbar if not needed
            elements.topScrollContainer.style.display = 'none';
        }
    }
    
    // Update scroll width immediately and after a short delay (for rendering)
    updateScrollWidth();
    setTimeout(updateScrollWidth, 100);
    
    // Remove any existing scroll listeners to avoid duplicates
    elements.spreadsheetContainer.removeEventListener('scroll', handleMainScroll);
    elements.topScrollContainer.removeEventListener('scroll', handleTopScroll);
    
    // Add new scroll listeners with named functions for easier removal
    elements.spreadsheetContainer.addEventListener('scroll', handleMainScroll);
    elements.topScrollContainer.addEventListener('scroll', handleTopScroll);
}

// Handler for main container scroll
function handleMainScroll() {
    // Synchronize the top scrollbar with the main scrollbar
    if (elements.topScrollContainer) {
        elements.topScrollContainer.scrollLeft = elements.spreadsheetContainer.scrollLeft;
    }
    
    // Hide the label when scrolling
    const scrollLabel = document.getElementById('scrollLabel');
    if (scrollLabel) {
        if (elements.spreadsheetContainer.scrollLeft > 0) {
            scrollLabel.style.opacity = '0';
        } else {
            scrollLabel.style.opacity = '0.7';
        }
    }
}

// Handler for top scrollbar scroll
function handleTopScroll() {
    // Synchronize the main scrollbar with the top scrollbar
    if (elements.spreadsheetContainer) {
        elements.spreadsheetContainer.scrollLeft = elements.topScrollContainer.scrollLeft;
    }
    
    // Hide the label when scrolling
    const scrollLabel = document.getElementById('scrollLabel');
    if (scrollLabel) {
        if (elements.topScrollContainer.scrollLeft > 0) {
            scrollLabel.style.opacity = '0';
        } else {
            scrollLabel.style.opacity = '0.7';
        }
    }
}

// Update a category name
function updateCategoryName(oldName, newName) {
    if (oldName !== newName && newName !== '') {
        appState.categories[newName] = appState.categories[oldName];
        delete appState.categories[oldName];
        
        // Update property fields in all items that use this category
        updateItemProperties(oldName, newName);
        
        // Refresh the categories table
        renderCategoriesTable();
    }
}

// Update items that use a renamed category
function updateItemProperties(oldName, newName) {
    const updateItem = (item) => {
        if (item.properties && item.properties[oldName] !== undefined) {
            item.properties[newName] = item.properties[oldName];
            delete item.properties[oldName];
        }
        
        if (item.children) {
            item.children.forEach(child => updateItem(child));
        }
    };
    
    appState.rewardTree.forEach(item => updateItem(item));
    
    // If an item is selected, update the properties panel
    if (appState.selectedItem) {
        renderPropertiesForm(appState.selectedItem);
    }
}

// Update a category item
function updateCategoryItem(category, index, value) {
    if (index >= appState.categories[category].length) {
        appState.categories[category].push(value);
    } else {
        const oldValue = appState.categories[category][index];
        appState.categories[category][index] = value;
        
        // Update items that use this value
        if (oldValue !== value) {
            updateItemValue(category, oldValue, value);
        }
    }
}

// Update items that use a value that was changed
function updateItemValue(category, oldValue, newValue) {
    const updateItem = (item) => {
        if (item.properties && item.properties[category] === oldValue) {
            item.properties[category] = newValue;
        }
        
        if (item.children) {
            item.children.forEach(child => updateItem(child));
        }
    };
    
    appState.rewardTree.forEach(item => updateItem(item));
    
    // Update the properties panel if needed
    if (appState.selectedItem && appState.selectedItem.properties && 
        appState.selectedItem.properties[category] === oldValue) {
        appState.selectedItem.properties[category] = newValue;
        renderPropertiesForm(appState.selectedItem);
    }
    
    // Refresh the tree view
    renderRewardTree();
}

// Add a new column (category) without prompting
function addColumn() {
    // Create a temporary category name that's unique
    const tempName = `Category ${Object.keys(appState.categories).length + 1}`;
    appState.categories[tempName] = [];
    renderCategoriesTable();
    
    // Focus on the new header for immediate editing
    const newHeader = elements.headerRow.lastChild;
    if (newHeader) {
        setTimeout(() => {
            newHeader.focus();
            // Select all text for easy replacement
            const range = document.createRange();
            range.selectNodeContents(newHeader);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }, 0);
    }
}

// Add a new row to all categories
function addRow() {
    Object.keys(appState.categories).forEach(category => {
        appState.categories[category].push('');
    });
    renderCategoriesTable();
}

// Add a root level item to the reward tree
function addRootItem() {
    const newItem = {
        id: appState.nextId++,
        name: "Reward",
        quantity: 1,
        properties: {},
        propertyOrder: [], // Store custom property order
        children: [],
        expanded: true,
        status: "not started" // Default status
    };
    
    appState.rewardTree.push(newItem);
    renderRewardTree();
    selectItem(newItem);
    updateUnsavedChangesIndicator();
}

// Add a child item to a parent
function addChildItem(parentItem) {
    const newItem = {
        id: appState.nextId++,
        name: "Reward",
        quantity: 1,
        properties: {},
        propertyOrder: [], // Store custom property order
        children: [],
        expanded: true,
        status: "not started" // Default status
    };
    
    parentItem.children.push(newItem);
    renderRewardTree();
    selectItem(newItem);
    updateUnsavedChangesIndicator();
}

// Delete an item from the tree
function deleteItem(item, addToUndoStack = true) {
    // Save deleted item for undo
    const deletedItemInfo = {
        item: JSON.parse(JSON.stringify(item)), // Deep clone
        parentId: findParentItem(appState.rewardTree, item.id)?.id || null,
        position: -1
    };
    
    // Find the position of the item in its parent's children or in the root
    if (deletedItemInfo.parentId === null) {
        // Item is at root level
        deletedItemInfo.position = appState.rewardTree.findIndex(i => i.id === item.id);
    } else {
        // Item is in a parent's children
        const parent = findItemById(appState.rewardTree, deletedItemInfo.parentId);
        if (parent && parent.children) {
            deletedItemInfo.position = parent.children.findIndex(i => i.id === item.id);
        }
    }
    
    // Add to undo stack if requested
    if (addToUndoStack) {
        appState.undoStack.push({
            type: 'delete',
            data: deletedItemInfo
        });
        
        // Clear redo stack when a new action is performed
        appState.redoStack = [];
    }
    
    console.log("Attempting to delete item with ID:", item.id);
    
    // Remove the item from the tree
    let removed = false;
    
    // First check if the item is at the root level
    const rootIndex = appState.rewardTree.findIndex(i => i.id === item.id);
    if (rootIndex !== -1) {
        console.log("Removing item from root level, index:", rootIndex);
        appState.rewardTree.splice(rootIndex, 1);
        removed = true;
    } else {
        // If not at root, must be a child of some parent
        const removeFromChildren = (children) => {
            for (let i = 0; i < children.length; i++) {
                if (children[i].id === item.id) {
                    console.log("Removing item from children at index:", i);
                    children.splice(i, 1);
                    return true;
                }
                
                if (children[i].children && children[i].children.length > 0) {
                    if (removeFromChildren(children[i].children)) {
                        return true;
                    }
                }
            }
            return false;
        };
        
        removed = removeFromChildren(appState.rewardTree);
    }
    
    if (!removed) {
        console.error("Failed to remove item:", item.id);
        return;
    }
    
    console.log("Item removed successfully");
    
    // Update selection if needed
    if (appState.selectedItem && appState.selectedItem.id === item.id) {
        appState.selectedItem = null;
        elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
    }
    
    // Show undo notification
    showUndoNotification('Item deleted');
    
    // Update UI
    renderRewardTree();
    appState.hasUnsavedChanges = true;
    updateUnsavedChangesIndicator();
}

// Create undo notification function
function showUndoNotification(message) {
    // Remove any existing notification
    const existingNotification = document.getElementById('undoNotification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'undoNotification';
    notification.className = 'notification';
    
    // Create message text
    const messageText = document.createElement('span');
    messageText.textContent = message;
    notification.appendChild(messageText);
    
    // Create undo button
    const undoButton = document.createElement('button');
    undoButton.textContent = 'Undo';
    undoButton.className = 'undo-button';
    undoButton.addEventListener('click', undo);
    notification.appendChild(undoButton);
    
    // Add redo button if there are items in the redo stack
    if (appState.redoStack.length > 0) {
        const redoButton = document.createElement('button');
        redoButton.textContent = 'Redo';
        redoButton.className = 'undo-button';
        redoButton.style.backgroundColor = '#666';
        redoButton.addEventListener('click', redo);
        notification.appendChild(redoButton);
    }
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'close-notification';
    closeButton.addEventListener('click', () => notification.remove());
    notification.appendChild(closeButton);
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Undo the last action
function undo() {
    if (appState.undoStack.length === 0) return;
    
    const action = appState.undoStack.pop();
    console.log("Undoing action:", action.type);
    
    // Handle different action types
    switch (action.type) {
        case 'delete':
            // For delete, we need to restore the item
            restoreDeletedItem(action.data);
            break;
        case 'bulk-delete':
            // For bulk delete, restore all items
            action.data.forEach(itemInfo => restoreDeletedItem(itemInfo));
            break;
        case 'move':
            // For move, we need to reverse the move
            undoMove(action.data);
            break;
        case 'selection-change':
            // For selection change, restore the previous selection
            console.log("Restoring previous selection:", action.data);
            restorePreviousSelection(action.data);
            return; // Return early as we've already updated the UI
        case 'property-propagation':
            // For property propagation, restore the original values
            undoPropertyPropagation(action.data);
            break;
        default:
            console.warn("Unknown action type:", action.type);
            break;
    }
    
    // Update UI
    renderRewardTree();
    updateUnsavedChangesIndicator();
}

// Undo a property propagation action
function undoPropertyPropagation(propagationData) {
    // Add to redo stack before undoing
    appState.redoStack.push({
        type: 'property-propagation',
        data: JSON.parse(JSON.stringify(propagationData))
    });
    
    // Restore original values
    const { originalValues } = propagationData;
    
    originalValues.forEach(valueInfo => {
        // Find the item by ID
        const item = findItemById(appState.rewardTree, valueInfo.itemId);
        if (!item) {
            console.warn(`Could not find item with ID ${valueInfo.itemId} for undo propagation`);
            return;
        }
        
        if (valueInfo.isName) {
            // Restore name
            item.name = valueInfo.originalName;
        } else {
            // Restore property value
            if (item.properties) {
                item.properties[valueInfo.propertyName] = valueInfo.originalValue;
            }
        }
    });
    
    // Show notification
    showNotification('Property propagation undone');
}

// Undo a move action
function undoMove(moveData) {
    // Find the item that was moved
    const item = findItemById(appState.rewardTree, moveData.item);
    
    if (!item) {
        console.error("Cannot undo move: item not found");
        return;
    }
    
    // Add to redo stack before undoing
    appState.redoStack.push({
        type: 'move',
        data: JSON.parse(JSON.stringify(moveData))
    });
    
    // First, remove the item from its current position
    let currentParent;
    let currentIndex;
    
    // Check if item is at root level
    const rootIndex = appState.rewardTree.findIndex(i => i.id === item.id);
    if (rootIndex !== -1) {
        appState.rewardTree.splice(rootIndex, 1);
    } else {
        // Find where the item currently is
        const removeFromChildren = (parent) => {
            if (!parent.children) return false;
            
            const index = parent.children.findIndex(i => i.id === item.id);
            if (index !== -1) {
                parent.children.splice(index, 1);
                return true;
            }
            
            for (const child of parent.children) {
                if (removeFromChildren(child)) return true;
            }
            
            return false;
        };
        
        // Try to remove from all root items
        let found = false;
        for (const rootItem of appState.rewardTree) {
            if (removeFromChildren(rootItem)) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.error("Could not find item to undo move");
            return;
        }
    }
    
    // Then add it back to its original position
    if (moveData.sourceParentId === null) {
        // Item was at root level
        if (moveData.sourceIndex >= 0 && moveData.sourceIndex <= appState.rewardTree.length) {
            appState.rewardTree.splice(moveData.sourceIndex, 0, item);
        } else {
            appState.rewardTree.push(item);
        }
    } else {
        // Item was inside a parent
        const sourceParent = findItemById(appState.rewardTree, moveData.sourceParentId);
        if (sourceParent) {
            if (!sourceParent.children) {
                sourceParent.children = [];
            }
            
            if (moveData.sourceIndex >= 0 && moveData.sourceIndex <= sourceParent.children.length) {
                sourceParent.children.splice(moveData.sourceIndex, 0, item);
            } else {
                sourceParent.children.push(item);
            }
        } else {
            console.error("Could not find source parent for undo move");
            appState.rewardTree.push(item); // Fallback to root level
        }
    }
    
    // Update UI
    selectItem(item);
}

// Restore a deleted item
function restoreDeletedItem(deletedItemInfo) {
    const { item, parentId, position } = deletedItemInfo;
    
    // Add to redo stack before restoring
    appState.redoStack.push({
        type: 'delete',
        data: deletedItemInfo
    });
    
    if (parentId === null) {
        // Item was at root level
        if (position >= 0 && position <= appState.rewardTree.length) {
            appState.rewardTree.splice(position, 0, item);
        } else {
            appState.rewardTree.push(item);
        }
    } else {
        // Item was in a parent's children
        const parent = findItemById(appState.rewardTree, parentId);
        if (parent) {
            if (!parent.children) {
                parent.children = [];
            }
            
            if (position >= 0 && position <= parent.children.length) {
                parent.children.splice(position, 0, item);
            } else {
                parent.children.push(item);
            }
        }
    }
    
    // Select the restored item
    selectItem(item);
}

// Toggle expand/collapse of an item
function toggleExpand(item) {
    item.expanded = !item.expanded;
    renderRewardTree();
}

// Select an item to edit its properties
function selectItem(item, multiSelect = false) {
    // Skip if same item already selected unless multi-select
    if (appState.selectedItem === item && !multiSelect) return;
    
    // Clear existing selections if not multi-selecting
    if (!multiSelect) {
        deselectAllItems(false); // Use the false flag to avoid UI updates here
        appState.selectedItem = item;
        
        // Add to the selectedItems array for consistent handling
        appState.selectedItems = [item];
        
        // Render properties for the selected item
        renderPropertiesForm(item);
    } else {
        // Add to multi-select
        if (!appState.selectedItems.some(i => i.id === item.id)) {
            appState.selectedItems.push(item);
            
            // If it's the first item selected, also set it as the primary selection
            if (appState.selectedItems.length === 1) {
                appState.selectedItem = item;
                renderPropertiesForm(item);
            }
        } else {
            // Remove from selection if already there
            appState.selectedItems = appState.selectedItems.filter(i => i.id !== item.id);
            
            // Update primary selection if needed
            if (appState.selectedItem === item) {
                appState.selectedItem = appState.selectedItems.length > 0 ? 
                    appState.selectedItems[0] : null;
                
                if (appState.selectedItem) {
                    renderPropertiesForm(appState.selectedItem);
                } else {
                    elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
                }
            }
        }
    }
    
    // Update tree to reflect selections
    updateSelections();
    
    // Show/hide bulk operations button
    elements.bulkOperationsButton.style.display = 
        appState.selectedItems.length > 1 ? 'block' : 'none';
}

// Update the visual selections in the tree
function updateSelections() {
    // Clear existing selections from both items and headers
    document.querySelectorAll('.tree-item.selected, .tree-item.multi-selected, .tree-item-header.selected').forEach(el => {
        el.classList.remove('selected', 'multi-selected');
    });
    
    // Add primary selection to both item and its header
    if (appState.selectedItem) {
        const selectedEl = document.querySelector(`.tree-item[data-id="${appState.selectedItem.id}"]`);
        const selectedHeader = document.querySelector(`.tree-item-header[data-id="${appState.selectedItem.id}"]`);
        
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }
        
        if (selectedHeader) {
            selectedHeader.classList.add('selected');
        }
    }
    
    // Add multi-selections to items
    appState.selectedItems.forEach(item => {
        if (item !== appState.selectedItem) {
            const el = document.querySelector(`.tree-item[data-id="${item.id}"]`);
            if (el) {
                el.classList.add('multi-selected');
            }
        }
    });
}

// Select all items in the tree
function selectAllItems() {
    const flattenedItems = flattenTree(appState.rewardTree);
    appState.selectedItems = [...flattenedItems];
    
    if (flattenedItems.length > 0) {
        appState.selectedItem = flattenedItems[0];
        renderPropertiesForm(appState.selectedItem);
    }
    
    updateSelections();
    elements.bulkOperationsButton.style.display = flattenedItems.length > 1 ? 'block' : 'none';
}

// Deselect all items
function deselectAllItems(updateUI = true) {
    appState.selectedItems = [];
    appState.selectedItem = null;
    
    if (updateUI) {
        elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
        updateSelections();
        elements.bulkOperationsButton.style.display = 'none';
    }
}

// Flatten the tree structure for operations
function flattenTree(tree) {
    const result = [];
    
    const flattenItems = (items) => {
        for (const item of items) {
            result.push(item);
            if (item.children && item.children.length > 0) {
                flattenItems(item.children);
            }
        }
    };
    
    flattenItems(tree);
    return result;
}

// Show bulk operations menu
function showBulkOperations() {
    if (appState.selectedItems.length <= 1) return;
    
    // Implement a popup menu for bulk operations
    alert(`Bulk operations on ${appState.selectedItems.length} items:\n- Delete\n- Change Properties\n- Color Coding`);
    // TODO: Implement full menu
}

// Render the properties form for an item
function renderPropertiesForm(item) {
    elements.propertiesForm.innerHTML = '';
    
    const form = document.createElement('div');
    form.className = 'properties-form';
    
    // Property selector at the top
    const categorySelect = document.createElement('select');
    categorySelect.id = 'propertySelect';
    
    // Add blank option
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = '-- Select a property --';
    categorySelect.appendChild(blankOption);
    
    // Add categories as options (sorted alphabetically)
    const sortedCategories = Object.keys(appState.categories).sort();
    sortedCategories.forEach(category => {
        // Skip categories that are already assigned
        if (item.properties[category] !== undefined) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Auto-add property when category is selected
    categorySelect.addEventListener('change', () => {
        const selectedCategory = categorySelect.value;
        if (selectedCategory) {
            item.properties[selectedCategory] = '';
            // Add to property order
            if (!item.propertyOrder) {
                item.propertyOrder = [];
            }
            item.propertyOrder.push(selectedCategory);
            renderPropertiesForm(item);
        }
    });
    
    // If we have categories to add
    if (categorySelect.options.length > 1) {
        const addPropertyField = document.createElement('div');
        addPropertyField.className = 'property-field';
        
        const addPropertyLabel = document.createElement('label');
        addPropertyLabel.textContent = 'Add Property';
        
        addPropertyField.appendChild(addPropertyLabel);
        addPropertyField.appendChild(categorySelect);
        form.appendChild(addPropertyField);
    }
    
    // Name field
    const nameField = document.createElement('div');
    nameField.className = 'property-field';
    nameField.dataset.property = 'Name';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    
    const nameFieldRow = document.createElement('div');
    nameFieldRow.className = 'property-field-row';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.name;
    nameInput.className = 'property-name-input';
    nameInput.addEventListener('input', () => {
        item.name = nameInput.value;
        renderRewardTree();
    });
    
    nameFieldRow.appendChild(nameInput);
    
    // Add buttons container for alignment
    const nameButtonsContainer = document.createElement('div');
    nameButtonsContainer.className = 'property-buttons';
    
    // Add promote button (hidden for Name property)
    const namePromoteButton = document.createElement('button');
    namePromoteButton.className = 'property-promote-button';
    namePromoteButton.title = 'This is already the name';
    namePromoteButton.style.visibility = 'hidden'; // Use visibility instead of display to maintain layout
    namePromoteButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3L13 8L8 13" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13 8H3" stroke="currentColor" stroke-width="1.5"/>
        </svg>
    `;
    nameButtonsContainer.appendChild(namePromoteButton);
    
    // Add delete button (hidden for Name property)
    const nameDeleteButton = document.createElement('button');
    nameDeleteButton.className = 'property-delete-button';
    nameDeleteButton.title = 'Cannot remove name';
    nameDeleteButton.style.visibility = 'hidden'; // Use visibility instead of display to maintain layout
    nameDeleteButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5H13V14H3V5Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 5V3H10V5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6.5 8V11" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9.5 8V11" stroke="currentColor" stroke-width="1.5"/>
        </svg>
    `;
    nameButtonsContainer.appendChild(nameDeleteButton);
    
    nameFieldRow.appendChild(nameButtonsContainer);
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameFieldRow);
    form.appendChild(nameField);
    
    // Quantity field
    const quantityField = document.createElement('div');
    quantityField.className = 'property-field';
    
    const quantityLabel = document.createElement('label');
    quantityLabel.textContent = 'Quantity';
    
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.value = item.quantity || 1; // Default to 1 if not set
    quantityInput.addEventListener('input', () => {
        item.quantity = parseInt(quantityInput.value) || 1;
        renderRewardTree();
    });
    
    quantityField.appendChild(quantityLabel);
    quantityField.appendChild(quantityInput);
    form.appendChild(quantityField);
    
    // Properties container with a note about drag & drop
    const propertiesContainer = document.createElement('div');
    propertiesContainer.className = 'properties-container';
    
    const dragHint = document.createElement('div');
    dragHint.className = 'drag-hint';
    dragHint.textContent = 'Drag properties to reorder';
    propertiesContainer.appendChild(dragHint);
    
    // Get property names in order (use propertyOrder if it exists, otherwise sort alphabetically)
    let propertyNames = [];
    if (item.propertyOrder && item.propertyOrder.length > 0) {
        // Use existing order first
        propertyNames = [...item.propertyOrder];
        
        // Add any properties that might not be in the order array yet
        Object.keys(item.properties).forEach(propName => {
            if (!propertyNames.includes(propName)) {
                propertyNames.push(propName);
            }
        });
        
        // Remove any properties that might no longer exist
        propertyNames = propertyNames.filter(propName => item.properties[propName] !== undefined);
    } else {
        // No custom order yet, use alphabetical
        propertyNames = Object.keys(item.properties).sort();
        // Also initialize the propertyOrder array
        item.propertyOrder = [...propertyNames];
    }
    
    // Track if any property is being used as the name source
    item.nameSource = item.nameSource || 'Name';
    
    // Render existing properties in the saved order
    propertyNames.forEach(propertyName => {
        const propertyField = document.createElement('div');
        propertyField.className = 'property-field';
        propertyField.dataset.property = propertyName;
        propertyField.draggable = true;
        
        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'property-drag-handle';
        dragHandle.innerHTML = '⋮⋮';  // Vertical dots as drag indicator
        propertyField.appendChild(dragHandle);
        
        const propertyLabel = document.createElement('label');
        propertyLabel.textContent = propertyName;
        
        const propertyFieldRow = document.createElement('div');
        propertyFieldRow.className = 'property-field-row';
        
        const propertySelect = document.createElement('select');
        propertySelect.dataset.property = propertyName;
        
        // Add blank option
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = '-- Select a value --';
        propertySelect.appendChild(blankOption);
        
        // Add values from the category (sorted alphabetically)
        if (appState.categories[propertyName]) {
            // Create a sorted copy of the values array
            const sortedValues = [...appState.categories[propertyName]].sort();
            
            sortedValues.forEach(value => {
                if (value.trim() === '') return;
                
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                option.selected = item.properties[propertyName] === value;
                propertySelect.appendChild(option);
            });
            
            // Add the "Add New Item" option
            const addNewOption = document.createElement('option');
            addNewOption.value = "__add_new_item__";
            addNewOption.textContent = "+ Add New Item";
            addNewOption.className = "add-new-option";
            propertySelect.appendChild(addNewOption);
        }
        
        // Handle property change
        propertySelect.addEventListener('change', () => {
            const selectedValue = propertySelect.value;
            
            // Check if the user selected the "Add New Item" option
            if (selectedValue === "__add_new_item__") {
                // Show input for new value
                const propertyRow = propertySelect.closest('.property-field-row');
                
                // Hide the select temporarily
                propertySelect.style.display = 'none';
                
                // Create input field
                const newValueInput = document.createElement('input');
                newValueInput.type = 'text';
                newValueInput.className = 'new-item-input';
                newValueInput.placeholder = 'Enter new value...';
                
                // Create button container
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'new-item-buttons';
                
                // Add Save button
                const saveButton = document.createElement('button');
                saveButton.textContent = 'Save';
                saveButton.className = 'new-item-save';
                saveButton.addEventListener('click', () => {
                    const newValue = newValueInput.value.trim();
                    if (newValue) {
                        // Add to category
                        appState.categories[propertyName].push(newValue);
                        
                        // Set as selected value
                        item.properties[propertyName] = newValue;
                        
                        // If this is the name source property, update the item name
                        if (item.nameSource === propertyName) {
                            item.name = newValue;
                        }
                        
                        // Remove temporary elements
                        newValueInput.remove();
                        buttonContainer.remove();
                        
                        // Show select again
                        propertySelect.style.display = '';
                        
                        // Update UI
                        renderPropertiesForm(item);
                        renderRewardTree();
                        
                        // Mark changes
                        appState.hasUnsavedChanges = true;
                        updateUnsavedChangesIndicator();
                    }
                });
                
                // Add Cancel button
                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Cancel';
                cancelButton.className = 'new-item-cancel';
                cancelButton.addEventListener('click', () => {
                    // Remove temporary elements
                    newValueInput.remove();
                    buttonContainer.remove();
                    
                    // Show select again and reset to previous value
                    propertySelect.style.display = '';
                    propertySelect.value = item.properties[propertyName] || '';
                });
                
                // Assemble buttons
                buttonContainer.appendChild(saveButton);
                buttonContainer.appendChild(cancelButton);
                
                // Add elements to DOM
                propertyRow.appendChild(newValueInput);
                propertyRow.appendChild(buttonContainer);
                
                // Focus input
                setTimeout(() => newValueInput.focus(), 0);
            } else {
                // Normal selection
                item.properties[propertyName] = selectedValue;
                
                // If this is the name source property, update the item name
                if (item.nameSource === propertyName) {
                    item.name = selectedValue;
                }
                
                // Real-time update in the tree view
                renderRewardTree();
            }
        });
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'property-buttons';
        
        // Add promote button
        const promoteButton = document.createElement('button');
        promoteButton.className = 'property-promote-button';
        promoteButton.title = 'Use as item name';
        promoteButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3L13 8L8 13" stroke="currentColor" stroke-width="1.5"/>
                <path d="M13 8H3" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        
        // Mark as active if this property is the current name source
        if (item.nameSource === propertyName) {
            promoteButton.classList.add('active');
            promoteButton.title = 'Currently used as item name';
        }
        
        promoteButton.addEventListener('click', () => {
            // Set this property as the name source
            item.nameSource = propertyName;
            // Update the item name to match this property's value
            item.name = item.properties[propertyName];
            // Re-render to update the UI and show this property as the active name source
            renderPropertiesForm(item);
            renderRewardTree();
        });
        
        // Add propagate button
        const propagateButton = document.createElement('button');
        propagateButton.className = 'property-propagate-button';
        propagateButton.title = 'Propagate value to all children with this property';
        propagateButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3V13" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4 7L8 3L12 7" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        propagateButton.addEventListener('click', () => {
            // Only propagate if there are children
            if (item.children && item.children.length > 0) {
                // Keep track of how many items were updated
                const updateCount = propagatePropertyToChildren(item, propertyName, item.properties[propertyName]);
                // Show notification
                showNotification(`Property propagated to ${updateCount} items`);
                // Update UI
                renderRewardTree();
            } else {
                showNotification('No children to propagate to');
            }
        });
        
        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'property-delete-button';
        deleteButton.title = 'Remove property';
        deleteButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H13V14H3V5Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 5V3H10V5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6.5 8V11" stroke="currentColor" stroke-width="1.5"/>
                <path d="M9.5 8V11" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        deleteButton.addEventListener('click', () => {
            // If this property was the name source, reset to default
            if (item.nameSource === propertyName) {
                item.nameSource = 'Name';
            }
            
            delete item.properties[propertyName];
            // Remove from propertyOrder array
            item.propertyOrder = item.propertyOrder.filter(name => name !== propertyName);
            renderPropertiesForm(item);
            renderRewardTree(); // Update tree view immediately
        });
        
        buttonsContainer.appendChild(promoteButton);
        buttonsContainer.appendChild(propagateButton);
        buttonsContainer.appendChild(deleteButton);
        
        propertyFieldRow.appendChild(propertySelect);
        propertyFieldRow.appendChild(buttonsContainer);
        
        propertyField.appendChild(propertyLabel);
        propertyField.appendChild(propertyFieldRow);
        propertiesContainer.appendChild(propertyField);
        
        // Add drag and drop event listeners
        propertyField.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', propertyName);
            propertyField.classList.add('dragging');
            
            // Create a custom drag image to improve UX
            const dragImage = propertyField.cloneNode(true);
            dragImage.style.width = propertyField.offsetWidth + 'px';
            dragImage.style.height = propertyField.offsetHeight + 'px';
            dragImage.style.opacity = '0.7';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 20, 20);
            
            // Clean up the drag image after a short delay
            setTimeout(() => {
                document.body.removeChild(dragImage);
            }, 100);
        });

        propertyField.addEventListener('dragend', () => {
            propertyField.classList.remove('dragging');
            document.querySelectorAll('.property-field-dragover').forEach(el => {
                el.classList.remove('property-field-dragover');
            });
        });

        propertyField.addEventListener('dragover', (e) => {
            e.preventDefault();
            propertyField.classList.add('property-field-dragover');
        });

        propertyField.addEventListener('dragleave', () => {
            propertyField.classList.remove('property-field-dragover');
        });

        propertyField.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedProperty = e.dataTransfer.getData('text/plain');
            const targetProperty = propertyName;
            
            if (draggedProperty !== targetProperty) {
                // Reorder properties
                const oldIndex = item.propertyOrder.indexOf(draggedProperty);
                const newIndex = item.propertyOrder.indexOf(targetProperty);
                
                if (oldIndex !== -1 && newIndex !== -1) {
                    // Remove from old position
                    item.propertyOrder.splice(oldIndex, 1);
                    
                    // Insert at new position
                    item.propertyOrder.splice(newIndex, 0, draggedProperty);
                    
                    // Render properties form and tree with new order
                    renderPropertiesForm(item);
                    renderRewardTree();
                }
            }
            
            propertyField.classList.remove('property-field-dragover');
        });
    });

    form.appendChild(propertiesContainer);
    elements.propertiesForm.appendChild(form);
}

// Render the reward tree
function renderRewardTree() {
    elements.treeContainer.innerHTML = '';
    
    // Count total items in the tree
    const totalItems = countTotalItems(appState.rewardTree);
    
    // Update the count display
    const countElement = document.getElementById('itemCount');
    if (countElement) {
        countElement.textContent = `(${totalItems} item${totalItems !== 1 ? 's' : ''})`;
    }
    
    if (appState.rewardTree.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No items added yet. Click "Add Root Item" to get started.';
        elements.treeContainer.appendChild(emptyMessage);
        return;
    }
    
    const renderItem = (item, container, depth = 0) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'tree-item';
        itemElement.dataset.id = item.id;
        
        // Apply selected class to item element
        if (appState.selectedItem && appState.selectedItem.id === item.id) {
            itemElement.classList.add('selected');
        } else if (appState.selectedItems.some(selectedItem => selectedItem.id === item.id)) {
            itemElement.classList.add('multi-selected');
        }
        
        const itemHeader = document.createElement('div');
        itemHeader.className = 'tree-item-header item-depth';
        itemHeader.setAttribute('data-id', item.id);
        
        // Determine if this is a leaf node (no children) or has collapsed children
        // These should be fully opaque
        const isLeafOrCollapsed = !item.children || 
                                  item.children.length === 0 || 
                                  !item.expanded;
        
        // Items with expanded children get reduced opacity
        const itemOpacity = isLeafOrCollapsed ? 1.0 : 0.35;
        
        // Apply the opacity directly to the element
        itemHeader.style.opacity = itemOpacity.toFixed(2);
        
        // Apply selected class to header - this needs to be after the opacity is set
        if (appState.selectedItem && appState.selectedItem.id === item.id) {
            itemHeader.classList.add('selected');
        }
        
        // Create drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '&#8942;'; // Vertical ellipsis
        dragHandle.title = 'Drag to reorder';
        itemHeader.appendChild(dragHandle);

        // Allow dragging from entire item header
        const setupDragHandlers = (element) => {
            element.addEventListener('mousedown', (e) => {
                // Skip if clicking on buttons, toggle, or the editable item name
                if (e.target.closest('button') || 
                    e.target.classList.contains('toggle-button') || 
                    e.target.classList.contains('item-name') ||
                    e.target.closest('.item-name')) {
                    return;
                }
                
                // For drag handle, start dragging immediately
                if (e.target.classList.contains('drag-handle')) {
                    initDrag(e);
                    return;
                }
                
                // For other parts of the header, only start dragging if the mouse moves
                let hasMoved = false;
                let dragStarted = false;
                
                // Record initial mouse position
                const startX = e.clientX;
                const startY = e.clientY;
                
                function onMouseMove(moveEvent) {
                    // Calculate distance moved
                    const deltaX = Math.abs(moveEvent.clientX - startX);
                    const deltaY = Math.abs(moveEvent.clientY - startY);
                    
                    // If mouse has moved enough, start dragging
                    if ((deltaX > 5 || deltaY > 5) && !dragStarted) {
                        hasMoved = true;
                        dragStarted = true;
                        initDrag(e);
                        
                        // Remove these temporary listeners
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    }
                }
                
                function onMouseUp(upEvent) {
                    // If mouse didn't move enough, treat as normal click (selection)
                    if (!hasMoved) {
                        selectItem(item);
                    }
                    
                    // Remove temporary listeners
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
                
                // Add temporary listeners to detect dragging intent
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
            
            // Function to initialize the drag operation
            function initDrag(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Create the placeholder before modifying the element
                const rect = itemElement.getBoundingClientRect();
                appState.dragPlaceholder = document.createElement('div');
                appState.dragPlaceholder.className = 'drag-placeholder';
                appState.dragPlaceholder.style.height = `${rect.height}px`;
                appState.dragPlaceholder.style.width = `${rect.width}px`;
                
                // Insert placeholder at the same position
                itemElement.parentNode.insertBefore(appState.dragPlaceholder, itemElement);
                
                // Set up dragging state
                appState.isDragging = true;
                appState.draggedItem = item;
                appState.draggedElement = itemElement;
                
                // Calculate the offset for mouse positioning
                appState.dragOffsetY = e.clientY - rect.top;
                
                // Style the element being dragged
                itemElement.classList.add('dragging');
                itemElement.style.position = 'absolute';
                itemElement.style.zIndex = '1000';
                itemElement.style.width = `${rect.width}px`;
                
                // Position the element at the current mouse position
                itemElement.style.top = `${e.clientY - appState.dragOffsetY}px`;
                itemElement.style.left = `${e.clientX - 20}px`; // Slight offset from cursor
                
                // Add global event listeners for dragging
                document.addEventListener('mousemove', handleGlobalMouseMove);
                document.addEventListener('mouseup', handleGlobalMouseUp);
            }
        };

        // Add drag functionality to both the drag handle and the item header
        setupDragHandlers(itemHeader);
        
        // Remove the original drag handle mousedown event as we now handle it in setupDragHandlers
        // The drag handle is kept for visual indication that the item is draggable
        
        // Toggle button (only if has children)
        const toggleButton = document.createElement('button');
        toggleButton.className = 'toggle-button';
        toggleButton.textContent = item.expanded ? '▼' : '►';
        toggleButton.addEventListener('click', () => toggleExpand(item));
        
        // Rest of item rendering code...
        const itemLabel = document.createElement('div');
        itemLabel.className = 'item-label';
        
        // Add rarity indicator if available
        if (item.properties && item.properties.Rarity) {
            const rarityIndicator = document.createElement('span');
            rarityIndicator.className = `rarity-indicator rarity-${item.properties.Rarity}`;
            itemLabel.appendChild(rarityIndicator);
        }
        
        // Name part
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;
        nameSpan.contentEditable = true;
        nameSpan.addEventListener('blur', () => {
            if (nameSpan.textContent.trim() !== '') {
                item.name = nameSpan.textContent.trim();
                
                // Update the name in the properties panel if this item is selected
                if (appState.selectedItem && appState.selectedItem.id === item.id) {
                    const nameInput = document.querySelector('.properties-form input[type="text"]');
                    if (nameInput) {
                        nameInput.value = item.name;
                    }
                }
                updateUnsavedChangesIndicator();
            } else {
                nameSpan.textContent = item.name; // Restore original if empty
            }
        });
        nameSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameSpan.blur();
            }
        });
        
        itemLabel.appendChild(nameSpan);
        
        // Add quantity if it's more than 1
        if (item.quantity && item.quantity > 1) {
            const quantitySpan = document.createElement('span');
            quantitySpan.className = 'item-quantity';
            quantitySpan.textContent = ` (×${item.quantity})`;
            itemLabel.appendChild(quantitySpan);
        }
        
        // Add children count if the item has children
        if (item.children && item.children.length > 0) {
            const childrenCount = countTotalItems([item]) - 1; // Subtract 1 to exclude the item itself
            const countSpan = document.createElement('span');
            countSpan.className = 'item-children-count';
            countSpan.textContent = ` (${childrenCount})`;
            itemLabel.appendChild(countSpan);
        }
        
        // Properties part
        if (Object.keys(item.properties).length > 0) {
            // Get properties in the custom order, or fallback to default if needed
            let propertyValues = [];
            if (item.propertyOrder && item.propertyOrder.length > 0) {
                // Use the custom order for properties
                propertyValues = item.propertyOrder
                    .filter(propName => {
                        // Skip properties used as the name source to avoid redundancy
                        if (item.nameSource === propName) return false;
                        // Only include non-empty properties
                        return item.properties[propName] && item.properties[propName].trim() !== '';
                    })
                    .map(propName => item.properties[propName]);
            } else {
                // Fallback to unordered values
                propertyValues = Object.entries(item.properties)
                    .filter(([propName, value]) => {
                        // Skip properties used as the name source to avoid redundancy
                        if (item.nameSource === propName) return false;
                        // Only include non-empty properties
                        return value.trim() !== '';
                    })
                    .map(([_, value]) => value);
            }
            
            if (propertyValues.length > 0) {
                const propertiesSpan = document.createElement('span');
                propertiesSpan.className = 'item-properties';
                propertiesSpan.textContent = ` - ${propertyValues.join(' - ')}`;
                itemLabel.appendChild(propertiesSpan);
            }
        }
        
        // Add context menu
        itemHeader.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showTreeItemContextMenu(e, item);
            selectItem(item);
        });
        
        itemLabel.addEventListener('click', (e) => {
            // Only select the item if we didn't click on the editable name
            if (e.target !== nameSpan) {
                selectItem(item);
            }
        });
        
        // Controls
        const itemControls = document.createElement('div');
        itemControls.className = 'item-controls';

        // Status indicator button
        const statusButton = document.createElement('button');
        statusButton.className = 'status-button status-' + (item.status || 'not started').replace(/\s+/g, '-');
        statusButton.title = 'Status: ' + (item.status || 'not started');
        statusButton.innerHTML = getStatusIcon(item.status || 'not started');
        statusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleItemStatus(item);
        });

        // Add button
        const addButton = document.createElement('button');
        addButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3V13" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
                <path d="M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
            </svg>
        `;
        addButton.title = 'Add a child item';
        addButton.addEventListener('click', () => addChildItem(item));

        const duplicateButton = document.createElement('button');
        duplicateButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
                <rect x="6" y="6" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        duplicateButton.title = 'Duplicate this item and all its children';
        duplicateButton.addEventListener('click', () => duplicateItem(item));

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H13V14H3V5Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 5V3H10V5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6.5 8V11" stroke="currentColor" stroke-width="1.5"/>
                <path d="M9.5 8V11" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        deleteButton.title = 'Delete this item and all its children';
        deleteButton.addEventListener('click', () => deleteItem(item));

        itemControls.appendChild(statusButton);
        itemControls.appendChild(addButton);
        itemControls.appendChild(duplicateButton);
        itemControls.appendChild(deleteButton);
        
        // Assemble header
        itemHeader.appendChild(dragHandle);
        itemHeader.appendChild(toggleButton);
        itemHeader.appendChild(itemLabel);
        itemHeader.appendChild(itemControls);
        
        itemElement.appendChild(itemHeader);
        
        // Children
        if (item.children && item.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-item-content';
            
            if (item.expanded) {
                // Pass depth + 1 to children
                item.children.forEach(child => renderItem(child, childrenContainer, depth + 1));
            } else {
                childrenContainer.style.display = 'none';
            }
            
            itemElement.appendChild(childrenContainer);
        } else {
            toggleButton.style.visibility = 'hidden';
        }
        
        container.appendChild(itemElement);
    };
    
    appState.rewardTree.forEach(item => renderItem(item, elements.treeContainer));
    
    // Setup manual drag and drop functionality for the tree
    setupTreeDragDrop();
}

// Setup manual drag and drop functionality for the tree
function setupTreeDragDrop() {
    console.log('Setting up manual drag and drop');
    
    // We're using a manual implementation with mouse events, 
    // so we don't need to add event listeners to the tree container
}

// Global mouse move handler (only active during drag)
function handleGlobalMouseMove(e) {
    // Check if we're in a drag operation
    if (!appState.isDragging || !appState.draggedElement) return;
    
    // Move the dragged element with the mouse
    appState.draggedElement.style.top = `${e.clientY - appState.dragOffsetY}px`;
    appState.draggedElement.style.left = `${e.clientX - 20}px`;
    
    // Find the element currently under the cursor
    const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
    const targetElement = elementsAtPoint.find(el => 
        el.classList.contains('tree-item') && 
        el !== appState.draggedElement
    );
    
    // If no target was found, exit
    if (!targetElement) return;
    
    // Get the target ID
    const targetId = parseInt(targetElement.dataset.id);
    
    // Skip if dragging onto itself or its children
    if (appState.draggedItem.id === targetId || isDescendantOf(appState.draggedItem, targetId)) return;
    
    // Remove any existing drop indicators
    document.querySelectorAll('.drop-above, .drop-below, .drop-inside')
        .forEach(el => el.classList.remove('drop-above', 'drop-below', 'drop-inside'));
    
    // Determine position relative to the target
    const rect = targetElement.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const height = rect.height;
    
    // Set drop position
    if (relY < height / 3) {
        targetElement.classList.add('drop-above');
        appState.dragPlaceholder.dataset.position = 'before';
    } else if (relY > (height * 2) / 3) {
        targetElement.classList.add('drop-below');
        appState.dragPlaceholder.dataset.position = 'after';
    } else {
        targetElement.classList.add('drop-inside');
        appState.dragPlaceholder.dataset.position = 'inside';
    }
    
    // Store the target ID for the drop
    appState.dragPlaceholder.dataset.targetId = targetId;
}

// Global mouse up handler (only active during drag)
function handleGlobalMouseUp(e) {
    // If we're not in a drag operation, exit
    if (!appState.isDragging) return;
    
    // Clean up event listeners
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    
    // Reset the dragged element's style
    if (appState.draggedElement) {
        appState.draggedElement.style.position = '';
        appState.draggedElement.style.top = '';
        appState.draggedElement.style.left = '';
        appState.draggedElement.style.width = '';
        appState.draggedElement.style.zIndex = '';
        appState.draggedElement.classList.remove('dragging');
    }
    
    // Process the drop if we have valid information
    if (appState.dragPlaceholder && appState.dragPlaceholder.dataset.targetId && appState.dragPlaceholder.dataset.position) {
        const targetId = parseInt(appState.dragPlaceholder.dataset.targetId);
        const position = appState.dragPlaceholder.dataset.position;
        
        console.log(`Dropping item ${appState.draggedItem.id} ${position} item ${targetId}`);
        
        // Find the target item in the data
        const targetItem = findItemById(appState.rewardTree, targetId);
        
        // Complete the drop operation
        if (targetItem && appState.draggedItem) {
            console.log("Target and source found, moving item");
            try {
                processItemMove(appState.draggedItem, targetItem, position);
                appState.hasUnsavedChanges = true;
                updateUnsavedChangesIndicator();
                
                // Show an undo notification after the move is complete
                showUndoNotification('Item moved');
            } catch (err) {
                console.error("Error moving item:", err);
            }
            // Re-render the tree to show changes
            renderRewardTree();
        }
    }
    
    // Remove the placeholder if it exists
    if (appState.dragPlaceholder && appState.dragPlaceholder.parentNode) {
        appState.dragPlaceholder.parentNode.removeChild(appState.dragPlaceholder);
    }
    
    // Clean up any remaining indicators
    document.querySelectorAll('.drop-above, .drop-below, .drop-inside')
        .forEach(el => el.classList.remove('drop-above', 'drop-below', 'drop-inside'));
    
    // Reset all drag state variables
    appState.isDragging = false;
    appState.draggedElement = null;
    appState.draggedItem = null;
    appState.dragPlaceholder = null;
}

// Process an item move operation
function processItemMove(sourceItem, targetItem, position) {
    console.log(`Processing move: ${sourceItem.id} to ${position} ${targetItem.id}`);
    
    // Save original position for undo
    const moveInfo = {
        item: sourceItem.id,
        sourceParentId: null,
        sourceIndex: -1,
        targetParentId: position === 'inside' ? targetItem.id : findParentItem(appState.rewardTree, targetItem.id)?.id || null,
        targetIndex: -1,
        position: position
    };
    
    // Find source parent and index
    const sourceParent = findParentItem(appState.rewardTree, sourceItem.id);
    if (sourceParent) {
        moveInfo.sourceParentId = sourceParent.id;
        moveInfo.sourceIndex = sourceParent.children.findIndex(item => item.id === sourceItem.id);
    } else {
        // Item is at root level
        moveInfo.sourceIndex = appState.rewardTree.findIndex(item => item.id === sourceItem.id);
    }
    
    // Find target index
    if (position === 'before' || position === 'after') {
        if (moveInfo.targetParentId) {
            const targetParent = findItemById(appState.rewardTree, moveInfo.targetParentId);
            moveInfo.targetIndex = targetParent.children.findIndex(item => item.id === targetItem.id);
            if (position === 'after') moveInfo.targetIndex++;
        } else {
            moveInfo.targetIndex = appState.rewardTree.findIndex(item => item.id === targetItem.id);
            if (position === 'after') moveInfo.targetIndex++;
        }
    }
    
    // Add to undo stack
    appState.undoStack.push({
        type: 'move',
        data: moveInfo
    });
    
    // Clear redo stack when a new action is performed
    appState.redoStack = [];
    
    // First, remove the source item from its current location
    // Try removing from root level
    let sourceRemoved = false;
    const rootIndex = appState.rewardTree.findIndex(item => item.id === sourceItem.id);
    
    if (rootIndex !== -1) {
        console.log("Removing item from root level, index:", rootIndex);
        appState.rewardTree.splice(rootIndex, 1);
        sourceRemoved = true;
    } else {
        // If not at root, try removing from children
        const removeFromChildren = (children) => {
            for (let i = 0; i < children.length; i++) {
                if (children[i].id === sourceItem.id) {
                    children.splice(i, 1);
                    return true;
                }
                
                if (children[i].children && children[i].children.length > 0) {
                    if (removeFromChildren(children[i].children)) {
                        return true;
                    }
                }
            }
            return false;
        };
        
        for (const rootItem of appState.rewardTree) {
            if (rootItem.children && removeFromChildren(rootItem.children)) {
                sourceRemoved = true;
                break;
            }
        }
    }
    
    if (!sourceRemoved) {
        console.error("Failed to remove source item");
        return;
    }
    
    // Then, add it to the target location
    if (position === 'before') {
        const targetParent = findParentItem(appState.rewardTree, targetItem.id);
        if (targetParent) {
            const index = targetParent.children.findIndex(item => item.id === targetItem.id);
            targetParent.children.splice(index, 0, sourceItem);
        } else {
            const index = appState.rewardTree.findIndex(item => item.id === targetItem.id);
            appState.rewardTree.splice(index, 0, sourceItem);
        }
    } 
    else if (position === 'after') {
        const targetParent = findParentItem(appState.rewardTree, targetItem.id);
        if (targetParent) {
            const index = targetParent.children.findIndex(item => item.id === targetItem.id);
            targetParent.children.splice(index + 1, 0, sourceItem);
        } else {
            const index = appState.rewardTree.findIndex(item => item.id === targetItem.id);
            appState.rewardTree.splice(index + 1, 0, sourceItem);
        }
    } 
    else if (position === 'inside') {
        if (!targetItem.children) {
            targetItem.children = [];
        }
        targetItem.children.push(sourceItem);
        targetItem.expanded = true;
    }
    
    console.log("Move operation completed");
}

// Check if item1 is an ancestor of item2
function isDescendantOf(potentialAncestor, descendantId) {
    if (!potentialAncestor.children) return false;
    
    for (const child of potentialAncestor.children) {
        if (child.id === descendantId || isDescendantOf(child, descendantId)) {
            return true;
        }
    }
    
    return false;
}

// Helper function to find an item by ID in the tree
function findItemById(tree, id) {
    for (const item of tree) {
        if (item.id === id) {
            return item;
        }
        if (item.children && item.children.length > 0) {
            const found = findItemById(item.children, id);
            if (found) return found;
        }
    }
    return null;
}

// Helper function to find the parent of an item by ID
function findParentItem(tree, childId) {
    for (const item of tree) {
        if (item.children && item.children.some(child => child.id === childId)) {
            return item;
        }
        if (item.children && item.children.length > 0) {
            const found = findParentItem(item.children, childId);
            if (found) return found;
        }
    }
    return null;
}

// Save data to a local file
function saveData() {
    const data = {
        rewardTree: appState.rewardTree,
        categories: appState.categories,
        nextId: appState.nextId
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    // Use the current filename if available, otherwise use a default name
    const filename = appState.currentFilename || 'reward-selector-data.json';
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Store the filename for future saves
    appState.currentFilename = filename;
    
    // Update the document name (without extension)
    elements.documentName.textContent = filename.replace('.json', '');
    
    // Update the saved state
    appState.lastSaved = JSON.stringify(data);
    updateUnsavedChangesIndicator();
    updateAutoSaveStatus('Saved to file');
    
    // IMPORTANT: Also save to localStorage to sync with the saved file
    saveToLocalStorage();
}

// Load data from a local file
function loadData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            appState.rewardTree = data.rewardTree || [];
            appState.categories = data.categories || {};
            appState.nextId = data.nextId || 1;
            appState.selectedItem = null;
            
            renderRewardTree();
            renderCategoriesTable();
            elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
            
            // Update the current filename for future saves
            appState.currentFilename = file.name;
            
            // Update the document name (remove path and extension)
            const filename = file.name.replace(/^.*[\\\/]/, '').replace('.json', '');
            elements.documentName.textContent = filename;
            
            // Reset file input
            elements.fileInput.value = '';
            
            // Update status
            updateAutoSaveStatus(`Loaded ${filename}`);
            
            // Set last saved state
            appState.lastSaved = JSON.stringify(data);
            updateUnsavedChangesIndicator();
            
            // IMPORTANT: Immediately save to localStorage to overwrite the cached data
            saveToLocalStorage();
            
            // Clear any multi-selection
            appState.selectedItems = [];
            elements.bulkOperationsButton.style.display = 'none';
        } catch (error) {
            alert('Error loading file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Handle paste events on the table
function handleTablePaste(e) {
    // Get the pasted data
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text');
    
    // Get the target cell
    const target = e.target.closest('td, th');
    if (!target) return;
    
    // Check if this is a simple single-cell paste (no tabs or newlines)
    if (!pastedData.includes('\t') && !pastedData.includes('\n')) {
        // Allow default paste behavior for simple cell-to-cell copy
        return;
    }
    
    // For multi-cell paste, prevent default and use custom handler
    e.preventDefault();
    
    // Process the pasted data (tab-separated values)
    processPastedData(pastedData, target);
}

// Process pasted data and insert it into the table
function processPastedData(data, targetCell) {
    // Split by new lines to get rows
    const rows = data.trim().split(/\r?\n/);
    
    // Split each row by tabs to get cells
    const grid = rows.map(row => row.split('\t'));
    
    // Determine if we're pasting into a header or body cell
    const isHeader = targetCell.tagName.toLowerCase() === 'th';
    
    if (isHeader) {
        // Pasting into header row - add new categories
        let targetIndex = Array.from(targetCell.parentNode.children).indexOf(targetCell);
        
        // Add new categories for each column in the pasted data
        grid[0].forEach((categoryName, index) => {
            if (categoryName.trim() === '') return;
            
            // Create a temporary unique name
            const tempName = `Category ${Date.now()}_${index}`;
            
            // Add the category
            appState.categories[tempName] = [];
            
            // Add values for this category if there are data rows
            for (let rowIndex = 1; rowIndex < grid.length; rowIndex++) {
                if (grid[rowIndex][index] && grid[rowIndex][index].trim() !== '') {
                    appState.categories[tempName].push(grid[rowIndex][index].trim());
                }
            }
        });
        
        // Render the updated table
        renderCategoriesTable();
        
        // After rendering, rename the temporary categories
        setTimeout(() => {
            // Get all headers
            const headers = elements.headerRow.querySelectorAll('th');
            
            // Start from the target index (skip the first "Item Name" column)
            for (let i = targetIndex; i < headers.length && i - targetIndex < grid[0].length; i++) {
                const categoryName = grid[0][i - targetIndex].trim();
                if (categoryName !== '') {
                    // Simulate editing the header
                    headers[i].textContent = categoryName;
                    // Trigger the blur event
                    const oldCategory = Object.keys(appState.categories)[i - 1]; // -1 because of "Item Name" column
                    updateCategoryName(oldCategory, categoryName);
                }
            }
        }, 0);
    } else {
        // Pasting into body - add values to existing categories
        const startRowIndex = parseInt(targetCell.dataset.index) || 0;
        let startColumnIndex = 0;
        
        // Find the column index
        if (targetCell.dataset.category) {
            // It's a data cell
            const categoryName = targetCell.dataset.category;
            startColumnIndex = Object.keys(appState.categories).indexOf(categoryName) + 1; // +1 because of the first column
        } else {
            // It's the first column (no category)
            startColumnIndex = 0;
        }
        
        // Add the data
        let rowsAdded = 0;
        grid.forEach((row, rowIndex) => {
            const dataRowIndex = startRowIndex + rowIndex;
            
            row.forEach((cellValue, colIndex) => {
                const dataColIndex = startColumnIndex + colIndex;
                
                if (dataColIndex === 0) {
                    // First column (no category)
                    return;
                } else if (dataColIndex - 1 < Object.keys(appState.categories).length) {
                    // Existing category
                    const categoryName = Object.keys(appState.categories)[dataColIndex - 1];
                    
                    // Make sure the category array has enough rows
                    while (appState.categories[categoryName].length <= dataRowIndex) {
                        appState.categories[categoryName].push('');
                        rowsAdded++;
                    }
                    
                    // Update the value
                    appState.categories[categoryName][dataRowIndex] = cellValue.trim();
                }
            });
        });
        
        // Render the updated table
        renderCategoriesTable();
    }
}

// Show the context menu for column headers
function showContextMenu(event, category) {
    // Hide any existing context menu
    hideContextMenu();
    
    // Create the context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'contextMenu';
    contextMenu.className = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    
    // Add delete option
    const deleteOption = document.createElement('div');
    deleteOption.className = 'context-menu-item';
    deleteOption.textContent = 'Delete Column';
    deleteOption.addEventListener('click', () => {
        deleteCategory(category);
        hideContextMenu();
    });
    
    contextMenu.appendChild(deleteOption);
    document.body.appendChild(contextMenu);
    
    // Prevent the menu from going off-screen
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${window.innerWidth - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${window.innerHeight - rect.height}px`;
    }
    
    // Stop propagation to prevent immediate hiding
    event.stopPropagation();
}

// Hide the context menu
function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.remove();
    }
}

// Delete a category
function deleteCategory(categoryName) {
    // Confirm deletion
    if (confirm(`Are you sure you want to delete the "${categoryName}" column?`)) {
        // Remove from categories
        delete appState.categories[categoryName];
        
        // Remove from all items' properties
        const removePropertyFromItem = (item) => {
            if (item.properties && item.properties[categoryName] !== undefined) {
                delete item.properties[categoryName];
            }
            
            if (item.children) {
                item.children.forEach(child => removePropertyFromItem(child));
            }
        };
        
        appState.rewardTree.forEach(item => removePropertyFromItem(item));
        
        // Update the UI
        renderCategoriesTable();
        renderRewardTree();
        
        // Update properties panel if needed
        if (appState.selectedItem) {
            renderPropertiesForm(appState.selectedItem);
        }
    }
}

// Show the context menu for tree items
function showTreeItemContextMenu(event, item) {
    // Hide any existing context menu
    hideContextMenu();
    
    // Create the context menu from template
    const contextMenu = elements.contextMenuTemplate.cloneNode(true);
    contextMenu.id = 'contextMenu';
    contextMenu.style.display = 'block';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    
    // Create copy and paste menu items
    const copyMenuItem = document.createElement('div');
    copyMenuItem.className = 'context-menu-item';
    copyMenuItem.setAttribute('data-action', 'copy');
    copyMenuItem.innerHTML = `<span class="menu-icon">📋</span> Copy Item`;
    
    const pasteMenuItem = document.createElement('div');
    pasteMenuItem.className = 'context-menu-item';
    pasteMenuItem.setAttribute('data-action', 'paste');
    pasteMenuItem.innerHTML = `<span class="menu-icon">📌</span> Paste Item`;
    
    // Create the duplicate with all property values menu item
    const duplicateAllValuesMenuItem = document.createElement('div');
    duplicateAllValuesMenuItem.className = 'context-menu-item';
    duplicateAllValuesMenuItem.setAttribute('data-action', 'duplicate-all-values');
    duplicateAllValuesMenuItem.innerHTML = `<span class="menu-icon">🔄</span> Duplicate For All Values`;
    
    // Insert copy and paste items at the top of the menu
    contextMenu.insertBefore(pasteMenuItem, contextMenu.firstChild);
    contextMenu.insertBefore(copyMenuItem, contextMenu.firstChild);
    
    // Add the duplicate all values item after the duplicate item
    const duplicateItem = contextMenu.querySelector('[data-action="duplicate"]');
    if (duplicateItem) {
        contextMenu.insertBefore(duplicateAllValuesMenuItem, duplicateItem.nextSibling);
    } else {
        // If the duplicate item isn't found for some reason, add it at the top
        contextMenu.insertBefore(duplicateAllValuesMenuItem, contextMenu.firstChild.nextSibling);
    }
    
    // Add event listeners for each action
    contextMenu.querySelectorAll('.context-menu-item').forEach(menuItem => {
        const action = menuItem.getAttribute('data-action');
        menuItem.addEventListener('click', () => {
            switch (action) {
                case 'copy':
                    copyItemToClipboard(item);
                    break;
                case 'paste':
                    pasteItemFromClipboard(item);
                    break;
                case 'add':
                    addChildItem(item);
                    break;
                case 'edit':
                    // Focus on the name span for inline editing
                    const itemElement = document.querySelector(`.tree-item-header[data-id="${item.id}"] .item-name`);
                    if (itemElement) {
                        itemElement.focus();
                        // Select all text
                        const range = document.createRange();
                        range.selectNodeContents(itemElement);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    break;
                case 'duplicate':
                    duplicateItem(item);
                    break;
                case 'duplicate-all-values':
                    duplicateForAllPropertyValues(item);
                    break;
                case 'delete':
                    deleteItem(item);
                    break;
                case 'expand-all':
                    expandItemAndChildren(item);
                    break;
                case 'collapse-all':
                    collapseItemAndChildren(item);
                    break;
            }
            hideContextMenu();
        });
    });
    
    document.body.appendChild(contextMenu);
    
    // Prevent the menu from going off-screen
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${window.innerWidth - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${window.innerHeight - rect.height}px`;
    }
    
    // Stop propagation to prevent immediate hiding
    event.stopPropagation();
}

// Expand an item and all its children
function expandItemAndChildren(item) {
    item.expanded = true;
    if (item.children && item.children.length > 0) {
        item.children.forEach(child => expandItemAndChildren(child));
    }
    renderRewardTree();
}

// Collapse an item and all its children
function collapseItemAndChildren(item) {
    item.expanded = false;
    if (item.children && item.children.length > 0) {
        item.children.forEach(child => collapseItemAndChildren(child));
    }
    renderRewardTree();
}

// Duplicate an item
function duplicateItem(originalItem) {
    // Deep clone the item
    const duplicate = JSON.parse(JSON.stringify(originalItem));
    
    // Update IDs in the duplicate and its children
    const updateIds = (item) => {
        item.id = appState.nextId++;
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => updateIds(child));
        }
    };
    
    updateIds(duplicate);
    
    // Find the parent of the original item
    const findParent = (items, childId) => {
        for (const item of items) {
            if (item.children && item.children.some(child => child.id === childId)) {
                return item;
            }
            
            if (item.children && item.children.length > 0) {
                const parent = findParent(item.children, childId);
                if (parent) return parent;
            }
        }
        return null;
    };
    
    const parent = findParent(appState.rewardTree, originalItem.id);
    
    if (parent) {
        // Find index of the original item in parent's children
        const index = parent.children.findIndex(child => child.id === originalItem.id);
        // Insert duplicate after the original
        parent.children.splice(index + 1, 0, duplicate);
    } else {
        // Root level item
        const index = appState.rewardTree.findIndex(item => item.id === originalItem.id);
        appState.rewardTree.splice(index + 1, 0, duplicate);
    }
    
    renderRewardTree();
    selectItem(duplicate);
}

// Create a new document
function newDocument() {
    // Check for unsaved changes
    if (hasUnsavedChanges()) {
        if (!confirm('You have unsaved changes. Are you sure you want to create a new blank document?')) {
            return;
        }
    }
    
    // Reset the application state
    appState.rewardTree = [];
    appState.categories = {};
    appState.selectedItem = null;
    appState.nextId = 1;
    appState.lastSaved = null;
    appState.searchResults = [];
    appState.undoStack = [];
    appState.redoStack = [];
    appState.currentFilename = null; // Clear current filename
    
    // Do NOT set up default categories - leave them empty
    
    // Update the UI
    renderRewardTree();
    renderCategoriesTable();
    elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
    
    // Reset the document name
    elements.documentName.textContent = 'Untitled (Blank)';
    
    // Update the status
    updateAutoSaveStatus('Created new blank document without categories');
    
    // Immediately save to localStorage to overwrite the cached data
    saveToLocalStorage();
    
    // Clear any multi-selection
    appState.selectedItems = [];
    elements.bulkOperationsButton.style.display = 'none';
}

// New blank document - keeping for backward compatibility
function newBlankDocument() {
    newDocument(); // Just call the main newDocument function now
}

// Import categories from CSV file
function importCategoriesFromCSV(event) {
    const file = event.target.files[0];
    if (!file) {
        console.error('No file selected');
        return;
    }
    
    console.log('Processing CSV file:', file.name);
    
    // Check for unsaved changes before importing
    if (hasUnsavedChanges()) {
        if (!confirm('Importing CSV will replace all current categories. Continue?')) {
            elements.csvFileInput.value = '';
            return;
        }
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const csvData = e.target.result;
            console.log('CSV data loaded, length:', csvData.length);
            
            const result = parseCSV(csvData);
            
            if (result && result.headers && result.headers.length > 0) {
                console.log('CSV parsed successfully, headers:', result.headers);
                
                // Replace existing categories with new ones from CSV
                appState.categories = {};
                
                // Process headers (first row)
                for (let i = 0; i < result.headers.length; i++) {
                    const header = result.headers[i].trim();
                    if (header) {
                        appState.categories[header] = [];
                    }
                }
                
                // Process data rows
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const row = result.data[rowIndex];
                    
                    // Add values to each category
                    Object.keys(appState.categories).forEach((category, colIndex) => {
                        if (colIndex < row.length && row[colIndex].trim()) {
                            appState.categories[category].push(row[colIndex].trim());
                        }
                    });
                }
                
                // Update UI
                renderCategoriesTable();
                
                // Reset file input
                elements.csvFileInput.value = '';
                
                // Update status
                updateAutoSaveStatus('Categories imported from CSV');
                appState.hasUnsavedChanges = true;
                updateUnsavedChangesIndicator();
            } else {
                alert('Invalid CSV format or empty file.');
            }
        } catch (error) {
            console.error('Error importing CSV:', error);
            alert('Error importing CSV: ' + error.message);
        }
    };
    
    reader.onerror = (e) => {
        console.error('FileReader error:', e);
        alert('Error reading file: ' + e.target.error);
    };
    
    reader.readAsText(file);
}

// Parse CSV data into headers and rows
function parseCSV(csvData) {
    console.log('Starting CSV parsing');
    
    // Check if the data contains tabs or commas
    const delimiter = csvData.indexOf('\t') !== -1 ? '\t' : ',';
    console.log('Using delimiter:', delimiter === '\t' ? 'tab' : 'comma');
    
    // Split data into rows
    const rows = csvData.split(/\r?\n/).filter(row => row.trim() !== '');
    console.log('Found', rows.length, 'rows in CSV data');
    
    if (rows.length === 0) return null;
    
    // Function to parse a CSV row, handling quotes properly
    const parseRow = (rowStr) => {
        const result = [];
        let cell = '';
        let inQuotes = false;
        
        for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            const nextChar = rowStr[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Double quotes within quotes - add a single quote
                    cell += '"';
                    i++; // Skip the next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if ((char === delimiter) && !inQuotes) {
                // End of cell
                result.push(cell);
                cell = '';
            } else {
                cell += char;
            }
        }
        
        // Add the last cell
        result.push(cell);
        return result;
    };
    
    // Parse headers (first row)
    const headers = parseRow(rows[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].trim()) {
            data.push(parseRow(rows[i]));
        }
    }
    
    console.log('Parsed CSV with', headers.length, 'columns and', data.length, 'data rows');
    return { headers, data };
}

// Function to trigger file input click
function openCSVFileDialog() {
    console.log('Opening CSV file dialog');
    // Make sure we have a valid reference to the file input element
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('CSV file input element not found!');
    }
}

// Apply the current theme
function applyTheme() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('rewardSelectorTheme');
    if (savedTheme) {
        appState.theme = savedTheme;
    } else {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            appState.theme = 'dark';
        }
    }
    
    // Apply the theme
    document.body.classList.toggle('dark-theme', appState.theme === 'dark');
    
    // Update the theme toggle
    if (elements.themeSwitch) {
        elements.themeSwitch.checked = appState.theme === 'dark';
    }
}

// Toggle between light and dark theme
function toggleTheme() {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme', appState.theme === 'dark');
    
    // Save the theme preference
    localStorage.setItem('rewardSelectorTheme', appState.theme);
}

// Apply the width preference
function applyWidthPreference() {
    // Check for saved width preference
    const isFullWidth = localStorage.getItem('rewardSelectorWidth') === 'full';
    
    // Apply the width preference
    document.querySelector('.container').classList.toggle('full-width', isFullWidth);
    
    // Update the width toggle
    if (elements.widthSwitch) {
        elements.widthSwitch.checked = isFullWidth;
    }
}

// Toggle between centered and full-width layout
function toggleWidth() {
    const container = document.querySelector('.container');
    const isFullWidth = elements.widthSwitch.checked;
    
    // Toggle the container class
    container.classList.toggle('full-width', isFullWidth);
    
    // Save the width preference
    localStorage.setItem('rewardSelectorWidth', isFullWidth ? 'full' : 'centered');
}

// Set up auto-backup functionality
function setupAutoBackup() {
    // Clear any existing timer
    if (appState.backupTimer) {
        clearInterval(appState.backupTimer);
    }
    
    // Set up a new timer
    appState.backupTimer = setInterval(() => {
        if (hasUnsavedChanges()) {
            createBackup();
        }
    }, appState.backupInterval);
    
    // Also create a backup on page load
    setTimeout(createBackup, 5000);
}

// Create a backup of the current state
function createBackup() {
    const currentState = {
        rewardTree: appState.rewardTree,
        categories: appState.categories,
        nextId: appState.nextId,
        timestamp: new Date().toISOString(),
        documentName: elements.documentName.textContent
    };
    
    // Add to backups array, limited to 10 most recent
    appState.autoBackups.unshift(currentState);
    if (appState.autoBackups.length > 10) {
        appState.autoBackups.pop();
    }
    
    // Save backups to localStorage
    try {
        localStorage.setItem('rewardSelectorBackups', JSON.stringify(appState.autoBackups));
        
        // Don't show backup notification for automatic backups - they're too intrusive
        // showBackupNotification();
    } catch (e) {
        console.error('Error saving backup:', e);
    }
}

// Show the backup notification
function showBackupNotification() {
    // Don't show backup notifications for automatic backups
    // The notification is too intrusive when it appears frequently
    
    // Only uncomment this if we want to display the notification for debugging
    /*
    if (appState.autoBackups.length === 0) return;
    
    const latestBackup = appState.autoBackups[0];
    const backupTime = new Date(latestBackup.timestamp);
    
    elements.backupStatus.textContent = 'Auto-backup saved';
    elements.backupTime.textContent = backupTime.toLocaleTimeString();
    elements.autoBackupNotification.style.display = 'flex';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        elements.autoBackupNotification.style.display = 'none';
    }, 3000);
    */
}

// Restore from the most recent backup
function restoreFromBackup() {
    if (appState.autoBackups.length === 0) {
        alert('No backups available');
        return;
    }
    
    if (!confirm('Restore from the most recent backup? This will discard any unsaved changes.')) {
        return;
    }
    
    const latestBackup = appState.autoBackups[0];
    
    // Restore the state
    appState.rewardTree = latestBackup.rewardTree;
    appState.categories = latestBackup.categories;
    appState.nextId = latestBackup.nextId;
    elements.documentName.textContent = latestBackup.documentName;
    
    // Update the UI
    renderRewardTree();
    renderCategoriesTable();
    
    // Clear selection
    appState.selectedItem = null;
    appState.selectedItems = [];
    elements.propertiesForm.innerHTML = '<p>Select an item to edit its properties</p>';
    
    // Hide the notification
    elements.autoBackupNotification.style.display = 'none';
    
    // Show confirmation
    updateAutoSaveStatus('Restored from backup');
    
    // Immediately save to localStorage to overwrite the cached data
    saveToLocalStorage();
    
    // Hide bulk operations button
    elements.bulkOperationsButton.style.display = 'none';
}

// Set up the command palette
function setupCommandPalette() {
    // Set up command input event handlers
    elements.commandInput.addEventListener('input', filterCommands);
    elements.commandInput.addEventListener('keydown', handleCommandNavigation);
    
    // Close the palette when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.commandPalette.contains(e.target)) {
            hideCommandPalette();
        }
    });
}

// Show the command palette
function showCommandPalette() {
    elements.commandPalette.style.display = 'block';
    elements.commandInput.value = '';
    elements.commandInput.focus();
    
    // Populate with common commands
    populateCommandPalette();
}

// Hide the command palette
function hideCommandPalette() {
    elements.commandPalette.style.display = 'none';
}

// Populate the command palette with available commands
function populateCommandPalette() {
    const commands = [
        { name: 'New Document', icon: '📄', action: newDocument, shortcut: 'Ctrl+N', description: 'Create a new blank document' },
        { name: 'New Blank Document', icon: '📝', action: newDocument, shortcut: 'Ctrl+Shift+N', description: 'Create a new blank document' },
        { name: 'Save', icon: '💾', action: saveData, shortcut: 'Ctrl+S', description: 'Save the current document' },
        { name: 'Load', icon: '📂', action: () => elements.fileInput.click(), shortcut: '', description: 'Load a document' },
        { name: 'Import CSV', icon: '📤', action: () => elements.csvFileInput.click(), shortcut: '', description: 'Import categories from CSV' },
        { name: 'Export CSV', icon: '📥', action: exportCategoriesToCSV, shortcut: '', description: 'Export categories to CSV' },
        { name: 'Copy Item', icon: '📋', action: copySelectedItem, shortcut: '', description: 'Copy the selected item to clipboard' },
        { name: 'Paste Item', icon: '📌', action: pasteToSelectedItem, shortcut: '', description: 'Paste item as child of selection' },
        { name: 'Toggle Theme', icon: '🌓', action: toggleTheme, shortcut: '', description: 'Switch between light and dark theme' },
        { name: 'Add Root Item', icon: '➕', action: addRootItem, shortcut: '', description: 'Add a new root level item' },
        { name: 'Select All', icon: '✓', action: selectAllItems, shortcut: 'Ctrl+A', description: 'Select all items' },
        { name: 'Deselect All', icon: '✗', action: deselectAllItems, shortcut: 'Esc', description: 'Deselect all items' },
        { name: 'Expand All', icon: '🔽', action: expandAllItems, shortcut: '', description: 'Expand all items' },
        { name: 'Collapse All', icon: '🔼', action: collapseAllItems, shortcut: '', description: 'Collapse all items' },
        { name: 'Show Keyboard Shortcuts', icon: '⌨️', action: showShortcutsModal, shortcut: '?', description: 'Display keyboard shortcuts' }
    ];
    
    renderCommandOptions(commands);
}

// Filter commands based on input
function filterCommands() {
    const query = elements.commandInput.value.toLowerCase();
    
    // Get all commands
    const commands = [
        { name: 'New Document', icon: '📄', action: newDocument, shortcut: 'Ctrl+N', description: 'Create a new blank document' },
        { name: 'New Blank Document', icon: '📝', action: newDocument, shortcut: 'Ctrl+Shift+N', description: 'Create a new blank document' },
        { name: 'Save', icon: '💾', action: saveData, shortcut: 'Ctrl+S', description: 'Save the current document' },
        { name: 'Load', icon: '📂', action: () => elements.fileInput.click(), shortcut: '', description: 'Load a document' },
        { name: 'Import CSV', icon: '📤', action: () => elements.csvFileInput.click(), shortcut: '', description: 'Import categories from CSV' },
        { name: 'Export CSV', icon: '📥', action: exportCategoriesToCSV, shortcut: '', description: 'Export categories to CSV' },
        { name: 'Copy Item', icon: '📋', action: copySelectedItem, shortcut: '', description: 'Copy the selected item to clipboard' },
        { name: 'Paste Item', icon: '📌', action: pasteToSelectedItem, shortcut: '', description: 'Paste item as child of selection' },
        { name: 'Toggle Theme', icon: '🌓', action: toggleTheme, shortcut: '', description: 'Switch between light and dark theme' },
        { name: 'Add Root Item', icon: '➕', action: addRootItem, shortcut: '', description: 'Add a new root level item' },
        { name: 'Select All', icon: '✓', action: selectAllItems, shortcut: 'Ctrl+A', description: 'Select all items' },
        { name: 'Deselect All', icon: '✗', action: deselectAllItems, shortcut: 'Esc', description: 'Deselect all items' },
        { name: 'Expand All', icon: '🔽', action: expandAllItems, shortcut: '', description: 'Expand all items' },
        { name: 'Collapse All', icon: '🔼', action: collapseAllItems, shortcut: '', description: 'Collapse all items' },
        { name: 'Show Keyboard Shortcuts', icon: '⌨️', action: showShortcutsModal, shortcut: '?', description: 'Display keyboard shortcuts' }
    ];
    
    // Filter commands based on query
    const filteredCommands = commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query) || 
        cmd.description.toLowerCase().includes(query)
    );
    
    renderCommandOptions(filteredCommands);
}

// Render command options in the palette
function renderCommandOptions(commands) {
    elements.commandResults.innerHTML = '';
    
    if (commands.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'command-option';
        noResults.textContent = 'No commands found';
        elements.commandResults.appendChild(noResults);
        return;
    }
    
    commands.forEach((cmd, index) => {
        const option = document.createElement('div');
        option.className = 'command-option';
        option.dataset.index = index;
        
        // Icon
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = cmd.icon;
        option.appendChild(icon);
        
        // Name
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = cmd.name;
        option.appendChild(name);
        
        // Shortcut (if any)
        if (cmd.shortcut) {
            const shortcut = document.createElement('span');
            shortcut.className = 'description';
            shortcut.textContent = cmd.shortcut;
            option.appendChild(shortcut);
        }
        
        // Click handler
        option.addEventListener('click', () => {
            executeCommand(cmd);
        });
        
        elements.commandResults.appendChild(option);
    });
    
    // Select the first option by default
    if (commands.length > 0) {
        elements.commandResults.querySelector('.command-option').classList.add('selected');
    }
}

// Handle keyboard navigation in the command palette
function handleCommandNavigation(e) {
    const options = elements.commandResults.querySelectorAll('.command-option');
    if (options.length === 0) return;
    
    const selected = elements.commandResults.querySelector('.command-option.selected');
    let index = selected ? parseInt(selected.dataset.index) : 0;
    
    // Handle arrow keys
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        index = Math.min(index + 1, options.length - 1);
        updateSelection(options, index);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        index = Math.max(index - 1, 0);
        updateSelection(options, index);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
            selected.click();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideCommandPalette();
    }
}

// Update the selected option
function updateSelection(options, index) {
    options.forEach(opt => opt.classList.remove('selected'));
    options[index].classList.add('selected');
    
    // Ensure the selected option is visible
    options[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Execute the selected command
function executeCommand(command) {
    hideCommandPalette();
    
    // Add to command history
    appState.commandHistory.unshift(command.name);
    if (appState.commandHistory.length > 20) {
        appState.commandHistory.pop();
    }
    
    // Execute the command
    command.action();
}

// Show advanced search dialog
function showAdvancedSearch() {
    // Create a simple dialog for now - could be enhanced to a full modal in the future
    const searchOptions = prompt(`Advanced Search Options:
1. Use quotes for exact phrases: "exact phrase"
2. Use + to require words: +required
3. Use - to exclude words: -excluded
4. Search in property values: property:value
5. Combine operators: +required -excluded property:value

Enter your search query:`);
    
    if (searchOptions) {
        elements.searchInput.value = searchOptions;
        searchRewards(searchOptions);
    }
}

// Get icon for status
function getStatusIcon(status) {
    switch(status) {
        case 'not started':
            return `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="#888888" stroke-width="1.5"/>
                </svg>
            `;
        case 'in progress':
            return `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="#3498db" stroke-width="1.5"/>
                    <circle cx="8" cy="8" r="3" fill="#3498db"/>
                </svg>
            `;
        case 'needs review':
            return `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="#f39c12" stroke-width="1.5"/>
                    <path d="M5 8L7 10L11 6" stroke="#f39c12" stroke-width="1.5"/>
                </svg>
            `;
        case 'done':
            return `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" fill="#2ecc71" stroke="#2ecc71" stroke-width="1.5"/>
                    <path d="M5 8L7 10L11 6" stroke="white" stroke-width="1.5"/>
                </svg>
            `;
        default:
            return `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="#888888" stroke-width="1.5"/>
                </svg>
            `;
    }
}

// Cycle through item statuses
function cycleItemStatus(item) {
    const statuses = ['not started', 'in progress', 'needs review', 'done'];
    
    // Get current status or default to 'not started'
    const currentStatus = item.status || 'not started';
    
    // Find current index and go to next
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    
    // Update item status
    item.status = statuses[nextIndex];
    
    // Update UI
    renderRewardTree();
    
    // Mark changes
    appState.hasUnsavedChanges = true;
    updateUnsavedChangesIndicator();
}

// Redo the last undone action
function redo() {
    if (appState.redoStack.length === 0) return;
    
    const action = appState.redoStack.pop();
    
    // Handle different action types
    switch (action.type) {
        case 'delete':
            // For delete, we need to delete the item again
            const item = findItemById(appState.rewardTree, action.data.item.id);
            if (item) {
                // Add back to undo stack first
                appState.undoStack.push({
                    type: 'delete',
                    data: JSON.parse(JSON.stringify(action.data))
                });
                
                deleteItem(item, false); // Pass false to not add to undo stack again
            }
            break;
        case 'move':
            // For move, apply the move again
            redoMove(action.data);
            break;
        case 'selection-change':
            // For selection change, apply the redone selection
            restorePreviousSelection(action.data);
            break;
        case 'property-propagation':
            // For property propagation, apply the propagation again
            redoPropertyPropagation(action.data);
            break;
        default:
            console.warn("Unknown action type:", action.type);
            break;
    }
    
    // Update UI
    renderRewardTree();
    updateUnsavedChangesIndicator();
}

// Redo a property propagation action
function redoPropertyPropagation(propagationData) {
    // Add to undo stack before redoing
    appState.undoStack.push({
        type: 'property-propagation',
        data: JSON.parse(JSON.stringify(propagationData))
    });
    
    const { parentItemId, propertyName, propertyValue, originalValues } = propagationData;
    
    // Find the parent item first
    const parentItem = findItemById(appState.rewardTree, parentItemId);
    if (!parentItem) {
        console.warn(`Could not find parent item with ID ${parentItemId} for redo propagation`);
        return;
    }
    
    // Get all affected items from the original values
    const affectedItemIds = new Set(originalValues.map(info => info.itemId));
    
    // Apply the property value to all affected items
    affectedItemIds.forEach(itemId => {
        const item = findItemById(appState.rewardTree, itemId);
        if (!item) {
            console.warn(`Could not find item with ID ${itemId} for redo propagation`);
            return;
        }
        
        // Apply the property change
        if (item.properties && item.properties.hasOwnProperty(propertyName)) {
            item.properties[propertyName] = propertyValue;
            
            // Update name if this property is the name source
            if (item.nameSource === propertyName) {
                item.name = propertyValue;
            }
        }
    });
    
    // Show notification
    showNotification('Property propagation redone');
}

// Redo a move action
function redoMove(moveData) {
    // Find the item that was moved
    const item = findItemById(appState.rewardTree, moveData.item);
    
    if (!item) {
        console.error("Cannot redo move: item not found");
        return;
    }
    
    // Add to undo stack before redoing
    appState.undoStack.push({
        type: 'move',
        data: JSON.parse(JSON.stringify(moveData))
    });
    
    // First remove the item from its current position
    // Check if item is at root level
    const rootIndex = appState.rewardTree.findIndex(i => i.id === item.id);
    if (rootIndex !== -1) {
        appState.rewardTree.splice(rootIndex, 1);
    } else {
        // Find where the item currently is
        const removeFromChildren = (parent) => {
            if (!parent.children) return false;
            
            const index = parent.children.findIndex(i => i.id === item.id);
            if (index !== -1) {
                parent.children.splice(index, 1);
                return true;
            }
            
            for (const child of parent.children) {
                if (removeFromChildren(child)) return true;
            }
            
            return false;
        };
        
        // Try to remove from all root items
        let found = false;
        for (const rootItem of appState.rewardTree) {
            if (removeFromChildren(rootItem)) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.error("Could not find item to redo move");
            return;
        }
    }
    
    // Then place it in its target position
    if (moveData.targetParentId === null) {
        // Target was at root level
        if (moveData.position === 'before' || moveData.position === 'after') {
            // Get the correct position at root level
            if (moveData.targetIndex >= 0 && moveData.targetIndex <= appState.rewardTree.length) {
                appState.rewardTree.splice(moveData.targetIndex, 0, item);
            } else {
                appState.rewardTree.push(item);
            }
        } else {
            // Must be a mistake, no 'inside' at root level
            appState.rewardTree.push(item);
        }
    } else {
        // Target was inside a parent
        const targetParent = findItemById(appState.rewardTree, moveData.targetParentId);
        if (targetParent) {
            if (!targetParent.children) {
                targetParent.children = [];
            }
            
            if (moveData.position === 'inside') {
                targetParent.children.push(item);
                targetParent.expanded = true;
            } else if (moveData.targetIndex >= 0 && moveData.targetIndex <= targetParent.children.length) {
                targetParent.children.splice(moveData.targetIndex, 0, item);
            } else {
                targetParent.children.push(item);
            }
        } else {
            console.error("Could not find target parent for redo move");
            appState.rewardTree.push(item); // Fallback to root level
        }
    }
    
    // Update UI
    selectItem(item);
}

// Set up scroll button functionality
function setupScrollButton() {
    const scrollButton = document.getElementById('scrollTopButton');
    if (!scrollButton) {
        console.error("Scroll button not found");
        return;
    }
    
    let savedPosition = 0;
    
    // Remove any existing listeners to avoid conflicts
    scrollButton.replaceWith(scrollButton.cloneNode(true));
    
    // Get fresh reference after replacement
    const freshButton = document.getElementById('scrollTopButton');
    
    // Simple click handler
    freshButton.addEventListener('click', function() {
        if (this.classList.contains('return')) {
            // Button is in "return" mode - go back to saved position
            window.scrollTo(0, savedPosition);
            this.classList.remove('return');
        } else {
            // Button is in normal mode - save position and go to top
            savedPosition = window.scrollY;
            window.scrollTo(0, 0);
            this.classList.add('return');
        }
    });
}

// Export categories to CSV file
function exportCategoriesToCSV() {
    console.log('Exporting categories to CSV');
    
    // Get all category names
    const categoryNames = Object.keys(appState.categories);
    if (categoryNames.length === 0) {
        alert('No categories to export');
        return;
    }
    
    // Find the maximum number of rows
    let maxRows = 0;
    categoryNames.forEach(category => {
        maxRows = Math.max(maxRows, appState.categories[category].length);
    });
    
    // Create CSV content
    let csvContent = categoryNames.join(',') + '\n';
    
    // Add data rows
    for (let i = 0; i < maxRows; i++) {
        const rowValues = categoryNames.map(category => {
            // Get the value for this category and row, or empty string
            const value = i < appState.categories[category].length ? appState.categories[category][i] : '';
            
            // Escape quotes and wrap in quotes if contains comma or newline
            if (value.includes('"') || value.includes(',') || value.includes('\n')) {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        
        csvContent += rowValues.join(',') + '\n';
    }
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger click
    const downloadLink = document.createElement('a');
    const filename = `${elements.documentName.textContent}_categories.csv`;
    
    downloadLink.href = url;
    downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    
    // Update status
    updateAutoSaveStatus('Categories exported to CSV');
}

// Call init when the page loads
document.addEventListener('DOMContentLoaded', init); 

// Copy an item and all its children to clipboard
function copyItemToClipboard(item) {
    try {
        // Create a deep clone of the item to avoid mutations
        const itemCopy = JSON.parse(JSON.stringify(item));
        
        // Add metadata to identify this is a reward item
        const clipboardData = {
            type: 'reward-selector-item',
            version: 1,
            data: itemCopy,
            timestamp: new Date().toISOString()
        };
        
        // Convert to string
        const clipboardString = JSON.stringify(clipboardData);
        
        // Store in localStorage as a fallback (this will always work even if clipboard fails)
        try {
            localStorage.setItem('reward-selector-clipboard', clipboardString);
        } catch(e) {
            console.warn('Failed to save to localStorage:', e);
        }
        
        // Also store in application state for immediate use
        appState.clipboardData = clipboardData;
        
        // Try to use the Clipboard API
        navigator.clipboard.writeText(clipboardString)
            .then(() => {
                // Show success notification
                showNotification('Item copied to clipboard');
            })
            .catch(err => {
                console.warn('Browser clipboard access failed, using internal clipboard:', err);
                // Show a different message to let the user know we're using an internal clipboard
                showNotification('Item copied to internal clipboard');
            });
    } catch (err) {
        console.error('Error preparing item for clipboard:', err);
        alert('Error preparing item for clipboard. See console for details.');
    }
}

// Paste an item from the clipboard
function pasteItemFromClipboard(parentItem) {
    // Try to get data from multiple sources in order of preference
    const getSavedItem = () => {
        return new Promise((resolve, reject) => {
            // First try browser clipboard API
            navigator.clipboard.readText()
                .then(text => {
                    try {
                        const data = JSON.parse(text);
                        if (data && data.type === 'reward-selector-item') {
                            resolve(data);
                        } else {
                            throw new Error('Invalid clipboard data format');
                        }
                    } catch (parseErr) {
                        throw new Error('Error parsing clipboard data: ' + parseErr.message);
                    }
                })
                .catch(clipboardErr => {
                    console.warn('Browser clipboard access failed, trying fallbacks:', clipboardErr);
                    
                    // Next, try our app state
                    if (appState.clipboardData) {
                        resolve(appState.clipboardData);
                        return;
                    }
                    
                    // Finally try localStorage
                    try {
                        const savedData = localStorage.getItem('reward-selector-clipboard');
                        if (savedData) {
                            const data = JSON.parse(savedData);
                            if (data && data.type === 'reward-selector-item') {
                                resolve(data);
                                return;
                            }
                        }
                    } catch (localStorageErr) {
                        console.warn('localStorage access failed:', localStorageErr);
                    }
                    
                    reject(new Error('No valid item found in clipboard or storage'));
                });
        });
    };
    
    // Process the paste operation
    getSavedItem()
        .then(clipboardData => {
            // Get the item data
            const newItem = clipboardData.data;
            
            // Update IDs to avoid conflicts
            updateItemIds(newItem);
            
            // Add to parent
            if (!parentItem.children) {
                parentItem.children = [];
            }
            
            parentItem.children.push(newItem);
            parentItem.expanded = true;
            
            // Update the UI
            renderRewardTree();
            selectItem(newItem);
            updateUnsavedChangesIndicator();
            
            // Show success notification
            showNotification('Item pasted successfully');
        })
        .catch(err => {
            console.error('Paste failed:', err);
            alert('Could not paste: No valid item found in clipboard. Please copy an item first.');
        });
}

// Recursively update all IDs in an item and its children
function updateItemIds(item) {
    // Update this item's ID
    item.id = appState.nextId++;
    
    // Update IDs of all children
    if (item.children && item.children.length > 0) {
        item.children.forEach(child => {
            updateItemIds(child);
        });
    }
}

// Show a notification
function showNotification(message, duration = 3000) {
    // Remove any existing notification
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    
    // Create message text
    const messageText = document.createElement('span');
    messageText.textContent = message;
    notification.appendChild(messageText);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'close-notification';
    closeButton.addEventListener('click', () => notification.remove());
    notification.appendChild(closeButton);
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Auto-hide after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Copy the currently selected item from the command palette
function copySelectedItem() {
    if (!appState.selectedItem) {
        alert('Please select an item first');
        return;
    }
    
    copyItemToClipboard(appState.selectedItem);
}

// Paste as a child of the selected item from the command palette
function pasteToSelectedItem() {
    if (!appState.selectedItem) {
        alert('Please select a parent item first');
        return;
    }
    
    pasteItemFromClipboard(appState.selectedItem);
}

// Instead of navigator.clipboard.writeText
function copyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Unable to copy', err);
  }
  document.body.removeChild(textArea);
}

// Propagate a property value to all children recursively
function propagatePropertyToChildren(parentItem, propertyName, propertyValue) {
    if (!parentItem.children || parentItem.children.length === 0) {
        return 0; // No children to update
    }
    
    let updateCount = 0;
    
    // Store original values for undo
    const originalValues = [];
    
    // Function to update an item and its children recursively
    const updateProperty = (item) => {
        // Only update if the item already has this property
        if (item.properties && item.properties.hasOwnProperty(propertyName)) {
            // Store original state for undo
            originalValues.push({
                itemId: item.id,
                propertyName: propertyName,
                originalValue: item.properties[propertyName]
            });
            
            // Update the property
            item.properties[propertyName] = propertyValue;
            updateCount++;
            
            // If this is the name source for the item, update the name too
            if (item.nameSource === propertyName) {
                // Store original name for undo
                originalValues.push({
                    itemId: item.id,
                    isName: true,
                    originalName: item.name
                });
                
                item.name = propertyValue;
            }
        }
        
        // Recursively update children
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => updateProperty(child));
        }
    };
    
    // Process all immediate children
    parentItem.children.forEach(child => {
        updateProperty(child);
    });
    
    // Only add to undo stack if changes were made
    if (updateCount > 0) {
        // Add to undo stack
        appState.undoStack.push({
            type: 'property-propagation',
            data: {
                parentItemId: parentItem.id,
                propertyName: propertyName,
                propertyValue: propertyValue,
                originalValues: originalValues
            }
        });
        
        // Clear redo stack when a new action is performed
        appState.redoStack = [];
        
        // Mark changes
        appState.hasUnsavedChanges = true;
        updateUnsavedChangesIndicator();
    }
    
    return updateCount;
}

// Count the total number of items in the tree
function countTotalItems(items) {
    let count = 0;
    
    function countRecursively(itemArray) {
        if (!itemArray || !Array.isArray(itemArray)) return;
        
        count += itemArray.length;
        
        // Count children recursively
        for (const item of itemArray) {
            if (item.children && item.children.length > 0) {
                countRecursively(item.children);
            }
        }
    }
    
    countRecursively(items);
    return count;
}

// Export data as Notion-compatible CSV
function exportToNotionCSV() {
    console.log('Exporting as Notion-compatible CSV');
    
    // Get all items in a flattened structure
    const allItems = flattenTree(appState.rewardTree);
    if (allItems.length === 0) {
        alert('No items to export');
        return;
    }
    
    // Determine which properties to include (get from all items)
    const propertySet = new Set();
    allItems.forEach(item => {
        Object.keys(item.properties || {}).forEach(prop => propertySet.add(prop));
    });
    
    // Convert Set to Array and sort alphabetically
    const propertyNames = Array.from(propertySet).sort();
    
    // Create CSV headers: Name, Status, Parent item, [Properties...]
    // Note: Notion doesn't need a "Sub-item" column - it builds hierarchy just from Parent references
    let headers = ['Name', 'Status', 'Parent item', ...propertyNames];
    
    // Start CSV content with headers
    let csvContent = headers.join(',') + '\n';
    
    // First create unique IDs for all items
    // These IDs need to be stable across exports so Notion can maintain relationships
    const itemReferences = new Map();
    allItems.forEach(item => {
        // Create a slug from the name (for readability in Notion URLs)
        const slug = item.name.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 20);
        
        // Generate a stable reference string
        const reference = `${slug}-${item.id}`;
        itemReferences.set(item.id, {
            reference,
            notionUrl: `${item.name.replace(/\s+/g, '-')}-${reference}`
        });
    });
    
    // Process each item and build the CSV rows
    allItems.forEach(item => {
        const row = [];
        
        // Name
        row.push(escapeCsvValue(item.name || ''));
        
        // Status
        row.push(escapeCsvValue(item.status || 'Not started'));
        
        // Parent item with Notion format reference URL
        const parent = findParentItem(appState.rewardTree, item.id);
        if (parent) {
            const parentRef = itemReferences.get(parent.id);
            // Format exactly as in the sample CSV: Parent Name (https://www.notion.so/Parent-Name-reference?pvs=21)
            row.push(escapeCsvValue(`${parent.name} (https://www.notion.so/${parentRef.notionUrl}?pvs=21)`));
        } else {
            row.push(''); // No parent = root level item
        }
        
        // Add all other properties
        propertyNames.forEach(propName => {
            const value = item.properties && item.properties[propName] ? item.properties[propName] : '';
            row.push(escapeCsvValue(value));
        });
        
        // Add to CSV content
        csvContent += row.join(',') + '\n';
    });
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger click
    const downloadLink = document.createElement('a');
    const filename = `${elements.documentName.textContent}_notion_export.csv`;
    
    downloadLink.href = url;
    downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    
    // Update status
    updateAutoSaveStatus('Exported to Notion-compatible CSV');
}

// Helper function to escape CSV values
function escapeCsvValue(value) {
    // Convert to string if not already
    value = String(value);
    
    // Check if the value needs to be quoted
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        // Escape double quotes with double quotes and wrap in quotes
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

// Update both document name elements
function updateDocumentName(name) {
    elements.documentName.textContent = name;
    // Update the duplicate in Categories tab
    if (document.getElementById('documentName2')) {
        document.getElementById('documentName2').textContent = name;
    }
}

function processCategoryPromotions() {
    const processItem = (item) => {
        // Check if this item has a Category property (case insensitive)
        if (item.properties) {
            const categoryProp = Object.keys(item.properties).find(key => 
                key.toLowerCase() === 'category'
            );
            
            if (categoryProp) {
                // Set this property as the name source
                item.nameSource = categoryProp;
                
                // Update the item's name to match the category value
                item.name = item.properties[categoryProp];
            }
        }
        
        // Process children recursively
        if (item.children) {
            item.children.forEach(processItem);
        }
    };
    
    // Process all root items
    appState.rewardTree.forEach(processItem);
    
    // Update the UI
    renderRewardTree();
    renderPropertiesForm(appState.selectedItem);
    updateUnsavedChangesIndicator();
}

// Convert tree data to markdown in a bulleted list format
function convertToMarkdown() {
    let markdown = `# ${elements.documentName.textContent || 'Reward List'}\n\n`;
    
    // Helper function to get the display name for an item based on nameSource
    function getDisplayNameForItem(item) {
        if (item.nameSource && item.nameSource !== 'Name' && 
            item.properties && item.properties[item.nameSource]) {
            return item.properties[item.nameSource];
        }
        return item.name;
    }
    
    // Function to process items recursively
    function processItems(items, level = 0) {
        let result = '';
        
        for (const item of items) {
            // Add bullet with proper indentation
            const indent = '  '.repeat(level);
            
            // Format based on level:
            // - Level 0 (root): H2 headings
            // - Level 1 (children of root): Bold bullet points
            // - Level 2+ (deeper nesting): Regular bullet points
            let bullet, nameFormat;
            
            if (level === 0) {
                bullet = '## ';
                nameFormat = name => name; // No additional formatting
            } else if (level === 1) {
                bullet = '- ';
                nameFormat = name => `**${name}**`; // Bold formatting
            } else {
                bullet = '- ';
                nameFormat = name => name; // No additional formatting
            }
            
            // Add item name (use the promoted property value if set)
            const displayName = getDisplayNameForItem(item);
            
            // Start the line with the item name, applying appropriate formatting
            let itemLine = `${indent}${bullet}${nameFormat(displayName)}`;
            
            // Add properties inline if they exist, separated by dashes
            if (item.properties && Object.keys(item.properties).length > 0) {
                const propertyValues = [];
                
                for (const [key, value] of Object.entries(item.properties)) {
                    if (value !== '' && value !== null && value !== undefined) {
                        // Skip the promoted property if it's already used as the item name
                        if (item.nameSource === key) {
                            continue;
                        }
                        propertyValues.push(value);
                    }
                }
                
                // Add the property values with dashes if there are any
                if (propertyValues.length > 0) {
                    itemLine += ` - ${propertyValues.join(' - ')}`;
                }
            }
            
            // End the line
            result += itemLine + '\n';
            
            // Process children if any
            if (item.children && item.children.length > 0) {
                result += processItems(item.children, level + 1);
            }
        }
        
        return result;
    }
    
    markdown += processItems(appState.rewardTree);
    return markdown;
}

// Initialize markdown export modal
function initMarkdownExport() {
    // Generate markdown only when explicitly requested by opening the modal
    const markdown = convertToMarkdown();
    elements.markdownText.textContent = markdown;
    elements.markdownModal.classList.add('show');
    
    // Hide the backup notification if it's showing
    if (elements.backupNotification) {
        elements.backupNotification.style.display = 'none';
    }
}

// Duplicate an item for each value of its promoted property
function duplicateForAllPropertyValues(originalItem) {
    // Check if item has a promoted property (nameSource)
    if (!originalItem.nameSource || originalItem.nameSource === 'Name') {
        showNotification('No promoted property found. Please promote a property first.', 5000);
        return;
    }
    
    const propertyName = originalItem.nameSource;
    
    // Check if this property has defined values in categories
    if (!appState.categories[propertyName] || appState.categories[propertyName].length === 0) {
        showNotification(`No values found for property "${propertyName}"`, 5000);
        return;
    }
    
    // Get all values for this property
    const propertyValues = [...appState.categories[propertyName]].filter(value => value.trim() !== '');
    
    if (propertyValues.length === 0) {
        showNotification(`No values found for property "${propertyName}"`, 5000);
        return;
    }
    
    // Find parent of the original item
    const parent = findParentItem(appState.rewardTree, originalItem.id);
    
    // Find index in parent's children or in root tree
    let insertIndex;
    if (parent) {
        insertIndex = parent.children.findIndex(item => item.id === originalItem.id) + 1;
    } else {
        insertIndex = appState.rewardTree.findIndex(item => item.id === originalItem.id) + 1;
    }
    
    // Track all created duplicates for undo
    const createdItems = [];
    
    // Create a duplicate for each property value
    for (const value of propertyValues) {
        // Skip if this value matches the original item's property value
        if (originalItem.properties[propertyName] === value) {
            continue;
        }
        
        // Deep clone the item
        const duplicate = JSON.parse(JSON.stringify(originalItem));
        
        // Update IDs in the duplicate and its children
        const updateIds = (item) => {
            item.id = appState.nextId++;
            if (item.children && item.children.length > 0) {
                item.children.forEach(child => updateIds(child));
            }
        };
        
        updateIds(duplicate);
        
        // Update the promoted property with the current value
        duplicate.properties[propertyName] = value;
        
        // Update the item's name to match the new property value
        duplicate.name = value;
        
        // Add the duplicate to the parent or root
        if (parent) {
            parent.children.splice(insertIndex, 0, duplicate);
            insertIndex++; // Increment for next insertion
        } else {
            appState.rewardTree.splice(insertIndex, 0, duplicate);
            insertIndex++; // Increment for next insertion
        }
        
        // Keep track of the created item
        createdItems.push(duplicate);
        
        // Propagate the property value to all children
        if (duplicate.children && duplicate.children.length > 0) {
            propagatePropertyToChildren(duplicate, propertyName, value);
        }
    }
    
    // Show notification with count of created duplicates
    showNotification(`Created ${createdItems.length} duplicates with different "${propertyName}" values`);
    
    // Update the UI
    renderRewardTree();
    appState.hasUnsavedChanges = true;
    updateUnsavedChangesIndicator();
}

// Show the context menu for tree items
function showTreeItemContextMenu(event, item) {
    // Hide any existing context menu
    hideContextMenu();
    
    // Create the context menu from template
    const contextMenu = elements.contextMenuTemplate.cloneNode(true);
    contextMenu.id = 'contextMenu';
    contextMenu.style.display = 'block';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    
    // Create copy and paste menu items
    const copyMenuItem = document.createElement('div');
    copyMenuItem.className = 'context-menu-item';
    copyMenuItem.setAttribute('data-action', 'copy');
    copyMenuItem.innerHTML = `<span class="menu-icon">📋</span> Copy Item`;
    
    const pasteMenuItem = document.createElement('div');
    pasteMenuItem.className = 'context-menu-item';
    pasteMenuItem.setAttribute('data-action', 'paste');
    pasteMenuItem.innerHTML = `<span class="menu-icon">📌</span> Paste Item`;
    
    // Create the duplicate with all property values menu item
    const duplicateAllValuesMenuItem = document.createElement('div');
    duplicateAllValuesMenuItem.className = 'context-menu-item';
    duplicateAllValuesMenuItem.setAttribute('data-action', 'duplicate-all-values');
    duplicateAllValuesMenuItem.innerHTML = `<span class="menu-icon">🔄</span> Duplicate For All Values`;
    
    // Insert copy and paste items at the top of the menu
    contextMenu.insertBefore(pasteMenuItem, contextMenu.firstChild);
    contextMenu.insertBefore(copyMenuItem, contextMenu.firstChild);
    
    // Add the duplicate all values item after the duplicate item
    const duplicateItem = contextMenu.querySelector('[data-action="duplicate"]');
    if (duplicateItem) {
        contextMenu.insertBefore(duplicateAllValuesMenuItem, duplicateItem.nextSibling);
    } else {
        // If the duplicate item isn't found for some reason, add it at the top
        contextMenu.insertBefore(duplicateAllValuesMenuItem, contextMenu.firstChild.nextSibling);
    }
    
    // Add event listeners for each action
    contextMenu.querySelectorAll('.context-menu-item').forEach(menuItem => {
        const action = menuItem.getAttribute('data-action');
        menuItem.addEventListener('click', () => {
            switch (action) {
                case 'copy':
                    copyItemToClipboard(item);
                    break;
                case 'paste':
                    pasteItemFromClipboard(item);
                    break;
                case 'add':
                    addChildItem(item);
                    break;
                case 'edit':
                    // Focus on the name span for inline editing
                    const itemElement = document.querySelector(`.tree-item-header[data-id="${item.id}"] .item-name`);
                    if (itemElement) {
                        itemElement.focus();
                        // Select all text
                        const range = document.createRange();
                        range.selectNodeContents(itemElement);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    break;
                case 'duplicate':
                    duplicateItem(item);
                    break;
                case 'duplicate-all-values':
                    duplicateForAllPropertyValues(item);
                    break;
                case 'delete':
                    deleteItem(item);
                    break;
                case 'expand-all':
                    expandItemAndChildren(item);
                    break;
                case 'collapse-all':
                    collapseItemAndChildren(item);
                    break;
            }
            hideContextMenu();
        });
    });
    
    document.body.appendChild(contextMenu);
    
    // Prevent the menu from going off-screen
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${window.innerWidth - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${window.innerHeight - rect.height}px`;
    }
    
    // Stop propagation to prevent immediate hiding
    event.stopPropagation();
}