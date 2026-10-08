import { defineTool } from "eve/tools";
import { z } from "zod";

// The file name is the tool name the model sees: `get_current_time`.
export default defineTool({
  description:
    "Get the current date and time. Pass an IANA time zone such as America/New_York or Asia/Tokyo for local time in that place. Without one, the result is in UTC.",
  inputSchema: z.object({
    timeZone: z
      .string()
      .optional()
      .describe("IANA time zone name, for example Europe/London."),
  }),
  async execute({ timeZone }) {
    const now = new Date();
    const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
    const local = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: zone,
    }).format(now);
    return { iso: now.toISOString(), local, timeZone: zone };
  },
});

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
