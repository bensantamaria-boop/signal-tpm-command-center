import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Signal deployment bundle", () => {
	it("configures Workers AI and a SQLite-backed Durable Object", async () => {
		const config = await readFile("wrangler.jsonc", "utf8");
		expect(config).toContain('"binding": "AI"');
		expect(config).toContain('"class_name": "RiskAgent"');
		expect(config).toContain('"new_sqlite_classes": ["RiskAgent"]');
	});

	it("includes the chat, voice, and Llama 3.3 experience", async () => {
		const html = await readFile("public/index.html", "utf8");
		expect(html).toContain("TPM Command Center");
		expect(html).toContain("Llama 3.3");
		expect(html).toContain("SpeechRecognition");
		expect(html).toContain("/api/chat");
	});

	it("uses the Cloudflare Agents SDK", async () => {
		const worker = await readFile("src/index.ts", "utf8");
		expect(worker).toContain('from "agents"');
		expect(worker).toContain("extends Agent");
		expect(worker).toContain("@callable()");
	});
});
