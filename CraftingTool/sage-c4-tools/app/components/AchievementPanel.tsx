import React, { useState } from 'react';
import { useSharedState } from '../contexts/SharedStateContext';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../constants/achievements';

export function AchievementPanel() {
    const { state } = useSharedState();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showPanel, setShowPanel] = useState(false);

    // Calculate achievement progress
    const unlockedCount = Object.keys(state.achievements || {}).filter(key => state.achievements[key]).length;
    const totalCount = Object.keys(ACHIEVEMENTS).length;
    const percentage = Math.round((unlockedCount / totalCount) * 100);

    // Filter achievements by category
    const filteredAchievements = Object.values(ACHIEVEMENTS).filter(achievement =>
        !selectedCategory || achievement.category === selectedCategory
    );

    return (
        <>
            {/* Achievement button */}
            <button
                className="achievement-button"
                onClick={() => setShowPanel(!showPanel)}
                title="View Achievements"
            >
                <span className="achievement-icon">🏆</span>
                <span className="achievement-progress" title={`${percentage}% Complete`}>{unlockedCount}/{totalCount}</span>
            </button>

            {/* Achievement panel */}
            {showPanel && (
                <div className="achievement-panel">
                    <div className="panel-header">
                        <h3>Achievements</h3>
                        <button
                            className="close-button"
                            onClick={() => setShowPanel(false)}
                            title="Close"
                        >
                            ×
                        </button>
                    </div>

                    <div className="achievement-progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${percentage}%` }}
                        />
                        <span className="progress-text">{percentage}% Complete</span>
                    </div>

                    <div className="category-filters">
                        <button
                            className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(null)}
                        >
                            All
                        </button>
                        {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, category]) => (
                            <button
                                key={key}
                                className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(key)}
                                style={{ '--category-color': category.color } as React.CSSProperties}
                            >
                                <span className="category-icon">{category.icon}</span>
                                <span>{category.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="achievement-list">
                        {filteredAchievements.map(achievement => {
                            const isUnlocked = state.achievements?.[achievement.id];
                            const progress = state.achievementProgress?.[achievement.id];
                            return (
                                <div
                                    key={achievement.id}
                                    className={`achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`}
                                >
                                    <div className="achievement-icon">
                                        {achievement.icon}
                                    </div>
                                    <div className="achievement-details">
                                        <h4>{achievement.name}</h4>
                                        <p>{achievement.description}</p>
                                        {isUnlocked && (
                                            <span className="unlock-date">
                                                Unlocked ✓
                                            </span>
                                        )}
                                        {!isUnlocked && progress && (
                                            <div className="achievement-progress-inline">
                                                <div className="mini-progress-bar">
                                                    <div
                                                        className="mini-progress-fill"
                                                        style={{
                                                            width: `${Math.min((progress.current / progress.target) * 100, 100)}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className="progress-numbers">
                                                    {progress.current.toLocaleString()}/{progress.target.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
} 