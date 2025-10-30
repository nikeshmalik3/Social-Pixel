import React, { useState, useEffect } from 'react';
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

// FIX: Configure the PDF.js worker to resolve loading issues and enable PDF parsing.
// The URL is derived from the importmap in index.html to ensure consistency.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

// FIX: Moved the AIStudio interface definition inside the `declare global` block to resolve potential TypeScript scope conflicts with the `window` object augmentation.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    // FIX: Made `aistudio` optional to resolve the TypeScript error "All declarations of 'aistudio' must have identical modifiers." This aligns with its conditional usage in the code.
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
        // Spreading a default ensures all keys are present even if localStorage data is from an old version
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
        // Ensure the parsed data is a non-null object before returning
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
    localStorage.setItem('calendarData', JSON.stringify(calendarData));
    if (Object.keys(calendarData).length > 0 && !activeTab) {
      setActiveTab(Object.keys(calendarData)[0]);
    }
  }, [calendarData, activeTab]);

  const handleSelectApiKey = async () => {
    // FIX: Added a check for window.aistudio to prevent potential runtime errors now that its type is optional.
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
            // FIX: Add type guard to ensure result is an ArrayBuffer, resolving potential type inference issues.
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
              // FIX: Ensure an Error object is always rejected for consistent error handling, resolving an error with accessing properties on an 'unknown' type.
              if (error instanceof Error) {
                reject(error);
              } else {
                reject(new Error(String(error)));
              }
            }
          };
          // FIX: Ensure an Error object is rejected on reader error to prevent rejecting with a ProgressEvent.
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
            for (let i = 0; i < data.length; i += 4 * 4) { // Sample pixels for performance
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (data[i+3] < 125 || (r > 250 && g > 250 && b > 250) || (r < 10 && g < 10 && b < 10)) {
                    continue;
                }
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
    // FIX: Use `window.setInterval` to ensure the browser's implementation is used, which returns a `number` type, resolving the TypeScript error where it was inferred as Node.js's `Timeout` object.
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
          3. **Competitor Analysis**: If no competitor URLs were provided, find the top 5 key competitors. For each, analyze their content strategy, voice, and key themes.
              
          **IMPORTANT**: Your entire response MUST be a single, raw JSON object. Do not include markdown.
          The required JSON structure is:
          {
            "brandProfile": {
                "summary": "string",
                "visualIdentity": {
                    "logoColors": ["#hex1", "#hex2"],
                    "suggestedPalette": ["#hex3", "#hex4"],
                    "vibe": "string"
                }
            },
            "trendAnalysis": { "summary": "string", "trends": [{ "trend": "string", "description": "string" }] },
            "competitorAnalysis": { "summary": "string", "competitors": [{ "name": "string", "url": "string", "analysis": "string" }] }
          }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });
        
        if (analysisInterval) window.clearInterval(analysisInterval);

        let resultText = response.text.trim();
        const jsonStartIndex = resultText.indexOf('{');
        const jsonEndIndex = resultText.lastIndexOf('}');
        if (jsonStartIndex === -1 || jsonEndIndex === -1) throw new Error("AI response did not contain a valid JSON object.");
        
        resultText = resultText.substring(jsonStartIndex, jsonEndIndex + 1);
        
        const parsedResult = JSON.parse(resultText);
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks.map(chunk => chunk.web || { uri: '#', title: 'Internal Knowledge' });
        
        setAnalysisResult({ ...parsedResult, sources });
        setStep('review');

    } catch (e) {
        if (analysisInterval) window.clearInterval(analysisInterval);
        console.error("Analysis failed:", e);
        setError("The AI's response was not in the expected format. Please try again.");
        setStep('error');
    }
  };

  const handleGenerateCalendar = async () => {
    if (!analysisResult) {
      setError("Analysis data is missing.");
      setStep('error');
      return;
    }

    setPlatformsToGenerate(selectedPlatforms);
    setCalendarGenerationProgress({ currentPlatform: null, completedPlatforms: [] });
    setStep('generatingCalendar');
    setError(null);
    setCalendarData({}); // Clear previous calendar

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        for (const platform of selectedPlatforms) {
            setCalendarGenerationProgress(prev => ({ ...prev, currentPlatform: platform }));

            const prompt = `
              **Primary Goal:** Create a detailed, actionable ${calendarDuration}-day social media content calendar for ${profile.name}.
              **Target Platform:** Generate content specifically for ${platform}.

              **Core Brand Identity & Guidelines (Strictly Adhere):**
              - **Brand Summary:** ${analysisResult.brandProfile.summary}
              - **Brand Voice & Vibe:** ${analysisResult.brandProfile.visualIdentity.vibe}. Maintain this tone consistently.
              - **Brand Visual Palette:** ${analysisResult.brandProfile.visualIdentity.suggestedPalette.join(', ')}. Image and video prompts must reflect these colors and aesthetic.
              - **Content Focus:** ${profile.contentFocus}

              **Strategic Inputs (Base all content on this analysis):**
              - **Key Market Trends:** ${analysisResult.trendAnalysis.trends.map(t => t.trend).join(', ')}. Weave these themes naturally into the content.
              - **Competitor Intelligence:**
                ${analysisResult.competitorAnalysis.competitors.map(c => `- ${c.name}: ${c.analysis}`).join('\n')}
                Create content that is differentiated and superior to these competitor strategies.

              **Content Generation Instructions:**
              1. **Platform-Specific Tailoring:**
                  - For LinkedIn: Professional, insightful captions. Focus on industry leadership and value. Use 2-3 paragraphs.
                  - For Instagram: Visually-driven captions. Use emojis, storytelling, and engaging questions. Keep paragraphs short (1-2 sentences).
                  - For Facebook: Community-focused and conversational. A mix of professional and engaging tones. Use questions to prompt engagement.
                  - For X: Concise, punchy, and timely. Maximum 280 characters. Use threads for longer ideas if necessary.
              2. **Hashtag Strategy:** For each post, provide 5-7 highly relevant hashtags. Include a mix of broad industry hashtags, niche community hashtags, and unique branded hashtags. Base this on the provided trend and competitor analysis to maximize reach.
              3. **Formatting (CRITICAL):**
                  - All captions MUST be highly readable. Use short sentences and paragraphs. Break up text with double line breaks.
                  - Incorporate bullet points (using '*') and numbered lists where appropriate.
                  - Use relevant emojis to add personality and break up text, especially for Instagram and Facebook.
              4. **Media Prompts:**
                  - For all visual posts ('Image', 'Reel', etc.), provide a highly detailed, narrative "imagePrompt" for an AI image/video generator. The prompt must describe the scene, subjects, style, and mood, explicitly referencing the brand's visual palette and vibe.
              
              **Output Format (MANDATORY):**
              Respond with a single, valid JSON object.
              - The top-level key MUST be "${platform}".
              - The value for this key MUST be an array of ${calendarDuration} post objects.
              - Each post object must contain: "day", "format" ('Image', 'Reel', 'Short Video', 'GIF', 'Text'), "postType", "contentIdea" (the full, formatted caption), "hashtags", and "imagePrompt".
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });
            
            const jsonResponse = JSON.parse(response.text);
            setCalendarData(prev => ({ ...prev, ...jsonResponse }));
            setCalendarGenerationProgress(prev => ({ ...prev, currentPlatform: null, completedPlatforms: [...prev.completedPlatforms, platform] }));
        }

        setActiveTab(selectedPlatforms[0] || 'LinkedIn');
        setStep('calendar');

    } catch (e) {
        console.error(e);
        setError("An error occurred generating the calendar. Please try again.");
        setStep('error');
    }
  };
  
  const triggerImageGeneration = async (platform: string, index: number) => {
    const entry = calendarData[platform]?.[index];
    if (!entry) return;

    setCalendarData(prev => ({ ...prev, [platform]: prev[platform].map((item, i) => i === index ? { ...item, isGeneratingImage: true } : item) }));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: entry.imagePrompt,
            config: {
                numberOfImages: 3,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        const imageUrls = response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
        
        setCalendarData(prev => ({
            ...prev,
            [platform]: prev[platform].map((item, i) => i === index ? {
                ...item,
                imageUrls,
                selectedImageUrl: imageUrls[0],
                isGeneratingImage: false
            } : item)
        }));
    } catch (e) {
        console.error("Image generation failed:", e);
        setCalendarData(prev => ({ ...prev, [platform]: prev[platform].map((item, i) => i === index ? { ...item, isGeneratingImage: false } : item) }));
        // Optionally show an error in the UI
    }
  };

  const triggerVideoGeneration = async (platform: string, index: number) => {
    const entry = calendarData[platform]?.[index];
    if (!entry) return;

    const updateMessage = (message: string) => {
        setCalendarData(prev => ({
            ...prev,
            [platform]: prev[platform].map((item, i) => i === index ? { ...item, videoGenerationMessage: message } : item)
        }));
    };

    setCalendarData(prev => ({ ...prev, [platform]: prev[platform].map((item, i) => i === index ? { ...item, isGeneratingVideo: true, videoGenerationMessage: VEO_MESSAGES[0] } : item) }));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: entry.imagePrompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
        });

        let messageIndex = 1;
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            updateMessage(VEO_MESSAGES[messageIndex % VEO_MESSAGES.length]);
            messageIndex++;
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");
        
        updateMessage('Downloading video...');
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        
        setCalendarData(prev => ({
            ...prev,
            [platform]: prev[platform].map((item, i) => i === index ? {
                ...item,
                videoUrl,
                isGeneratingVideo: false
            } : item)
        }));
    } catch (e) {
        console.error("Video generation failed:", e);
        updateMessage(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        // Keep isGeneratingVideo as true to show the error, but add a button to retry or clear
        setCalendarData(prev => ({ ...prev, [platform]: prev[platform].map((item, i) => i === index ? { ...item, isGeneratingVideo: false } : item) }));
    }
  };

  const handleImageEdit = async (platform: string, index: number) => {
    const entry = calendarData[platform]?.[index];
    if (!entry || !entry.selectedImageUrl || !entry.imageEditPrompt) return;

    setCalendarData(prev => ({ ...prev, [platform]: prev[platform].map((item, i) => i === index ? { ...item, isGeneratingImage: true } : item) }));
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = entry.selectedImageUrl.split(',')[1];
        const mimeType = entry.selectedImageUrl.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: entry.imageEditPrompt }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) {
            const newBase64 = part.inlineData.data;
            const newMime = part.inlineData.mimeType;
            const newImageUrl = `data:${newMime};base64,${newBase64}`;
            
            setCalendarData(prev => {
                const newPlatformData = [...prev[platform]];
                const currentItem = newPlatformData[index];
                const newImageUrls = [...(currentItem.imageUrls || [])];
                const editIndex = newImageUrls.indexOf(currentItem.selectedImageUrl || '');
                if (editIndex !== -1) {
                    newImageUrls[editIndex] = newImageUrl;
                } else {
                    newImageUrls.push(newImageUrl);
                }
                newPlatformData[index] = {
                    ...currentItem,
                    imageUrls: newImageUrls,
                    selectedImageUrl: newImageUrl,
                    isGeneratingImage: false,
                    imageEditPrompt: ''
                };
                return { ...prev, [platform]: newPlatformData };
            });
        } else {
             throw new Error("No image data returned from edit.");
        }
    } catch (e) {
        console.error("Image edit failed:", e);
        setCalendarData(prev => ({ ...prev, [platform]: prev[platform].map((item, i) => i === index ? { ...item, isGeneratingImage: false } : item) }));
    }
  };

  const handleContentUpdate = (platform: string, index: number, field: keyof CalendarEntry, value: string) => {
    setCalendarData(prev => ({
        ...prev,
        [platform]: prev[platform].map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };
  
  const startOver = () => {
    localStorage.removeItem('calendarData');
    if (analysisInterval) window.clearInterval(analysisInterval);
    setCalendarData({});
    setStep('profile');
    setError(null);
    setAnalysisResult(null);
    setAnalysisProgress([]);
  };

  const handleExport = () => {
    if (!calendarData[activeTab]) return;
    const headers = ['Day', 'Format', 'Post Type', 'Content', 'Hashtags', 'Media URL/Prompt'];
    const rows = calendarData[activeTab].map(item => [
      item.day,
      item.format,
      item.postType,
      `"${item.contentIdea.replace(/"/g, '""')}"`, // Escape quotes
      `"${item.hashtags.replace(/"/g, '""')}"`,
      `"${(item.selectedImageUrl || item.videoUrl || item.imagePrompt).replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${profile.name}_${activeTab}_calendar.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        return <ReviewScreen
          analysisResult={analysisResult}
          setStep={setStep}
          handleGenerateCalendar={handleGenerateCalendar}
        />;
      case 'generatingCalendar':
        return <LoadingScreen
          message="Crafting your multi-platform calendar..."
          platforms={platformsToGenerate}
          currentPlatform={calendarGenerationProgress.currentPlatform}
          completedPlatforms={calendarGenerationProgress.completedPlatforms}
        />;
      case 'calendar':
        if (Object.keys(calendarData).length > 0) {
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
        }
        return <LoadingScreen message="Loading..." />;
      case 'error':
        return <ErrorScreen error={error} startOver={startOver} />;
      default:
        return null;
    }
  };

  if (!isApiKeySelected) {
    return <ApiKeyScreen onSelectKey={handleSelectApiKey} />;
  }

  return (
    <div className="container">
      {renderStep()}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);