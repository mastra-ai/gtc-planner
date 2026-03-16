import { Mastra } from "@mastra/core";
import { chatRoute } from "@mastra/ai-sdk";
import { LibSQLStore } from "@mastra/libsql";
import { createClient } from "@libsql/client";
import { gtcAdvisor } from "./agents/gtc-advisor.js";

const memoryDb = createClient({ url: "file:./memory.db" });

export const mastra = new Mastra({
  agents: { gtcAdvisor },
  storage: new LibSQLStore({
    id: "gtc-storage",
    url: "file:./memory.db",
  }),
  server: {
    cors: {
      origin: (origin: string) => {
        const allowed = [
          "http://localhost:5173",
          "https://web-production-8f839.up.railway.app",
        ];
        return allowed.includes(origin) ? origin : allowed[0];
      },
      credentials: true,
    },
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
      }),
      {
        method: "DELETE" as const,
        path: "/api/memory/observational-memory",
        requiresAuth: false,
        handler: async (c: any) => {
          const threadId = c.req.query("threadId");
          const resourceId = c.req.query("resourceId");
          if (!threadId && !resourceId) {
            return c.json({ error: "threadId or resourceId required" }, 400);
          }
          const lookupKey = threadId ? `thread:${threadId}` : `resource:${resourceId}`;
          await memoryDb.execute({
            sql: `DELETE FROM "mastra_observational_memory" WHERE "lookupKey" = ?`,
            args: [lookupKey],
          });
          return c.json({ success: true });
        },
      },
    ],
  },
});
