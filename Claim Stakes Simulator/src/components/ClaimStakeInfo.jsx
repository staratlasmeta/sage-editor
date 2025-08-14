import React from 'react';
import '../styles/ClaimStakeInfo.css';

/**
 * ClaimStakeInfo - Displays key information about a claim stake
 * Shows stats like slots and rent multiplier in an attractive card format
 */
const ClaimStakeInfo = ({ claimStake }) => {
    if (!claimStake) return null;

    return (
        <div className="claim-stake-overview">
            <div className="claim-stake-header">
                <h2>{claimStake.definition?.name || "ONI Terrestrial Planet T3 Claim Stake"}</h2>
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
        </div>
    );
};

export default ClaimStakeInfo; 