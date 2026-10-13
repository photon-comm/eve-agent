# eve agent on iMessage

A personal assistant you text over iMessage. It runs on [eve](https://eve.dev/docs), Vercel's agent framework, and [Photon](https://photon.codes) carries the messages between iMessage and your Vercel deployment. Text your Photon number and the agent answers in short, plain-text replies.

Messages reach the agent at `/eve/v1/photon` through eve's built-in Photon channel. The model runs through Vercel AI Gateway, which a Vercel deployment signs in to with its own OIDC token, so there is no model key to paste. Set `IMESSAGE_ALLOWED_USERS` to your number and the agent answers only you.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/photon-comm/eve-agent&env=IMESSAGE_PROJECT_ID,IMESSAGE_PROJECT_SECRET&envDescription=Your%20Photon%20project%20ID%20and%20project%20secret%2C%20from%20the%20API%20keys%20page%20of%20your%20project%20at%20app.photon.codes.&envLink=https%3A%2F%2Fgithub.com%2Fphoton-comm%2Feve-agent%23environment-variables&project-name=eve-agent&repository-name=eve-agent)

## Set up with Photon

1. Sign in to the Photon dashboard at [app.photon.codes](https://app.photon.codes) and create a project from the **Vercel Eve Agent** template.
2. Confirm your phone number.
3. Connect your Vercel account.

Photon deploys this repo to your Vercel account with its values already set. When the deploy finishes, text the iMessage number Photon assigns you.

## Deploy by hand

1. Create a project in the [Photon dashboard](https://app.photon.codes). Copy the project ID and project secret from its API keys page.
2. Click **Deploy with Vercel** above and paste both values when Vercel asks for them.
3. When the deploy finishes, open the project's Webhooks page in the Photon dashboard and create a webhook with this URL:

   ```text
   https://<host>/eve/v1/photon
   ```

   `<host>` is your Vercel project's production domain, such as `eve-agent.vercel.app`. Use the production domain: with Vercel's Standard Deployment Protection, every other URL of the project asks for a Vercel login, which Photon can't pass.

4. Copy the webhook's signing secret. Photon shows it only once.
5. In your Vercel project, open **Settings**, then **Environment Variables**. Add `IMESSAGE_WEBHOOK_SECRET` with the signing secret. To have the agent answer only you, also add `IMESSAGE_ALLOWED_USERS` with your phone number.
6. Redeploy so the new variables take effect, then text your Photon number.

From a clone of this repo, `npm run deploy` runs `eve deploy`, which links a Vercel project and deploys it to production. Add the [environment variables](#environment-variables) to that Vercel project, then follow the webhook steps above.

## Run locally

You need Node.js 24 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local` before the last step. `npm run dev` runs `eve dev`, which starts the agent on port 2000 and opens a chat with it in your terminal. If no model is connected yet, eve asks you to sign in with a Vercel account or paste an AI Gateway key.

To get real iMessages on your machine, Photon needs a public HTTPS URL. Point a tunnel such as ngrok at port 2000, create a second webhook for `https://<tunnel-host>/eve/v1/photon`, and put its signing secret in `IMESSAGE_WEBHOOK_SECRET` in `.env.local`. Every webhook on a project receives every message, so delete the tunnel webhook when you are done, or both agents will reply.

## Who it answers

`IMESSAGE_ALLOWED_USERS` takes a comma-separated list of phone numbers in E.164 format, like `+15551234567`, or Apple ID emails. A message from anyone else is dropped before it reaches the agent: no reply and no read receipt. With the variable empty, the agent answers everyone who texts the number. The check is the `onMessage` callback in `agent/channels/photon.ts`.

## Model

`agent/agent.ts` uses `openai/gpt-6-luna-fast` through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). On Vercel, the deployment authenticates to AI Gateway with its OIDC token, so you need no API key ([eve docs](https://eve.dev/docs/guides/deployment/vercel), [Vercel docs](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc)). Requests are charged to your Vercel team's AI Gateway credits; see [AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing) for the free tier.

To change the model, run `npx eve set model <provider/model>`, for example `npx eve set model anthropic/claude-sonnet-5`.

## Use Vercel Connect

The channel reads Photon credentials from environment variables, which works on any host. On Vercel, [Vercel Connect](https://eve.dev/docs/channels/photon) can hold them instead, and Photon's webhook is then verified with the deployment's Vercel OIDC token.

To switch, move `agent/channels/photon.ts` out of `agent/` (the setup won't overwrite it), run `npx eve add channel/photon-imessage`, and choose **Set up Vercel Connect**. eve creates the connector, configures Photon's webhook, and writes a new channel file:

```ts
import { connectPhotonCredentials } from "@vercel/connect/eve";
import { photonIMessageChannel } from "eve/channels/photon";

export default photonIMessageChannel({
  credentials: connectPhotonCredentials("<connector id>"),
});
```

Copy `onMessage` and its two helper functions from the old file into the new one to keep the allowlist. With Connect, `IMESSAGE_PROJECT_ID`, `IMESSAGE_PROJECT_SECRET`, and `IMESSAGE_WEBHOOK_SECRET` are no longer used.

## Environment variables

| Variable                  | Required               | What it is                                                                                               | Where to get it                                                                                      |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `IMESSAGE_PROJECT_ID`     | Yes                    | Your Photon project ID.                                                                                  | [Photon dashboard](https://app.photon.codes), your project's API keys page.                          |
| `IMESSAGE_PROJECT_SECRET` | Yes                    | Your Photon project secret. The agent uses it to send replies.                                           | Same API keys page.                                                                                  |
| `IMESSAGE_WEBHOOK_SECRET` | Yes, to receive texts  | Signing secret of the Photon webhook that points to `https://<host>/eve/v1/photon`.                      | Photon dashboard, your project's Webhooks page. Shown once, when you create the webhook.             |
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

`photon.jsonc` tells Photon what this template needs, so the Photon dashboard can set it up without anyone pasting a key. It names the iMessage channel, says Photon delivers messages as webhooks to `/eve/v1/photon` signed the way eve checks them, and lists the four variables Photon writes into your Vercel project. Change it in the same pull request as the code it describes. A workflow checks it on every change; see [`.github/photon`](.github/photon) to run the check yourself.

## License

MIT. See [LICENSE](LICENSE).
