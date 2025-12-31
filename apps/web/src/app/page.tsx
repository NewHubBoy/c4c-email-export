"use client";

import { useMemo, useState } from "react";

type ResultState = {
  status: "idle" | "loading" | "success" | "error";
  data?: unknown;
  error?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

type EmailNote = {
  html: string;
  text: string;
};

function extractReferenceIds(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const references = (data as { references?: unknown }).references as {
    d?: { results?: Array<{ ID?: unknown }> };
  } | null;
  const results = references?.d?.results;
  if (!Array.isArray(results)) {
    return [];
  }
  const ids = results
    .map((result) => (typeof result?.ID === "string" ? result.ID : null))
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

function extractEmailNoteHtml(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const emailNotes = (data as { emailNotes?: unknown }).emailNotes as {
    d?: {
      results?: Array<{
        EMailNotes?: Array<{ Text?: unknown }>;
      }>;
    };
  } | null;
  const results = emailNotes?.d?.results;
  if (!Array.isArray(results)) {
    return [];
  }
  const htmlNotes: string[] = [];
  results.forEach((result) => {
    const notes = result?.EMailNotes;
    if (!Array.isArray(notes)) {
      return;
    }
    notes.forEach((note) => {
      if (typeof note?.Text === "string" && note.Text.trim()) {
        htmlNotes.push(note.Text);
      }
    });
  });
  return htmlNotes;
}

function formatEmailHtml(html: string): string {
  if (!html) {
    return "";
  }
  const normalized = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<div[^>]*>/gi, "");

  if (typeof window === "undefined" || !("DOMParser" in window)) {
    return normalized.replace(/<[^>]+>/g, "").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, "text/html");
  const text = doc.body.textContent || "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ResultBlock({
  label,
  state,
  filename
}: {
  label: string;
  state: ResultState;
  filename: string;
}) {
  if (state.status === "idle") {
    return <p className="status">No data yet.</p>;
  }

  if (state.status === "loading") {
    return <p className="status">Loading...</p>;
  }

  if (state.status === "error") {
    return <p className="status error">{state.error || "Request failed."}</p>;
  }

  return (
    <div>
      <div className="actions">
        <button
          className="button ghost"
          type="button"
          onClick={() => downloadJson(state.data, filename)}
        >
          Download JSON
        </button>
      </div>
      <pre className="result">{JSON.stringify(state.data, null, 2)}</pre>
      <p className="status">{label}</p>
    </div>
  );
}

export default function Home() {
  const [ticketId, setTicketId] = useState("");
  const [emailActivityId, setEmailActivityId] = useState("");

  const [textState, setTextState] = useState<ResultState>({
    status: "idle"
  });
  const [memoState, setMemoState] = useState<ResultState>({
    status: "idle"
  });
  const [emailState, setEmailState] = useState<ResultState>({
    status: "idle"
  });

  const basePayload = useMemo(
    () => ({
      ticketId: ticketId.trim()
    }),
    [ticketId]
  );

  const canRun = Boolean(basePayload.ticketId);

  const memoReferenceIds = useMemo(
    () => extractReferenceIds(memoState.data),
    [memoState.data]
  );
  const formattedEmailNotes = useMemo<EmailNote[]>(
    () =>
      extractEmailNoteHtml(emailState.data).map((html) => ({
        html,
        text: formatEmailHtml(html)
      })),
    [emailState.data]
  );

  async function runRequest(
    path: string,
    payload: Record<string, unknown>,
    setState: (state: ResultState) => void
  ) {
    try {
      setState({ status: "loading" });
      const response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message;
        throw new Error(message || "Request failed.");
      }
      setState({ status: "success", data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request failed.";
      setState({ status: "error", error: message });
    }
  }

  return (
    <main>
      <section className="hero">
        <h1>C4C Text Explorer</h1>
        <p>
          Fetch service request text collections, internal memos, and e-mail
          notes with server-side Basic Auth. Results are returned as JSON with
          one-click export.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Ticket Input</h2>
          <p>
            C4C_TENANT_URL, C4C_USERNAME, and C4C_PASSWORD are loaded from the
            API .env file.
          </p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ticketId">Ticket ID</label>
            <input
              id="ticketId"
              placeholder="XYZ"
              value={ticketId}
              onChange={(event) => setTicketId(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Service Request Text Collection</h2>
          <p>Returns description, interactions, and notes for the ticket.</p>
        </div>
        <div className="actions">
          <button
            className="button"
            type="button"
            disabled={!canRun || textState.status === "loading"}
            onClick={() =>
              runRequest("/c4c/service-request-texts", basePayload, setTextState)
            }
          >
            Fetch Texts
          </button>
        </div>
        <ResultBlock
          label="ServiceRequestTextCollection response."
          state={textState}
          filename={`service-request-texts-${ticketId || "ticket"}.json`}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Internal Memo Lookup</h2>
          <p>
            Pulls internal memo references and expands ActivityText entries.
          </p>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            type="button"
            disabled={!canRun || memoState.status === "loading"}
            onClick={() =>
              runRequest("/c4c/internal-memos", basePayload, setMemoState)
            }
          >
            Fetch Internal Memos
          </button>
        </div>
        <ResultBlock
          label="Internal memo references and ActivityText response."
          state={memoState}
          filename={`internal-memos-${ticketId || "ticket"}.json`}
        />
        {memoReferenceIds.length > 0 ? (
          <div>
            <p className="status">IDs detected from Internal Memo results:</p>
            <div className="actions">
              {memoReferenceIds.map((id) => (
                <button
                  className="button ghost"
                  type="button"
                  key={id}
                  disabled={!canRun || emailState.status === "loading"}
                  onClick={() => {
                    setEmailActivityId(id);
                    runRequest(
                      "/c4c/email-notes",
                      { ...basePayload, emailActivityId: id },
                      setEmailState
                    );
                  }}
                >
                  Fetch Email Notes: {id}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Email Notes</h2>
          <p>
            First call returns a list of e-mail references. Paste the email
            activity ID to expand notes.
          </p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="emailActivityId">Email Activity ID (optional)</label>
            <input
              id="emailActivityId"
              placeholder="Paste the e-mail activity ID"
              value={emailActivityId}
              onChange={(event) => setEmailActivityId(event.target.value)}
            />
          </div>
        </div>
        <div className="actions">
          <button
            className="button"
            type="button"
            disabled={!canRun || emailState.status === "loading"}
            onClick={() =>
              runRequest(
                "/c4c/email-notes",
                {
                  ...basePayload,
                  emailActivityId: emailActivityId.trim() || undefined
                },
                setEmailState
              )
            }
          >
            Fetch Email Notes
          </button>
        </div>
        <ResultBlock
          label="Email references and expanded EMailNotes response."
          state={emailState}
          filename={`email-notes-${ticketId || "ticket"}.json`}
        />
        {emailState.status === "success" && formattedEmailNotes.length > 0 ? (
          <div className="note-list">
            <p className="status">Formatted EMailNotes.Text content:</p>
            {formattedEmailNotes.map((note, index) => (
              <div className="note-card" key={`${index}-${note.text.length}`}>
                <pre>{note.text}</pre>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
