# Signal demo script

## 90-second walkthrough

1. **Frame the problem (10 seconds)**
   
   “Technical program leaders spend too much time converting fragmented updates into decisions. Signal turns a raw infrastructure update into an executive-ready risk review while preserving context across turns.”

2. **Show multimodal input (15 seconds)**
   
   Use the microphone or paste:
   
   > We are six weeks from GPU cluster launch. Power commissioning slipped nine days, the network vendor has not confirmed optics delivery, and security review found 14 critical findings. Training capacity is already committed to two model teams. Create an executive risk review.

3. **Show the coordinated output (25 seconds)**
   
   Point out the executive readout, prioritized risks, decisions, owner roles, dates/time horizons, and metrics. Explain that the Worker coordinates the request while Llama 3.3 runs on Workers AI.

4. **Demonstrate memory (20 seconds)**
   
   Follow up with:
   
   > The network vendor now confirms optics will arrive in five days, but power commissioning slipped another week. Update the risk review and tell me what changed.

   Signal uses the same Durable Object session and prior messages, so the response should distinguish the resolved and worsening risks.

5. **Show architecture and safety (20 seconds)**
   
   Explain that each browser session maps to a named Agent/Durable Object with persisted state. Note the reset control, bounded message history, input limits, no third-party model key, and the UI warning against confidential data.

## Suggested evaluator questions

- Why an Agent/Durable Object instead of stateless requests? Durable identity provides isolated, low-latency state per session and supports future real-time collaboration.
- Why Workers AI? It keeps inference in the Cloudflare stack, removes external model-key management, and reduces integration surface area.
- What would you add for production? Cloudflare Access, rate limiting, DLP/redaction, audit events, retention controls, observability, evaluation datasets, and human approval for consequential actions.
- How would this expand? Add Jira, Slack, ServiceNow, capacity-planning, and incident tools as authenticated Agent tools; use Workflows for long-running approvals and follow-ups.
