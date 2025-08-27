import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../styles/ship-transfer-modal.css';

interface ShipTransferModalProps {
    show: boolean;
    from: string;
    to: string;
    resources: Record<string, number>;
    onComplete: () => void;
}

export function ShipTransferModal({ show, from, to, resources, onComplete }: ShipTransferModalProps) {
    const [phase, setPhase] = useState<'loading' | 'traveling' | 'unloading' | 'complete'>('loading');
    const [progress, setProgress] = useState(0);
    const [minimized, setMinimized] = useState(false);
    const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);

    // Store onComplete in a ref to avoid dependency issues
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Animation sequence definition
    const sequences = useMemo(() => [
        { phase: 'loading' as const, duration: 1500 },
        { phase: 'traveling' as const, duration: 2000 },
        { phase: 'unloading' as const, duration: 1500 },
        { phase: 'complete' as const, duration: 500 }
    ], []);

    useEffect(() => {
        if (!show) {
            // Reset everything when modal is hidden
            setPhase('loading');
            setProgress(0);
            setCurrentSequenceIndex(0);
            setMinimized(false);
            return;
        }

        // Don't run if we've completed all sequences
        if (currentSequenceIndex >= sequences.length) {
            // Complete the transfer after showing completion state
            const timer = setTimeout(() => {
                onCompleteRef.current();
                setCurrentSequenceIndex(0); // Reset for next time
            }, 500);
            return () => clearTimeout(timer);
        }

        const currentSequence = sequences[currentSequenceIndex];
        setPhase(currentSequence.phase);
        setProgress(0);

        // Animate the progress bar for this sequence
        const progressInterval = 50;
        const progressIncrement = 100 / (currentSequence.duration / progressInterval);
        let currentProgress = 0;

        const progressTimer = setInterval(() => {
            currentProgress = Math.min(currentProgress + progressIncrement, 100);
            setProgress(currentProgress);

            if (currentProgress >= 100) {
                clearInterval(progressTimer);
                // Move to next sequence after a short delay
                setTimeout(() => {
                    setCurrentSequenceIndex(prev => prev + 1);
                }, 200);
            }
        }, progressInterval);

        return () => {
            clearInterval(progressTimer);
        };
    }, [show, currentSequenceIndex, sequences]);

    if (!show) return null;

    const getLocationName = (location: string) => {
        if (location === 'starbase') return '🛸 Starbase';
        if (location === 'all-stakes') return '🏭 All Claim Stakes';
        if (location.includes('claim')) return `⛏️ ${location}`;
        return location;
    };

    const getPhaseIcon = () => {
        switch (phase) {
            case 'loading': return '📦';
            case 'traveling': return '🚀';
            case 'unloading': return '📥';
            case 'complete': return '✅';
            default: return '🚀';
        }
    };

    const getPhaseMessage = () => {
        switch (phase) {
            case 'loading': return `Loading cargo at ${getLocationName(from)}...`;
            case 'traveling': return `Ship traveling to ${getLocationName(to)}...`;
            case 'unloading': return `Unloading cargo at ${getLocationName(to)}...`;
            case 'complete': return 'Transfer complete!';
            default: return 'Processing...';
        }
    };

    const totalResources = Object.entries(resources).reduce((sum, [_, amount]) => sum + amount, 0);

    // Handle skip transfer
    const handleSkip = () => {
        // Immediately complete the transfer
        onCompleteRef.current();
        setCurrentSequenceIndex(0);
    };

    // Minimized view
    if (minimized) {
        return (
            <div className="ship-transfer-minimized">
                <div className="minimized-content">
                    <span className="minimized-icon">🚀</span>
                    <span className="minimized-text">Transfer in progress...</span>
                    <span className="minimized-progress">{Math.round(progress)}%</span>
                    <button onClick={() => setMinimized(false)} className="expand-btn">↑</button>
                </div>
                <div className="minimized-progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
            </div>
        );
    }

    return (
        <div className="ship-transfer-overlay">
            <div className="ship-transfer-modal">
                <div className="ship-transfer-header">
                    <h2>🚀 Cargo Transfer in Progress</h2>
                    <div className="modal-controls">
                        <button onClick={() => setMinimized(true)} className="minimize-btn" title="Minimize">_</button>
                        <button onClick={handleSkip} className="skip-btn" title="Skip Animation">⏩</button>
                    </div>
                </div>

                <div className="ship-animation-container">
                    <div className="ship-path">
                        <div className="location-marker start">
                            <span className="location-icon">{from === 'starbase' ? '🛸' : '⛏️'}</span>
                            <span className="location-label">{getLocationName(from)}</span>
                        </div>

                        <div className="ship-track">
                            <div
                                className={`ship-icon ${phase}`}
                                style={{
                                    left: phase === 'loading' ? '0%' :
                                        phase === 'traveling' ? `${progress}%` :
                                            phase === 'unloading' ? '100%' : '100%'
                                }}
                            >
                                🚀
                            </div>
                            <div className="ship-trail" style={{ width: `${phase === 'traveling' ? progress : phase === 'loading' ? 0 : 100}%` }} />
                        </div>

                        <div className="location-marker end">
                            <span className="location-icon">{to === 'starbase' ? '🛸' : '⛏️'}</span>
                            <span className="location-label">{getLocationName(to)}</span>
                        </div>
                    </div>
                </div>

                <div className="transfer-phase">
                    <div className="phase-icon">{getPhaseIcon()}</div>
                    <div className="phase-message">{getPhaseMessage()}</div>
                </div>

                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="progress-text">{Math.round(progress)}%</div>
                </div>

                <div className="cargo-manifest">
                    <h3>📋 Cargo Manifest</h3>
                    <div className="manifest-items">
                        {Object.entries(resources).map(([resource, amount]) => (
                            <div key={resource} className="manifest-item">
                                <span className="resource-name">{resource.replace(/-/g, ' ')}</span>
                                <span className="resource-amount">{amount.toLocaleString()} units</span>
                            </div>
                        ))}
                    </div>
                    <div className="manifest-total">
                        <strong>Total Cargo:</strong> {totalResources.toLocaleString()} units
                    </div>
                </div>

                <div className="ship-info">
                    <div className="ship-stat">
                        <span className="stat-label">Ship Class:</span>
                        <span className="stat-value">Hauler MK-II</span>
                    </div>
                    <div className="ship-stat">
                        <span className="stat-label">Cargo Capacity:</span>
                        <span className="stat-value">10,000 units</span>
                    </div>
                    <div className="ship-stat">
                        <span className="stat-label">Fuel Usage:</span>
                        <span className="stat-value">5 fuel/transfer</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
