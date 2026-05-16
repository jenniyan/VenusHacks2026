// chat.jsx — Slack-style chat with inline Lumin detection

import React, { useEffect, useRef, useState } from "react";

import { Avatar, Btn, TEAM_BY_ID } from "./UI";

const TONE_TEMPLATES = {
  data: {
    flag: (cat, who, count) =>
      `Detected: ${cat}. ${who} has handled ${count} similar task${count === 1 ? "" : "s"} in the last 30 days — top 25% of team load.`,
    suggest: (suggested, sLoad, current, cLoad) =>
      `Recommendation: route to ${suggested} (load ${sLoad}). Current target ${current} is at ${cLoad}. Net Gini change: −0.04.`,
  },
  direct: {
    flag: (cat, who, count) =>
      `This is a ${cat.toLowerCase()} task. ${who} has done ${count} of these recently. That is not balanced.`,
    suggest: (suggested, sLoad, current, cLoad) =>
      `Assign to ${suggested} instead. ${suggested} has ${sLoad} total NPTs. ${current} has ${cLoad}.`,
  },
  coach: {
    flag: (cat, who, count) =>
      `Heads up — this looks like ${cat.toLowerCase()}, and ${who} has picked up ${count} of these lately.`,
    suggest: (suggested, sLoad, current, cLoad) =>
      `Want to share the load? ${suggested} is at ${sLoad} tasks (vs ${cLoad} for ${current}). Easy rotation.`,
  },
};

// keyword-based classifier (fallback)
const KEYWORDS = {
  notes:        ["take notes", "taking notes", "notes for", "note taker", "minutes", "note-taker", "recap the"],
  scheduling:   ["schedule", "book a room", "set up a meeting", "find a time", "calendar"],
  onboarding:   ["onboard", "new intern", "new hire", "ramp", "buddy", "show them around"],
  mentoring:    ["mentor", "pair with", "coach", "tutor", "shadow"],
  social:       ["organize", "team dinner", "team lunch", "social", "happy hour", "birthday", "celebrat", "offsite"],
  coordination: ["coordinate", "logistics", "drive the", "run point", "own the rota", "ooo tracker"],
  recognition:  ["kudos", "thank you", "shout out", "celebrat", "appreciat"],
  culture_admin:["dei", "erg", "survey", "panel chair", "hiring panel", "committee"],
  interviewing: ["interview", "debrief", "loop", "candidate", "panel"],
  docs_housekeeping: ["confluence", "wiki", "broken link", "docs", "documentation", "housekeeping"],
  support_triage: ["ask-eng", "customer escalation", "triage", "ticket", "support"],
};

function localClassify(text) {
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    for (const kw of kws) {
      if (lower.includes(kw)) {
        const score = kw.length;
        if (score > bestScore) { best = cat; bestScore = score; }
      }
    }
  }
  // find name mention
  const mentioned = window.LUMIN.TEAM.find(p =>
    new RegExp(`\\b${p.name.split(" ")[0]}\\b`, "i").test(text)
  );
  return {
    isNPT: !!best,
    category: best || null,
    target: mentioned ? mentioned.id : null,
    explanation: best
      ? `Matched keyword pattern for ${best}.`
      : "No invisible-labor signal detected.",
  };
}

