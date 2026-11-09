# Forge platform research notes — Handover (Codegeist 2026)

Researched 2026-11-09 from developer.atlassian.com and one independent Codegeist 2026 tutorial. Research only; nothing installed, no accounts created. All URLs below were read live on 2026-11-09.

## 1. Forge getting started

**Docs:** https://developer.atlassian.com/platform/forge/set-up-forge/

- **Node.js required:** a supported LTS release, 22.x (22.23.4+) or 24.x (24.22.1+). (This VM already has Node v24.22.1, which qualifies.)
- **Install the CLI:** `npm install -g @forge/cli` (do not use sudo/root). Verify with `forge --version`.
- **Log in:** `forge login` with an Atlassian API scoped token. Create the token at https://id.atlassian.com/manage-profile/security/api-tokens → "Create API token with scopes" → select **Forge** as the app. On a headless Linux box without a keychain (`libsecret` missing), skip `forge login` and use env vars instead: `FORGE_EMAIL` and `FORGE_API_TOKEN`.
- **Create an app:** `forge create` (interactive: name up to 50 chars, pick product/template, e.g. Jira or "Multiple"). This registers the app and writes its id into `manifest.yml`.
- **Project layout (Jira template):** `manifest.yml` at root (name, app id, permissions/scopes, modules), `src/` with frontend (UI Kit or Custom UI) and backend resolver functions, `package.json`.
- **Deploy:** `cd <app-dir>` then `forge deploy`. Builds, compiles and deploys to the Forge development environment; reports compilation errors. Redeploy after every code change.
- **Install:** `forge install` (prompts for product and site URL, e.g. `yoursite.atlassian.net`). Must run `forge deploy` first. Update an installed app with `forge install --upgrade`. Uninstall with `forge uninstall`.
- **Demo site shortcut:** `forge install --demo-site` reuses your latest active demo site or provisions one. A demo site includes realistic seeded data and is active for 90 days by default.
- **Local dev:** `forge tunnel` for hot reload and log streams while developing.
- **Free Atlassian Cloud Developer License:** the Codegeist rules point at https://developer.atlassian.com/cloud/ for signup. A traditional development site is created via the "Atlassian cloud developer site" link on the getting-started page (go.atlassian.com); log in and complete its setup wizard. The developer site gives a free Jira + Confluence cloud site to install and test on. **Caveat:** a free developer site may not include Rovo (see section 6).

## 2. The `rovo:agent` module

**Docs:** https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/
**Tutorial:** https://developer.atlassian.com/platform/forge/build-a-jira-issue-analyst-rovo-agent/

Manifest structure (all under `modules:`):

```yaml
modules:
  rovo:agent:
    - key: handover-agent
      name: "Handover Assistant"        # mandatory, max 30 characters
      description: Answers questions about a teammate's handover pack
      icon: resource:main-resources;icons/agent-icon.svg   # optional, resource path or absolute URL
      prompt: |                          # mandatory, inline string OR resource path
        You are the Handover Assistant. You answer questions as if Maya were here,
        using only the handover pack and the actions below. Never invent facts.
      conversationStarters:              # optional
        - What is Maya working on right now?
        - Who should I ask about the billing project?
      actions:                           # optional, list of `action` module keys
        - fetch-handover-pack
        - fetch-person-work
      skills:                            # optional, list of `rovo:skill` module keys (Preview)
        - handover-briefing-skill
      followUpPrompt: "..."              # optional
resources:
  - key: agent-prompt
    path: prompts
```

- `prompt` can be a resource file instead of inline text: `prompt: resource:agent-prompt;prompt.md` (needs Forge CLI 10.6.0+). Keep long prompts out of the YAML; long inline prompts are one of the largest contributors to manifest size.
- **Actions** are separate `action` modules backed by Forge functions. Each action has `key`, `name`, `function`, `actionVerb` (GET, CREATE, UPDATE, DELETE, TRIGGER), `description`, and `inputs` (typed, with title/description/required). Rovo reads the action descriptions to decide when to call them, so write each description as the question it answers.
- **Action data limit:** a Rovo action can only handle data up to 5 MB.
- **Automation caveat:** agents triggered by automation rules will not call CREATE, UPDATE, DELETE or TRIGGER actions, only GET. Design handover actions as GET where possible.
- **Skills (`rovo:skill`, Preview):** task-specific playbooks / multi-step orchestration, loaded only when relevant. Use a skill when a workflow coordinates several actions in order, has branching/validation, or would otherwise bloat the prompt.
- **Interaction points:** Rovo chat side panel in Jira/Confluence (Chat button in top nav), `/ai` toolbar in the Confluence and Jira editors, Automation rules, and programmatic access via the Forge bridge rovo API.
- **Data access:** app-based agents only see data in the workspace where the app is installed. A Confluence page on the same tenant is NOT automatically visible to an agent installed only in Jira. For cross-product data, configure the app to support multiple Atlassian apps (see `app.compatibility`).
- **Screening:** Atlassian safety-screens agents and may block deployment or suspend Rovo API use if issues are found.

