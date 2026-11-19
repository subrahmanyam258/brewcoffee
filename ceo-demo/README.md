# 3BB CEO Demo: scenario launcher

A local web page for presenting the **3BB CEO Demo** project in chat. It is
demo tooling only, not product code, so no SDLC artefacts are attached.

Each scenario opens a new live session on the platform through the Web SDK. It
uses the same agents as the outbound voice call: Customer Verification →
Payment Outcome, plus the Supervisor and the Points & Privileges agents.

## Run

```bash
cp demos/3bb-ceo-demo/.env.example demos/3bb-ceo-demo/.env   # then set SDK_PUBLIC_KEY
node demos/3bb-ceo-demo/server.mjs                           # → http://localhost:5199
```

Requirements:

- Node 18 or later. There is nothing to install.
- The project needs an active **dev deployment** pinned to a **config-vars
  version**. The web channel serves deployed versions, not the working copy:
  after changing an agent, publish a version and deploy again. Without a pinned
  config-vars version, the deployment has no `MOCK_DATA` and the CVA answers
  "information incomplete". The current deployment is agents 0.1.0, workflows
  v0.1.0 and config vars 1.0.0.
- The public SDK key (`pk_…`) must allow the origins `http://localhost:5199`
  and `http://127.0.0.1:5199`. `.env` is git-ignored, so never commit the key.

## What the page sends

The SDK `userContext.customAttributes` arrive in the agents as `session.*`:

| Attribute | Meaning |
| --- | --- |
| `web_entry` | `visit` (signed in on ais.th), `reminder_link` (opened the SMS bill reminder) or `anonymous` |
| `web_authenticated` | `true` for `visit` and `reminder_link`. The CVA skips identity questions, greets with the pending bill and hands to the POA. |
| `web_language` | `th` or `en`, the starting language. Language detection still switches per turn. |
| `web_overlay` + MOCK_DATA keys | Per-customer fields (name, amounts, line numbers), merged over `MOCK_DATA` |

Custom attributes must be flat primitive values, with at most 32 keys and
4 KB in total. That is why each profile in `scenarios.js` sends only the
MOCK_DATA fields that differ from the default.

## Using it in front of the customer

- **Top bar** (presenter only): customer, how the customer arrives (website
  visit, SMS reminder link or guest), start language, and scenario. Changing
  any of them starts a new live session.
- **Presenter** opens a drawer with the pitch, lines to say (click to send),
  the live agent, the agent path and the session ID.
- The page imitates the AIS look (kelly green `#73C23A` and deep teal
  `#1E3D35`, sampled from ais.th). It is a demo mock-up, not the AIS site.
- Chat templates are drawn by the page around the agents' real replies: the
  bill card, ways to pay, the payment-date picker, the "payment date saved"
  card, the AIS Points card, privileges, and a star rating for the survey.

## Files

- `server.mjs`: a static server. It also generates `/config.js` from `.env`.
- `index.html`, `styles.css`, `app.js`: the AIS-style site, the phone view, the
  chat widget with its templates, and the presenter drawer.
- `scenarios.js`: the customer profiles and the 12 scenarios.

The page loads the SDK from `<ENDPOINT>/api/sdk/embed/script`, so it always
matches the runtime it talks to.
