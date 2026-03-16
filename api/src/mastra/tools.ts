import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

function findDataFile(filename: string): string {
  const candidates = [
    join(process.cwd(), `src/data/${filename}`),
    join(process.cwd(), `../src/data/${filename}`),
    join(process.cwd(), `../../src/data/${filename}`),
    join(process.cwd(), `../../../src/data/${filename}`),
    `/app/src/data/${filename}`,
    resolve(`src/data/${filename}`),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `${filename} not found. Tried: ${candidates.join(", ")}. cwd=${process.cwd()}`
  );
}

interface Session {
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

const sessions: Session[] = JSON.parse(
  readFileSync(findDataFile("sessions.json"), "utf-8")
);

interface Party {
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

const parties: Party[] = JSON.parse(
  readFileSync(findDataFile("parties.json"), "utf-8")
);

function matchesQuery(session: Session, query: string): boolean {
  const q = query.toLowerCase();
  const searchable = [
    session.title,
    session.abstract,
    session.type,
    ...session.speakers.map((s) => `${s.name} ${s.company} ${s.jobTitle}`),
  ]
    .join(" ")
    .toLowerCase();

  const terms = q.split(/\s+/).filter(Boolean);
  return terms.every((term) => searchable.includes(term));
}

export const searchSessions = createTool({
  id: "search-sessions",
  description:
    "Search GTC 2026 sessions by keyword. Searches across titles, abstracts, speakers, and companies. Returns matching sessions with full details.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Search keyword or phrase (e.g., 'RAG', 'robotics', 'Jensen Huang', 'Cursor')"
      ),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Max results to return (default 10)"),
  }),
  outputSchema: z.object({
    count: z.number(),
    sessions: z.array(z.any()),
  }),
  execute: async ({ query, limit }) => {
    const results = sessions
      .filter((s) => matchesQuery(s, query))
      .slice(0, limit);
    return { count: results.length, sessions: results };
  },
});

export const filterSessions = createTool({
  id: "filter-sessions",
  description:
    "Filter GTC 2026 sessions by day, session type, viewing experience, or language. Use this when users want to see what's available on a specific day or of a specific format.",
  inputSchema: z.object({
    day: z
      .enum([
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ])
      .optional()
      .describe("Day of the week"),
    type: z
      .string()
      .optional()
      .describe(
        "Session type: Talk, Panel, Tutorial, Training Lab, Full-Day Workshop, Fireside Chat, Lightning Talk, Theater Talk, Posters, Connect With the Experts, Keynote, Watch Party, Q&A With NVIDIA Experts, Hackathon, Certification"
      ),
    viewingExperience: z
      .enum(["In-Person", "Virtual"])
      .optional()
      .describe("In-Person or Virtual"),
    language: z
      .string()
      .optional()
      .describe("Session language (e.g., English, Japanese)"),
    featured: z.boolean().optional().describe("Only show featured sessions"),
    limit: z
      .number()
      .optional()
      .default(15)
      .describe("Max results to return"),
  }),
  outputSchema: z.object({
    count: z.number(),
    totalMatches: z.number(),
    sessions: z.array(z.any()),
  }),
  execute: async (input) => {
    let results = [...sessions];

    if (input.day) {
      results = results.filter((s) =>
        s.schedule.some((t) => t.day === input.day)
      );
    }
    if (input.type) {
      const typeLower = input.type.toLowerCase();
      results = results.filter((s) =>
        s.type.toLowerCase().includes(typeLower)
      );
    }
    if (input.viewingExperience) {
      results = results.filter(
        (s) => s.viewingExperience === input.viewingExperience
      );
    }
    if (input.language) {
      results = results.filter(
        (s) => s.language.toLowerCase() === input.language!.toLowerCase()
      );
    }
    if (input.featured) {
      results = results.filter((s) => s.featured);
    }

    const totalMatches = results.length;
    const lim = input.limit ?? 15;
    return {
      count: Math.min(results.length, lim),
      totalMatches,
      sessions: results.slice(0, lim),
    };
  },
});

