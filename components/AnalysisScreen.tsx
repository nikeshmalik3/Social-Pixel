import React from 'react';

interface AnalysisScreenProps {
    allSteps: string[];
    progress: string[];
}

const AnalysisScreen = ({ allSteps, progress }: AnalysisScreenProps) => {
    const currentStepIndex = progress.length - 1;
    const progressPercentage = currentStepIndex >= 0 
        ? (currentStepIndex / (allSteps.length - 1)) * 100 
        : 0;

    const currentStepText = currentStepIndex >= 0 && currentStepIndex < allSteps.length
        ? progress[currentStepIndex]
        : currentStepIndex >= allSteps.length
        ? 'Finalizing Report...'
        : 'Initiating analysis...';

    return (
        <div className="analysis-container">
            <header>
                <h2>AI Research & Analysis in Progress</h2>
                <p>Our AI is deep-diving into your brand, the market, and your competition.</p>
                <div className="analysis-subtitle">
                    {currentStepText}
                </div>
            </header>
            <div className="analysis-timeline-wrapper">
                <div className="analysis-timeline-track"></div>
                <div 
                    className="analysis-timeline-progress" 
                    style={{ width: `${progressPercentage}%` }}
                ></div>
                <ul className="analysis-steps-list">
                    {allSteps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isActive = index === currentStepIndex;
                        
                        let status = 'pending';
                        if (isCompleted) status = 'completed';
                        if (isActive) status = 'active';
                        
                        return (
                            <li key={index} className={`analysis-step-item ${status}`}>
                                <div className="step-node">
                                    {isActive ? <div className="step-spinner"></div> : isCompleted ? '✔' : null}
                                </div>
                                <div className="step-content">
                                    {step}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default AnalysisScreen;