import { Mastra } from "@mastra/core";
import { chatRoute } from "@mastra/ai-sdk";
import { LibSQLStore } from "@mastra/libsql";
import { gtcAdvisor } from "./agents/gtc-advisor.js";

export const mastra = new Mastra({
  agents: { gtcAdvisor },
  storage: new LibSQLStore({
    id: "gtc-storage",
    url: "file:./memory.db",
  }),
  server: {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
      }),
    ],
  },
});
