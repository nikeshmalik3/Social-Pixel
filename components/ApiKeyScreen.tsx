import React from 'react';

interface ApiKeyScreenProps {
  onSelectKey: () => void;
}

const ApiKeyScreen = ({ onSelectKey }: ApiKeyScreenProps) => (
  <div className="container" style={{ textAlign: 'center', maxWidth: '600px', margin: 'auto', marginTop: '10vh' }}>
    <header>
      <h1>API Key Required</h1>
      <p style={{ marginTop: '1rem', color: 'var(--secondary-text)', lineHeight: 1.6 }}>
        Video generation with Veo models is a premium feature that requires a valid Google AI API key with billing enabled. Please select your key to proceed.
      </p>
    </header>
    <main style={{ marginTop: '2rem' }}>
      <button className="generate-button" onClick={onSelectKey}>
        Select API Key
      </button>
      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--secondary-text)' }}>
        Learn more about API keys and billing at{' '}
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: 'var(--accent-color)' }}
        >
          ai.google.dev/gemini-api/docs/billing
        </a>.
      </p>
    </main>
  </div>
);

export default ApiKeyScreen;
