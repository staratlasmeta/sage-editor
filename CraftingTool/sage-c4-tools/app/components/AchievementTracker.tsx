import React, { useState, useEffect } from 'react';
import { ACHIEVEMENTS } from '../constants/achievements';

interface ProgressUpdate {
    current: number;
    target: number;
    updated: boolean;
}

export function AchievementTracker() {
    const [progressUpdates, setProgressUpdates] = useState<Record<string, ProgressUpdate>>({});
    const [expanded, setExpanded] = useState(true);
    const [visible, setVisible] = useState(true);

    // Load preferences from localStorage
    useEffect(() => {
        const savedExpanded = localStorage.getItem('achievementTrackerExpanded');
        const savedVisible = localStorage.getItem('achievementTrackerVisible');

        if (savedExpanded !== null) {
            setExpanded(JSON.parse(savedExpanded));
        }
        if (savedVisible !== null) {
            setVisible(JSON.parse(savedVisible));
        }
    }, []);

    // Save preferences
    const toggleExpanded = () => {
        const newState = !expanded;
        setExpanded(newState);
        localStorage.setItem('achievementTrackerExpanded', JSON.stringify(newState));
    };

    const toggleVisible = () => {
        const newState = !visible;
        setVisible(newState);
        localStorage.setItem('achievementTrackerVisible', JSON.stringify(newState));
    };

    // Listen for achievement progress events
    useEffect(() => {
        const handleProgress = (event: CustomEvent) => {
            const { achievementId, current, target } = event.detail;
            setProgressUpdates(prev => ({
                ...prev,
                [achievementId]: { current, target, updated: true }
            }));

            // Remove the "updated" flag after animation
            setTimeout(() => {
                setProgressUpdates(prev => ({
                    ...prev,
                    [achievementId]: { ...prev[achievementId], updated: false }
                }));
            }, 1000);
        };

        window.addEventListener('achievement-progress' as any, handleProgress);

        return () => {
            window.removeEventListener('achievement-progress' as any, handleProgress);
        };
    }, []);

    const activeTrackers = Object.entries(progressUpdates).filter(
        ([_, data]) => data.current < data.target
    );

    if (!visible && activeTrackers.length > 0) {
        return (
            <button
                className="achievement-tracker-toggle"
                onClick={toggleVisible}
                title="Show Achievement Progress"
            >
                📊 {activeTrackers.length}
            </button>
        );
    }

    if (!visible || activeTrackers.length === 0) return null;

    return (
        <div className={`achievement-tracker ${expanded ? 'expanded' : 'collapsed'}`}>
            <div className="tracker-header">
                <button
                    className="tracker-toggle"
                    onClick={toggleExpanded}
                    title={expanded ? 'Collapse' : 'Expand'}
                >
                    {expanded ? '◀' : '▶'}
                </button>
                {!expanded && (
                    <span className="tracker-count">
                        📊 {activeTrackers.length}
                    </span>
                )}
                {expanded && (
                    <>
                        <span className="tracker-title">Progress</span>
                        <button
                            className="tracker-close"
                            onClick={toggleVisible}
                            title="Hide Progress Tracker"
                        >
                            ×
                        </button>
                    </>
                )}
            </div>

            {expanded && (
                <div className="tracker-items">
                    {activeTrackers.map(([id, data]) => {
                        const achievement = ACHIEVEMENTS[id];
                        const progress = Math.min((data.current / data.target) * 100, 100);

                        return (
                            <div
                                key={id}
                                className={`tracker-item ${data.updated ? 'updated' : ''}`}
                            >
                                <div className="tracker-info">
                                    <span className="tracker-icon">{achievement.icon}</span>
                                    <span className="tracker-name">{achievement.name}</span>
                                </div>
                                <div className="tracker-progress">
                                    <div className="progress-bar-mini">
                                        <div
                                            className="progress-fill-mini"
                                            style={{ width: `${progress}%` }}
                                        />
                                        <span className="progress-text-mini">
                                            {data.current.toLocaleString()}/{data.target.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
