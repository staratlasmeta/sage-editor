import React from 'react';
import SaveLoadManager from './SaveLoadManager';
import './Navigation.css';

function Navigation({ activeTool, onToolChange }) {
    const tools = [
        { id: 'claim-stakes', name: 'Claim Stakes', icon: '🏭' },
        { id: 'crafting-hab', name: 'Crafting Hab', icon: '🔧' },
        { id: 'crafting-recipes', name: 'Recipes', icon: '📋' }
    ];

    return (
        <nav className="sage-navigation">
            <div className="nav-brand">
                <span className="brand-text">SAGE C4 TOOLS</span>
            </div>

            <div className="nav-tools">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        className={`nav-tool ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => onToolChange(tool.id)}
                    >
                        <span className="tool-icon">{tool.icon}</span>
                        <span className="tool-name">{tool.name}</span>
                    </button>
                ))}
            </div>

            <div className="nav-actions">
                <SaveLoadManager />
            </div>
        </nav>
    );
}

export default Navigation;