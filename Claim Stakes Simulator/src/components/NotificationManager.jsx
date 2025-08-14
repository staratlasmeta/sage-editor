import React, { useState, useEffect, useCallback, useRef } from 'react';
import NotificationSystem from './NotificationSystem';
import '../styles/Notifications.css';

/**
 * NotificationManager listens for notification events and displays them using NotificationSystem
 * It can be added to any parent component in the app
 */
const NotificationManager = ({ initialNotifications = [] }) => {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [debugVisible, setDebugVisible] = useState(false); // Default to false now
    const notificationIdsRef = useRef(new Set()); // Keep track of notification IDs to prevent duplicates
    const blockDismissTimeoutRef = useRef(null); // Reference to store timeout for blocking auto-dismissal
    const activeNotificationsRef = useRef(new Set()); // Track which notifications are currently active/visible

    // Force a render every second to ensure notifications stay visible
    const [forceRender, setForceRender] = useState(0);
    const lastRenderTimeRef = useRef(Date.now());

    // Keep the notification container visible by incrementing forceRender regularly
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            // Only update state if at least 1 second has passed since the last update
            // and there are active notifications
            if (now - lastRenderTimeRef.current >= 1000 && activeNotificationsRef.current.size > 0) {
                lastRenderTimeRef.current = now;
                setForceRender(prev => prev + 1);

                // Only block auto-dismissal if there are active notifications
                blockAutoDismissal();
            }
        }, 2000); // Reduce frequency to every 2 seconds

        return () => clearInterval(interval);
    }, []); // Empty dependency array - this effect should only run once

    // Enhanced logging helper
    const logNotification = (action, notification) => {
        if (!notification) return;

        console.log(`📣 NotificationManager [${action}]:`, {
            id: notification.id,
            title: notification.title,
            message: notification.message?.substring(0, 50) + (notification.message?.length > 50 ? '...' : ''),
            type: notification.type,
            autoClose: notification.autoClose || 'none (persistent)',
            timestamp: notification.timestamp ? new Date(notification.timestamp).toLocaleTimeString() : 'none'
        });
    };

    // Handle notification dismissal
    const handleDismissNotification = useCallback((notificationId) => {

        // Get the notification before removing it
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            logNotification('DISMISS', notification);
        }

        // Apply a slide-out animation before removing
        const elements = document.querySelectorAll(`.notification[data-id="${notificationId}"]`);
        if (elements.length > 0) {
            elements.forEach(el => {
                el.style.animation = 'notificationSlideOut 0.5s forwards';
                el.classList.add('notification-exiting'); // Mark as exiting for CSS
            });

            // Actually remove after animation completes
            setTimeout(() => {
                setNotifications(prev => {
                    const updatedNotifications = prev.filter(n => n.id !== notificationId);
                    console.log(`🔔 Removed notification ${notificationId}, ${updatedNotifications.length} remaining`);

                    // Also remove from our tracking Sets
                    notificationIdsRef.current.delete(notificationId);
                    activeNotificationsRef.current.delete(notificationId);
                    return updatedNotifications;
                });
            }, 500);
        } else {
            // No element found, just remove it
            setNotifications(prev => {
                const updatedNotifications = prev.filter(n => n.id !== notificationId);
                // Also remove from our tracking Sets
                notificationIdsRef.current.delete(notificationId);
                activeNotificationsRef.current.delete(notificationId);
                return updatedNotifications;
            });
        }
    }, [notifications]);

    // Handle notification actions
    const handleNotificationAction = useCallback((notificationId, actionId) => {

        // Find the notification
        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Handle different action types
        if (actionId === 'view' && notification.buildingId) {
            // Dispatch an event to view the building
            window.dispatchEvent(new CustomEvent('notificationAction', {
                detail: {
                    action: 'viewBuilding',
                    buildingId: notification.buildingId,
                    source: 'notification',
                    notificationId: notificationId
                }
            }));

            // Also dispatch the legacy viewBuilding event for backward compatibility
            window.dispatchEvent(new CustomEvent('viewBuilding', {
                detail: {
                    buildingId: notification.buildingId,
                    source: 'notification',
                    notificationId: notificationId
                }
            }));

            console.log(`🔍 Dispatched viewBuilding action for ${notification.buildingId}`);
        }

        // Auto-dismiss the notification after action is taken
        handleDismissNotification(notificationId);
    }, [notifications, handleDismissNotification]);

    // Block auto-dismissal of all notifications - ensure they stay visible
    const blockAutoDismissal = useCallback(() => {
        // Clear any existing timeout
        if (blockDismissTimeoutRef.current) {
            clearTimeout(blockDismissTimeoutRef.current);
        }

        // Find and modify any notification elements to prevent auto-dismissal
        const notificationElements = document.querySelectorAll('.notification:not(.notification-exiting)');
        notificationElements.forEach(el => {
            // Skip notifications that are animating out
            if (el.style.animation?.includes('notificationSlideOut')) return;

            // Ensure element and its container are fully visible
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.display = 'flex';
            el.style.transform = 'translateX(0)';

            // Fix any animation that might be causing flickering
            // Only apply entry animation if it doesn't have the shown class
            if (!el.classList.contains('notification-shown')) {
                el.classList.add('notification-shown');
            } else {
                // Otherwise, clear animation to prevent repeating
                el.style.animation = 'none';
            }

            // Add the notification ID to our active tracking
            const id = el.getAttribute('data-id');
            if (id) activeNotificationsRef.current.add(id);
        });

        // Also make sure the container is visible
        const container = document.querySelector('.notification-container');
        if (container) {
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.display = 'flex';
        }

        // Schedule the next block with decreasing frequency
        const activeCount = activeNotificationsRef.current.size;
        const interval = activeCount > 0 ? 1000 : 5000; // More frequent if we have active notifications

        blockDismissTimeoutRef.current = setTimeout(blockAutoDismissal, interval);
    }, []);

    // Initialize blocking auto-dismissal
    useEffect(() => {
        blockAutoDismissal();

        return () => {
            if (blockDismissTimeoutRef.current) {
                clearTimeout(blockDismissTimeoutRef.current);
            }
        };
    }, [blockAutoDismissal]);

    // Listen for notification events
    useEffect(() => {
        const handleShowNotification = (event) => {
            const notificationData = event.detail;
            if (!notificationData || !notificationData.id) {
                console.warn('⚠️ Invalid notification data received', event);
                return;
            }
            logNotification('RECEIVED', notificationData);

            // Check if this notification ID already exists in our tracking Set
            if (notificationIdsRef.current.has(notificationData.id)) {
                return;
            }

            // Add to the tracking Set
            notificationIdsRef.current.add(notificationData.id);
            activeNotificationsRef.current.add(notificationData.id);

            // Add notification to state - ensure it's persistent
            const persistentNotification = {
                ...notificationData,
                autoClose: undefined, // Remove auto-close value to make it stay until dismissed
                persistent: true,     // Add explicit flag for persistence
                addedAt: Date.now()   // Track when it was added
            };

            // Log the full notification data
            logNotification('ADDING', persistentNotification);

            setNotifications(prev => {
                // Auto-cap old notifications if there are too many
                const maxNotifications = 10; // Increased from 5 to 10
                let newNotifications = [...prev, persistentNotification];

                if (newNotifications.length > maxNotifications) {
                    // Remove oldest notifications
                    const notificationsToKeep = newNotifications.sort((a, b) =>
                        (b.timestamp || b.addedAt || 0) - (a.timestamp || a.addedAt || 0)
                    ).slice(0, maxNotifications);

                    // Update our tracking Set to match kept notifications
                    notificationIdsRef.current = new Set(notificationsToKeep.map(n => n.id));
                    activeNotificationsRef.current = new Set(notificationsToKeep.map(n => n.id));

                    return notificationsToKeep;
                }

                return newNotifications;
            });

            // Apply special styles to make notification visible after render
            setTimeout(() => {
                const notificationElements = document.querySelectorAll(`.notification[data-id="${notificationData.id}"]`);
                if (notificationElements.length > 0) {
                    notificationElements.forEach(el => {
                        // Apply slide-in animation once
                        el.classList.add('notification-shown');

                        // Fix animation to not repeat/reverse
                        el.style.animation = 'notificationSlideIn 0.5s forwards';

                        // Force the notification to be fully visible
                        setTimeout(() => {
                            el.style.transform = 'translateX(0)';
                            el.style.opacity = '1';
                        }, 500); // After animation completes
                    });
                }
            }, 50); // Small delay to ensure element exists in DOM

            // Force blockAutoDismissal to run to ensure notifications stay visible
            blockAutoDismissal();
        };

        // Add event listener
        window.addEventListener('showNotification', handleShowNotification);

        return () => {
            window.removeEventListener('showNotification', handleShowNotification);
        };
    }, [handleDismissNotification, debugVisible, notifications, blockAutoDismissal]);

    // Toggle debug mode
    const toggleDebug = useCallback(() => {
        setDebugVisible(prev => !prev);
    }, []);

    // For development only, add a simple debug toggle without notifications
    return (
        <>
            <NotificationSystem
                notifications={notifications}
                onDismiss={handleDismissNotification}
                onAction={handleNotificationAction}
            />

            {/* Hidden debug toggle in corner - no more notifications */}
            {process.env.NODE_ENV === 'development' && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '5px',
                        right: '5px',
                        width: '10px',
                        height: '10px',
                        background: debugVisible ? 'green' : 'red',
                        borderRadius: '50%',
                        zIndex: 10000,
                        cursor: 'pointer'
                    }}
                    onClick={toggleDebug}
                    title="Toggle notification debug"
                />
            )}
        </>
    );
};

export default NotificationManager; 