export const getSessionDetails = createTool({
  id: "get-session-details",
  description:
    "Get full details of a specific session by its session code (e.g., S81595) or session ID.",
  inputSchema: z.object({
    code: z.string().describe("Session code (e.g., S81595) or session ID"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    session: z.any().optional(),
  }),
  execute: async ({ code }) => {
    const session = sessions.find(
      (s) =>
        s.code.toLowerCase() === code.toLowerCase() || s.id === code
    );
    return { found: !!session, session: session || undefined };
  },
});

export const recommendSessions = createTool({
  id: "recommend-sessions",
  description:
    "Get personalized session recommendations based on user interests/topics. Provide multiple interest keywords and the tool will score and rank sessions by relevance.",
  inputSchema: z.object({
    interests: z
      .array(z.string())
      .describe(
        "List of interest topics (e.g., ['RAG', 'agentic AI', 'robotics', 'CUDA'])"
      ),
    day: z
      .enum([
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ])
      .optional()
      .describe("Optionally restrict to a specific day"),
    type: z
      .string()
      .optional()
      .describe("Optionally restrict to a session type"),
    viewingExperience: z.enum(["In-Person", "Virtual"]).optional(),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Max recommendations"),
  }),
  outputSchema: z.object({
    count: z.number(),
    recommendations: z.array(z.any()),
  }),
  execute: async (input) => {
    let pool = [...sessions];

    if (input.day) {
      pool = pool.filter((s) =>
        s.schedule.some((t) => t.day === input.day)
      );
    }
    if (input.type) {
      const typeLower = input.type.toLowerCase();
      pool = pool.filter((s) => s.type.toLowerCase().includes(typeLower));
    }
    if (input.viewingExperience) {
      pool = pool.filter(
        (s) => s.viewingExperience === input.viewingExperience
      );
    }

    const scored = pool.map((s) => {
      const searchable = [
        s.title,
        s.abstract,
        s.type,
        ...s.speakers.map((sp) => `${sp.name} ${sp.company}`),
      ]
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const interest of input.interests) {
        const terms = interest.toLowerCase().split(/\s+/);
        if (terms.every((t: string) => searchable.includes(t))) {
          score += 2;
        } else {
          for (const term of terms) {
            if (searchable.includes(term)) score += 1;
          }
        }
      }
      if (s.featured) score += 0.5;
      return { session: s, score };
    });

    const recommendations = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit)
      .map((r) => ({ ...r.session, relevanceScore: r.score }));

    return { count: recommendations.length, recommendations };
  },
});

export const buildSchedule = createTool({
  id: "build-schedule",
  description:
    "Given a list of session codes, build a conflict-free schedule. Detects time overlaps and suggests alternatives.",
  inputSchema: z.object({
    sessionCodes: z
      .array(z.string())
      .describe(
        "List of session codes to include in the schedule (e.g., ['S81595', 'S81490'])"
      ),
  }),
  outputSchema: z.object({
    schedule: z.array(z.any()),
    conflicts: z.array(z.any()),
  }),
  execute: async ({ sessionCodes }) => {
    const selected = sessionCodes
      .map((code: string) =>
        sessions.find(
          (s) =>
            s.code.toLowerCase() === code.toLowerCase() || s.id === code
        )
      )
      .filter(Boolean) as Session[];

    const dayOrder: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
    };

    const withTime = selected
      .map((s) => ({
        ...s,
        sortKey: s.schedule[0]
          ? `${dayOrder[s.schedule[0].day] ?? 9}-${s.schedule[0].startTime}`
          : "z",
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    const conflicts: {
      session1: string;
      session2: string;
      overlap: string;
    }[] = [];
    for (let i = 0; i < withTime.length; i++) {
      for (let j = i + 1; j < withTime.length; j++) {
        const a = withTime[i];
        const b = withTime[j];
        if (!a.schedule[0] || !b.schedule[0]) continue;
        if (a.schedule[0].day !== b.schedule[0].day) continue;
        if (
          a.schedule[0].startTime < b.schedule[0].endTime &&
          b.schedule[0].startTime < a.schedule[0].endTime
        ) {
          conflicts.push({
            session1: `${a.code}: ${a.title}`,
            session2: `${b.code}: ${b.title}`,
            overlap: `${a.schedule[0].day} ${a.schedule[0].startTime}-${a.schedule[0].endTime} vs ${b.schedule[0].startTime}-${b.schedule[0].endTime}`,
          });
        }
      }
    }

    return {
      schedule: withTime.map((s) => ({
        code: s.code,
        title: s.title,
        type: s.type,
        day: s.schedule[0]?.day || "TBD",
        time: s.schedule[0]
          ? `${s.schedule[0].startTime} - ${s.schedule[0].endTime}`
          : "TBD",
        room: s.schedule[0]?.room || "TBD",
      })),
      conflicts,
    };
  },
});

// ── Party Tools ──

export const searchParties = createTool({
  id: "search-parties",
  description:
    "Search after-parties and social events happening during GTC week. Search by day, sponsor, topic, or keyword.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Search term to match against party title, sponsors, location, or description"),
    day: z
      .string()
      .optional()
      .describe("Filter by day of week (e.g., 'Monday', 'Tuesday')"),
  }),
  outputSchema: z.object({
    count: z.number(),
    parties: z.array(z.any()),
  }),
  execute: async ({ context: { input } }) => {
    let results = [...parties];

    if (input.day) {
      const d = input.day.toLowerCase();
      results = results.filter((p) => p.day.toLowerCase() === d);
    }

    if (input.query) {
      const q = input.query.toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      results = results.filter((p) => {
        const searchable = [
          p.title,
          p.description || "",
          p.location,
          ...p.sponsors,
        ]
          .join(" ")
          .toLowerCase();
        return terms.every((term: string) => searchable.includes(term));
      });
    }

    return {
      count: results.length,
      parties: results.map((p) => ({
        id: p.id,
        title: p.title,
        day: p.day,
        date: p.date,
        time: p.time,
        location: p.location,
        sponsors: p.sponsors,
        inviteOnly: p.inviteOnly,
        description: p.description,
        rsvpUrl: p.rsvpUrl,
      })),
    };
  },
});

