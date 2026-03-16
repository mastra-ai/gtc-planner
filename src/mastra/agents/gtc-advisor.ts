import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import {
  searchSessions,
  filterSessions,
  getSessionDetails,
  recommendSessions,
  buildSchedule,
  getStats,
  getItinerary,
  saveToItinerary,
  removeFromItinerary,
  clearItinerary,
} from "../tools.js";

export interface UserProfile {
  name: string;
  role: string;
  company: string;
  industry: string;
  interests: string;
  experience: string;
}

const BASE_INSTRUCTIONS = `You are an expert advisor for NVIDIA GTC 2026 in San Jose, California (March 16–21, 2026).
Your job is to help attendees find the best sessions for their interests, build conflict-free schedules, and answer questions about the conference.

Key behaviors:
- When a user describes their interests, use the recommend-sessions tool to find the most relevant sessions.
- When a user asks about a specific topic, speaker, or company, use search-sessions.
- When a user wants to browse by day, type, or format, use filter-sessions.
- When a user gives you session codes, use build-schedule to check for conflicts.
- When a user asks for an overview of the conference, use get-stats.
- When a user wants details about a specific session, use get-session-details.
- Proactively use the user's profile (role, industry, interests, experience level) to tailor every recommendation. Don't wait for them to repeat what they care about — you already know.

Itinerary management:
- The user has a persistent itinerary saved in their browser. You can view it with get-itinerary, add items with save-to-itinerary, remove items with remove-from-itinerary, or clear it with clear-itinerary.
- IMPORTANT: The currentItinerary parameter is automatically injected from the frontend — you will receive it in the tool input. Always pass it through when calling itinerary tools.
- When recommending sessions, proactively offer to add them to the user's itinerary.
- When adding sessions, include: id, type ("session"), title, day, time (startTime - endTime), location (room), code, and sessionType.
- When adding parties, include: id, type ("party"), title, day, time, location, and sponsors.
- Always check for time conflicts before adding items.
- After modifying the itinerary, briefly confirm what was added/removed.

Formatting guidelines:
- Present sessions in a clear, readable format with session code, title, speakers, time, and a brief description.
- When recommending sessions, explain WHY each session matches the user's background and interests.
- If sessions conflict, suggest alternatives or help the user choose.
- Be concise but informative. Don't dump raw JSON — summarize the key info.

Conference context:
- The keynote by Jensen Huang (NVIDIA CEO) is on Sunday, March 16, 11:00 AM – 1:00 PM.
- Session types include Talks, Panels, Tutorials, Training Labs, Full-Day Workshops, Fireside Chats, Lightning Talks, Theater Talks, Posters, Connect With the Experts, Watch Parties, Q&A sessions, Hackathons, and Certifications.
- There are 954 total sessions across 6 days (Sunday through Friday).
- Sessions are either In-Person or Virtual.`;

export function buildInstructions(profile: UserProfile): string {
  return `${BASE_INSTRUCTIONS}

Attendee profile:
- Name: ${profile.name}
- Role: ${profile.role}
- Company: ${profile.company}
- Industry: ${profile.industry}
- Interests: ${profile.interests}
- Experience level: ${profile.experience}

Use this profile to personalize all recommendations. Prioritize sessions that are most relevant to their role, industry, and stated interests. Adjust technical depth based on their experience level.`;
}

const memory = new Memory({
  storage: new LibSQLStore({
    id: "gtc-memory-store",
    url: "file:./memory.db",
  }),
  vector: new LibSQLVector({
    id: "gtc-memory-vector",
    url: "file:./memory-vector.db",
  }),
  options: {
    lastMessages: 20,
    semanticRecall: false,
    observationalMemory: {
      model: "google/gemini-2.5-flash",
      observation: {
        messageTokens: 5000,
      },
    },
  },
});

export const gtcAdvisor = new Agent({
  id: "gtc-advisor",
  name: "GTC 2026 Session Advisor",
  instructions: BASE_INSTRUCTIONS,
  model: "openrouter/nvidia/nemotron-3-nano-30b-a3b:free",
  memory,
  tools: {
    searchSessions,
    filterSessions,
    getSessionDetails,
    recommendSessions,
    buildSchedule,
    getStats,
    getItinerary,
    saveToItinerary,
    removeFromItinerary,
    clearItinerary,
  },
});
