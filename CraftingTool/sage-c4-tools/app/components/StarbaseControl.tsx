import React from 'react';
import { useSharedState, STARBASE_LEVELS } from '../contexts/SharedStateContext';

interface StarbaseControlProps {
  onNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function StarbaseControl({ onNotification }: StarbaseControlProps = {}) {
  const { state, updateStarbaseLevel, unlockAchievement } = useSharedState();
  const currentLevel = state.starbaseLevel;
  const levelData = STARBASE_LEVELS[currentLevel as keyof typeof STARBASE_LEVELS];
  const nextLevelData = STARBASE_LEVELS[(currentLevel + 1) as keyof typeof STARBASE_LEVELS];

  const handleUpgrade = () => {
    if (currentLevel < 6) {
      updateStarbaseLevel(currentLevel + 1);
      const nextLevel = STARBASE_LEVELS[(currentLevel + 1) as keyof typeof STARBASE_LEVELS];

      if (onNotification) {
        onNotification(`Starbase upgraded to Level ${currentLevel + 1}: ${nextLevel.name}!`, 'success');
      }

      // Check for starbase achievements
      if (currentLevel + 1 === 6) {
        unlockAchievement('starbase_commander');
      }
    }
  };

  return (
    <div className="starbase-control panel">
      <h3 className="heading-secondary">Starbase Command</h3>

      <div className="starbase-info">
        <div className="level-display">
          <span className="level-number">Level {currentLevel}</span>
          <h4 className="level-name">{levelData.name}</h4>
        </div>

        {currentLevel < 6 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentLevel / 6) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="capabilities-grid">
        <div className="capability-section">
          <h5 className="stat-text">Claim Stake Access</h5>
          <div className="tier-badges">
            {[1, 2, 3, 4, 5].map(tier => (
              <div
                key={tier}
                className={`tier-badge ${levelData.claimStakeTiers.includes(tier) ? 'unlocked' : 'locked'}`}
              >
                T{tier}
              </div>
            ))}
          </div>
        </div>

        <div className="capability-section">
          <h5 className="stat-text">Hab Plot Availability</h5>
          <div className="plot-counts">
            {Object.entries(levelData.habPlotsByTier).map(([tier, count]) => (
              <div key={tier} className="plot-count">
                <span className="tier-label">T{tier}:</span>
                <span className="count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="capability-section">
          <h5 className="stat-text">Features</h5>
          <ul className="feature-list">
            {levelData.features.map(feature => (
              <li key={feature} className="feature-item">
                <span className="feature-icon">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {currentLevel < 6 && nextLevelData && (
        <div className="upgrade-section">
          <h5 className="stat-text">Next Level: {nextLevelData.name}</h5>
          <div className="upgrade-preview">
            <div className="new-features">
              <span className="text-dim">Unlocks:</span>
              <ul>
                {nextLevelData.features
                  .filter(f => !levelData.features.includes(f))
                  .map(feature => (
                    <li key={feature} className="text-success">+ {feature}</li>
                  ))}
              </ul>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleUpgrade}
          >
            Upgrade to Level {currentLevel + 1}
          </button>
        </div>
      )}

      {currentLevel === 6 && (
        <div className="max-level-badge">
          <span className="badge-icon">⭐</span>
          <span className="badge-text">Maximum Level Achieved</span>
        </div>
      )}
    </div>
  );
}

// Add these styles to your sage-theme.css
const starbaseControlStyles = `
.starbase-control {
  max-width: 400px;
  margin: 0 auto;
}

.starbase-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.level-display {
  margin-bottom: 1rem;
}

.level-number {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--primary-orange);
  color: white;
  border-radius: var(--radius-sm);
  font-family: 'Orbitron', monospace;
  font-weight: 800;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.level-name {
  font-family: 'Orbitron', monospace;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0.5rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-orange), var(--accent-blue));
  transition: width 0.5s ease;
}

.capabilities-grid {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.capability-section h5 {
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
}

.tier-badges {
  display: flex;
  gap: 0.5rem;
}

.tier-badge {
  padding: 0.25rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: 'Orbitron', monospace;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.tier-badge.unlocked {
  border-color: var(--accent-green);
  color: var(--accent-green);
  background: rgba(0, 200, 150, 0.1);
}

.tier-badge.locked {
  color: var(--text-dim);
  opacity: 0.5;
}

.plot-counts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
}

.plot-count {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
}

.tier-label {
  color: var(--text-secondary);
  font-family: 'Orbitron', monospace;
}

.count {
  color: var(--primary-orange);
  font-family: 'Orbitron', monospace;
  font-weight: 600;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.feature-icon {
  color: var(--accent-green);
}

.upgrade-section {
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
  text-align: center;
}

.upgrade-preview {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid var(--primary-orange);
  border-radius: var(--radius-md);
}

.new-features ul {
  list-style: none;
  padding: 0;
  margin-top: 0.5rem;
}

.max-level-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 107, 53, 0.1));
  border: 2px solid var(--accent-gold);
  border-radius: var(--radius-md);
  margin-top: 1rem;
}

.badge-icon {
  font-size: 1.5rem;
}

.badge-text {
  font-family: 'Orbitron', monospace;
  font-weight: 600;
  color: var(--accent-gold);
}
`; 