import React, { useState, useEffect, useRef } from 'react';
import { ACHIEVEMENTS } from '../constants/achievements';

interface AchievementNotificationProps {
    achievementId: string;
    onClose: () => void;
}

export function AchievementNotification({ achievementId, onClose }: AchievementNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const achievement = ACHIEVEMENTS[achievementId];

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);

        // Auto-close after 5 seconds
        const closeTimer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 500); // Wait for exit animation
        }, 5000);

        // Achievement sound removed to prevent spam and browser errors
        // Sound was causing "too many WebMediaPlayers" error when achievements fired repeatedly

        return () => {
            clearTimeout(timer);
            clearTimeout(closeTimer);
        };
    }, [onClose]);

    if (!achievement) return null;

    return (
        <div className={`achievement-notification ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}>
            <div className="achievement-burst">
                {/* Particle effects */}
                {[...Array(12)].map((_, i) => (
                    <div key={i} className={`particle particle-${i + 1}`} />
                ))}
            </div>

            <div className="achievement-content">
                <div className="achievement-header">
                    <span className="achievement-label">ACHIEVEMENT UNLOCKED!</span>
                </div>

                <div className="achievement-body">
                    <div className="achievement-icon-large">
                        {achievement.icon}
                    </div>
                    <div className="achievement-info">
                        <h2>{achievement.name}</h2>
                        <p>{achievement.description}</p>
                    </div>
                </div>

                <div className="achievement-footer">
                    <div className="xp-gained">
                        +100 XP
                    </div>
                    <div className="category-badge">
                        {achievement.category}
                    </div>
                </div>
            </div>

            <button
                className="close-notification"
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(onClose, 500);
                }}
            >
                ×
            </button>
        </div>
    );
}

interface AchievementProgressProps {
    achievementId: string;
    current: number;
    target: number;
    justUpdated?: boolean;
}

export function AchievementProgress({ achievementId, current, target, justUpdated }: AchievementProgressProps) {
    const [showPulse, setShowPulse] = useState(false);
    const achievement = ACHIEVEMENTS[achievementId];
    const progress = Math.min((current / target) * 100, 100);
    const isComplete = current >= target;

    useEffect(() => {
        if (justUpdated) {
            setShowPulse(true);
            const timer = setTimeout(() => setShowPulse(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [current, justUpdated]);

    if (!achievement) return null;

    return (
        <div className={`achievement-progress-tracker ${showPulse ? 'pulse' : ''} ${isComplete ? 'complete' : ''}`}>
            <div className="progress-header">
                <span className="progress-icon">{achievement.icon}</span>
                <span className="progress-name">{achievement.name}</span>
            </div>

            <div className="progress-bar-container">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    >
                        {progress >= 50 && (
                            <span className="progress-text">
                                {current}/{target}
                            </span>
                        )}
                    </div>
                </div>
                {progress < 50 && (
                    <span className="progress-text-outside">
                        {current}/{target}
                    </span>
                )}
            </div>

            {isComplete && (
                <div className="completion-badge">
                    ✓ Ready to claim!
                </div>
            )}
        </div>
    );
}

interface AchievementManagerProps {
    children: React.ReactNode;
}

export function AchievementManager({ children }: AchievementManagerProps) {
    const [notifications, setNotifications] = useState<string[]>([]);
    const [processedAchievements] = useState(() => new Set<string>());
    const activeNotificationsRef = useRef(new Set<string>());

    // Listen for achievement unlock events
    useEffect(() => {
        const handleAchievement = (event: CustomEvent) => {
            const { achievementId } = event.detail;

            // Debug logging
            console.log('[AchievementManager] Event received:', achievementId);
            console.log('[AchievementManager] Already processed:', processedAchievements.has(achievementId));
            console.log('[AchievementManager] Currently active:', activeNotificationsRef.current.has(achievementId));

            // Prevent duplicate notifications for the same achievement
            if (processedAchievements.has(achievementId) || activeNotificationsRef.current.has(achievementId)) {
                console.log('[AchievementManager] Duplicate blocked:', achievementId);
                return;
            }

            processedAchievements.add(achievementId);
            activeNotificationsRef.current.add(achievementId);
            setNotifications(prev => [...prev, achievementId]);
            console.log('[AchievementManager] Achievement added to notifications:', achievementId);
        };

        window.addEventListener('achievement-unlocked' as any, handleAchievement);

        return () => {
            window.removeEventListener('achievement-unlocked' as any, handleAchievement);
        };
    }, [processedAchievements]);

    return (
        <>
            {children}

            {/* Notification Stack */}
            <div className="achievement-notification-stack">
                {notifications.map((id, index) => (
                    <div
                        key={`${id}-${index}`}
                        style={{
                            transform: `translateY(${index * 120}px)`,
                            zIndex: 1000 - index
                        }}
                    >
                        <AchievementNotification
                            achievementId={id}
                            onClose={() => {
                                activeNotificationsRef.current.delete(id);
                                setNotifications(prev => prev.filter((_, i) => i !== index));
                            }}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}