## 3. Teamwork Graph

**Docs:** https://developer.atlassian.com/platform/forge/call-the-teamwork-graph-api/
**Independent tutorial (Codegeist 2026, Oct 2026):** https://dev.to/mihai_leanzero/atlassian-teamwork-graph-api-forge-rovo-agent-3mcc

- **Status:** Preview since 15 October 2026 (was EAP before that). Preview = usable by anyone, same support as GA, breaking changes get at least 1 month's deprecation notice via the Teamwork Graph changelog. No allowlisting was needed as of October 2026, though two older docs pages still mention it.
- **What it is:** Atlassian's connected model of a site/org: users, teams, Jira work items, comments, goals, Confluence pages, plus third-party connector data. One GraphQL endpoint per site: `POST https://<your-site>.atlassian.net/gateway/api/graphql/twg`
- **How a Forge app calls it:** from backend code with `@forge/api` (`@forge/api` 8.4.0+ in the tutorial):
  ```js
  import api from '@forge/api';
  const response = await api.asUser().requestTeamworkGraph(`query { echo(myString: "Hello World!") }`);
  ```
  Frontend alternative: `requestTeamworkGraph` from `@forge/bridge` (always runs as the current user). `api.asApp()` is also available, but the tutorial runs as the user so results are permission-filtered to what that user can already see.
