import React, { useEffect, useState } from 'react';
import './Notification.css';

/**
 * Notification component for displaying game notifications
 */
const Notification = ({ notifications, onDismiss }) => {
    return (
        <div className="notification-container">
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
};

/**
 * Individual notification item with auto-dismiss functionality
 */
const NotificationItem = ({ notification, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    // Auto-dismiss non-critical notifications
    useEffect(() => {
        let autoDismissTimer;
        let exitAnimationTimer;

        if (!notification.isPersistent) {
            // Start the auto-dismiss timer
            autoDismissTimer = setTimeout(() => {
                setIsExiting(true);

                // Handle the exit animation before completely removing
                exitAnimationTimer = setTimeout(() => {
                    setIsVisible(false);
                    if (onDismiss) {
                        onDismiss(notification.id);
                    }
                }, 300); // Match with CSS transition time
            }, 5000); // 5 seconds before auto-dismiss
        }

        return () => {
            // Clean up timers
            if (autoDismissTimer) clearTimeout(autoDismissTimer);
            if (exitAnimationTimer) clearTimeout(exitAnimationTimer);
        };
    }, [notification, onDismiss]);

    // Handle manual dismiss
    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onDismiss) {
                onDismiss(notification.id);
            }
        }, 300); // Match with CSS transition time
    };

    if (!isVisible) return null;

    return (
        <div className={`notification ${notification.type} ${isExiting ? 'exiting' : ''}`}>
            <div className="notification-content">
                {notification.title && <div className="notification-title">{notification.title}</div>}
                <div className="notification-message">{notification.message}</div>
            </div>
            <button className="notification-dismiss" onClick={handleDismiss}>
                ×
            </button>
        </div>
    );
};

export default Notification; 