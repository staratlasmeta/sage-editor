import React, { useState, useEffect } from 'react';

interface TutorialStep {
    id: string;
    title: string;
    content: string;
    target?: string; // CSS selector for element to highlight
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIALS: Record<string, TutorialStep[]> = {
    claimStakes: [
        {
            id: 'cs-welcome',
            title: 'Welcome to Claim Stakes!',
            content: 'Build and manage resource extraction operations on planets. Let\'s get started!',
        },
        {
            id: 'cs-select-planet',
            title: 'Select a Planet',
            content: 'Choose a planet from the left panel. Each planet has different resources and richness values.',
            target: '.planet-card',
            position: 'right'
        },
        {
            id: 'cs-choose-tier',
            title: 'Choose Your Tier',
            content: 'Higher tiers offer more slots but cost more. Start with Tier 1 to learn the basics.',
            target: '.tier-selector',
            position: 'bottom'
        },
        {
            id: 'cs-add-buildings',
            title: 'Add Buildings',
            content: 'Click buildings to add them. Extractors gather resources, generators provide power.',
            target: '.available-buildings',
            position: 'left'
        },
        {
            id: 'cs-balance-power',
            title: 'Balance Power',
            content: 'Keep power positive! Generators produce power, other buildings consume it.',
            target: '.stat-power',
            position: 'bottom'
        },
        {
            id: 'cs-finalize',
            title: 'Finalize Design',
            content: 'When ready, click "Finalize Design" to start production!',
            target: '.finalize-btn',
            position: 'top'
        }
    ],
    craftingHab: [
        {
            id: 'ch-welcome',
            title: 'Welcome to Crafting Hab!',
            content: 'Set up crafting operations at starbases to create components and modules.',
        },
        {
            id: 'ch-select-starbase',
            title: 'Select a Starbase',
            content: 'Choose a starbase from the left. Higher level starbases have more plots.',
            target: '.starbase-card',
            position: 'right'
        },
        {
            id: 'ch-rent-plot',
            title: 'Rent a Plot',
            content: 'Click "Rent" on an available plot to begin designing your hab.',
            target: '.rent-btn',
            position: 'bottom'
        },
        {
            id: 'ch-place-hab',
            title: 'Place Your Hab',
            content: 'First, select a hab that matches the plot tier.',
            target: '.hab-options',
            position: 'left'
        },
        {
            id: 'ch-add-stations',
            title: 'Add Crafting Stations',
            content: 'Add crafting stations to increase speed and job capacity.',
            target: '.station-options',
            position: 'left'
        },
        {
            id: 'ch-start-crafting',
            title: 'Start Crafting',
            content: 'Select recipes and start crafting jobs. Resources are consumed from starbase inventory.',
            target: '.recipe-grid',
            position: 'top'
        }
    ],
    recipes: [
        {
            id: 'r-welcome',
            title: 'Welcome to Recipe Explorer!',
            content: 'Visualize crafting dependencies and plan your production chains.',
        },
        {
            id: 'r-search',
            title: 'Find Recipes',
            content: 'Use search and filters to find specific recipes.',
            target: '.recipe-filters',
            position: 'bottom'
        },
        {
            id: 'r-select',
            title: 'Select a Recipe',
            content: 'Click a recipe to see its dependency tree.',
            target: '.recipe-list-item',
            position: 'right'
        },
        {
            id: 'r-tree',
            title: 'Recipe Tree',
            content: 'The tree shows all ingredients and sub-components. Green nodes are raw materials.',
            target: '.tree-canvas',
            position: 'bottom'
        },
        {
            id: 'r-analysis',
            title: 'Analysis Dashboard',
            content: 'See total resources needed, time required, and optimization tips.',
            target: '.analysis-dashboard',
            position: 'left'
        },
        {
            id: 'r-export',
            title: 'Export to Queue',
            content: 'Send recipes to the Crafting Hab tool for production.',
            target: '.export-btn',
            position: 'top'
        }
    ]
};

interface TutorialOverlayProps {
    tutorialKey: 'claimStakes' | 'craftingHab' | 'recipes';
    onComplete?: () => void;
}

export function TutorialOverlay({ tutorialKey, onComplete }: TutorialOverlayProps) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);

    const tutorial = TUTORIALS[tutorialKey];
    const step = tutorial?.[currentStep];

    useEffect(() => {
        // Check if tutorial has been completed before
        const completed = localStorage.getItem(`tutorial_${tutorialKey}_completed`);
        if (!completed) {
            setIsActive(true);
        }
    }, [tutorialKey]);

    useEffect(() => {
        if (step?.target) {
            const element = document.querySelector(step.target) as HTMLElement;
            setHighlightElement(element);
        } else {
            setHighlightElement(null);
        }
    }, [step]);

    const handleNext = () => {
        if (currentStep < tutorial.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = () => {
        setIsActive(false);
    };

    const handleComplete = () => {
        localStorage.setItem(`tutorial_${tutorialKey}_completed`, 'true');
        setIsActive(false);
        onComplete?.();
    };

    if (!isActive || !step) return null;

    const highlightRect = highlightElement?.getBoundingClientRect();

    return (
        <>
            {/* Overlay */}
            <div className="tutorial-overlay" onClick={handleSkip}>
                {/* Highlight cutout */}
                {highlightRect && (
                    <div
                        className="tutorial-highlight"
                        style={{
                            position: 'fixed',
                            left: highlightRect.left - 10,
                            top: highlightRect.top - 10,
                            width: highlightRect.width + 20,
                            height: highlightRect.height + 20,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                            borderRadius: '8px',
                            pointerEvents: 'none'
                        }}
                    />
                )}

                {/* Tutorial Card */}
                <div
                    className="tutorial-card"
                    style={{
                        position: 'fixed',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10001
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="tutorial-header">
                        <h3>{step.title}</h3>
                        <span className="tutorial-progress">
                            {currentStep + 1} / {tutorial.length}
                        </span>
                    </div>
                    <div className="tutorial-content">
                        <p>{step.content}</p>
                    </div>
                    <div className="tutorial-actions">
                        <button className="btn btn-secondary" onClick={handleSkip}>
                            Skip Tutorial
                        </button>
                        <button className="btn btn-primary" onClick={handleNext}>
                            {currentStep < tutorial.length - 1 ? 'Next' : 'Complete'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
} 