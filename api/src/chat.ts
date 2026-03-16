import { gtcAdvisor, buildInstructions, type UserProfile } from "./mastra/agents/gtc-advisor.js";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

async function collectProfile(): Promise<UserProfile> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  NVIDIA GTC 2026 Session Advisor");
  console.log("  954 sessions · March 16–21, San Jose, CA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nLet's personalize your experience.\n");

  const name = await prompt("Your name: ");
  const role = await prompt("Your job title/role: ");
  const company = await prompt("Company/organization: ");
  const industry = await prompt("Industry (e.g., healthcare, finance, robotics, gaming): ");
  const interests = await prompt("Topics you're interested in (e.g., agentic AI, CUDA, LLMs, robotics): ");
  const experience = await prompt("Technical experience level (beginner / intermediate / advanced): ");

  return {
    name: name.trim() || "Attendee",
    role: role.trim() || "Not specified",
    company: company.trim() || "Not specified",
    industry: industry.trim() || "Not specified",
    interests: interests.trim() || "General AI",
    experience: experience.trim() || "intermediate",
  };
}

async function main() {
  const profile = await collectProfile();
  const instructions = buildInstructions(profile);

  console.log(`\nWelcome, ${profile.name}! I'm ready to help you navigate GTC 2026.`);
  console.log('Ask me about sessions, get recommendations, or build your schedule.');
  console.log('Type "quit" to exit.\n');

  while (true) {
    const input = await prompt("You: ");
    if (input.trim().toLowerCase() === "quit") {
      console.log("\nEnjoy GTC 2026!");
      rl.close();
      break;
    }
    if (!input.trim()) continue;

    try {
      process.stdout.write("\nAdvisor: ");
      const response = await gtcAdvisor.stream(input, {
        instructions,
      });

      let fullResponse = "";
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
      console.log("\n");
    } catch (err) {
      console.error("\nError:", err instanceof Error ? err.message : err);
    }
  }
}

main().catch(console.error);