- **Two query styles:**
  - **Curated queries (preferred):** ready-made typed GraphQL root fields defined by Atlassian, e.g. `atlassianUserAssignedJiraWorkItems`, `confluencePageContributors`. No registration step. Paging with `first`/`after`; `first` caps at 25 rows, requesting more is an error.
  - **Persisted Cypher queries:** for custom traversals, write Cypher, register it in advance via TWG Labs Query Builder (https://teamwork-graph.atlassian.com/query-builder) against your Forge app, get a `queryKey`, then call it at runtime through the GraphQL `customQuery` field with the key + params. Raw `cypherQuery` sent at request time is refused for new apps.
- **Scopes (per-object, pattern `read:graph:<object>:<product>`):** add one scope per object type your query reads, including intermediate objects in a traversal. The broad `read:graph:jira` / `read:graph:confluence` scopes are being retired. Relevant scopes for Handover:
  - `read:graph:issue:jira`, `read:graph:issue-status:jira`, `read:graph:issue-comment:jira`
  - `read:graph:page:confluence`
  - `read:graph:user:atlassian`, `read:graph:team:atlassian`, `read:graph:goal:atlassian`
  - Plus plain Jira/Confluence scopes for REST calls the actions also make, e.g. `read:jira-work`, `read:jira-user`, `read:confluence-content.all` (or granular `read:page:confluence`)
  - Forge caps an app at 50 scopes.
- **Admin approval:** the organization admin must grant the requested scopes when installing or configuring the app.
- **Silent-failure gotcha:** missing or disabled scopes do NOT produce a deployment or API error; queries succeed but omit unreadable data, so results can come back empty. Test with the `echo` query first.
- **Operation names:** every GraphQL operation needs a name shaped `company_operation` (company ≥ 3 chars, operation ≥ 4). Without one the API answers HTTP 200 with a `DataFetchingException`, so checking `res.ok` alone passes.
- **Rate limits:** curated queries return at most 25 rows a page; in the tutorial's tests a rate-limited call could come back with zero rows after about 128 calls in 20 seconds. Client should retry with backoff and the agent prompt should say "may be incomplete" rather than "nothing found".
- **What it can read for Handover:** a person's assigned Jira work items + status, their teams, goals linked to work, who is assigned/reported/commented on an item, Confluence page contributors. (Decisions: the graph models goals, work, people, pages, comments; there is no single "decision" object type, so decisions are best read from linked Confluence pages / issue comments, or stored by the app itself in Forge storage.)

## 4. The `rovo:mcp` module

**Docs:** https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/
**Tutorial:** https://developer.atlassian.com/platform/forge/build-a-hello-world-rovo-mcp/
**Module reference for `action`:** https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/

- **Status:** Preview (fully supported, shorter deprecation windows possible). Needs Forge CLI 13.3.0+ for the hello-world flow (`npm install -g @forge/cli@latest`).
- **What it does:** exposes your Forge `action` modules as tools to custom agents in Rovo Studio and to third-party MCP-compatible AI clients (Claude Desktop, Codex, Cursor, Claude Code). **No separate server to run or host**: the tools are Forge functions; Atlassian hosts the MCP endpoint.
- **Manifest syntax** (at most one `rovo:mcp` module per app; `name` max 30 chars; `tools` is a list of action keys, max 50 actions, each action key under 64 chars):
  ```yaml
  modules:
    rovo:mcp:
      - key: handover-mcp
        name: "Handover MCP"
        tools:
          - fetch-handover-pack
          - fetch-person-work
          - list-handover-contacts
    action:
      - key: fetch-handover-pack
        name: Fetch handover pack
        function: getHandoverPack
        actionVerb: GET
        description: |
          Returns the leave-handover pack for a named teammate: open work, key contacts, decisions, docs.
        inputs:
          person:
            title: Person
            type: string
            required: true
            description: The teammate's name or email
    function:
      - key: getHandoverPack
        handler: index.getHandoverPack
  ```
- **Same actions, two surfaces:** the `action` modules you write for the `rovo:agent` are the same ones listed in `rovo:mcp`'s `tools`. Build the actions once, expose them twice. (This is exactly the Codegeist bonus-prize overlap: one app can qualify for both "Best Agents - Rovo" and "Best app with Atlassian MCP", though one submission can win at most one grand + one bonus prize.)
- **External endpoint:** each installed app exposes its tools at `https://mcp.atlassian.com/forge/<appId>` where `<appId>` is the UUID part of `app.id` in `manifest.yml` (after `ari:cloud:ecosystem::app/`). Add that URL to the client's remote MCP server config.
- **External access is OFF by default:** a site/org admin must enable it per installation in Atlassian Administration → Apps → Sites → your site → Connected apps → select the app → turn on the tools to expose. (During Preview, enabling exposes all tools in the module; per-tool admin choice is planned for GA.)
- **Auth and permissions:** clients connect via OAuth 2.1; the user picks a site (only sites where the app is installed and exposure is enabled), reviews scopes/tools, approves. Every tool invocation respects the invoking user's own permissions on that site.
- **Rovo Studio use needs no Rovo licence on the site for external clients:** per Atlassian staff, a customer's site does not need Rovo enabled/licensed for an external AI client to access `rovo:mcp` tools, as long as an admin enabled exposure. (Using the tools inside Rovo Studio custom agents does need Rovo.)
- **Also exposeable:** an `rovo:skill` + `skill.md` file can be shipped so third-party agents can use the tools with the right playbook (the dora-incident-desk Codegeist 2026 repo does this).

## 5. Forge UI modules for the handover pack

**Module index:** https://developer.atlassian.com/platform/forge/manifest-reference/modules/index-common/
**Multi-product tutorial:** https://developer.atlassian.com/platform/forge/build-an-app-compatible-with-confluence-and-jira/

Recommended fit for Handover (Jira + Confluence, declared via `app.compatibility` with one product required and the other optional):

| Module | Where it appears | Use for Handover |
|---|---|---|
| `jira:globalPage` | Full page in Jira left nav (needs `route`) | Main handover dashboard: pick a person on leave, see their pack, generate/share it |
| `jira:projectPage` | Full page inside a Jira project | Team-level view: everyone on leave in this project and their coverage |
| `jira:issuePanel` | Panel on a Jira issue view | On any issue owned by the person on leave: show its handover status, owner-on-leave banner, cover person |
| `jira:issueAction` | Action menu on an issue | "Add to handover pack" from an issue |
| `confluence:globalPage` | Full page in Confluence (needs `route`) | Handover pack reader: the generated pack rendered as a Confluence-style page |
| `confluence:contentAction` | Action menu on a Confluence page (`target: confluencePage`) | "Create handover pack from this page" on a handover/notes page |
| `confluence:macro` | Embeddable macro in a page | Embed a live handover summary inside a team page |
| `confluence:contentBylineItem` | Byline under a page title | "Handover pack" status chip on the pack page |

Manifest sketch (from the official multi-product tutorial and community examples):

```yaml
modules:
  jira:globalPage:
    - key: handover-dashboard
      resource: main
      resolver:
        function: resolver
      render: native
      title: Handover
      route: handover
  jira:issuePanel:
    - key: handover-issue-panel
      resource: main
      resolver:
        function: resolver
      render: native
      title: Handover
      icon: https://developer.atlassian.com/platform/forge/images/icons/issue-panel-icon.svg
  confluence:contentAction:
    - key: handover-content-action
      resource: main
      resolver:
        function: resolver
      render: native
      title: Create handover pack
      target: confluencePage
  confluence:globalPage:
    - key: handover-pack-page
      resource: main
      resolver:
        function: resolver
      render: native
      title: Handover pack
      route: handover-pack
resources:
  - key: main
    path: src/frontend/index.jsx
function:
  - key: resolver
    handler: index.handler
app:
  id: ari:cloud:ecosystem::app/<your-app-id>
  compatibility:
    jira:
      required: true
    confluence:
      required: false
```

- `render: native` = UI Kit; Custom UI uses a `resource` pointing at a static build instead. UI Kit is faster to build; Custom UI gives full React control.
- **Cross-product install note:** if the app requires both Jira and Confluence, the installer must install it on both products; if Confluence is `required: false`, the app still works when only Jira is installed. When installing with `forge install`, run `forge install --upgrade` once per product.
- **Storage for packs:** use Forge storage (`storage:app` scope, key-value) or Forge SQL (Preview) to persist generated handover packs. No egress needed if the app only calls Atlassian APIs (same pattern as the dora-incident-desk Codegeist 2026 entry, which lists "No egress").

## 6. Gotchas

1. **Rovo is paid-only.** A free developer site may not have Rovo; a Standard or Premium trial includes it. The Codegeist rules do not say how entrants get a Rovo-enabled site; Atlassian's Rovo pricing page says you can "trial Rovo through a trial of our Standard, Premium, or Enterprise plan". Plan: test the Rovo agent on a Standard/Premium trial site you administer. (Source: dev.to tutorial, Oct 2026.)
2. **Forge deploy/install needs an Atlassian account login** (`forge login` with an API token, or `FORGE_EMAIL`/`FORGE_API_TOKEN` env vars on headless Linux). The login is per-developer, not per-app; the token belongs to the Atlassian account that owns the app. Five will need to supply the Atlassian account (or the token) once for the build/deploy step.
3. **An app can be installed on a free developer site.** Yes, via `forge install` or `forge install --demo-site` (demo site: seeded data, 90 days). The only paid-plan dependency is Rovo itself (see 1).
4. **Installation link for judges:** deploy to the **production** environment first (`forge deploy -e production` / promote to production), then in the developer console → Distribution → set **Sharing** (anyone with the link) or **Sharing within organization**, fill in app details, save, copy the installation link. The person installing must be a site admin. Apps that have a Marketplace licence in the manifest or have been submitted for Marketplace listing cannot be shared via installation link; share an unlicensed copy instead. Docs: https://developer.atlassian.com/platform/forge/distribute-your-apps/
5. **Forge now has consumption billing (since 1 Jan 2026), but a hackathon app should stay free.** Docs: https://developer.atlassian.com/platform/forge/forge-platform-pricing/ — free monthly allowance per app: 200,000 GB-seconds of function compute, 0.1 GB KVS reads/writes, 1 GB logs, 1 hr SQL compute, 100,000 SQL requests, 730 GB-hours SQL storage. Overage is billed monthly in arrears to the payment method on file, so a card on file in the developer space is the mechanism, even though a small app should never cross the free line. Usage on up to the first five sandboxes per production site is exempt. **Rovo usage is billed separately from Forge.** The Forge LLMs API has **no** free allowance at all, so avoid it (Handover does not need it; the Rovo agent's LLM is Atlassian's, not the app's Forge LLM calls).
6. **Teamwork Graph scopes need org-admin approval at install time**, and missing scopes fail silently (empty results, no error). Budget time to test the `echo` query first.
7. **App-based agents/tools only see the workspace they are installed in.** A Jira-only install cannot read Confluence pages for the agent; declare both products in `app.compatibility` and install on both.
8. **One `rovo:mcp` module per app, max 50 tools; agent name max 30 chars; action payloads max 5 MB; Forge apps cap at 50 scopes.**
9. **Judges need the app installed, not just a video.** Codegeist requires an installation link plus a public YouTube demo under 5 minutes. The demo video should show the Rovo agent answering and the MCP tools working, since those are the two bonus prizes Handover targets.
10. **Reference implementation:** dora-incident-desk, a public Codegeist 2026 Forge app with a Rovo agent, `rovo:mcp` tools and a Teamwork Graph connector in one manifest: https://github.com/CVasilopoulos/dora-incident-desk — useful as a structural template (same three modules Handover needs).