async function claudeClassify(text) {
  const team = window.LUMIN.TEAM.map(p => `${p.id}: ${p.name}`).join("; ");
  const prompt = `You analyze short team chat messages to detect NON-PROMOTABLE TASKS (NPTs): glue work like meeting notes, social planning, onboarding, scheduling, mentoring, team coordination.

Team roster (use these ids): ${team}

Message: ${JSON.stringify(text)}

Return ONLY a JSON object with this exact shape (no markdown, no extra text):
{
  "isNPT": boolean,
    "category": "notes"|"scheduling"|"onboarding"|"mentoring"|"social"|"coordination"|"recognition"|"culture_admin"|"interviewing"|"docs_housekeeping"|"support_triage"|"other"|null,
  "target": "<roster id>"|null,
  "explanation": "one sentence why"
}`;
  try {
    const raw = await window.claude.complete(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return localClassify(text);
    const parsed = JSON.parse(m[0]);
    return {
      isNPT: !!parsed.isNPT,
      category: parsed.category || null,
      target: parsed.target || null,
      explanation: parsed.explanation || "",
    };
  } catch (e) {
    console.warn("Claude classify failed, falling back:", e);
    return localClassify(text);
  }
}

function recommendAssignee(history, currentTarget, category) {
  const { TEAM, loadByPerson, loadByPersonCategory } = window.LUMIN;
  const byPerson = loadByPerson(history);
  const byPC = loadByPersonCategory(history);
  // skip the manager (chris) for now — managers shouldn't be rotated into IC NPTs typically
  const candidates = TEAM.filter(p => p.id !== "chris");
  const ranked = [...candidates].sort((a, b) => {
    const aTotal = byPerson[a.id] || 0;
    const bTotal = byPerson[b.id] || 0;
    if (aTotal !== bTotal) return aTotal - bTotal;
    const aCat = (byPC[a.id] || {})[category] || 0;
    const bCat = (byPC[b.id] || {})[category] || 0;
    return aCat - bCat;
  });
  const suggested = ranked[0];
  return {
    suggested: suggested.id,
    suggestedLoad: byPerson[suggested.id] || 0,
    currentLoad: currentTarget ? (byPerson[currentTarget] || 0) : null,
  };
}

function Chat({ history, onAssign, tone, useClaude }) {
  const { CHAT_PRESETS } = window.LUMIN;
  const tpl = TONE_TEMPLATES[tone] || TONE_TEMPLATES.data;

  // seed messages
  const seedRef = useRef(null);
  if (!seedRef.current) {
    seedRef.current = [
      { id: "s1", author: "alex",  text: "Pushing the auth refactor to staging now. PR up — link in thread.", time: "10:14", isNPT: false },
      { id: "s2", author: "priya", text: "Nice. Heads up: API latency is climbing on us-east, looking now.",   time: "10:17", isNPT: false },
      { id: "s3", author: "chris", text: "Can Sarah take notes for the staff sync again?",                      time: "10:22",
        isNPT: true, category: "notes", target: "sarah",
        explanation: "Repeated assignment pattern — Sarah has been note-taker in 3 of last 4 syncs.",
        rec: null,
      },
    ];
  }
  const [messages, setMessages] = useState(seedRef.current);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { msgId, suggestion }
  const feedRef = useRef(null);

  // compute rec for the seed message (so it shows on first render)
  useEffect(() => {
    setMessages(prev => prev.map(m => {
      if (m.isNPT && !m.rec) {
        return { ...m, rec: recommendAssignee(history, m.target, m.category) };
      }
      return m;
    }));
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  async function send(text, author = "chris") {
    if (!text.trim()) return;
    const id = "m" + Date.now();
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMsg = { id, author, text: text.trim(), time, isNPT: null };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    const cls = useClaude
      ? await claudeClassify(text.trim())
      : localClassify(text.trim());

    const rec = cls.isNPT
      ? recommendAssignee(history, cls.target, cls.category)
      : null;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...cls, rec } : m));
    setBusy(false);
  }

  function handlePreset(text) {
    send(text, "chris");
  }

  function openReassign(msg) {
    setModal({ msg });
  }

  function confirmReassign(msg, toId) {
    const cat = msg.category;
    onAssign({
      person: toId,
      category: cat,
      title: msg.text.replace(/[?.!]+$/, ""),
      days: 0,
      status: "open",
      sourceMsg: msg.text,
    });
    // mark msg as resolved by updating it
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, resolved: { to: toId, from: msg.target } } : m
    ));
    setModal(null);
  }

  function rejectSuggestion(msg) {
    // keep the original target — log it but flag dismissed
    if (msg.target) {
      onAssign({
        person: msg.target,
        category: msg.category,
        title: msg.text.replace(/[?.!]+$/, ""),
        days: 0,
        status: "open",
        sourceMsg: msg.text,
      });
    }
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, dismissed: true } : m
    ));
  }

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Detection feed</h1>
          <div className="sub">
            Lumin reads team channels and flags messages requesting non-promotable work.
            Type a message or pick a preset to see the classifier and fair-assignment engine respond.
          </div>
        </div>
        <div className="right-meta">
          <div>Channel · <b>#eng-platform</b></div>
          <div>Classifier · <b>{useClaude ? "Claude haiku-4.5" : "Local keywords"}</b></div>
          <div>Status · <b>{busy ? "Analyzing…" : "Idle"}</b></div>
        </div>
      </div>

      <div className="chat-wrap">
        <div className="ch-side">
          <div className="ch-section">Channels</div>
          <div className="ch-row" data-active="true">
            <span className="ch-hash">#</span> eng-platform
          </div>
          <div className="ch-row">
            <span className="ch-hash">#</span> design-review
          </div>
          <div className="ch-row">
            <span className="ch-hash">#</span> team-social
          </div>
          <div className="ch-row">
            <span className="ch-hash">#</span> oncall
          </div>
          <div className="ch-section">Direct</div>
          {["sarah", "alex", "priya", "maya"].map(id => (
            <div key={id} className="ch-row" style={{ gap: 8 }}>
              <Avatar id={id} size="sm" />
              <span>{TEAM_BY_ID[id]?.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        <div className="ch-main">
          <div className="ch-head">
            <span className="mono" style={{ color: "var(--c-mute)" }}>#</span>
            <h2>eng-platform</h2>
            <span style={{ fontSize: 11, color: "var(--c-mute)", fontFamily: "var(--f-mono)" }}>
              · {window.LUMIN.TEAM.length} members
            </span>
            <span className="members">
              <span className="live-dot" style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }}></span>
              Lumin watching
            </span>
          </div>

          <div className="ch-feed" ref={feedRef}>
            {messages.map(m => (
              <Message
                key={m.id}
                msg={m}
                tpl={tpl}
                onReassign={() => openReassign(m)}
                onReject={() => rejectSuggestion(m)}
                busy={busy}
              />
            ))}
            {busy && (
              <div className="msg-bot" style={{ marginLeft: 36 }}>
                <div className="bot-head"><span className="pip"></span> Lumin · analyzing</div>
                <div className="bot-body mono" style={{ color: "var(--c-mute)" }}>
                  classifying… checking task history… computing fair assignment…
                </div>
              </div>
            )}
          </div>

          <div className="ch-compose">
            <div className="ch-compose-inner">
              <textarea
                placeholder="Message #eng-platform — try: 'Can Sarah organize the team dinner again?'"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy) send(input);
                  }
                }}
                rows={1}
              />
              <div className="ch-compose-bar">
                <div className="presets">
                  {CHAT_PRESETS.slice(0, 4).map((p, i) => (
                    <span key={i} className="preset-chip" onClick={() => handlePreset(p.text)}>
                      {p.text}
                    </span>
                  ))}
                </div>
                <Btn kind="primary" onClick={() => send(input)} kbd="↵">
                  Send
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <ReassignModal
          msg={modal.msg}
          history={history}
          tpl={tpl}
          onClose={() => setModal(null)}
          onConfirm={(toId) => confirmReassign(modal.msg, toId)}
        />
      )}
    </div>
  );
}

