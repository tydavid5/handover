import React, { useState } from "react";
import ForgeReconciler, { Button, DatePicker, Form, Heading, SectionMessage, Stack, Text, Textfield } from "@forge/react";
import { invoke } from "@forge/bridge";

const App = () => {
  const [person, setPerson] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [pack, setPack] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Read the values from state, not from the form submit argument: the UI Kit
  // Form onSubmit has arrived with no data before, which broke the build with
  // "Cannot read properties of undefined (reading 'person')". The form data is
  // only a fallback now.
  const fieldValue = (v) => (typeof v === "string" ? v : v?.target?.value || "");

  const buildPack = async (formData) => {
    setError("");
    setPack(null);
    const name = (person || formData?.person || "").trim();
    const start = leaveStart || formData?.leaveStart || null;
    if (!name) {
      setError("Give me a name or email to build a pack for.");
      return;
    }
    setLoading(true);
    try {
      const result = await invoke("getPack", {
        person: name,
        leaveStart: start,
      });
      if (result?.error) setError(result.error);
      else setPack(result);
    } catch (e) {
      setError(`Could not build the pack: ${String(e?.message || e)}`);
    }
    setLoading(false);
  };

  const itemLine = (item) => {
    const bits = [item.key, item.summary].filter(Boolean).join(" - ");
    const meta = [item.status, item.priority, item.dueDate ? `due ${item.dueDate}` : null].filter(Boolean).join(", ");
    return meta ? `${bits} (${meta})` : bits;
  };

  return (
    <Stack space="space.200">
      <Heading size="large">Handover</Heading>
      <Text>
        When a teammate goes on leave, their work stalls because the context lives in their head and in
        scattered tickets. Pick the person and their first day away, and Handover builds the pack from
        their Jira work, Confluence pages and Teamwork Graph context.
      </Text>
      <Form onSubmit={buildPack} submitButtonText={loading ? "Building..." : "Build handover pack"}>
        <Textfield label="Teammate" name="person" isRequired placeholder="Name or email, for example Maya" value={person} onChange={(v) => setPerson(fieldValue(v))} />
        <DatePicker label="First day of leave" name="leaveStart" placeholder="YYYY-MM-DD" value={leaveStart} onChange={(v) => setLeaveStart(fieldValue(v))} />
      </Form>
      <Button appearance="primary" onClick={buildPack} isDisabled={loading}>
        {loading ? "Building..." : "Build handover pack"}
      </Button>
      {error ? <SectionMessage title="Could not build the pack" appearance="error"><Text>{error}</Text></SectionMessage> : null}
      {pack ? (
        <Stack space="space.200">
          <SectionMessage title="Generated summary" appearance="information">
            <Text>{pack.generatedNote}</Text>
            <Text>Built {pack.builtAt} for {pack.person}, leave starts {pack.leaveStart}.</Text>
          </SectionMessage>
          <Heading size="medium">Urgent ({pack.urgent.length})</Heading>
          {pack.urgent.length === 0 ? <Text>Nothing urgent. Good timing.</Text> : null}
          {pack.urgent.map((item) => <Text key={item.key}>{itemLine(item)}</Text>)}
          <Heading size="medium">Can wait ({pack.canWait.length})</Heading>
          {pack.canWait.length === 0 ? <Text>Nothing waiting.</Text> : null}
          {pack.canWait.map((item) => <Text key={item.key}>{itemLine(item)}</Text>)}
          <Heading size="medium">Who to ask ({pack.contacts.length})</Heading>
          {pack.contacts.length === 0 ? <Text>No contacts found yet.</Text> : null}
          {pack.contacts.map((c) => <Text key={c.accountId}>{c.name}</Text>)}
          <Heading size="medium">Decided already ({pack.decisions.length})</Heading>
          {pack.decisions.length === 0 ? <Text>No linked goals found.</Text> : null}
          {pack.decisions.map((d, i) => <Text key={i}>{d.goal} ({d.itemKey})</Text>)}
          <Heading size="medium">Docs to read ({pack.docs.length})</Heading>
          {pack.docs.length === 0 ? <Text>No Confluence pages found.</Text> : null}
          {pack.docs.map((d, i) => <Text key={i}>{d.title}</Text>)}
          {pack.teams.length > 0 ? <Text>Teams: {pack.teams.join(", ")}</Text> : null}
          {pack.notes.length > 0 ? (
            <SectionMessage title="Notes" appearance="warning">
              {pack.notes.map((n, i) => <Text key={i}>{n}</Text>)}
            </SectionMessage>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
