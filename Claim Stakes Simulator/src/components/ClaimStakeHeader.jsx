import React from 'react';
import '../styles/ClaimStakeInfo.css';

/**
 * ClaimStakeHeader - Displays the main header section of a claim stake with tabs and info
 * Shows the title, slots, and rent multiplier in an attractive format
 */
const ClaimStakeHeader = ({
    claimStake,
    activeTab,
    onTabChange
}) => {
    if (!claimStake) return null;

    return (
        <div className="claim-stake-header-section">
            <div className="claim-stake-title">
                <h1>{claimStake.definition?.name || "ONI Terrestrial Planet T3 Claim Stake"}</h1>
                <button className="purchase-stake-button">
                    Purchase Claim Stake
                </button>
            </div>

            <div className="claim-stake-stats-row">
                <div className="claim-stake-stat">
                    <div className="stat-left">
                        <div className="stat-icon slots-icon">
                            <i className="fas fa-cubes"></i>
                        </div>
                        <div className="stat-info">
                            <div className="stat-name">Slots</div>
                        </div>
                    </div>
                    <div className="stat-value">{claimStake.slots || claimStake.definition?.slots || "30"}</div>
                </div>
                <div className="claim-stake-stat">
                    <div className="stat-left">
                        <div className="stat-icon rent-icon">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="stat-info">
                            <div className="stat-name">Rent Multiplier</div>
                        </div>
                    </div>
                    <div className="stat-value">{claimStake.rentMultiplier || claimStake.definition?.rentMultiplier || "1.4"}x</div>
                </div>
            </div>

            <div className="claim-stake-tabs">
                <button
                    className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => onTabChange('general')}
                >
                    GENERAL
                </button>
                <button
                    className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
                    onClick={() => onTabChange('resources')}
                >
                    RESOURCES
                </button>
                <button
                    className={`tab-button ${activeTab === 'buildings' ? 'active' : ''}`}
                    onClick={() => onTabChange('buildings')}
                >
                    BUILDINGS
                </button>
            </div>
        </div>
    );
};

export default ClaimStakeHeader; 