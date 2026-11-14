import { createMemoryState } from "@chat-adapter/state-memory";
import { createPhotonAdapter, type PhotonAdapter } from "@photon-ai/chat-adapter";
import type { Message, Thread } from "chat";
import { chatSdkChannel, messageToUserContent } from "eve/channels/chat-sdk";

// Receives messages from Photon at POST /eve/v1/photon and sends the agent's
// replies back through the same conversation. The adapter reads
// PHOTON_PROJECT_ID, PHOTON_API_KEY, PHOTON_WEBHOOK_SECRET and PHOTON_API_URL.
export const { bot, channel, send } = chatSdkChannel({
  userName: "eve",
  adapters: { photon: photonAdapter() },
  state: createMemoryState(),
  // Not every platform can edit a sent message, so each reply goes out once,
  // complete.
  streaming: false,
  // A message that arrives while the agent is replying steers that reply.
  concurrency: "concurrent",
});

bot.onDirectMessage(dispatch);
bot.onNewMention(dispatch);
bot.onNewMessage(/[\s\S]*/, dispatch);

export default channel;

// eve also runs this file when it builds, and the adapter checks its keys as
// soon as it is created. Creating it on first use lets the agent build, and
// `eve dev` start, without Photon keys.
function photonAdapter(): PhotonAdapter {
  let adapter: PhotonAdapter | undefined;
  const real = () => (adapter ??= createPhotonAdapter());
  return new Proxy({} as PhotonAdapter, {
    get: (_, key) => {
      const value = Reflect.get(real(), key);
      return typeof value === "function" ? value.bind(real()) : value;
    },
    has: (_, key) => Reflect.has(real(), key),
    set: (_, key, value) => Reflect.set(real(), key, value),
  });
}

async function dispatch(thread: Thread, message: Message): Promise<void> {
  const allowed = allowedUsers();
  // userName is the sender's handle, such as a phone number or an email
  // address, or their Photon user ID when Photon has no handle for them.
  if (allowed && !allowed.has(normalizeHandle(message.author.userName))) {
    // Not on the list: no reply and no read receipt.
    return;
  }
  try {
    await bot.getAdapter("photon").markAsRead(thread.id, message.id);
  } catch {
    // A missing read receipt shouldn't stop the reply.
  }
  const content = messageToUserContent(message);
  if (typeof content === "string" ? content.trim() === "" : content.length === 0) {
    return;
  }
  await send(content, {
    thread,
    auth: {
      attributes: message.author.userName ? { user_name: message.author.userName } : {},
      authenticator: "photon",
      issuer: "photon",
      principalId: `photon:${message.author.userId}`,
      principalType: message.author.isBot === true ? "service" : "user",
      subject: message.author.userId,
    },
  });
}

// PHOTON_ALLOWED_USERS is a comma-separated list of the handles the agent
// answers, such as phone numbers (E.164) and email addresses. When it is
// empty, the agent answers everyone.
function allowedUsers(): Set<string> | undefined {
  const handles = (process.env.PHOTON_ALLOWED_USERS ?? "")
    .split(",")
    .map(normalizeHandle)
    .filter(Boolean);
  return handles.length > 0 ? new Set(handles) : undefined;
}

// "+1 (555) 123-4567" becomes "+15551234567". Other handles, such as email
// addresses, are lowercased.
function normalizeHandle(handle: string): string {
  const value = handle.trim().toLowerCase();
  return /^[\d\s().+-]+$/.test(value) ? value.replace(/[^\d+]/g, "") : value;
}
