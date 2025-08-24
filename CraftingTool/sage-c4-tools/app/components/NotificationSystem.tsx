import React, { useState, useEffect } from 'react';

export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface NotificationSystemProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}

export function NotificationSystem({ notifications, onDismiss }: NotificationSystemProps) {
    return (
        <div className="notification-container">
            {notifications.map(notification => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={() => onDismiss(notification.id)}
                />
            ))}
        </div>
    );
}

function NotificationItem({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
    useEffect(() => {
        if (notification.duration !== 0) {
            const timer = setTimeout(() => {
                onDismiss();
            }, notification.duration || 3000);

            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    };

    return (
        <div className={`notification notification-${notification.type}`}>
            <span className="notification-icon">{getIcon()}</span>
            <span className="notification-message">{notification.message}</span>
            <button className="notification-close" onClick={onDismiss}>×</button>
        </div>
    );
}

// Notification manager hook
export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = (message: string, type: Notification['type'] = 'info', duration?: number) => {
        const id = `notification-${Date.now()}-${Math.random()}`;
        const notification: Notification = { id, message, type, duration };
        setNotifications(prev => [...prev, notification]);
    };

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return {
        notifications,
        showNotification,
        dismissNotification
    };
} 