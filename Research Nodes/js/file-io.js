// === MODULE: File I/O ===
// Handles JSON file loading and saving

/**
 * Export current state to JSON
 */
function exportJSON(editor) {
    const data = {
        nodes: Array.from(editor.nodes.values()),
        connections: Array.from(editor.connections.values()),
        milestones: editor.milestones,
        tags: editor.tags,
        collapsedNodes: Array.from(editor.collapsedNodes)  // Save collapsed state
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research_nodes.json';
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Load JSON file
 */
async function loadJSON(editor, event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    editor.nodes.clear();
    editor.connections.clear();
    editor.collapsedNodes.clear();  // Clear collapsed state
    
    // Load milestones and tags
    if (data.milestones) {
        editor.milestones = data.milestones;
    }
    if (data.tags) {
        editor.tags = data.tags;
    }
    
    // Load nodes
    data.nodes.forEach(nodeData => {
        window.NodeManager.createNode(editor, nodeData);
    });
    
    // Load connections
    data.connections.forEach(conn => {
        // Add default type if not present
        if (!conn.type) {
            conn.type = 'linear';
        }
        
        editor.connections.set(`${conn.from}_${conn.to}`, conn);
        
        // Establish parent-child relationship
        const toNode = editor.nodes.get(conn.to);
        if (toNode) {
            toNode.parent = conn.from;
            // Update color to inherit from parent
            toNode.color = window.NodeManager.getNodeColor(toNode, editor);
        }
    });
    
    // Restore collapsed nodes state
    if (data.collapsedNodes && Array.isArray(data.collapsedNodes)) {
        data.collapsedNodes.forEach(nodeId => {
            if (editor.nodes.has(nodeId)) {
                editor.collapsedNodes.add(nodeId);
            }
        });
    }
    
    // Use CanvasManager if available
    if (window.CanvasManager && window.CanvasManager.fitToScreen) {
        window.CanvasManager.fitToScreen(editor);
    }
    
    // Update stats from NodeManager
    if (window.NodeManager && window.NodeManager.updateStats) {
        window.NodeManager.updateStats(editor);
    }
}

/**
 * Convert nodes to markdown format
 */
function convertToMarkdown(editor) {
    const nodes = Array.from(editor.nodes.values());
    const connections = Array.from(editor.connections.values());
    
    let markdown = `# Research Nodes Structure\n\n`;
    markdown += `**Total Nodes:** ${nodes.length}\n`;
    markdown += `**Total Connections:** ${connections.length}\n\n`;
    
    // Helper function to find children of a node
    const getChildren = (nodeId) => {
        return connections
            .filter(conn => conn.from === nodeId)
            .map(conn => nodes.find(n => n.id === conn.to))
            .filter(n => n);
    };
    
    // Helper function to find parent of a node
    const getParent = (nodeId) => {
        const parentConn = connections.find(conn => conn.to === nodeId);
        if (parentConn) {
            return nodes.find(n => n.id === parentConn.from);
        }
        // Also check node's parent property as fallback
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.parent) {
            return nodes.find(n => n.id === node.parent);
        }
        return null;
    };
    
    // Find root nodes (nodes with no parents)
    const rootNodes = nodes.filter(node => !getParent(node.id));
    
    // Recursive function to render node tree
    const renderNodeTree = (node, level = 0) => {
        const indent = '  '.repeat(level);
        
        // For the actual hierarchy structure:
        // Level 0 (root): No indentation, use ## for headers
        // Level 1+: Use bullets with increasing indentation
        let line = '';
        
        if (level === 0) {
            // Root nodes like Council Rank
            line = `${indent}## **${node.name}**`;
        } else {
            // Child nodes with proper bullets
            line = `${indent}- **${node.name}**`;
        }
        
        // Add node properties inline with smaller text
        const props = [];
        if (node.scalability) props.push(`*${node.scalability}*`);
        if (node.milestone) props.push(`Milestone: ${node.milestone}`);
        if (node.tag) props.push(`[${node.tag}]`);
        
        if (props.length > 0) {
            line += ` - ${props.join(' | ')}`;
        }
        
        let result = line + '\n';
        
        // Add description if exists
        if (node.description) {
            // Handle multi-line descriptions by preserving line breaks
            const descLines = node.description.split('\n');
            descLines.forEach((line, idx) => {
                if (line.trim()) {
                    result += `${indent}  > ${line.trim()}\n`;
                }
            });
        }
        
        // Render children with increased indentation
        const children = getChildren(node.id);
        if (children.length > 0) {
            children.forEach(child => {
                result += renderNodeTree(child, level + 1);
            });
        }
        
        return result;
    };
    
    // Render by hierarchy
    markdown += `## Node Hierarchy\n\n`;
    rootNodes.forEach(root => {
        markdown += renderNodeTree(root);
        markdown += '\n';
    });
    
    return markdown;
}

/**
 * Export to markdown and show modal
 */
function exportMarkdown(editor) {
    const markdown = convertToMarkdown(editor);
    
    // Create HTML version with colors for display
    const htmlForDisplay = createDisplayHTML(editor, markdown);
    
    // Show modal
    const modal = document.getElementById('markdownModal');
    const preview = document.getElementById('markdownPreview');
    const textArea = document.getElementById('markdownText');
    
    preview.innerHTML = htmlForDisplay;
    textArea.value = markdown;  // Clean markdown for clipboard
    
    modal.style.display = 'flex';
}

/**
 * Create HTML for display with node colors
 */
function createDisplayHTML(editor, markdown) {
    // First convert markdown to HTML
    let html = markdownToHTML(markdown);
    
    // Then enhance with colors
    const nodes = Array.from(editor.nodes.values());
    
    // Replace node names with colored versions
    nodes.forEach(node => {
        const nodeColor = node.customColor || node.color || '#666666';
        const escapedName = node.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Replace in strong tags
        const strongRegex = new RegExp(`<strong>${escapedName}</strong>`, 'g');
        html = html.replace(strongRegex, `<strong data-node-color="${nodeColor}">${node.name}</strong>`);
    });
    
    // Add styling for node details
    html = html.replace(/ - (.*?)(<\/li>|<br>|$)/g, (match, details, ending) => {
        // Check if this is a properties line (contains italics or brackets)
        if (details.includes('<em>') || details.includes('[')) {
            return ` <span class="node-details">- ${details}</span>${ending}`;
        }
        return match;
    });
    
    return html;
}

/**
 * Simple markdown to HTML converter
 */
function markdownToHTML(markdown) {
    // First, split by lines to handle structure better
    const lines = markdown.split('\n');
    let html = '';
    let listStack = []; // Track open list tags and their depths
    let inBlockquote = false;
    let blockquoteContent = '';
    let lastDepth = -1;
    
    lines.forEach((line, index) => {
        // Count leading spaces for indentation
        const indent = line.search(/\S|$/);
        const trimmedLine = line.trim();
        
        // Handle blockquotes
        if (trimmedLine.startsWith('> ')) {
            if (!inBlockquote) {
                inBlockquote = true;
                blockquoteContent = processInlineMarkdown(trimmedLine.substring(2));
            } else {
                blockquoteContent += '<br>' + processInlineMarkdown(trimmedLine.substring(2));
            }
            return; // Continue to next line
        } else if (inBlockquote) {
            // End of blockquote
            html += `<blockquote>${blockquoteContent}</blockquote>`;
            inBlockquote = false;
            blockquoteContent = '';
        }
        
        // Handle headers
        if (trimmedLine.startsWith('# ')) {
            // Close all open lists before header
            while (listStack.length > 0) {
                html += '</ul>';
                listStack.pop();
            }
            lastDepth = -1;
            html += `<h1>${processInlineMarkdown(trimmedLine.substring(2))}</h1>`;
        } else if (trimmedLine.startsWith('## ')) {
            // Close all open lists before header
            while (listStack.length > 0) {
                html += '</ul>';
                listStack.pop();
            }
            lastDepth = -1;
            html += `<h2>${processInlineMarkdown(trimmedLine.substring(3))}</h2>`;
        } else if (trimmedLine.startsWith('### ')) {
            html += `<h3>${processInlineMarkdown(trimmedLine.substring(4))}</h3>`;
        } else if (trimmedLine.startsWith('- ')) {
            // Handle list items with proper nesting
            const currentDepth = Math.floor(indent / 2);
            
            // Close lists until we're at the right depth
            while (listStack.length > 0 && listStack[listStack.length - 1] > currentDepth) {
                html += '</ul>';
                listStack.pop();
            }
            
            // Open new lists if needed
            if (listStack.length === 0 || listStack[listStack.length - 1] < currentDepth) {
                // We need to open new list(s)
                const startDepth = listStack.length > 0 ? listStack[listStack.length - 1] + 1 : 0;
                for (let d = startDepth; d <= currentDepth; d++) {
                    html += '<ul>';
                    listStack.push(d);
                }
            }
            
            html += `<li>${processInlineMarkdown(trimmedLine.substring(2))}`;
            
            // Check if the next line is a child (more indented)
            if (index + 1 < lines.length) {
                const nextLine = lines[index + 1];
                const nextIndent = nextLine.search(/\S|$/);
                const nextTrimmed = nextLine.trim();
                
                // Don't close the li tag if the next line is more indented or is a blockquote
                if ((nextTrimmed.startsWith('-') && nextIndent > indent) || nextTrimmed.startsWith('>')) {
                    // Keep li open for nested content
                } else {
                    html += '</li>';
                }
            } else {
                html += '</li>';
            }
            
            lastDepth = currentDepth;
        } else if (trimmedLine && !inBlockquote) {
            // Regular paragraph - close all lists first
            while (listStack.length > 0) {
                html += '</ul>';
                listStack.pop();
            }
            lastDepth = -1;
            html += `<p>${processInlineMarkdown(trimmedLine)}</p>`;
        }
    });
    
    // Handle any remaining blockquote
    if (inBlockquote) {
        html += `<blockquote>${blockquoteContent}</blockquote>`;
    }
    
    // Close any remaining lists
    while (listStack.length > 0) {
        html += '</ul>';
        listStack.pop();
    }
    
    return html;
}

/**
 * Process inline markdown (bold, italic, code, etc.)
 */
function processInlineMarkdown(text) {
    return text
        // Bold (must come before italic to handle **text**)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Tags in brackets
        .replace(/\[(.+?)\]/g, '<span class="tag">$1</span>');
}

// === MODULE EXPORT ===
window.FileIO = {
    exportJSON,
    loadJSON,
    exportMarkdown
};

// Backward compatibility
window.exportJSON = exportJSON;
window.loadJSON = loadJSON;
window.exportMarkdown = exportMarkdown;

console.log('File I/O module loaded successfully'); 