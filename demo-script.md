# Handover demo video script (Codegeist 2026, under 5 minutes)

Target: under 5 minutes, public on YouTube (@arc5ive). Problem first, then the app working live. No em dashes anywhere on screen or in narration.

## 0:00 - 0:20 The problem

On screen: a Jira board full of tickets and a chat message that says "who owns the checkout bug now that Emma is away?"

Narration: "When a teammate goes on leave, their work stalls because the context lives in their head and in scattered tickets. Handover turns that scattered work into one pack before they leave, and answers questions about it while they are gone."

## 0:20 - 1:30 Build the pack (Jira project page)

On screen: the Handover project page in Jira. Type "Emma Paris" and a leave date, click "Build handover pack".

Narration: "Pick the person and their first day away. Handover reads their open Jira work, their Confluence pages and the Teamwork Graph around them: their teams, the people involved, the decisions already made. High priority work and anything due in the first week goes to urgent. The rest can wait. The pack is a generated summary, not the person's own words, and a human checks it before anyone relies on it."

Show the finished pack: Urgent, Can wait, Who to ask, Decided already, Docs to read.

## 1:30 - 3:00 Ask the Rovo agent

On screen: Rovo chat in Jira, agent "Handover Guide" selected.

Ask, in order:
1. "What is in Emma's handover pack?"
2. "Who should I ask about the billing project?"
3. "What is Emma working on right now?"

Narration: "While Emma is away, the team asks the Handover Guide instead of guessing. Every answer cites the pack and the original tickets, with links back to the source. When a source could not be read, the agent says the answer may be incomplete instead of saying there is nothing."

## 3:00 - 4:00 The MCP server

On screen: a terminal or an MCP client (Claude Desktop / Cursor) connected to https://mcp.atlassian.com/forge/<appId>, calling fetch-handover-pack for Emma Paris.

Narration: "The same three actions are also MCP tools. Any MCP client can call them, with the caller's own permissions on the site. No separate server to run, Atlassian hosts the endpoint."

## 4:00 - 4:40 Close

On screen: the repo and the installation link.

Narration: "Handover is a Forge app for Jira and Confluence. It is free to install, the code is public at github.com/tydavid5/handover, and judges can install it from the link in the submission. The Rovo agent needs a Standard or Premium trial site, the pack page and the graph queries work on a free site."

## Recording notes

- Record on the demo site https://one-atlas-zaly.atlassian.net with its seeded demo data (pretend people and pretend tickets, clearly labelled as demo data). Use Emma Paris as the person in the demo: she is a real seeded user on the site, while "Maya" does not exist there at all.
- Rovo answers take 28 to 32 seconds in chat even when the action runs in about a second, so let the chat answer fully before cutting, or speed that section up in the edit and say so on screen. Rovo IS available on this demo site, verified live Nov 9.
- Keep every screen free of real personal data. The demo site is a fresh trial site with seeded demo data only.
- End card: repo link, installation link, "Built for Codegeist 2026".
