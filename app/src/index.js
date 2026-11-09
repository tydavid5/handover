// Handover: three Rovo actions and the UI Kit resolver.
// The pack is built fresh from Jira, Confluence and Teamwork Graph each time it is asked for,
// then saved to Forge storage so the project page can show it again.

import api, { route } from "@forge/api";
import { storage } from "@forge/kvs";
import Resolver from "@forge/resolver";
import { twg, twgAll, Q, userAri, workItemAri } from "./twg.js";

const log = (event, data) => console.log(JSON.stringify({ handover: event, ...data }));

const isDoneStatus = (status) => /^(done|closed|resolved)$/i.test(status || "");
const isBlockedStatus = (status) => /blocked/i.test(status || "");
const isHighPriority = (priority) => /^(highest|high)$/i.test(priority || "");

// Rovo puts the person chatting in payload.context.accountId.
const askerOf = (payload) => payload?.context?.accountId || null;

// Resolve a name or email to one Jira user, as the person asking (they only find who they can see).
// Reads run as the app, not as the user: asUser() needs per-user consent, and
// a raw consent or 401 error thrown out of a resolver makes the Forge runtime
// re-prompt for consent in a loop (ECO-1297). asApp() uses the scopes granted
// at install, so it never needs that consent. Teamwork Graph stays on asUser
// because requestTeamworkGraph only exists there, and twg() already catches
// its errors. Every call below catches its own failure and returns a
// controlled error instead of throwing.
async function findPerson(text) {
  let res;
  try {
    res = await api.asApp().requestJira(route`/rest/api/3/user/search?query=${text}&maxResults=5`);
  } catch (e) {
    return { error: `user search could not run (${String(e?.message || e).slice(0, 120)})` };
  }

  if (!res || !res.ok) return { error: `user search failed (${res?.status || "no response"})` };

  const users = (await res.json()).filter((u) => u.accountType === "atlassian" && u.active);

  if (users.length === 0) return { error: `no active person matches "${text}"` };

  if (users.length > 1) {
    return { error: `"${text}" matches ${users.length} people: ${users.map((u) => u.displayName).join(", ")}. Ask which one.` };
  }

  return { accountId: users[0].accountId, name: users[0].displayName };
}

async function personName(accountId) {
  try {
    const res = await api.asApp().requestJira(route`/rest/api/3/user?accountId=${accountId}`);
    return res.ok ? (await res.json()).displayName : accountId;
  } catch (e) {
    return accountId;
  }
}

