import React from 'react';

interface LoadingScreenProps {
  message: string;
  platforms?: string[];
  currentPlatform?: string | null;
  completedPlatforms?: string[];
}

interface PlatformProgressItemProps {
    platform: string;
    status: 'pending' | 'in-progress' | 'completed';
}

const getPlatformLogo = (platform: string) => {
    switch (platform.toLowerCase()) {
        case 'linkedin':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
            );
        case 'instagram':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.058 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.441-.645 1.441-1.44s-.646-1.44-1.441-1.44z" />
                </svg>
            );
        case 'facebook':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-3 7h-1.924c-.615 0-1.076.252-1.076.888v1.112h3l-.238 2h-2.762v8h-3v-8h-2v-2h2v-1.677c0-2.987 2.23-3.323 3.323-3.323h1.677v3z" />
                </svg>
            );
        case 'x':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            );
        default:
            return null;
    }
};

const PlatformProgressItem = ({ platform, status }: PlatformProgressItemProps) => {
    const getIcon = () => {
        switch (status) {
            case 'in-progress':
                return <div className="inline-spinner status-icon"></div>;
            case 'completed':
                return <div className="status-icon" style={{ fontSize: '1.2rem' }}>✔</div>;
            case 'pending':
                return <div className="status-icon" style={{ fontSize: '1.2rem' }}>...</div>;
            default:
                return null;
        }
    };
    return (
        <div className={`platform-progress-item ${status}`}>
            <div className="platform-logo">{getPlatformLogo(platform)}</div>
            {getIcon()}
            <span>{platform}</span>
        </div>
    );
};

const LoadingScreen = ({ message, platforms, currentPlatform, completedPlatforms }: LoadingScreenProps) => {
    const showPlatformProgress = platforms && completedPlatforms;

    return (
        <div className="loading-indicator">
            <p style={{ marginBottom: showPlatformProgress ? '2rem' : '1rem', fontSize: '1.2rem' }}>{message}</p>
            {showPlatformProgress ? (
                <div className="platform-progress-container">
                    {platforms.map(p => {
                        const isCompleted = completedPlatforms.includes(p);
                        const isInProgress = currentPlatform === p;
                        const status = isCompleted ? 'completed' : isInProgress ? 'in-progress' : 'pending';
                        return <PlatformProgressItem key={p} platform={p} status={status} />;
                    })}
                </div>
            ) : (
                <div className="spinner"></div>
            )}
        </div>
    );
};

export default LoadingScreen;