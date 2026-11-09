# Codegeist 2026 entry note: Handover

## Deadline

Tue Dec 22, 2026, 12:00 PM Pacific Time (20:00 UTC, 21:00 WAT). Judging Jan 5 - Feb 3, 2027. Winners announced around Feb 15, 2027.

## Prizes

$120,000+ cash. 1st $15,000 x3, 2nd $8,000 x3, 3rd $5,000 x3. Bonus $1,500 x6 in four categories: Best Agents - Rovo/Assignable agents, Best app with Atlassian MCP, Best apps with Teamwork Graph integration, Best Marketplace published app. Participation swag pack for 300, first-come first-serve.

## Eligibility

Verified live in the rules Nov 9, 2026: individuals at least the age of majority where they reside. Nigeria NOT on the excluded list. Five is eligible.

## Category

Apps for Business Teams.

## Bonus prizes targeted

- Best Agents - Rovo/Assignable agents (rovo:agent module)
- Best app with Atlassian MCP (rovo:mcp module)
- Best apps with Teamwork Graph integration (consumes Teamwork Graph API)

## What the live form requires

From the Devpost page, verified Nov 9, 2026:

- Installation link for the judges to install and test the app, plus all instructions to get it working in a judge's environment.
- Demo video under 5 minutes, uploaded to YouTube and made public.
- Category and bonus prizes selected, with any write-up for the bonus prizes.
- Explanation of how the project meets the main technology requirement (Forge app integrating at least one Atlassian product).
- Complete the Devpost submission form before the deadline.

Project rules: newly created, or updated/rebuilt in Forge after the submission period started, with a Forge manifest and at least one Forge module. Must run on Atlassian Forge. Must be installable in a judge's test environment via the installation link.

## Problem sentence (same everywhere)

When a teammate goes on leave, their work stalls because the context lives in their head and in scattered tickets.

## Proof links

- Repo: https://github.com/tydavid5/handover (public, live Nov 9, 2026, commit 51495d97bbb55d2d6a3a0bdb52a51b16b83456f7, verified by read-back: manifest.yml and README.md match local files)
- Live demo / installation link: (needs Atlassian developer site + Five's Atlassian sign-in)
- Demo video: (under 5 min, public on @arc5ive)
- Devpost submission: (to create)

## Needs from Five

- Atlassian sign-in once, to create the free developer site and install the app so judges get an installation link. No card, no money.
- Approval of the demo video before it is uploaded.

## Build notes

- Forge CLI 15.0.0 installed in the VM with `npm install -g @forge/cli --ignore-scripts` (keytar native build fails on fchown EPERM; CLI runs fine without it for scaffold/lint/package).
- Forge research notes: ~/workspace/codegeist-handover/research/forge-platform-notes.md
- Tracker: ~/workspace/hackathon-marathon/TRACKER.md
