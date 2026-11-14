# eve agent on iMessage

A personal assistant you text over iMessage. It runs on [eve](https://eve.dev/docs), Vercel's agent framework, and [Photon](https://photon.codes) carries the messages between iMessage and your Vercel deployment. Text your Photon number and the agent answers in short, plain-text replies.

Messages reach the agent at `/eve/v1/photon` through eve's Chat SDK channel and Photon's Chat SDK adapter, [`@photon-ai/chat-adapter`](https://www.npmjs.com/package/@photon-ai/chat-adapter). It runs on Photon Beta. The model runs through Vercel AI Gateway, which a Vercel deployment signs in to with its own OIDC token, so there is no model key to paste. Set `IMESSAGE_ALLOWED_USERS` to your number and the agent answers only you.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/photon-comm/eve-agent&env=PHOTON_PROJECT_ID,PHOTON_API_KEY&envDescription=Your%20Photon%20project%20ID%20and%20a%20project%20API%20key%2C%20from%20the%20API%20keys%20page%20of%20your%20project%20at%20app.beta.photon.codes.&envLink=https%3A%2F%2Fgithub.com%2Fphoton-comm%2Feve-agent%23environment-variables&project-name=eve-agent&repository-name=eve-agent)

## Set up with Photon

1. Sign in to the Photon Beta dashboard at [app.beta.photon.codes](https://app.beta.photon.codes) and create a project from the **Vercel Eve Agent** template.
2. Confirm your phone number.
3. Connect your Vercel account.

Photon deploys this repo to your Vercel account with its values already set. When the deploy finishes, text the iMessage number Photon assigns you.

## Deploy by hand

1. Create a project in the [Photon Beta dashboard](https://app.beta.photon.codes). On its API keys page, copy the project ID. Then type a key name, choose **Create key**, then **Custom**, select the `project:read` and `project:write` permissions, set **Expires** to **No expiry**, and choose **Create key**. A key that expires stops the agent's replies when it does. Copy the key: Photon shows it only once.
2. On the project's **iMessage** page, choose **Shared line**, then **Use the shared line**, and add the phone number you'll text from. Photon pairs it with a number from its pool, and the agent can reply once you text that number. A dedicated line works too.
3. Click **Deploy with Vercel** above and paste the project ID and the key when Vercel asks for them.
4. When the deploy finishes, open the project's Webhooks page in the Photon Beta dashboard and add a webhook destination. Give it a name, set its URL to

   ```text
   https://<host>/eve/v1/photon
   ```

   choose API version `2026-07-01`, the event format the adapter reads, and select the `message.received` event.

   `<host>` is your Vercel project's production domain, such as `eve-agent.vercel.app`. Use the production domain: with Vercel's Standard Deployment Protection, every other URL of the project asks for a Vercel login, which Photon can't pass.

5. Copy the destination's signing secret. Photon shows it only once.
6. In your Vercel project, open **Settings**, then **Environment Variables**. Add `PHOTON_WEBHOOK_SECRET` with the signing secret. To have the agent answer only you, also add `IMESSAGE_ALLOWED_USERS` with your phone number.
7. Redeploy so the new variables take effect, then text your line's number.

From a clone of this repo, `npm run deploy` runs `eve deploy`, which links a Vercel project and deploys it to production. Add the [environment variables](#environment-variables) to that Vercel project, then follow the webhook steps above.

## Run locally

You need Node.js 24 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` before the last step. `npm run dev` runs `eve dev`, which starts the agent on port 2000 and opens a chat with it in your terminal. If no model is connected yet, eve asks you to sign in with a Vercel account or paste an AI Gateway key.

To get real iMessages on your machine, Photon needs a public HTTPS URL. Point a tunnel such as ngrok at port 2000, add a second webhook destination for `https://<tunnel-host>/eve/v1/photon` with API version `2026-07-01` and the `message.received` event, and put its signing secret in `PHOTON_WEBHOOK_SECRET` in `.env.local`. Every enabled destination that subscribes to `message.received` receives every message, so delete the tunnel destination when you are done, or both agents will reply.

## Who it answers

`IMESSAGE_ALLOWED_USERS` takes a comma-separated list of phone numbers in E.164 format, like `+15551234567`, or Apple ID emails. A message from anyone else is dropped before it reaches the agent: no reply and no read receipt. With the variable empty, the agent answers everyone who texts the number. The check is at the top of `dispatch` in `agent/channels/photon.ts`.

## Model

`agent/agent.ts` uses `openai/gpt-6-luna-fast` through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). On Vercel, the deployment authenticates to AI Gateway with its OIDC token, so you need no API key ([eve docs](https://eve.dev/docs/guides/deployment/vercel), [Vercel docs](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc)). Requests are charged to your Vercel team's AI Gateway credits; see [AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing) for the free tier.

To change the model, run `npx eve set model <provider/model>`, for example `npx eve set model anthropic/claude-sonnet-5`.

## Environment variables

| Variable                  | Required               | What it is                                                                                               | Where to get it                                                                                      |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `PHOTON_PROJECT_ID`       | Yes                    | Your Photon project ID.                                                                                  | [Photon Beta dashboard](https://app.beta.photon.codes), your project's API keys page.                |
| `PHOTON_API_KEY`          | Yes                    | A project API key with `project:read` and `project:write`. The agent uses it to send replies.            | Same API keys page, **Create key**. Shown once, when you create the key.                             |
| `PHOTON_WEBHOOK_SECRET`   | Yes, to receive texts  | Signing secret of the Photon webhook destination that points to `https://<host>/eve/v1/photon`.          | Photon Beta dashboard, your project's Webhooks page. Shown once, when you add the destination.       |
| `PHOTON_API_URL`          | No                     | The Photon API the agent calls. Unset means `https://api.photon.codes`.                                  | Leave it unset. Photon sets it when it deploys the agent for you.                                    |
| `IMESSAGE_ALLOWED_USERS`  | No                     | Comma-separated phone numbers (E.164) or Apple ID emails the agent answers. Empty means everyone.        | Your own phone number.                                                                               |
| `AI_GATEWAY_API_KEY`      | No                     | AI Gateway key. Not needed on Vercel, where the deployment uses OIDC. Needed on other hosts.             | Vercel dashboard, **AI Gateway**, **API Keys**.                                                      |

`.env.example` lists the same variables for local runs.

## What's inside

```text
agent/
  agent.ts                   model and reasoning settings
  instructions.md            personality and reply style
  channels/photon.ts         iMessage channel and the allowlist
  tools/get_current_time.ts  example tool: current date and time in any time zone
```

eve also gives the agent its [default tools](https://eve.dev/docs/concepts/built-in-tools), such as web search and web fetch. Edit `agent/instructions.md` to change how it talks, and add tools under `agent/tools/`.

## photon.jsonc

`photon.jsonc` tells Photon what this template needs, so the Photon dashboard can set it up without anyone pasting a key. It names the iMessage channel, says Photon delivers messages as webhooks to `/eve/v1/photon` signed with Standard Webhooks, the way the adapter checks them, and lists the five variables Photon writes into your Vercel project. Change it in the same pull request as the code it describes. A workflow checks it on every change; see [`.github/photon`](.github/photon) to run the check yourself.

## License

MIT. See [LICENSE](LICENSE).
