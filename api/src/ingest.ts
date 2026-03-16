import { writeFileSync } from "fs";

const API_BASE =
  "https://api-prod.nvidia.com/services/sessioncatalog/api/v1/search";
const EVENT_ID = "175570351919000gtc26";
const PAGE_SIZE = 100;

interface RawSession {
  sessionId: string;
  title: string;
  abbreviation: string;
  abstract?: string;
  sessionType: string;
  length: number;
  viewingExperience: string;
  language: string;
  featuredSession?: boolean;
  speakers?: {
    firstName: string;
    lastName: string;
    fullName: string;
    companyName: string;
    jobTitle: string;
    roles: string;
    bio?: string;
  }[];
  times?: {
    dateFormatted: string;
    dayName: string;
    startTime: string;
    endTime: string;
    room?: string;
  }[];
  [key: string]: unknown;
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
  speakers: {
    name: string;
    company: string;
    jobTitle: string;
    role: string;
  }[];
  schedule: {
    date: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  }[];
}

function transformSession(raw: RawSession): Session {
  return {
    id: raw.sessionId,
    code: raw.abbreviation,
    title: raw.title,
    abstract: raw.abstract || "",
    type: raw.sessionType,
    lengthMinutes: raw.length,
    viewingExperience: raw.viewingExperience,
    language: raw.language,
    featured: raw.featuredSession ?? false,
    speakers: (raw.speakers || []).map((s) => ({
      name: s.fullName,
      company: s.companyName,
      jobTitle: s.jobTitle,
      role: s.roles,
    })),
    schedule: (raw.times || []).map((t) => ({
      date: t.dateFormatted,
      day: t.dayName,
      startTime: t.startTime,
      endTime: t.endTime,
      room: t.room || "TBD",
    })),
  };
}

async function fetchPage(page: number): Promise<{ total: number; sessions: RawSession[] }> {
  const url = `${API_BASE}?eventid=${EVENT_ID}&view=data&page=${page}&size=${PAGE_SIZE}&sortby=featured`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return { total: json.totalResults, sessions: json.data };
}

async function ingestAll() {
  console.log("Fetching GTC 2026 session catalog...");

  const { total, sessions: firstPage } = await fetchPage(0);
  console.log(`Total sessions: ${total}`);

  const allRaw: RawSession[] = [...firstPage];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  for (let page = 1; page < totalPages; page++) {
    console.log(`  Fetching page ${page + 1}/${totalPages}...`);
    const { sessions } = await fetchPage(page);
    allRaw.push(...sessions);
  }

  console.log(`Fetched ${allRaw.length} sessions. Transforming...`);
  const sessions = allRaw.map(transformSession);

  // Write the full dataset
  writeFileSync("src/data/sessions.json", JSON.stringify(sessions, null, 2));
  console.log(`Wrote ${sessions.length} sessions to src/data/sessions.json`);

  // Print summary stats
  const types = new Map<string, number>();
  const days = new Map<string, number>();
  for (const s of sessions) {
    types.set(s.type, (types.get(s.type) || 0) + 1);
    for (const t of s.schedule) {
      days.set(t.day, (days.get(t.day) || 0) + 1);
    }
  }
  console.log("\nSession types:");
  for (const [type, count] of types) console.log(`  ${type}: ${count}`);
  console.log("\nSessions by day:");
  for (const [day, count] of days) console.log(`  ${day}: ${count}`);
}

ingestAll().catch(console.error);
