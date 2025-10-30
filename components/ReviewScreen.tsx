import React, { useState } from 'react';
import type { AnalysisResult, AppStep } from '../types';
import LoadingScreen from './LoadingScreen';

interface ReviewScreenProps {
  analysisResult: AnalysisResult | null;
  setStep: React.Dispatch<React.SetStateAction<AppStep>>;
  handleGenerateCalendar: () => void;
}

const ReviewScreen = ({ analysisResult, setStep, handleGenerateCalendar }: ReviewScreenProps) => {
    const [activeTab, setActiveTab] = useState('brand');

    if (!analysisResult) {
        return <LoadingScreen message="Loading analysis results..." />;
    }
    
    const { brandProfile, trendAnalysis, competitorAnalysis, sources } = analysisResult;
    
    const renderContent = () => {
        switch(activeTab) {
            case 'brand':
                return (
                    <div className="review-content">
                        <p>{brandProfile.summary}</p>
                        <h4 style={{marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-text)'}}>Visual Identity Analysis</h4>
                        <p><strong>Vibe:</strong> {brandProfile.visualIdentity.vibe}</p>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem'}}>
                            <strong>Suggested Palette:</strong>
                            <div className="color-palette">
                                {brandProfile.visualIdentity.suggestedPalette.map(color => (
                                    <div key={color} className="color-swatch" style={{ backgroundColor: color }} title={color}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'trends':
                return (
                    <div className="review-content">
                        <p>{trendAnalysis.summary}</p>
                        <ul className="trend-list">
                            {trendAnalysis.trends.map((t, i) => <li key={i}><strong>{t.trend}:</strong> {t.description}</li>)}
                        </ul>
                    </div>
                );
            case 'competitors':
                return (
                    <div className="review-content">
                        <p>{competitorAnalysis.summary}</p>
                        <div className="competitor-grid">
                            {competitorAnalysis.competitors.map((c, i) => (
                                <div key={i} className="competitor-card">
                                    <h4>{c.name}</h4>
                                    <a href={c.url} target="_blank" rel="noopener noreferrer">{c.url}</a>
                                    <p>{c.analysis}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="review-container">
            <header>
                <h2>Review AI Analysis</h2>
                <p>Please review the AI's understanding of your brand, market, and competitors before we build your calendar.</p>
            </header>
            <div className="tab-container">
                <button className={`tab-button ${activeTab === 'brand' ? 'active' : ''}`} onClick={() => setActiveTab('brand')}>Brand Profile</button>
                <button className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`} onClick={() => setActiveTab('trends')}>Market Trends</button>
                <button className={`tab-button ${activeTab === 'competitors' ? 'active' : ''}`} onClick={() => setActiveTab('competitors')}>Competitor Analysis</button>
            </div>
            <div className="review-panel">{renderContent()}</div>
            
             <div className="sources-section">
                <h3>Research Sources</h3>
                <ul className="sources-list">
                    {sources.map((source, index) => (
                        <li key={index}><a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title}>{source.title || source.uri}</a></li>
                    ))}
                </ul>
            </div>
            <div className="action-bar space-between">
                <button className="secondary-button" onClick={() => setStep('profile')}>← Start Over</button>
                <button 
                    className="generate-button" 
                    onClick={handleGenerateCalendar}
                >
                    Confirm & Generate Calendar →
                </button>
            </div>
        </div>
    );
};

export default ReviewScreen;