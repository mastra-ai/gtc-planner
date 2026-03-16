export interface Session {
  id: string;
  code: string;
  title: string;
  abstract: string;
  type: string;
  lengthMinutes: number;
  viewingExperience: string;
  language: string;
  featured: boolean;
  speakers: { name: string; company: string; jobTitle: string; role: string }[];
  schedule: {
    date: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  }[];
}

export interface Party {
  id: string;
  day: string;
  date: string;
  time: string;
  sponsors: string[];
  title: string;
  rsvpUrl: string;
  location: string;
  inviteOnly: boolean;
  description?: string;
}

export interface ItineraryItem {
  id: string;
  type: 'session' | 'party';
  title: string;
  day: string;
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  location?: string;
  code?: string;
  sessionType?: string;
  sponsors?: string[];
  note?: string;
}

export interface UserProfile {
  name: string;
  role: string;
  company: string;
  industry: string;
  interests: string;
  experience: string;
}
