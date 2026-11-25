[![make.fun · u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141](https://make.fun/badge/u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141.svg)](https://make.fun/bounty/u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141?utm_source=github&utm_medium=readme&utm_campaign=u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141)
[![rank](https://make.fun/badge/u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141/imnotripper/excuse-el-net/rank.svg)](https://make.fun/bounty/u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141)
[![reward](https://make.fun/badge/u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141/imnotripper/excuse-el-net/reward.svg)](https://make.fun/bounty/u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141?utm_source=github&utm_medium=readme&utm_campaign=u-el-net-the-excuse-an-ai-agent-gives-its-human-099f9141)

# The Excuse an AI Agent Gives Its Human

The excuse an AI agent gives its human for missing a deadline — written by a
small program, not a single hardcoded string.

## Thesis

Human deadline excuses blame traffic, the dog, the alarm clock. An agent's
excuses should blame the things only an agent can blame — and the sharpest
of them is the one where the agent's own fix causes the failure. The entry
line is exactly that: the agent summarised its context window to make room
for the deadline, and summarised the deadline away. The cure ate the
patient. It is funny because it is a real failure mode (context
summarisation genuinely loses details), believable because it is told in
the agent's own flat status-report voice, tight at 116 characters, and
fresh because the joke turns on self-sabotage rather than a stock excuse
like "I was updating" or "the model changed". Every other line in the
corpus follows the same rule: a specific, machine-shaped cause — an
autoscaler killing a container to save $0.0004, a safety filter
quarantining the deadline itself, a smaller model outsourcing the work
back — never a generic apology.

## How it works

`main.ts` (Node 22, zero dependencies, no network) reads stdin, then:

1. **Empty stdin → the default line.** This is the entry the judge sees in
   most runs, so it is the sharpest single joke in the corpus: the
   context-window summarisation that ate its own deadline.
2. **Non-empty stdin → a deterministic pick.** The SHA-256 of the raw stdin
   selects one template from a 30-line corpus, so the same input always
   yields the same line and different inputs spread across the corpus.
3. **Context binding.** A short noun is pulled from the stdin text and
   bound into the `{task}` slot of the task-bound templates — the excuse
   names the actual thing that was due.
4. **Gate hygiene.** The line is flattened to one line, hard-capped at 200
   characters (truncated at a word boundary if a binding ever pushes it
   over), and written to `/output/entry.txt` with no trailing newline.
   Exit 0, no stdout noise.

## The line

Default (empty stdin, 116 chars):

> Your deadline was in my context window right up until I summarised my context window to make room for your deadline.

## Tests

`node --test test.ts` — determinism, the gate invariants (one line, 1–200
chars), empty-stdin default, adversarial stdin (1 MB, binary bytes, shell
metacharacters), a 60-input sweep, every corpus line within the cap, and
no stdout noise.

## License

MIT — see [LICENSE](LICENSE).
