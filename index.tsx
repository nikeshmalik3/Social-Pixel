import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';

import type { AppStep, CompanyProfile, AnalysisResult, CalendarData, CalendarEntry } from './types';

import ProfileScreen from './components/ProfileScreen';
import AnalysisScreen from './components/AnalysisScreen';
import ReviewScreen from './components/ReviewScreen';
import LoadingScreen from './components/LoadingScreen';
import CalendarScreen from './components/CalendarScreen';
import ErrorScreen from './components/ErrorScreen';
import ApiKeyScreen from './components/ApiKeyScreen';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    aistudio?: AIStudio;
    process: {
      env: {
        API_KEY: string;
      }
    }
  }
}

const ANALYSIS_STEPS = [
    'Analyzing brand identity & logo colors...',
    'Extracting themes from knowledge base...',
    'Scraping provided website & social media URLs...',
    'Identifying top 5 market competitors using Google Search...',
    'Analyzing Competitor #1 strategy...',
    'Analyzing Competitor #2 strategy...',
    'Analyzing Competitor #3 strategy...',
    'Analyzing Competitor #4 strategy...',
    'Analyzing Competitor #5 strategy...',
    'Researching current industry trends & hashtags...',
    'Synthesizing strategic report...'
];

const VEO_MESSAGES = [
    'Initializing video engine...',
    'Analyzing visual prompt...',
    'Compositing initial scenes...',
    'Upscaling to high resolution...',
    'Applying cinematic effects...',
    'Rendering final frames...',
    'Finalizing video, almost there...'
];

const ALL_PLATFORMS = ['LinkedIn', 'Instagram', 'Facebook', 'X'];

