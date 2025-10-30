import React from 'react';
import type { CompanyProfile, AppStep } from '../types';

interface ProfileScreenProps {
  profile: CompanyProfile;
  handleProfileChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fileType: 'knowledgeBase' | 'logo') => void;
  logoFileName: string | null;
  knowledgeBaseFileNames: string[] | null;
  error: string | null;
  handleStartAnalysis: () => void;
  step: AppStep;
  calendarDuration: number;
  selectedPlatforms: string[];
  handleDurationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handlePlatformChange: (platform: string) => void;
  allPlatforms: string[];
}

const ProfileScreen = ({ profile, handleProfileChange, handleFileChange, logoFileName, knowledgeBaseFileNames, error, handleStartAnalysis, step, calendarDuration, selectedPlatforms, handleDurationChange, handlePlatformChange, allPlatforms }: ProfileScreenProps) => (
  <>
    <header>
      <h1>AI Social Media Strategist</h1>
      <p>Provide your brand's details, knowledge base, and content focus to generate a tailored, trend-aware social media calendar.</p>
    </header>
    <main>
      <div className="profile-form">
        <div className="form-group"><label htmlFor="name">Company Name*</label><input type="text" id="name" name="name" className="profile-input" value={profile.name} onChange={handleProfileChange} placeholder="e.g., Sprinklr" /></div>
        <div className="form-group"><label htmlFor="website">Website URL</label><input type="text" id="website" name="website" className="profile-input" value={profile.website} onChange={handleProfileChange} placeholder="e.g., https://www.sprinklr.com" /></div>
        <div className="form-group"><label>Company Logo</label><div className="file-input-wrapper vertical"><div className="logo-preview-wrapper"><label htmlFor="logo-upload" className="file-input-label">Upload Logo</label>{profile.logo && <img src={profile.logo} alt="Logo Preview" className="logo-preview" />}{profile.logoColors.length > 0 && (<div className="color-palette">{profile.logoColors.map(color => <div key={color} className="color-swatch" style={{ backgroundColor: color }} title={color}></div>)}</div>)}</div><input type="file" id="logo-upload" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e, 'logo')} />{logoFileName && <span className="file-name-tag">{logoFileName}</span>}</div></div>
        <div className="form-group"><label>Knowledge Base (PDFs)</label><div className="file-input-wrapper vertical"><label htmlFor="kb-upload" className="file-input-label">Upload PDFs</label><input type="file" id="kb-upload" accept=".pdf" onChange={(e) => handleFileChange(e, 'knowledgeBase')} multiple /><div className="file-names-container">{knowledgeBaseFileNames && knowledgeBaseFileNames.map(name => (<span key={name} className="file-name-tag">{name}</span>))}</div></div></div>
        <div className="form-group"><label htmlFor="socials">Social Media URLs (comma-separated)</label><input type="text" id="socials" name="socials" className="profile-input" value={profile.socials} onChange={handleProfileChange} placeholder="e.g., https://instagram.com/sprinklr, https://linkedin.com/company/sprinklr" /></div>
        <div className="form-group"><label htmlFor="competitors">Competitor URLs (optional, comma-separated)</label><input type="text" id="competitors" name="competitors" className="profile-input" value={profile.competitors} onChange={handleProfileChange} placeholder="e.g., https://www.competitor1.com, https://www.competitor2.com" /></div>
        <div className="form-group full-width"><label htmlFor="contentFocus">Content Focus & Voice</label><textarea id="contentFocus" name="contentFocus" className="profile-textarea" value={profile.contentFocus} onChange={handleProfileChange} placeholder="What type of content do you post? e.g., 'Educational and professional, focusing on AI in customer service. Voice is authoritative but accessible.'"></textarea></div>

        <div className="form-group full-width calendar-options">
            <div className="option-group">
                <label htmlFor="duration-select">Calendar Duration</label>
                <select id="duration-select" value={calendarDuration} onChange={handleDurationChange}>
                    <option value="7">1 Week</option>
                    <option value="14">2 Weeks</option>
                    <option value="30">1 Month</option>
                </select>
            </div>
            <div className="option-group">
                <label>Target Platforms</label>
                <div className="platform-checkboxes">
                    {allPlatforms.map(platform => (
                        <label key={platform} className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedPlatforms.includes(platform)}
                                onChange={() => handlePlatformChange(platform)}
                            />
                            {platform}
                        </label>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="action-bar">{error && <p className="error-message" style={{padding: '0.5rem 1rem', marginRight: 'auto'}}>{error}</p>}<button className="generate-button" onClick={handleStartAnalysis} disabled={!profile.name.trim() || step === 'analyzing' || selectedPlatforms.length === 0}>Start Analysis →</button></div>
      </div>
    </main>
  </>
);

export default ProfileScreen;