import React from 'react';

const TabNavigation = ({ activeTab, onTabChange, tabs }) => {
    return (
        <div className="tab-navigation">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default TabNavigation; 