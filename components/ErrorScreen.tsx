import React from 'react';

interface ErrorScreenProps {
  error: string | null;
  startOver: () => void;
}

const ErrorScreen = ({ error, startOver }: ErrorScreenProps) => (
    <div className="error-message-screen"><div className="error-message"><p>{error}</p><button className="generate-button" style={{marginTop: '1rem'}} onClick={startOver}>Try Again</button></div></div>
);

export default ErrorScreen;