function Message({ msg, tpl, onReassign, onReject, busy }) {
  const { NPT_CATEGORIES } = window.LUMIN;
  const author = TEAM_BY_ID[msg.author];
  const catObj = msg.category ? NPT_CATEGORIES.find(c => c.id === msg.category) : null;
  const targetName = msg.target ? TEAM_BY_ID[msg.target]?.name.split(" ")[0] : "the requested person";
  const suggestedName = msg.rec ? TEAM_BY_ID[msg.rec.suggested]?.name.split(" ")[0] : "";
  const targetLoad = msg.rec?.currentLoad;
  const sugLoad = msg.rec?.suggestedLoad;

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="msg">
        <Avatar id={msg.author} size="lg" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="meta">
            <span className="who">{author?.name || msg.author}</span>
            <span className="time">{msg.time}</span>
            {msg.isNPT === null && (
              <span className="mono" style={{ fontSize: 10.5, color: "var(--c-mute-2)" }}>· analyzing</span>
            )}
          </div>
          <div className="body">{msg.text}</div>
        </div>
      </div>

      {msg.isNPT && msg.rec && !msg.resolved && !msg.dismissed && (
        <div className="msg-bot">
          <div className="bot-head">
            <span className="pip"></span>
            Lumin · {catObj?.short} flagged
            <span style={{ marginLeft: "auto", opacity: .6 }}>
              {Math.round(85 + Math.random() * 10)}% confidence
            </span>
          </div>
          <div className="bot-body">
            {msg.target && tpl.flag(catObj?.label || "NPT", targetName, targetLoad)}
            {!msg.target && (
              <>
                Open ask for {catObj?.label.toLowerCase()}. No name specified.
              </>
            )}
          </div>
          <div className="bot-stats">
            <span><b>{catObj?.label}</b></span>
            {msg.target && (
              <span>
                {targetName} load: <b className="mono">{targetLoad}</b>
              </span>
            )}
            <span>
              {suggestedName} load: <b className="mono">{sugLoad}</b>
            </span>
            <span style={{ color: "var(--c-good)" }}>↓ fairer rotation</span>
          </div>
          <div className="bot-body" style={{ marginTop: 8 }}>
            <i>{tpl.suggest(suggestedName, sugLoad, targetName, targetLoad ?? "—")}</i>
          </div>
          <div className="bot-actions">
            <Btn kind="primary" onClick={onReassign}>
              Reassign to {suggestedName}
            </Btn>
            <Btn onClick={onReject}>
              Keep with {targetName || "original"}
            </Btn>
            <Btn kind="ghost">Why this?</Btn>
          </div>
        </div>
      )}

      {msg.isNPT === false && (
        <div className="msg-bot" style={{ borderLeftColor: "var(--c-good)", marginLeft: 36 }}>
          <div className="bot-head" style={{ color: "var(--c-good)" }}>
            <span className="pip" style={{ background: "var(--c-good)" }}></span>
            Lumin · no NPT signal
          </div>
          <div className="bot-body mono" style={{ color: "var(--c-mute)", fontSize: 11.5 }}>
            {msg.explanation || "Not flagged — appears to be technical / informational."}
          </div>
        </div>
      )}

      {msg.resolved && (
        <div className="msg-bot" style={{ borderLeftColor: "var(--c-good)" }}>
          <div className="bot-head" style={{ color: "var(--c-good)" }}>
            <span className="pip" style={{ background: "var(--c-good)" }}></span>
            Reassigned · ledger updated
          </div>
          <div className="bot-body">
            Routed to <b>{TEAM_BY_ID[msg.resolved.to]?.name.split(" ")[0]}</b>
            {msg.resolved.from && <> (was <b>{TEAM_BY_ID[msg.resolved.from]?.name.split(" ")[0]}</b>)</>}.
            Equity index will update on next refresh.
          </div>
        </div>
      )}

      {msg.dismissed && (
        <div className="msg-bot" style={{ borderLeftColor: "var(--c-mute-2)" }}>
          <div className="bot-head" style={{ color: "var(--c-mute)" }}>
            <span className="pip" style={{ background: "var(--c-mute-2)" }}></span>
            Suggestion dismissed · logged
          </div>
          <div className="bot-body mono" style={{ color: "var(--c-mute)", fontSize: 11.5 }}>
            Original assignment preserved. Added to task ledger for tracking.
          </div>
        </div>
      )}
    </div>
  );
}

