export type AppStep = 'profile' | 'analyzing' | 'review' | 'generatingCalendar' | 'calendar' | 'error';

export interface CompanyProfile {
  name: string;
  website: string;
  socials: string;
  competitors: string;
  knowledgeBase: string;
  logo: string | null;
  contentFocus: string;
  logoColors: string[];
}

export interface AnalysisResult {
  brandProfile: {
    summary: string;
    visualIdentity: {
      logoColors: string[];
      suggestedPalette: string[];
      vibe: string;
    }
  };
  trendAnalysis: {
    summary: string;
    trends: Array<{ trend: string; description: string; }>;
  };
  competitorAnalysis: {
    summary: string;
    competitors: Array<{
      name: string;
      url: string;
      analysis: string;
    }>;
  };
  sources: Array<{ uri: string; title: string }>;
}

export interface CalendarEntry {
  day: string;
  format: 'Image' | 'Reel' | 'Short Video' | 'GIF' | 'Text';
  postType: string;
  contentIdea: string;
  hashtags: string;
  imagePrompt: string;
  imageUrls?: string[];
  selectedImageUrl?: string;
  imageEditPrompt?: string;
  isGeneratingImage?: boolean;
  videoUrl?: string;
  isGeneratingVideo?: boolean;
  videoGenerationMessage?: string;
}

export interface CalendarData {
  [platform: string]: CalendarEntry[];
}
