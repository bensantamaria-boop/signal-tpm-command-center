import { Agent, callable, getAgentByName, routeAgentRequest } from "agents";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type RiskAgentState = { messages: ChatMessage[]; turns: number; lastUpdated: string | null };
type AppEnv = Env & { AI: Ai; RiskAgent: DurableObjectNamespace<RiskAgent> };

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_HISTORY = 18;
const SYSTEM_PROMPT = `You are Signal, an AI technical program management copilot for complex infrastructure programs.
Turn ambiguous updates into decisive, executive-ready guidance. Focus on cloud infrastructure, AI/ML compute, GPU clusters, data centers, storage, networking, reliability, migrations, security, compliance, capacity planning, and vendor delivery.

For every response:
- Use relevant prior context. Separate facts from assumptions; never invent dates, owners, metrics, or commitments.
- Identify material delivery, dependency, capacity, reliability, security, compliance, financial, and vendor risks.
- Recommend concrete actions with an owner role and time horizon.
- Use concise headings and bullets. Prefer decisions over generic advice.
- If inputs are insufficient, state the smallest set of missing facts, then give a provisional assessment.
- Never claim to contact people, change systems, or complete external actions.

For risk reviews include: Executive readout, Top risks, Decisions needed, Next actions, and Metrics to watch.
For plans include: Outcome, Workstreams, Milestones, Dependencies, Risks, Governance cadence, and Success metrics.`;

const json = (data: unknown, init: ResponseInit = {}) => Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init.headers } });
function cleanSessionId(value: string | null) {
	const cleaned = value?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
	return cleaned || crypto.randomUUID();
}

export class RiskAgent extends Agent<AppEnv, RiskAgentState> {
	initialState: RiskAgentState = { messages: [], turns: 0, lastUpdated: null };

	@callable()
	async chat(input: string) {
		const content = input.trim().slice(0, 8_000);
		if (!content) throw new Error("Please enter a program update or question.");
		const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
		const history = [...this.state.messages, userMessage].slice(-MAX_HISTORY);
		const result = (await this.env.AI.run(MODEL, {
			messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.map(({ role, content }) => ({ role, content }))],
			max_tokens: 1_200,
			temperature: 0.25,
		})) as { response?: string };
		const answer = result.response?.trim();
		if (!answer) throw new Error("The model returned an empty response. Please try again.");
		const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: answer, createdAt: new Date().toISOString() };
		this.setState({ messages: [...history, assistantMessage].slice(-MAX_HISTORY), turns: this.state.turns + 1, lastUpdated: assistantMessage.createdAt });
		return { message: assistantMessage, turns: this.state.turns };
	}

	@callable() history() { return this.state; }
	@callable() reset() {
		this.setState({ messages: [], turns: 0, lastUpdated: null });
		return this.state;
	}
}

export default {
	async fetch(request: Request, env: AppEnv): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/agents/")) return (await routeAgentRequest(request, env)) ?? new Response("Agent not found", { status: 404 });
		if (url.pathname === "/api/health") return json({ ok: true, model: MODEL, runtime: "Cloudflare Agents SDK" });
		if (url.pathname === "/api/history" && request.method === "GET") {
			const sessionId = cleanSessionId(url.searchParams.get("session"));
			const agent = await getAgentByName(env.RiskAgent, sessionId);
			return json({ sessionId, ...(await agent.history()) });
		}
		if (url.pathname === "/api/chat" && request.method === "POST") {
			try {
				const body = (await request.json()) as { sessionId?: string; message?: string };
				const sessionId = cleanSessionId(body.sessionId ?? null);
				const agent = await getAgentByName(env.RiskAgent, sessionId);
				return json({ sessionId, ...(await agent.chat(body.message ?? "")) });
			} catch (error) {
				return json({ error: error instanceof Error ? error.message : "Unable to process the request." }, { status: 400 });
			}
		}
		if (url.pathname === "/api/reset" && request.method === "POST") {
			const body = (await request.json()) as { sessionId?: string };
			const sessionId = cleanSessionId(body.sessionId ?? null);
			await (await getAgentByName(env.RiskAgent, sessionId)).reset();
			return json({ ok: true, sessionId });
		}
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<AppEnv>;