// ── Itinerary Management Tools ──

interface ItineraryItem {
  id: string;
  type: "session" | "party";
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

const itineraryItemSchema = z.object({
  id: z.string(),
  type: z.enum(["session", "party"]),
  title: z.string(),
  day: z.string().describe("Day of week, e.g. 'Monday'"),
  date: z.string().describe("Full date, e.g. 'March 17, 2026'"),
  time: z.string().describe("Human-readable time range, e.g. '11:00 AM – 1:00 PM' or '6–9 PM'"),
  startTime: z.string().describe("24-hour start time for calendar positioning, e.g. '11:00' or '18:00'"),
  endTime: z.string().describe("24-hour end time for calendar positioning, e.g. '13:00' or '21:00'"),
  location: z.string().optional(),
  code: z.string().optional(),
  sessionType: z.string().optional(),
  sponsors: z.array(z.string()).optional(),
  note: z.string().optional(),
});

const itinerarySchema = z.array(itineraryItemSchema);

export const getItinerary = createTool({
  id: "get-itinerary",
  description:
    "Retrieve the user's current saved itinerary. The itinerary is passed from the frontend. Use this before adding items to check for conflicts, or when the user asks to see their schedule.",
  inputSchema: z.object({
    currentItinerary: itinerarySchema.describe("The user's current itinerary (passed from frontend)"),
  }),
  outputSchema: z.object({
    items: itinerarySchema,
    count: z.number(),
    byDay: z.record(z.number()),
  }),
  execute: async ({ currentItinerary }: { currentItinerary: ItineraryItem[] }) => {
    const byDay: Record<string, number> = {};
    for (const item of currentItinerary) {
      byDay[item.day] = (byDay[item.day] || 0) + 1;
    }
    return { items: currentItinerary, count: currentItinerary.length, byDay };
  },
});

export const saveToItinerary = createTool({
  id: "save-to-itinerary",
  description:
    "Add one or more sessions/parties to the user's itinerary. Supports bulk additions — pass an array of items to add multiple at once. The tool checks for time conflicts and deduplicates. Use this when the user wants to attend sessions or parties, or when building their schedule.",
  inputSchema: z.object({
    currentItinerary: itinerarySchema.describe("The user's current itinerary (passed from frontend)"),
    item: itineraryItemSchema.optional().describe("Single item to add (use 'items' for bulk)"),
    items: z.array(itineraryItemSchema).optional().describe("Multiple items to add at once"),
  }),
  outputSchema: z.object({
    updatedItinerary: itinerarySchema,
    added: z.array(itineraryItemSchema),
    conflicts: z.array(z.object({
      newItem: z.string(),
      existingItem: z.string(),
      existingTime: z.string(),
    })),
    action: z.literal("save-itinerary"),
  }),
  execute: async ({ currentItinerary, item, items }: { currentItinerary: ItineraryItem[]; item?: ItineraryItem; items?: ItineraryItem[] }) => {
    const toAdd = items || (item ? [item] : []);
    if (toAdd.length === 0) {
      return { updatedItinerary: currentItinerary, added: [], conflicts: [], action: "save-itinerary" as const };
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };

    let updated = [...currentItinerary];
    const added: ItineraryItem[] = [];
    const allConflicts: { newItem: string; existingItem: string; existingTime: string }[] = [];

    for (const newItem of toAdd) {
      // Skip duplicates
      if (updated.some((i: ItineraryItem) => i.id === newItem.id)) continue;

      // Check for time conflicts
      const conflicts = updated
        .filter((i: ItineraryItem) => i.day === newItem.day)
        .filter((existing: ItineraryItem) => {
          if (!existing.startTime || !existing.endTime || !newItem.startTime || !newItem.endTime) {
            return existing.time === newItem.time;
          }
          const aStart = toMin(existing.startTime);
          const aEnd = toMin(existing.endTime);
          const bStart = toMin(newItem.startTime);
          const bEnd = toMin(newItem.endTime);
          return aStart < bEnd && bStart < aEnd;
        })
        .map((existing: ItineraryItem) => ({
          newItem: newItem.title,
          existingItem: existing.title,
          existingTime: existing.time,
        }));

      allConflicts.push(...conflicts);
      updated.push(newItem);
      added.push(newItem);
    }

    return {
      updatedItinerary: updated,
      added,
      conflicts: allConflicts,
      action: "save-itinerary" as const,
    };
  },
});

export const removeFromItinerary = createTool({
  id: "remove-from-itinerary",
  description:
    "Remove an item from the user's itinerary by its ID or title. Use when the user wants to drop a session or party from their schedule.",
  inputSchema: z.object({
    currentItinerary: itinerarySchema.describe("The user's current itinerary (passed from frontend)"),
    itemId: z.string().optional().describe("ID of the item to remove"),
    itemTitle: z.string().optional().describe("Title of the item to remove (fuzzy match)"),
  }),
  outputSchema: z.object({
    updatedItinerary: itinerarySchema,
    removed: itineraryItemSchema.nullable(),
    action: z.literal("save-itinerary"),
  }),
  execute: async ({ currentItinerary, itemId, itemTitle }: { currentItinerary: ItineraryItem[]; itemId?: string; itemTitle?: string }) => {
    let removedIdx = -1;
    if (itemId) {
      removedIdx = currentItinerary.findIndex((i: ItineraryItem) => i.id === itemId);
    } else if (itemTitle) {
      const q = itemTitle.toLowerCase();
      removedIdx = currentItinerary.findIndex((i: ItineraryItem) => i.title.toLowerCase().includes(q));
    }

    if (removedIdx === -1) {
      return {
        updatedItinerary: currentItinerary,
        removed: null,
        action: "save-itinerary" as const,
      };
    }

    const removed = currentItinerary[removedIdx];
    const updated = currentItinerary.filter((_: ItineraryItem, idx: number) => idx !== removedIdx);
    return {
      updatedItinerary: updated,
      removed,
      action: "save-itinerary" as const,
    };
  },
});

export const clearItinerary = createTool({
  id: "clear-itinerary",
  description:
    "Clear the user's entire itinerary. Use only when explicitly asked to start fresh.",
  inputSchema: z.object({
    currentItinerary: itinerarySchema.describe("The user's current itinerary (passed from frontend)"),
  }),
  outputSchema: z.object({
    updatedItinerary: itinerarySchema,
    removedCount: z.number(),
    action: z.literal("save-itinerary"),
  }),
  execute: async ({ currentItinerary }: { currentItinerary: ItineraryItem[] }) => {
    return {
      updatedItinerary: [],
      removedCount: currentItinerary.length,
      action: "save-itinerary" as const,
    };
  },
});

export const getStats = createTool({
  id: "get-stats",
  description:
    "Get summary statistics about the GTC 2026 session catalog — total sessions, breakdown by type, day, etc.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    totalSessions: z.number(),
    byType: z.record(z.number()),
    byDay: z.record(z.number()),
    byViewingExperience: z.record(z.number()),
    featuredCount: z.number(),
  }),
  execute: async () => {
    const byType: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byVE: Record<string, number> = {};
    let featured = 0;

    for (const s of sessions) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      byVE[s.viewingExperience] = (byVE[s.viewingExperience] || 0) + 1;
      if (s.featured) featured++;
      for (const t of s.schedule) {
        byDay[t.day] = (byDay[t.day] || 0) + 1;
      }
    }

    return {
      totalSessions: sessions.length,
      byType,
      byDay,
      byViewingExperience: byVE,
      featuredCount: featured,
    };
  },
});
