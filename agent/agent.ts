import { defineAgent } from "eve";

// A model ID string routes through Vercel AI Gateway. On Vercel, the
// deployment signs in to AI Gateway with its OIDC token, so no API key is
// needed. Change the model with `npx eve set model <provider/model>`.
export default defineAgent({
  model: "openai/gpt-6-luna-fast",
  reasoning: "low",
});
