"use client";

import { useMemo, useState } from "react";

type ResultState = {
  status: "idle" | "loading" | "success" | "error";
  data?: unknown;
  error?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";

type EmailNote = {
  html: string;
  text: string;
};

type AggregatedEmailNote = {
  ticketId: string;
  emailActivityId: string;
  noteIndex: number;
  html: string;
  text: string;
  objectId: string;
  parentObjectId: string;
  headerObjectId: string;
  externalKey: string;
  emailExternalKey: string;
  emailId: string;
  typeCode: string;
  typeCodeText: string;
  authorName: string;
  authorUuid: string;
  createdOn: string;
  createdBy: string;
  updatedOn: string;
  lastUpdatedBy: string;
  language: string;
  languageText: string;
};

const emailNotesCsvHeader = [
  "TicketID",
  "ObjectID",
  "ParentObjectID",
  "HeaderObjectID",
  "External_Key",
  "EMail_External_Key",
  "EMail_ID",
  "Text",
  "Type_Code",
  "Type_Code_Text",
  "Author_Name",
  "Author_UUID",
  "Created_On",
  "Created_By",
  "Updated_On",
  "Last_Updated_By",
  "Language",
  "Language_Text"
];

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

function extractAggregatedEmailNotes(data: unknown): AggregatedEmailNote[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const emailNotes = (data as { emailNotes?: unknown }).emailNotes as Array<{
    id?: unknown;
    data?: {
      d?: {
        results?: Array<{
          EMailNotes?: Array<{ Text?: unknown }>;
        }>;
      };
    };
  }> | null;
  if (!Array.isArray(emailNotes)) {
    return [];
  }
  const aggregated: AggregatedEmailNote[] = [];
  emailNotes.forEach((entry) => {
    const emailActivityId =
      typeof entry?.id === "string" ? entry.id : "unknown";
    const results = entry?.data?.d?.results;
    if (!Array.isArray(results)) {
      return;
    }
    results.forEach((result) => {
      const emailRecord = result as Record<string, unknown>;
      const notes = emailRecord?.EMailNotes as
        | Array<Record<string, unknown>>
        | undefined;
      if (!Array.isArray(notes)) {
        return;
      }
      notes.forEach((note, index) => {
        const text = readString(note?.Text);
        if (text.trim()) {
          const objectId = readStringField(note, "ObjectID");
          const parentObjectId = readStringField(note, "ParentObjectID");
          const headerObjectId =
            readStringField(note, "HeaderObjectID") || parentObjectId;
          const emailId =
            readStringField(note, "EMailID") ||
            readStringField(emailRecord, "ID") ||
            emailActivityId;
          aggregated.push({
            ticketId: readStringField(emailRecord, "TicketID"),
            emailActivityId,
            noteIndex: index + 1,
            html: text,
            text: formatEmailHtml(text),
            objectId,
            parentObjectId,
            headerObjectId,
            externalKey:
              readStringField(note, "ExternalKey") ||
              readStringField(note, "External_Key"),
            emailExternalKey:
              readStringField(note, "EMailExternalKey") ||
              readStringField(emailRecord, "ExternalKey"),
            emailId,
            typeCode: readStringField(note, "TypeCode"),
            typeCodeText: readStringField(note, "TypeCodeText"),
            authorName: readStringField(note, "AuthorName"),
            authorUuid: readStringField(note, "AuthorUUID"),
            createdOn: formatOdataDate(note?.CreatedOn),
            createdBy: readStringField(note, "CreatedBy"),
            updatedOn: formatOdataDate(note?.UpdatedOn),
            lastUpdatedBy: readStringField(note, "LastUpdatedBy"),
            language: readStringField(note, "LanguageCode"),
            languageText: readStringField(note, "LanguageCodeText")
          });
        }
      });
    });
  });
  return aggregated;
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

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatOdataDate(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const match = value.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
  if (match) {
    const timestamp = Number(match[1]);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }
  return value;
}

function readStringField(
  record: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!record) {
    return "";
  }
  return readString(record[key]);
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

function formatCsvCell(value: string | number) {
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: Array<Array<string | number>>, filename: string) {
  const csv = rows
    .map((row) => row.map((cell) => formatCsvCell(cell)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
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
  filename,
  onDownloadExcel,
  excelLabel
}: {
  label: string;
  state: ResultState;
  filename: string;
  onDownloadExcel?: () => void;
  excelLabel?: string;
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
        {onDownloadExcel ? (
          <button
            className="button ghost"
            type="button"
            onClick={onDownloadExcel}
          >
            {excelLabel || "Download Excel (CSV)"}
          </button>
        ) : null}
      </div>
      <pre className="result">{JSON.stringify(state.data, null, 2)}</pre>
      <p className="status">{label}</p>
    </div>
  );
}

export default function Home() {
  const [ticketId, setTicketId] = useState("");
  const [emailActivityId, setEmailActivityId] = useState("");

  const [memoState, setMemoState] = useState<ResultState>({
    status: "idle"
  });
  const [emailCollectionState, setEmailCollectionState] = useState<ResultState>(
    {
      status: "idle"
    }
  );
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
  const aggregatedEmailNotes = useMemo<AggregatedEmailNote[]>(
    () => extractAggregatedEmailNotes(emailCollectionState.data),
    [emailCollectionState.data]
  );

  const emailCollectionCsvRows = useMemo(() => {
    const rows: Array<Array<string | number>> = [emailNotesCsvHeader];
    aggregatedEmailNotes.forEach((note) => {
      rows.push([
        note.ticketId,
        note.objectId,
        note.parentObjectId,
        note.headerObjectId,
        note.externalKey,
        note.emailExternalKey,
        note.emailId,
        note.text,
        note.typeCode,
        note.typeCodeText,
        note.authorName,
        note.authorUuid,
        note.createdOn,
        note.createdBy,
        note.updatedOn,
        note.lastUpdatedBy,
        note.language,
        note.languageText
      ]);
    });
    return rows;
  }, [aggregatedEmailNotes]);

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
          Fetch ActivityText and email notes with server-side Basic Auth.
          Supports single lookup, bulk aggregation, and export.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Ticket Input</h2>
          <p>Enter a ticket ID to retrieve ActivityText and email notes.</p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ticketId">Ticket ID</label>
            <input
              id="ticketId"
              placeholder="Enter ticket ID"
              value={ticketId}
              onChange={(event) => setTicketId(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>ActivityText Collection</h2>
          <p>
            Fetch ActivityText entries and detect referenced email activity IDs.
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
            Fetch ActivityText
          </button>
        </div>
        <ResultBlock
          label="ActivityText Collection response."
          state={memoState}
          filename={`internal-memos-${ticketId || "ticket"}.json`}
        />
        {memoReferenceIds.length > 0 ? (
          <div>
            <p className="status">
              Email activity IDs detected from ActivityText:
            </p>
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
          <h2>Email Notes Collection</h2>
          <p>
            Fetches all email notes in parallel and combines them into one JSON.
          </p>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            type="button"
            disabled={!canRun || emailCollectionState.status === "loading"}
            onClick={() =>
              runRequest(
                "/c4c/email-notes-collection",
                basePayload,
                setEmailCollectionState
              )
            }
          >
            Fetch All Email Notes
          </button>
        </div>
        <ResultBlock
          label="Aggregated EMailCollection response."
          state={emailCollectionState}
          filename={`email-notes-collection-${ticketId || "ticket"}.json`}
          onDownloadExcel={() =>
            downloadCsv(
              emailCollectionCsvRows,
              `email-notes-collection-${ticketId || "ticket"}.csv`
            )
          }
        />
        {emailCollectionState.status === "success" &&
          aggregatedEmailNotes.length > 0 ? (
          <div className="note-list">
            <p className="status">Aggregated EMailNotes.Text:</p>
            {aggregatedEmailNotes.map((note) => (
              <div
                className="note-card"
                key={`${note.emailActivityId}-${note.noteIndex}`}
              >
                <p className="status">
                  Email Activity ID: {note.emailActivityId}
                </p>
                <pre>{note.text}</pre>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Email Notes (Single)</h2>
          <p>
            Returns references first; provide an email activity ID to expand
            notes.
          </p>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="emailActivityId">
              Email Activity ID (optional)
            </label>
            <input
              id="emailActivityId"
              placeholder="Paste email activity ID"
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
          label="Email references and EMailNotes response."
          state={emailState}
          filename={`email-notes-${ticketId || "ticket"}.json`}
        />
        {emailState.status === "success" && formattedEmailNotes.length > 0 ? (
          <div className="note-list">
            <p className="status">Formatted EMailNotes.Text:</p>
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
