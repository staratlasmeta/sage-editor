import React, { useEffect, useRef } from 'react';
import '../styles/Notifications.css';

/**
 * NotificationSystem displays notifications and handles user interactions with them
 */
const NotificationSystem = ({ notifications, onDismiss, onAction }) => {
    const containerRef = useRef(null);
    // Use a ref to track notifications that have already been scheduled for auto-dismiss
    const autoDismissTracker = useRef(new Set());
    // Create a ref to store timeout IDs
    const timeoutRefs = useRef({});

    // Log when notifications change
    useEffect(() => {
        if (notifications.length > 0) {
            notifications.forEach(notification => {
                console.log(`> ${notification.id}: ${notification.title}`);
            });
        }
    }, [notifications]);

    // Set up auto-dismiss timers for non-persistent notifications
    useEffect(() => {
        // For each notification that isn't already tracked
        notifications.forEach(notification => {
            // Skip persistent notifications
            if (notification.persistent) return;

            // Skip if we've already set up auto-dismiss for this notification
            if (autoDismissTracker.current.has(notification.id)) return;

            // Add to tracker so we don't set multiple timers
            autoDismissTracker.current.add(notification.id);

            // Set timeout to auto-dismiss after 5 seconds
            const timeout = setTimeout(() => {
                onDismiss(notification.id);
                autoDismissTracker.current.delete(notification.id);
            }, 5000);

            // Store the timeout ID to clean it up if the component unmounts
            return () => {
                clearTimeout(timeout);
                autoDismissTracker.current.delete(notification.id);
            };
        });
    }, [notifications, onDismiss]);

    // Ensure notifications are visible if we have any
    useEffect(() => {
        if (notifications.length > 0 && containerRef.current) {
            // Make sure notification container is visible
            containerRef.current.style.visibility = 'visible';
            containerRef.current.style.opacity = '1';
            containerRef.current.style.display = 'flex';

            // Add shown class to notifications after a small delay
            setTimeout(() => {
                const notificationElements = containerRef.current.querySelectorAll('.notification:not(.notification-shown)');
                if (notificationElements.length > 0) {
                    notificationElements.forEach(el => {
                        el.classList.add('notification-shown');
                    });
                }
            }, 50);
        }
    }, [notifications]);

    // Set up auto-dismiss feature
    useEffect(() => {
        // Clear previous timeouts to avoid memory leaks
        return () => {
            Object.values(timeoutRefs.current).forEach(timeoutId => clearTimeout(timeoutId));
        };
    }, []);

    // When notifications change, set up auto-dismiss timeouts for new notifications
    useEffect(() => {
        // For each notification, create a timeout to auto-dismiss after 3 seconds
        notifications.forEach(notification => {
            // Only set timeout if we haven't already created one for this notification
            if (!timeoutRefs.current[notification.id]) {
                timeoutRefs.current[notification.id] = setTimeout(() => {
                    onDismiss(notification.id);
                    // Remove the reference after it's been dismissed
                    delete timeoutRefs.current[notification.id];
                }, 3000); // 3 seconds
            }
        });
    }, [notifications, onDismiss]);

    if (notifications.length === 0) {
        return <div ref={containerRef} className="notification-container" style={{ display: 'none' }}></div>;
    }

    return (
        <div ref={containerRef} className="notification-container">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    data-id={notification.id}
                    className={`notification ${notification.type || 'info'} ${notification.persistent ? 'notification-persistent' : ''} ${notification.className || ''}`}
                >
                    <div className="notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                    </div>
                    <div className="notification-actions">
                        {notification.actions?.map((action) => (
                            <button
                                key={action.id}
                                className={`notification-action ${action.type || 'primary'}`}
                                onClick={() => onAction(notification.id, action.id)}
                            >
                                {action.label}
                            </button>
                        ))}
                        <button
                            className="notification-dismiss"
                            onClick={() => {
                                // Clear the timeout when manually dismissed
                                if (timeoutRefs.current[notification.id]) {
                                    clearTimeout(timeoutRefs.current[notification.id]);
                                    delete timeoutRefs.current[notification.id];
                                }
                                onDismiss(notification.id);
                            }}
                            title="Dismiss"
                            aria-label="Dismiss notification"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationSystem; 