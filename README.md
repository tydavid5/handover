# Handover

When a teammate goes on leave, their work stalls because the context lives in their head and in scattered tickets.

Handover is a Forge app for Jira and Confluence that turns a person's scattered work into a handover pack before they leave, and answers questions about it while they are gone. Pick a teammate and a leave date, and Handover gathers their open Jira issues, the decisions behind them, the Confluence pages they own, and the people who depend on them, using Teamwork Graph context, and writes it into one handover pack. A Rovo agent then answers the team's questions in plain language, as if the person were there, citing the pack and the original tickets. An MCP server exposes the handover data so other agents can check it too.

## How it works

1. **Pick the person and the dates.** A manager or the teammate themself opens Handover from a Jira project page and picks who is going on leave and when.
2. **Handover builds the pack.** It reads the person's open Jira issues, their in-progress Confluence pages, and the Teamwork Graph around them: who they work with, what decisions were made, what is blocked and on whom. Everything is grouped into: what is urgent, what can wait, who to ask, and what is decided already.
3. **The pack is reviewed, then shared.** The teammate checks the pack, fixes anything wrong, and shares it to the team in Confluence. Nothing is published without a human looking at it first.
4. **The Rovo agent covers the leave.** While the person is away, teammates ask the agent questions like "who owns the checkout bug now?" or "why did we decide to delay the launch?" and get answers grounded in the pack, the tickets, and the decisions, with links back to the source.
5. **Everything is labelled.** The pack is marked as generated from the person's work, with the date it was built and a note that it is a summary, not the person's own words. Demo data is clearly labelled as demo data.

## What it is built on

- Atlassian Forge, with a Jira project page and a Confluence macro for the handover pack.
- Teamwork Graph API for the context around the person: their work, their collaborators, and the decisions connected to them.
- A Rovo agent (rovo:agent module) that answers questions from the handover pack.
- An MCP server (rovo:mcp module) exposing handover lookups as tools for other agents.
- No real money moves anywhere in the app. The demo uses pretend people and pretend tickets, clearly labelled.

## Codegeist 2026

- Category: Apps for Business Teams.
- Bonus prizes targeted: Best Agents - Rovo/Assignable agents, Best app with Atlassian MCP, Best apps with Teamwork Graph integration.
- Deadline: Tue Dec 22, 2026, 12:00 PM Pacific Time (9:00 PM WAT).
- Demo video: under 5 minutes, public on YouTube.
- Judges get an installation link to install and test the app on their own site.

## Status

- [ ] Forge app scaffolded and validated (forge lint)
- [ ] Handover pack builder working (Jira + Confluence + Teamwork Graph)
- [ ] Rovo agent answering from the pack
- [ ] MCP server exposing handover tools
- [ ] Public repo on GitHub
- [ ] Installed on a developer site, installation link ready
- [ ] Demo video recorded (under 5 min, public on @arc5ive)
- [ ] Submitted on Devpost

## Repo

https://github.com/tydavid5/handover