function parseLeaveStart(value) {
  const d = new Date(String(value || "").trim());
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

async function teamsOf(accountId, notes) {
  const r = await twgAll("userTeams", Q.userTeams, { userId: userAri(accountId) }, "atlassianUserInTeams");
  if (!r.ok) notes.push(`teams could not be read: ${r.error}`);
  else if (!r.complete) notes.push("team list may be incomplete");
  return r.nodes.map((t) => ({ id: t.id, name: t.displayName }));
}

async function assignedTo(accountId, notes, maxPages = 4) {
  // Assigned work via Jira JQL as the app: reliable, needs no user consent and
  // no Teamwork Graph. Teamwork Graph is the fallback; its curated fields
  // intermittently answer "User is not permitted to query this organization".
  const jql = `assignee = "${accountId}" ORDER BY updated DESC`;
  try {
    const res = await api.asApp().requestJira(route`/rest/api/3/search/jql?jql=${jql}&fields=summary,status&maxResults=50`);
    if (res && res.ok) {
      const body = await res.json();
      return (body.issues || []).map((i) => ({ key: i.key, summary: i.fields?.summary, status: i.fields?.status?.name || null, webUrl: null }));
    }
    notes.push(`assigned work search returned ${res?.status || "no response"}, trying Teamwork Graph`);
  } catch (e) {
    notes.push(`assigned work search could not run (${String(e?.message || e).slice(0, 80)}), trying Teamwork Graph`);
  }
  const r = await twgAll("assignedWork", Q.assignedWork, { userId: userAri(accountId) }, "atlassianUserAssignedJiraWorkItems", maxPages);
  if (!r.ok) notes.push(`assigned work could not be read: ${r.error}`);
  else if (!r.complete) notes.push(`showing the first ${r.nodes.length} assigned work items; there are more`);
  return r.nodes.map((n) => ({ key: n.key, summary: n.summary, status: n.status?.name || null, webUrl: n.webUrl }));
}

// Jira REST details for one item: priority and due date, used to judge urgency.
async function issueDetails(key, notes) {
  let res;
  try {
    res = await api.asApp().requestJira(route`/rest/api/3/issue/${key}?fields=summary,status,priority,duedate`);
  } catch (e) {
    notes.push(`details for ${key} could not be read (${String(e?.message || e).slice(0, 80)})`);
    return null;
  }
  if (!res || !res.ok) {
    notes.push(`details for ${key} could not be read (${res?.status || "no response"})`);
    return null;
  }
  const issue = await res.json();
  return {
    key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name || null,
    priority: issue.fields.priority?.name || null,
    dueDate: issue.fields.duedate || null,
  };
}

// Confluence pages the person contributed to, most recently changed first.
// Lets the route tag encode the CQL exactly once (pre-encoding it encodes it
// twice). Tries the app first, then the user on a 401: the consent token
// exists now, and the fallback is caught, so it cannot restart the consent
// loop.
async function personPages(accountId, notes) {
  const cql = `contributor = "${accountId}" order by lastmodified desc`;
  const path = route`/rest/api/content/search?cql=${cql}&limit=5`;
  let res = null;
  try {
    res = await api.asApp().requestConfluence(path);
  } catch (e) {
    log("confluence-asapp-failed", { error: String(e?.message || e).slice(0, 200) });
    res = null;
  }
  if (!res || res.status === 401) {
    try {
      res = await api.asUser().requestConfluence(path);
    } catch (e) {
      log("confluence-asuser-failed", { error: String(e?.message || e).slice(0, 200) });
      res = null;
    }
  }

  if (!res || !res.ok) {
    notes.push(`Confluence pages could not be read (${res?.status || "no response"})`);
    return [];
  }

  const body = await res.json();
  return (body.results || []).map((p) => ({
    title: p.title,
    url: p._links?.webui ? p._links.webui : null,
  }));
}

// The handover pack: open work split into urgent and can-wait, people to ask,
// decisions already made (goals linked to the urgent items), and docs to read.
async function buildPack(person, leaveStart, cloudId) {
  const t0 = Date.now();
  const notes = [];
  const leaveDate = parseLeaveStart(leaveStart);
  const urgentBefore = addDays(leaveDate, 7);

  const [teams, workItems] = await Promise.all([
    teamsOf(person.accountId, notes),
    assignedTo(person.accountId, notes),
  ]);

  const open = workItems.filter((w) => w.status && !isDoneStatus(w.status));

  // Priority and due date decide urgency. Blocked items are always urgent.
  const detailed = [];
  for (const item of open.slice(0, 20)) {
    const d = await issueDetails(item.key, notes);
    detailed.push(d || item);
  }

  const urgent = [];
  const canWait = [];
  for (const item of detailed) {
    const due = item.dueDate ? new Date(item.dueDate) : null;
    const dueSoon = due && !Number.isNaN(due.getTime()) && due <= urgentBefore;
    if (isBlockedStatus(item.status) || isHighPriority(item.priority) || dueSoon) urgent.push(item);
    else canWait.push(item);
  }

  // Contacts and decisions come from the urgent items: recent commenters and linked goals.
  const contacts = new Map();
  const decisions = [];
  for (const item of urgent.slice(0, 5)) {
    let res;
    try {
      res = await api.asApp().requestJira(route`/rest/api/3/issue/${item.key}?fields=assignee,reporter`);
    } catch (e) {
      continue;
    }
    if (!res || !res.ok) continue;
    const issue = await res.json();
    for (const who of [issue.fields.assignee, issue.fields.reporter]) {
      if (who?.accountId && who.accountId !== person.accountId) {
        contacts.set(who.accountId, { name: who.displayName, accountId: who.accountId });
      }
    }
  }

  // Comments on the urgent items, last 90 days, add the people talking about them.
  // Needs the site id for the work item ARI; without it this step is skipped.
  for (const item of urgent.slice(0, 5)) {
    if (!cloudId) {
      notes.push("comments and goals could not be read: no site id in context");
      break;
    }
    let detail;
    try {
      detail = await api.asApp().requestJira(route`/rest/api/3/issue/${item.key}?fields=id`);
    } catch (e) {
      continue;
    }
    if (!detail || !detail.ok) continue;
    const issue = await detail.json();
    const ari = workItemAri(cloudId, issue.id);
    const comments = await twgAll("workItemComments", Q.workItemComments, { id: ari, since: "P90D" }, "jiraWorkItemComments", 1);
    if (!comments.ok) {
      notes.push(`comments for ${item.key} could not be read: ${comments.error}`);
      continue;
    }
    for (const c of comments.nodes) {
      const authorId = c.author?.accountId;
      if (authorId && authorId !== person.accountId && !contacts.has(authorId)) {
        contacts.set(authorId, { name: c.author?.name || authorId, accountId: authorId });
      }
    }
    const goals = await twgAll("workItemGoals", Q.workItemGoals, { id: ari }, "jiraWorkItemGoals", 1);
    if (!goals.ok) notes.push(`goals for ${item.key} could not be read: ${goals.error}`);
    for (const g of goals.nodes) decisions.push({ goal: g.name, url: g.url || null, itemKey: item.key });
  }

  const docs = await personPages(person.accountId, notes);

  const pack = {
    person: person.name,
    leaveStart: leaveDate.toISOString().slice(0, 10),
    builtAt: new Date().toISOString(),
    generatedNote: "This pack is a summary built from the person's Jira work, Confluence pages and Teamwork Graph context. It is not the person's own words. A human should check it before relying on it.",
    urgent: urgent.slice(0, 10),
    canWait: canWait.slice(0, 10),
    doneCount: workItems.length - open.length,
    teams: teams.map((t) => t.name),
    contacts: [...contacts.values()].slice(0, 10),
    decisions: decisions.slice(0, 10),
    docs,
    notes: [...new Set(notes)],
  };

  log("build-pack", { ms: Date.now() - t0, person: person.name, urgent: pack.urgent.length, canWait: pack.canWait.length, notes: notes.length });
  return pack;
}

// Action 1: build the leave-handover pack for a named teammate.
export async function getHandoverPack(payload) {
  const asked = String(payload?.person || "").trim();
  if (!asked) return { error: "Whose handover pack? Give me a name or email." };

  const person = await findPerson(asked);
  if (person.error) return { error: person.error };

  const pack = await buildPack(person, payload?.leaveStart || null, payload?.context?.cloudId || null);

  try {
    await storage.set(`pack:${person.accountId}`, pack);
  } catch (e) {
    pack.notes.push(`pack could not be saved for the project page: ${String(e?.message || e)}`);
  }

  return pack;
}

// Action 2: what is a person (or the asker) working on?
export async function getPersonWork(payload) {
  const t0 = Date.now();
  const notes = [];
  let person;

  const asked = String(payload?.person || "").trim();
  if (asked) {
    person = await findPerson(asked);
    if (person.error) return { error: person.error };
  } else {
    const id = askerOf(payload);
    if (!id) return { error: "I could not tell who is asking. Give me a name." };
    person = { accountId: id, name: await personName(id) };
  }

  const [teams, workItems] = await Promise.all([teamsOf(person.accountId, notes), assignedTo(person.accountId, notes)]);
  const open = workItems.filter((w) => w.status && !isDoneStatus(w.status));

  log("person-work", { ms: Date.now() - t0, teams: teams.length, items: workItems.length, notes: notes.length });
  return { person: person.name, teams: teams.map((t) => t.name), assignedOpen: open, assignedDoneCount: workItems.length - open.length, notes };
}

// Action 3: who is involved in one work item?
export async function listHandoverContacts(payload) {
  const t0 = Date.now();
  const notes = [];
  const key = String(payload?.issueKey || payload?.context?.jira?.issueKey || "").trim().toUpperCase();

  if (!key) return { error: "Which work item? Give me a key such as ORB-12." };

  let res;
  try {
    res = await api.asApp().requestJira(route`/rest/api/3/issue/${key}?fields=summary,assignee,reporter,status`);
  } catch (e) {
    return { error: `Could not read ${key} (${String(e?.message || e).slice(0, 120)}).` };
  }
  if (res?.status === 404) return { error: `${key} does not exist or you cannot see it.` };
  if (!res || !res.ok) return { error: `Could not read ${key} (${res?.status || "no response"}).` };

  const issue = await res.json();
  const cloudId = payload?.context?.cloudId;
  const ari = workItemAri(cloudId, issue.id);

  const [comments, goals] = await Promise.all([
    twgAll("workItemComments", Q.workItemComments, { id: ari, since: "P90D" }, "jiraWorkItemComments"),
    twgAll("workItemGoals", Q.workItemGoals, { id: ari }, "jiraWorkItemGoals"),
  ]);

  if (!comments.ok) notes.push(`comments could not be read: ${comments.error}`);
  if (!goals.ok) notes.push(`goals could not be read: ${goals.error}`);

  const byAuthor = new Map();
  for (const c of comments.nodes) {
    const name = c.author?.name || "unknown";
    const row = byAuthor.get(name) || { name, comments: 0, lastAt: null };
    row.comments += 1;
    if (!row.lastAt || c.createdAt > row.lastAt) row.lastAt = c.createdAt;
    byAuthor.set(name, row);
  }

  const assignee = issue.fields.assignee;
  const assigneeTeams = assignee ? (await teamsOf(assignee.accountId, notes)).map((t) => t.name) : [];

  log("handover-contacts", { ms: Date.now() - t0, key, comments: comments.nodes.length, goals: goals.nodes.length });
  return {
    workItem: { key, summary: issue.fields.summary, status: issue.fields.status?.name },
    assignee: assignee ? { name: assignee.displayName, teams: assigneeTeams } : null,
    reporter: issue.fields.reporter?.displayName || null,
    commentersLast90Days: [...byAuthor.values()].sort((a, b) => b.comments - a.comments),
    goals: goals.nodes.map((g) => ({ name: g.name, url: g.url })),
    notes,
  };
}

// UI Kit resolver for the project page and issue panel.
const resolver = new Resolver();

resolver.define("getPack", async ({ payload, context }) => {
  const asked = String(payload?.person || "").trim();
  if (!asked) return { error: "Give me a name or email to build a pack for." };
  const person = await findPerson(asked);
  if (person.error) return { error: person.error };
  return buildPack(person, payload?.leaveStart || null, context?.cloudId || null);
});

resolver.define("getSavedPack", async ({ payload }) => {
  const accountId = String(payload?.accountId || "").trim();
  if (!accountId) return { error: "No saved pack to show." };
  const pack = await storage.get(`pack:${accountId}`);
  if (!pack) return { error: "No saved pack for this person yet. Build one first." };
  return pack;
});

export const handler = resolver.getDefinitions();
