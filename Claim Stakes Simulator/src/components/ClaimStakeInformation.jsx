import React from 'react';
import '../styles/ClaimStakeDetails.css';

/**
 * ClaimStakeInformation - Displays key information about a claim stake
 * Shows slots, rent multiplier, and tier in a clean card layout
 */
const ClaimStakeInformation = ({ claimStake = {} }) => {
    // Use properties directly from claimStake, but fall back to definition if not available
    const slots = claimStake.slots || claimStake.definition?.slots || 30;
    const rentMultiplier = claimStake.rentMultiplier || claimStake.definition?.rentMultiplier || 1.4;
    const tier = claimStake.tier || claimStake.definition?.tier || 3;

    return (
        <div className="claim-stake-information">
            <h2 className="section-header">CLAIM STAKE INFORMATION</h2>
            <div className="claim-stake-info-section">
                <div className="info-card slots">
                    <div className="info-card-header">Slots</div>
                    <div className="info-card-content">
                        <div className="info-card-value">{slots}</div>
                    </div>
                </div>
                <div className="info-card rent">
                    <div className="info-card-header">Rent Multiplier</div>
                    <div className="info-card-content">
                        <div className="info-card-value">{rentMultiplier}x</div>
                    </div>
                </div>
                <div className="info-card tier">
                    <div className="info-card-header">Tier</div>
                    <div className="info-card-content">
                        <div className="info-card-value">{tier}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClaimStakeInformation; 