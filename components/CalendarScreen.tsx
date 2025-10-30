import React from 'react';
import type { CalendarData, CalendarEntry } from '../types';

interface CalendarScreenProps {
  calendarData: CalendarData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleContentUpdate: (platform: string, index: number, field: keyof CalendarEntry, value: string) => void;
  triggerImageGeneration: (platform: string, index: number) => void;
  triggerVideoGeneration: (platform: string, index: number) => void;
  handleImageEdit: (platform: string, index: number) => void;
  handleExport: () => void;
  startOver: () => void;
}

const CalendarScreen = ({ calendarData, activeTab, setActiveTab, handleContentUpdate, triggerImageGeneration, triggerVideoGeneration, handleImageEdit, handleExport, startOver }: CalendarScreenProps) => {
    
    return (
    <>
      <div className="calendar-header">
        <h2>Your {Object.values(calendarData)[0]?.length || ''}-Day Content Plan</h2>
        <div className="calendar-controls">
            <button className="secondary-button" onClick={handleExport}>Export to CSV</button>
            <button className="secondary-button" onClick={startOver}>← Start Over</button>
        </div>
      </div>
      <div className="tab-container">
        {Object.keys(calendarData).map(platform => (
            <button key={platform} className={`tab-button ${activeTab === platform ? 'active' : ''}`} onClick={() => setActiveTab(platform)}>
                {platform}
            </button>
        ))}
      </div>
      <div className="calendar-output">
        <table className="calendar-table">
          <thead><tr><th>Day</th><th>Format</th><th>Post Type</th><th>Content & Caption</th><th>Hashtags</th><th className="image-cell">Media</th></tr></thead>
          <tbody>
            {(calendarData[activeTab] || []).map((item, index) => (
              <tr key={item.day}>
                <td style={{width: '5%'}}>{item.day}</td>
                <td style={{width: '10%'}}><span className="tag format">{item.format}</span></td>
                <td style={{width: '12%'}}><span className="tag type">{item.postType}</span></td>
                <td 
                    contentEditable 
                    suppressContentEditableWarning 
                    onBlur={(e) => handleContentUpdate(activeTab, index, 'contentIdea', e.currentTarget.innerText)}
                >
                    {item.contentIdea}
                </td>
                <td 
                    style={{width: '18%'}} 
                    contentEditable 
                    suppressContentEditableWarning 
                    onBlur={(e) => handleContentUpdate(activeTab, index, 'hashtags', e.currentTarget.innerText)}
                >
                    {item.hashtags}
                </td>
                <td className="image-cell">
                  {item.format === 'Image' && (
                    <>
                      {item.isGeneratingImage ? (
                        <div className="image-placeholder media-loading">
                            <div className="inline-spinner"></div>
                            <p>Generating Images...</p>
                        </div>
                      ) : (item.imageUrls && item.imageUrls.length > 0) ? (
                        <div>
                          <div className="image-gallery">
                            {item.imageUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`${item.imagePrompt} - variation ${i + 1}`}
                                className={`gallery-image ${item.selectedImageUrl === url ? 'selected' : ''}`}
                                onClick={() => handleContentUpdate(activeTab, index, 'selectedImageUrl', url)}
                              />
                            ))}
                          </div>
                          {item.selectedImageUrl && (
                            <div className="image-edit-form">
                              <input
                                type="text"
                                className="image-edit-input"
                                placeholder="e.g., Make the background blue"
                                value={item.imageEditPrompt || ''}
                                onChange={(e) => handleContentUpdate(activeTab, index, 'imageEditPrompt', e.target.value)}
                              />
                              <button
                                className="generate-button generate-image-button"
                                onClick={() => handleImageEdit(activeTab, index)}
                                disabled={!item.imageEditPrompt?.trim()}
                              >
                                Update
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                         <div className="image-placeholder">No Image</div>
                         <button className="generate-button generate-image-button" onClick={() => triggerImageGeneration(activeTab, index)}>
                            Generate
                         </button>
                        </>
                      )}
                    </>
                  )}
                  {(item.format === 'Reel' || item.format === 'Short Video' || item.format === 'GIF') && (
                    <>
                      {item.isGeneratingVideo ? (
                        <div className="image-placeholder media-loading">
                          <div className="inline-spinner"></div>
                          <p>{item.videoGenerationMessage}</p>
                        </div>
                      ) : item.videoUrl ? (
                        <video src={item.videoUrl} controls style={{width: '100%', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <div className="image-placeholder">No Video</div>
                          <button className="generate-button generate-image-button" onClick={() => triggerVideoGeneration(activeTab, index)}>
                              Generate
                          </button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
    );
}

export default CalendarScreen;