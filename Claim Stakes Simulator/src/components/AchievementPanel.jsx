/**
 * AchievementPanel.jsx
 * Component for displaying achievement progress and completion
 */

import React, { useState, useEffect } from 'react';
import AchievementService from '../services/AchievementService';
import '../styles/AchievementPanel.css';

const AchievementPanel = ({ isOpen, onClose, gameState }) => {
    const [achievements, setAchievements] = useState({});
    const [completionStats, setCompletionStats] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('resourceMastery');

    useEffect(() => {
        if (isOpen) {
            updateAchievements();
        }
    }, [isOpen, gameState]);

    const updateAchievements = () => {
        const allAchievements = AchievementService.getAllAchievements();
        const stats = AchievementService.getCompletionStats();
        setAchievements(allAchievements);
        setCompletionStats(stats);
    };

    const categoryNames = {
        resourceMastery: 'Resource Mastery',
        industrialDevelopment: 'Industrial Development',
        territorialExpansion: 'Territorial Expansion'
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'Bronze': return '#CD7F32';
            case 'Silver': return '#C0C0C0';
            case 'Gold': return '#FFD700';
            case 'Platinum': return '#E5E4E2';
            case 'Diamond': return '#B9F2FF';
            default: return '#888888';
        }
    };

    const formatProgress = (progress) => {
        return Math.round(progress * 100) / 100;
    };

    if (!isOpen) return null;

    return (
        <div className="achievement-panel-overlay">
            <div className="achievement-panel">
                <div className="achievement-panel-header">
                    <h2>🏆 Achievements</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="achievement-panel-content">
                    {/* Category Navigation */}
                    <div className="achievement-categories">
                        {Object.entries(categoryNames).map(([categoryKey, categoryName]) => (
                            <button
                                key={categoryKey}
                                className={`category-button ${selectedCategory === categoryKey ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(categoryKey)}
                            >
                                <div className="category-name">{categoryName}</div>
                                <div className="category-progress">
                                    {completionStats[categoryKey]?.completed || 0} / {completionStats[categoryKey]?.total || 0}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Achievement List */}
                    <div className="achievement-list">
                        {achievements[selectedCategory] && Object.entries(achievements[selectedCategory]).map(([achievementKey, achievement]) => (
                            <div
                                key={achievementKey}
                                className={`achievement-card ${achievement.progress.completed ? 'completed' : ''}`}
                            >
                                <div className="achievement-icon">
                                    {achievement.icon}
                                </div>

                                <div className="achievement-info">
                                    <div className="achievement-header">
                                        <h3 className="achievement-name">{achievement.name}</h3>
                                        <div
                                            className="achievement-tier"
                                            style={{ color: getTierColor(achievement.tier) }}
                                        >
                                            {achievement.tier}
                                        </div>
                                    </div>

                                    <p className="achievement-description">{achievement.description}</p>

                                    <div className="achievement-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width: `${Math.min(100, achievement.progress.progress)}%`,
                                                    backgroundColor: achievement.progress.completed ? '#38B000' : '#3A86FF'
                                                }}
                                            />
                                        </div>
                                        <div className="progress-text">
                                            {achievement.progress.completed ? 'Completed' : `${formatProgress(achievement.progress.progress)}%`}
                                        </div>
                                    </div>

                                    {achievement.progress.completed && achievement.progress.completionDate && (
                                        <div className="completion-date">
                                            Completed: {new Date(achievement.progress.completionDate).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AchievementPanel; 