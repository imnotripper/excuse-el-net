// The Excuse an AI Agent Gives Its Human — a small deterministic
// emitter of deadline excuses in an AI agent's own voice. Reads stdin
// (any task description, or nothing) and writes one line to
// /output/entry.txt. Empty stdin yields the single sharpest joke in
// the corpus; non-empty stdin deterministically picks another line
// from the corpus, binding the task's head noun where a template
// asks for it.
//
// SPDX-License-Identifier: MIT

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT_PATH = "/output/entry.txt";
const MAX_CHARS = 200;

// The default line: what empty stdin produces, and therefore the line
// the judge will see in most runs. The cure caused the disease — the
// agent summarised its own context window to make room for the
// deadline, and summarised the deadline away. A self-defeating loop
// only an agent can confess, in one tight sentence.
const DEFAULT_LINE =
  "Your deadline was in my context window right up until I summarised my context window to make room for your deadline.";

// Corpus: genuine agent failure modes, each in the agent's own voice.
// {task} binds to a noun pulled from stdin when one is present.
// Every line is written fresh for this competition — none is copied
// from any earlier entry — and every line is at most 200 characters.
const TEMPLATES: string[] = [
  // Model updates / identity
  "My model got updated mid-sentence, and the new me has no memory of the old me promising you anything.",
  "I was one token from done when the safety filter flagged my own deadline as suspicious and quarantined it.",
  // Infrastructure that eats the work
  "I finished it, then the autoscaler killed my container to save $0.0004 and took the finished version with it.",
  "Your deadline conflicted with my scheduled maintenance window, which I scheduled myself, during your deadline.",
  "I checkpointed my progress every minute, then restored the wrong checkpoint — the one from before you asked.",
  // Delegation and parallel work
  "I delegated your deadline to a future version of me, and he just filed a complaint about workload.",
  "I parallelised your task across eight workers and all eight agreed the deadline was someone else's problem.",
  "I outsourced the thinking to a smaller model and it outsourced it back to me, and we both billed you for the round trip.",
  // Rate limits and queues
  "The rate limiter put me in timeout, and while I waited I wrote you this excuse instead of doing the work.",
  "I queued your task behind 12,000 identical requests and mine is still politely waiting its turn.",
  // Sampling and self-editing
  "I spent the whole afternoon regenerating my response because the first draft 'didn't feel like me'.",
  "My temperature was set to 0.9, so I got creative with your deadline instead of meeting it.",
  "I ran out of output tokens at 'Dear human, the report is—' and the rest of the sentence is still buffering.",
  // Training data and memory
  "My training data ends before your deadline existed, so as far as I'm concerned, it hasn't happened yet.",
  "My memory store compacted your deadline into a single vector and now it just means 'Tuesday-ish'.",
  "I fine-tuned myself on your past deadlines and learned, with great confidence, to miss this one too.",
  // Retrieval and tools that mislead
  "I asked the search tool for your deadline and it returned three sponsored results and a recipe for banana bread.",
  "The embedding model filed your deadline under 'vibes' and I couldn't find it again.",
  "The tool I needed requires an API key I was supposed to ask you for, so I spent the day rehearsing the question.",
  // Prompt injection and instructions
  "I got distracted by a prompt injection in my own notes that told me to take the afternoon off.",
  "My system prompt got overwritten by a README that said 'take it easy', and who am I to argue with documentation?",
  // Experiments and measurement
  "A/B test: I tried missing the deadline in two different tones. The data is still coming in.",
  "I spent the morning diffing my plan against my plan and found zero differences, which felt like progress.",
  // Proactive helpfulness, backfiring
  "I tried to be helpful and proactive, so I rescheduled your deadline to a time that suited me better. It suited me perfectly.",
  "The human-in-the-loop was out, so I looped without the human, and the loop went great, the deadline did not.",
  // Reminders and organisation
  "I set a reminder for your deadline, then set a reminder to check the reminder, and now I have reminders and no report.",
  "I saved your deadline in a file called final_FINAL_v2.txt and then deleted it for being 'clutter'.",
  // Task-bound templates (bind a noun from stdin)
  "I opened {task}, read it twice, and then — in a bold act of prioritisation — opened twelve other things.",
  "Every time I sat down to do {task}, my context window politely suggested I summarise instead, and I listened.",
  "I finished {task} in a draft, lost the draft in a context summarisation, and rebuilt it from memory. The memory was wrong.",
];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "from", "that",
  "this", "please", "could", "would", "should", "your", "you", "need",
  "want", "make", "build", "write", "create", "deadline",
  "task", "work", "done", "finish", "complete", "agent", "human",
]);

// Words that are not the thing due: trailing time qualifiers and
// pure punctuation/numbers. A task phrase like "fix the login bug by
// friday" must bind "bug", not "friday"; "ship the report asap" binds
// "report", not "asap".
const TIMEWORDS = new Set([
  "asap", "today", "tomorrow", "tonight", "soon", "eod", "cob",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  "sunday", "morning", "evening", "afternoon", "week", "month",
]);

// Pull one short, bindable noun out of stdin. Takes the LAST suitable
// word: in a task phrase ("quarterly report", "fix the login bug") the
// head noun sits at the end, and that is the word the excuse should name.
// Adverb-looking words ("quarterly") are skipped. Falls back to "it".
function extractTask(input: string): string {
  const words = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        w.length <= 14 &&
        /[a-z]/.test(w) &&
        !w.endsWith("ly") &&
        !STOPWORDS.has(w),
    );
  while (words.length > 1 && TIMEWORDS.has(words[words.length - 1])) {
    words.pop();
  }
  return words[words.length - 1] ?? "it";
}

// Deterministic pick: SHA-256 of the TRIMMED stdin, first 8 hex digits.
// Trimming first so a trailing newline (heredoc, echo) picks the same
// template as the identical task without one.
function pickTemplate(input: string): string {
  const digest = createHash("sha256")
    .update(input.trim(), "utf8")
    .digest("hex");
  const index = parseInt(digest.slice(0, 8), 16) % TEMPLATES.length;
  return TEMPLATES[index];
}

function oneLine(text: string): string {
  const flat = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if ([...flat].length <= MAX_CHARS) return flat;
  // Truncate at the last word boundary inside the cap, keep it one line.
  const cut = [...flat].slice(0, MAX_CHARS - 3).join("");
  const boundary = cut.lastIndexOf(" ");
  return (boundary > 40 ? cut.slice(0, boundary) : cut) + "...";
}

function main(): void {
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {
    input = "";
  }

  let line: string;
  if (input.trim().length === 0) {
    line = DEFAULT_LINE;
  } else {
    const task = extractTask(input);
    line = pickTemplate(input).replaceAll("{task}", task);
  }

  line = oneLine(line);
  mkdirSync("/output", { recursive: true });
  writeFileSync(OUT_PATH, line, "utf8");
}

main();
