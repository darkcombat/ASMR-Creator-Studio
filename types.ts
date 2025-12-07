export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  videoUrl?: string;
  timestamp: Date;
}

export interface VideoPlanRequest {
  topic: string;
  category: string;
  duration?: string;
  preferences?: string;
}

export enum ASMRCategory {
  ROLEPLAY = 'Roleplay',
  TAPPING = 'Tapping & Scratching',
  SLEEP_AID = 'Sleep Aid',
  PERSONAL_ATTENTION = 'Personal Attention',
  MUKBANG = 'Eating Sounds',
  STUDY = 'Study with Me',
  UNBOXING = 'Unboxing',
  MEDITATION = 'Guided Meditation'
}