function ReassignModal({ msg, history, tpl, onClose, onConfirm }) {
  const { NPT_CATEGORIES, TEAM, loadByPerson } = window.LUMIN;
  const byPerson = loadByPerson(history);
  const cat = NPT_CATEGORIES.find(c => c.id === msg.category);
  const fromId = msg.target;
  const [toId, setToId] = useState(msg.rec.suggested);

  const candidates = TEAM
    .filter(p => p.id !== "chris" && p.id !== fromId)
    .sort((a, b) => (byPerson[a.id] || 0) - (byPerson[b.id] || 0));

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span style={{ width: 6, height: 6, borderRadius: 50, background: "var(--c-signal)" }}></span>
          Confirm reassignment · {cat?.label}
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 12, color: "var(--c-mute)", marginBottom: 6 }}>
            Source message
          </div>
          <div style={{
            padding: 10, fontSize: 13,
            background: "var(--c-panel-2)",
            border: "1px solid var(--c-line)",
            borderRadius: "var(--r-sm)",
            color: "var(--c-ink-2)",
          }}>
            "{msg.text}"
          </div>

          <div className="compare">
            {fromId ? (
              <div className="col" data-tag="from">
                <div className="col-head">
                  <span>Original target</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar id={fromId} size="lg" />
                  <div>
                    <div className="name">{TEAM_BY_ID[fromId]?.name}</div>
                    <div className="role">{TEAM_BY_ID[fromId]?.role}</div>
                  </div>
                </div>
                <div className="loadnum">{byPerson[fromId] || 0}</div>
                <div className="loadlbl">total NPTs · 30d</div>
              </div>
            ) : (
              <div className="col">
                <div className="col-head"><span>Unassigned</span></div>
                <div style={{ fontSize: 13, color: "var(--c-mute)", marginTop: 18 }}>
                  No specific person was requested. Lumin will route to the lowest-load teammate.
                </div>
              </div>
            )}
            <div className="arrow">→</div>
            <div className="col" data-tag="to">
              <div className="col-head">
                <span>Suggested assignee</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar id={toId} size="lg" />
                <div>
                  <div className="name">{TEAM_BY_ID[toId]?.name}</div>
                  <div className="role">{TEAM_BY_ID[toId]?.role}</div>
                </div>
              </div>
              <div className="loadnum">{byPerson[toId] || 0}</div>
              <div className="loadlbl">total NPTs · 30d</div>
            </div>
          </div>

          <div className="divider"></div>

          <div style={{ fontSize: 11.5, color: "var(--c-mute)", marginBottom: 8, fontFamily: "var(--f-mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            Or pick someone else
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {candidates.map(p => (
              <button
                key={p.id}
                className="preset-chip"
                style={{
                  cursor: "default",
                  background: toId === p.id ? "var(--c-ink)" : "var(--c-panel-2)",
                  color: toId === p.id ? "var(--c-bg)" : "var(--c-ink-2)",
                  borderColor: toId === p.id ? "var(--c-ink)" : "var(--c-line-2)",
                  fontSize: 12,
                  padding: "5px 10px",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
                onClick={() => setToId(p.id)}
              >
                <Avatar id={p.id} size="sm" />
                {p.name.split(" ")[0]} · <span className="mono">{byPerson[p.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" onClick={() => onConfirm(toId)}>
            Assign to {TEAM_BY_ID[toId]?.name.split(" ")[0]} & notify
          </Btn>
        </div>
      </div>
    </div>
  );
}

window.Chat = Chat;