const App = () => {
  const [step, setStep] = useState<AppStep>('profile');
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    const savedProfile = localStorage.getItem('companyProfile');
    const defaultProfile = {
      name: '', website: '', socials: '', competitors: '', knowledgeBase: '', logo: null, contentFocus: '', logoColors: []
    };
    if (savedProfile) {
      try {
        return { ...defaultProfile, ...JSON.parse(savedProfile) };
      } catch (e) {
        console.error('Failed to parse company profile from localStorage, using default.', e);
        return defaultProfile;
      }
    }
    return defaultProfile;
  });
  const [calendarData, setCalendarData] = useState<CalendarData>(() => {
    const savedCalendar = localStorage.getItem('calendarData');
    if (savedCalendar) {
      try {
        const parsed = JSON.parse(savedCalendar);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse calendar data from localStorage, using default.', e);
      }
    }
    return {};
  });
  
  const [knowledgeBaseFileNames, setKnowledgeBaseFileNames] = useState<string[] | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>('LinkedIn');
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);
  const [platformsToGenerate, setPlatformsToGenerate] = useState<string[]>([]);
  const [calendarGenerationProgress, setCalendarGenerationProgress] = useState<{ currentPlatform: string | null; completedPlatforms: string[] }>({ currentPlatform: null, completedPlatforms: [] });
  const [analysisInterval, setAnalysisInterval] = useState<number | null>(null);
  const [calendarDuration, setCalendarDuration] = useState(30);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(ALL_PLATFORMS);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        setIsApiKeySelected(true);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    const savedCalendar = localStorage.getItem('calendarData');
    if (savedCalendar && savedCalendar !== '{}') {
      setStep('calendar');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('companyProfile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (Object.keys(calendarData).length > 0) {
        const storableCalendarData: CalendarData = {};
        for (const platform in calendarData) {
            storableCalendarData[platform] = calendarData[platform].map(entry => {
                const { 
                    imageUrls, 
                    selectedImageUrl, 
                    videoUrl, 
                    isGeneratingImage, 
                    isGeneratingVideo,
                    videoGenerationMessage,
                    ...rest 
                } = entry;
                return rest;
            });
        }
        try {
            localStorage.setItem('calendarData', JSON.stringify(storableCalendarData));
        } catch (e) {
            console.error("Failed to save calendar data to localStorage (quota may be exceeded):", e);
        }
    } else {
        localStorage.removeItem('calendarData');
    }

    if (Object.keys(calendarData).length > 0 && !activeTab) {
      setActiveTab(Object.keys(calendarData)[0]);
    }
  }, [calendarData, activeTab]);

  const handleSelectApiKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
    setIsApiKeySelected(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCalendarDuration(Number(e.target.value));
  };

  const handlePlatformChange = (platform: string) => {
      setSelectedPlatforms(prev =>
          prev.includes(platform)
              ? prev.filter(p => p !== platform)
              : [...prev, platform]
      );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'knowledgeBase' | 'logo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fileType === 'knowledgeBase') {
      const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (!event.target?.result || !(event.target.result instanceof ArrayBuffer)) {
              return reject(new Error('FileReader failed to read the file as an ArrayBuffer.'));
            }
            try {
              const pdfData = new Uint8Array(event.target.result);
              const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
              let fileText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
                fileText += pageText + ' ';
              }
              resolve(fileText.trim());
            } catch (error) {
              if (error instanceof Error) {
                reject(error);
              } else {
                reject(new Error(String(error)));
              }
            }
          };
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsArrayBuffer(file);
        });
      });

      try {
        setError(null);
        const texts = await Promise.all(filePromises);
        setProfile(prev => ({ ...prev, knowledgeBase: texts.join('\n\n') }));
        setKnowledgeBaseFileNames(Array.from(files).map(f => f.name));
      } catch (error) {
        console.error('Error processing PDFs:', error);
        setError('Failed to process one or more PDF files.');
        setKnowledgeBaseFileNames(null);
      }

    } else if (fileType === 'logo') {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(100 / img.width, 100 / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const colorCounts: { [key: string]: number } = {};
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4 * 4) { // Sample every 4th pixel
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Skip transparent, white, or black pixels
                if (data[i+3] < 125 || (r > 250 && g > 250 && b > 250) || (r < 10 && g < 10 && b < 10)) {
                    continue;
                }
                // Group similar colors
                const key = `${Math.round(r/20)*20},${Math.round(g/20)*20},${Math.round(b/20)*20}`;
                colorCounts[key] = (colorCounts[key] || 0) + 1;
            }
            const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
            const dominantColors = sortedColors.slice(0, 5).map(key => {
                const [r, g, b] = key.split(',').map(Number);
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
            });
            
            setProfile(prev => ({ ...prev, logo: imageUrl, logoColors: dominantColors }));
        };
        img.src = imageUrl;
        setLogoFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleStartAnalysis = async () => {
    if (!profile.name.trim()) {
        setError("Company name is required.");
        return;
    }
    setStep('analyzing');
    setError(null);
    setAnalysisProgress([]);

    if (analysisInterval) window.clearInterval(analysisInterval);

    let stepIndex = 0;
    const interval = window.setInterval(() => {
        if (stepIndex < ANALYSIS_STEPS.length) {
            setAnalysisProgress(p => [...p, ANALYSIS_STEPS[stepIndex]]);
            stepIndex++;
        } else {
            window.clearInterval(interval);
        }
    }, 2500);
    setAnalysisInterval(interval);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const userURLs = [profile.website, ...profile.socials.split(',')].map(u => u.trim()).filter(Boolean);
        const competitorURLs = profile.competitors.split(',').map(u => u.trim()).filter(Boolean);

        const prompt = `
          Analyze the provided company and its market to create a strategic foundation for a social media calendar.
          Company Name: ${profile.name}
          Company URLs: ${userURLs.join(', ')}
          User-Provided Competitor URLs: ${competitorURLs.join(', ')}
          Company Focus/Voice: "${profile.contentFocus}"
          Extracted Brand Colors from Logo: ${profile.logoColors.join(', ')}
          Internal Knowledge Base: """${profile.knowledgeBase}"""

          Perform a deep analysis using Google Search and return ONE valid JSON object.

          1. **Brand Profile**: Synthesize all info into a brand summary. Include a 'visualIdentity' section analyzing the logo colors and suggesting a vibe.
          2. **Market Trends**: Identify the top 3-5 current, relevant market trends for this industry.
          3. **Competitor Analysis**: If no competitor URLs were provided, find the top 5 key competitors. For each, analyze their content strategy, voice, and key themes/pillars.
          4. **Output Schema**: Structure your entire response as a single, valid JSON object matching this schema. Do not add markdown formatting like \`\`\`json.
          {
            "brandProfile": {"summary": "string", "visualIdentity": {"logoColors": ["string"], "suggestedPalette": ["string"], "vibe": "string"}},
            "trendAnalysis": {"summary": "string", "trends": [{"trend": "string", "description": "string"}]},
            "competitorAnalysis": {"summary": "string", "competitors": [{"name": "string", "url": "string", "analysis": "string"}]}
          }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        window.clearInterval(interval);

        const text = response.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        
        const parsedResult = JSON.parse(jsonString) as Omit<AnalysisResult, 'sources'>;

        const resultWithSources: AnalysisResult = {
            ...parsedResult,
            sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks
                ?.map(chunk => chunk.web)
                .filter(Boolean) as Array<{ uri: string; title: string; }> || []
        };
        
        setAnalysisResult(resultWithSources);
        setStep('review');

    } catch (e) {
        window.clearInterval(interval);
        console.error("Analysis failed:", e);
        if (e instanceof Error) {
            setError(`Analysis failed: ${e.message}. Please check your API key and network connection.`);
        } else {
            setError("An unknown error occurred during analysis.");
        }
        setStep('error');
    }
  };

  const handleGenerateCalendar = async () => {
    if (!analysisResult) return;
    setStep('generatingCalendar');
    setCalendarGenerationProgress({ currentPlatform: null, completedPlatforms: [] });
    setActiveTab(selectedPlatforms[0]);
    
    let newCalendarData: CalendarData = {};

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      for (const platform of selectedPlatforms) {
        setCalendarGenerationProgress(prev => ({ ...prev, currentPlatform: platform }));

        const prompt = `
            Based on this strategic analysis, create a ${calendarDuration}-day social media content calendar for ${platform}.
            Analysis: ${JSON.stringify(analysisResult)}

            Generate an array of ${calendarDuration} JSON objects, one for each day.
            The response MUST be a single valid JSON array. Do not add markdown formatting.

            For each day, provide:
            - "day": (e.g., "Day 1")
            - "format": Choose from 'Image', 'Reel', 'Short Video', 'GIF', or 'Text'.
            - "postType": A category like 'Educational', 'Behind the Scenes', 'Product Spotlight', 'User-Generated Content', 'Question/Poll', 'Company News'.
            - "contentIdea": A detailed caption for the post, written in a voice suitable for ${platform}.
            - "hashtags": A string of relevant hashtags, starting with '#'.
            - "imagePrompt": A detailed, descriptive prompt for an AI image generator to create a visual for the post. Describe the scene, style, colors, and composition.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        newCalendarData[platform] = JSON.parse(jsonString);

        setCalendarGenerationProgress(prev => ({
            ...prev,
            completedPlatforms: [...prev.completedPlatforms, platform]
        }));
      }
      setCalendarData(newCalendarData);
      setStep('calendar');
    } catch (e) {
      console.error('Calendar generation failed:', e);
      if (e instanceof Error) {
        setError(`Failed to generate calendar for ${calendarGenerationProgress.currentPlatform}: ${e.message}`);
      } else {
        setError('An unknown error occurred during calendar generation.');
      }
      setStep('error');
    }
  };

  const handleContentUpdate = (platform: string, index: number, field: keyof CalendarEntry, value: any) => {
    setCalendarData(prev => {
      const newPlatformData = [...(prev[platform] || [])];
      if (newPlatformData[index]) {
        newPlatformData[index] = { ...newPlatformData[index], [field]: value };
      }
      return { ...prev, [platform]: newPlatformData };
    });
  };

  const triggerImageGeneration = async (platform: string, index: number) => {
    const entry = calendarData[platform]?.[index];
    if (!entry) return;

    handleContentUpdate(platform, index, 'isGeneratingImage', true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: entry.imagePrompt,
            config: { numberOfImages: 3 }
        });
        
        const imageUrls = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
        handleContentUpdate(platform, index, 'imageUrls', imageUrls);
        handleContentUpdate(platform, index, 'selectedImageUrl', imageUrls[0]);

    } catch (e) {
        console.error('Image generation failed:', e);
        setError('Failed to generate images. Please try again.');
    } finally {
        handleContentUpdate(platform, index, 'isGeneratingImage', false);
    }
  };
  
  const handleImageEdit = async (platform: string, index: number) => {
    const entry = calendarData[platform]?.[index];
    if (!entry || !entry.selectedImageUrl || !entry.imageEditPrompt) return;

    handleContentUpdate(platform, index, 'isGeneratingImage', true);
    
    try {
        const base64Data = entry.selectedImageUrl.split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType: 'image/png' } },
                    { text: entry.imageEditPrompt }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        const newImageUrls: string[] = [];
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                newImageUrls.push(`data:image/png;base64,${part.inlineData.data}`);
            }
        }
        
        if (newImageUrls.length > 0) {
            handleContentUpdate(platform, index, 'imageUrls', newImageUrls);
            handleContentUpdate(platform, index, 'selectedImageUrl', newImageUrls[0]);
            handleContentUpdate(platform, index, 'imageEditPrompt', '');
        }

    } catch (e) {
        console.error('Image edit failed:', e);
        setError('Failed to edit image. Please try again.');
    } finally {
        handleContentUpdate(platform, index, 'isGeneratingImage', false);
    }
  };
  
  const triggerVideoGeneration = async (platform: string, index: number) => {
    const entry = calendarData[platform]?.[index];
    if (!entry) return;

    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setIsApiKeySelected(false);
      setStep('apiKey');
      return;
    }
    
    handleContentUpdate(platform, index, 'isGeneratingVideo', true);
    handleContentUpdate(platform, index, 'videoGenerationMessage', VEO_MESSAGES[0]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: entry.imagePrompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
      });
      
      let messageIndex = 1;
      const intervalId = setInterval(() => {
          handleContentUpdate(platform, index, 'videoGenerationMessage', VEO_MESSAGES[messageIndex % VEO_MESSAGES.length]);
          messageIndex++;
      }, 5000);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }
      
      clearInterval(intervalId);

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);
        handleContentUpdate(platform, index, 'videoUrl', videoUrl);
      } else {
        throw new Error('Video generation completed but no download link was found.');
      }

    } catch (e) {
        console.error('Video generation failed:', e);
        if (e instanceof Error && e.message.includes('Requested entity was not found')) {
            setError('Video generation failed. Your API key may be invalid. Please select a valid key.');
            setIsApiKeySelected(false);
            setStep('apiKey');
        } else {
            setError('Failed to generate video. Please try again.');
        }
    } finally {
        handleContentUpdate(platform, index, 'isGeneratingVideo', false);
    }
  };

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Platform,Day,Format,Post Type,Content Idea,Hashtags,Media URL\n";

    Object.entries(calendarData).forEach(([platform, entries]) => {
      entries.forEach(entry => {
        const row = [
          platform,
          entry.day,
          entry.format,
          entry.postType,
          `"${entry.contentIdea.replace(/"/g, '""')}"`,
          `"${entry.hashtags.replace(/"/g, '""')}"`,
          entry.selectedImageUrl || entry.videoUrl || ''
        ].join(',');
        csvContent += row + "\r\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "social_media_calendar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const startOver = () => {
    localStorage.removeItem('companyProfile');
    localStorage.removeItem('calendarData');
    setProfile({ name: '', website: '', socials: '', competitors: '', knowledgeBase: '', logo: null, contentFocus: '', logoColors: [] });
    setCalendarData({});
    setAnalysisResult(null);
    setLogoFileName(null);
    setKnowledgeBaseFileNames(null);
    setSelectedPlatforms(ALL_PLATFORMS);
    setStep('profile');
    setError(null);
  };

  const renderStep = () => {
    switch(step) {
      case 'profile':
        return <ProfileScreen 
          profile={profile} 
          handleProfileChange={handleProfileChange} 
          handleFileChange={handleFileChange}
          logoFileName={logoFileName}
          knowledgeBaseFileNames={knowledgeBaseFileNames}
          error={error}
          handleStartAnalysis={handleStartAnalysis}
          step={step}
          calendarDuration={calendarDuration}
          selectedPlatforms={selectedPlatforms}
          handleDurationChange={handleDurationChange}
          handlePlatformChange={handlePlatformChange}
          allPlatforms={ALL_PLATFORMS}
        />;
      case 'analyzing':
        return <AnalysisScreen allSteps={ANALYSIS_STEPS} progress={analysisProgress} />;
      case 'review':
        return <ReviewScreen analysisResult={analysisResult} setStep={setStep} handleGenerateCalendar={handleGenerateCalendar} />;
      case 'generatingCalendar':
        return <LoadingScreen message="Generating content calendar..." {...calendarGenerationProgress} platforms={selectedPlatforms} />;
      case 'calendar':
        return <CalendarScreen
            calendarData={calendarData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleContentUpdate={handleContentUpdate}
            triggerImageGeneration={triggerImageGeneration}
            triggerVideoGeneration={triggerVideoGeneration}
            handleImageEdit={handleImageEdit}
            handleExport={handleExport}
            startOver={startOver}
        />;
      case 'apiKey':
        return <ApiKeyScreen onSelectKey={handleSelectApiKey} />;
      case 'error':
        return <ErrorScreen error={error} startOver={startOver} />;
      default:
        return <ErrorScreen error="Invalid application state." startOver={startOver} />;
    }
  };

  return (
    <div className="container">
      {renderStep()}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);