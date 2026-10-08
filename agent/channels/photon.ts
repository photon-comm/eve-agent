import { defaultPhotonAuth, photonIMessageChannel } from "eve/channels/photon";

// Receives iMessages from Photon at POST /eve/v1/photon and sends the
// agent's replies back through the same conversation.
export default photonIMessageChannel({
  // Read on the first message, not at build time, so the build needs no secrets.
  async credentials() {
    const projectId = process.env.IMESSAGE_PROJECT_ID;
    const projectSecret = process.env.IMESSAGE_PROJECT_SECRET;
    if (!projectId || !projectSecret) {
      throw new Error("Set IMESSAGE_PROJECT_ID and IMESSAGE_PROJECT_SECRET.");
    }
    return { projectId, projectSecret };
  },
  // Verifies that each webhook delivery was signed by Photon.
  webhookSecret: process.env.IMESSAGE_WEBHOOK_SECRET,
  onMessage(_ctx, message) {
    const allowed = allowedUsers();
    if (allowed && !allowed.has(normalizeHandle(message.author.userId))) {
      // Not on the list: no reply and no read receipt.
      return null;
    }
    return { auth: defaultPhotonAuth(message) };
  },
});

// IMESSAGE_ALLOWED_USERS is a comma-separated list of phone numbers (E.164)
// or Apple ID emails. When it is empty, the agent answers everyone.
function allowedUsers(): Set<string> | undefined {
  const handles = (process.env.IMESSAGE_ALLOWED_USERS ?? "")
    .split(",")
    .map(normalizeHandle)
    .filter(Boolean);
  return handles.length > 0 ? new Set(handles) : undefined;
}

// "+1 (555) 123-4567" becomes "+15551234567". Emails are lowercased.
function normalizeHandle(handle: string): string {
  const value = handle.trim().toLowerCase();
  return value.includes("@") ? value : value.replace(/[^\d+]/g, "");
}
