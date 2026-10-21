# Speech-to-Text in Pitch Guesser — Setup Guide & Class Tutorial

This guide explains how voice input works in this app, exactly what configuration
it needs, and how to present it. It also documents the "grown-up" alternative
(Google Cloud Speech-to-Text API) in case we ever outgrow the free option.

** TL;DR **
We use the **Web Speech API** built into Chrome — it is Google's speech
recognition, it costs **nothing**, and it needs **no cloud accounts, API keys, or
billing**. All we need is Chrome, a microphone, and `localhost` (or HTTPS).

---

## Part 1 — Which speech-to-text option should we use?

There are two "Google" speech-to-text options, and they are easy to confuse:

| | **Web Speech API** (what we use) | **Google Cloud Speech-to-Text API** (the billed product) |
|---|---|---|
| Cost | Free | Pay-per-usage (~$0.024–$0.096 per 15 s of audio; check [pricing](https://cloud.google.com/speech-to-text/pricing)) |
| Configuration | None | GCP project + billing account + enabled API + credentials |
| Setup time | ~1 minute | ~30–60 minutes the first time |
| Where it runs | Inside the browser (Chrome); audio is sent to Google's recognition servers automatically | Your own backend code calls Google's API with credentials |
| Custom vocabulary ("curveball", "slider"…) | Not supported — we do our own fuzzy matching (see Part 3) | Yes — `speechContexts` with word boosting |
| Accuracy/controls | Very good for general speech | Better, plus models, timestamps, diarization, 125+ languages |
| Reliability | No SLA — fine for a class project | SLA-backed, production-grade |

**Our decision:** the free Web Speech API. For an HCI class prototype that just
needs to hear pitch names, it is the best free option by far. The Cloud API
configuration is documented in Part 5 anyway, because it's great interview/demo
material and a natural "next step" for the project.

> Honest framing for your presentation: the Web Speech API is *not* a separate
> Google product — it is a browser window onto the same Google speech
> recognition that powers "Hey Google" and voice typing. Chrome captures the
> mic, streams audio to Google, and hands back text. We just never see a bill
> or an API key.

---

## Part 2 — What configuration is needed? (the short answer)

For **our** implementation, here is the complete configuration list:

1. **Google Chrome** (or any Chromium browser — Edge, Brave, Arc).
   Firefox and Safari do not support the Web Speech API.
2. **A secure context**: `https://` or `localhost`.
   `npm run dev` serves the app on `http://localhost:5173`, which counts as
   secure. Opening the built files via `file://` will *not* work.
3. **A working microphone** and permission for the page to use it
   (Chrome shows a permission prompt the first time you press Start).
4. **An internet connection** (the audio goes to Google's servers).

That's it. No GCP project, no billing, no API key, no environment variables.

### If you want to demo "what real cloud setup looks like"

Run this 60-second version during the presentation to show the contrast:

```text
1. console.cloud.google.com  →  create project "pitch-guesser"
2. Search "Speech-to-Text"  →  Enable        (billing must be attached!)
3. APIs & Services → Credentials → Create credentials → API key
4. curl a request with the key  →  get a JSON transcript back
```

Compare that with our app, where you press one button and talk.

---

## Part 3 — How our code works

### Architecture

```text
 ┌────────────────────────── Chrome ───────────────────────────┐
 │                                                             │
 │  Home.tsx (UI: mic button, live transcript, results)        │
 │     ▲                                                       │
 │     │ state (interim + final transcripts)                   │
 │     │                                                       │
 │  useSpeechRecognition.ts  ──►  window.SpeechRecognition     │
 │     (React hook)                     │                      │
 │                                      │ audio stream         │
 └──────────────────────────────────────┼──────────────────────┘
                                        ▼
                            Google's recognition servers
                                        │
                                        ▼ text
  matchPitches()  ◄── final transcript chunks
  (pitchMatcher.ts, using the word lists in
   src/static/importantWords/balltypes/*.jsonc)
        │
        ▼
  "fastball" detected → shown as a chip in the UI
```

### File-by-file walkthrough

#### 1. `src/hooks/useSpeechRecognition.ts` — the microphone

The Web Speech API is one global object:

```ts
const SpeechRecognition =
  window.SpeechRecognition ?? window.webkitSpeechRecognition;
```

(The `webkit` prefix is why it "feels experimental" — it was never standardized,
which is also why only Chromium browsers have it.)

The hook configures it like this:

```ts
const recognition = new SpeechRecognition();
recognition.continuous = true;      // keep listening after each phrase
recognition.interimResults = true;  // stream partial results as we speak
recognition.lang = 'en-US';
```

Three events drive everything:

| Event | What it gives us | What the hook does |
|---|---|---|
| `onresult` | `isFinal` flag + `transcript` + recognizer `confidence` | Final text is appended to `finalTranscript`; partial text goes to `interimTranscript` for live "subtitles" |
| `onerror` | `not-allowed`, `no-speech`, `network`… | Fatal errors (`not-allowed`) stop the session and show a friendly message; `no-speech` is ignored because it just means a quiet gap |
| `onend` | (no data) | **The important one:** Chrome silently ends the session after a few seconds of silence, even with `continuous = true`. The hook restarts automatically as long as the user hasn't pressed Stop |

#### 2. `src/lib/pitchMatcher.ts` — turning words into pitch names

Speech recognizers don't know baseball. Our existing word lists solve that, and
`matchPitches()` checks a transcript in three escalating ways:

1. **Exact** — the word *is* the pitch name (`"fastball"`).
2. **Sound-alike** — the word is one of the hand-written look-alikes from the
   JSONC lists (`"festival"` → fastball, `"bowl"` as a suffix for `fast` + `bowl`).
   Recognition engines really do transcribe "fastball" as "festival" — the lists
   were designed for exactly this.
3. **Fuzzy** — otherwise, allow a small [Levenshtein edit distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
   (1 typo for short words, 2 for long ones) so `"fastboll"` still scores.

It also joins **prefix + suffix** pairs across word boundaries: `"fast"` in one
recognition result followed by `"ball"` in the next still matches, using
`fullAndPrefix.jsonc` and `ballSuffix.jsonc`.

> Presentation tip: run `npx vitest run src/lib/pitchMatcher.test.ts` live —
> it's 10 fast tests that double as slides showing every matching strategy.

#### 3. `src/pages/Home.tsx` — the interface

- **Start / Stop** toggles the hook (`start()` / `stop()`).
- A red pulsing dot shows we're live; interim text renders as it arrives.
- Each **final** transcript chunk is passed to `matchPitches()` (only the new
  portion, so words are never scored twice).
- Matches appear as chips: pitch name + which word triggered it + how.
- The raw transcript is shown at the bottom so the audience can see what Google
  actually heard — great for laughs AND great for explaining confidence.

---

## Part 4 — Run the demo yourself

```bash
cd myApp
npm install        # first time only
npm run dev        # starts Vite on http://localhost:5173
```

Open **http://localhost:5173** in **Chrome**, press **Start listening**, allow
the microphone, and say things like:

- "fastball" (exact)
- "festival" (sound-alike — gets a laugh when you explain it)
- "that was a fast ball" (prefix + suffix across words)
- "fastboll" (fuzzy typo forgiveness)

Run the tests any time with:

```bash
npm run test.unit
```

---

## Part 5 — Going further: the real Google Cloud Speech-to-Text API

If we wanted word boosting, guaranteed uptime, timestamps, or offline batch
transcription, this is the path. It's also the perfect "here's what the
industry does" section for the class presentation.

### 5.1 One-time cloud configuration

1. **Create a project** — [console.cloud.google.com](https://console.cloud.google.com)
   → project selector → **New Project** (e.g. `pitch-guesser`).
2. **Enable billing** — Speech-to-Text requires a billing account. New Google
   Cloud accounts get **$300 of free credit**, which lasts far beyond a class
   project. **Set a budget alert** (Billing → Budgets & alerts) so nothing
   surprises you.
3. **Enable the API** — search "Speech-to-Text" in the console search bar →
   **Cloud Speech-to-Text API** → **Enable**.
4. **Create credentials** — two flavors:
   - *API key* (simple, good for a quick `curl` demo):
     APIs & Services → Credentials → Create credentials → **API key**.
     Restrict the key to the Speech-to-Text API only.
   - *Service account* (correct for an app): create a service account, download
     its JSON key, and point the client library at it.

### 5.2 Authentication for local development

For Node.js code on your own machine, use **Application Default Credentials**:

```bash
gcloud init
gcloud auth application-default login
```

The `@google-cloud/speech` library finds those credentials automatically —
no `GOOGLE_APPLICATION_CREDENTIALS` plumbing needed for local dev.
(The [Node codelab](https://codelabs.developers.google.com/codelabs/cloud-speech-text-node)
shows the alternative: a service-account JSON key file.)

### 5.3 First request in five lines

```bash
npm install @google-cloud/speech
```

```js
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

const [resp] = await client.recognize({
  config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
  audio: { content: audioBase64String },
});
console.log(resp.results[0].alternatives[0].transcript);
```

Config gotcha worth mentioning in class: `encoding` and `sampleRateHertz` must
match the audio file *exactly* or you get inscrutable errors. Google's own
demo videos spend half their time fighting this.

### 5.4 Why our app would need a small backend

Two blockers stop us from calling the Cloud API straight from Ionic code:

1. **No browser auth** — you cannot safely put service-account credentials in
   browser JavaScript, and the REST endpoint doesn't allow cross-origin (CORS)
   browser calls.
2. **Streaming is gRPC-only** — real-time mic streaming isn't available over
   plain REST.

So the standard architecture is: browser captures mic audio (Web Audio API /
MediaRecorder) → streams PCM over WebSocket → small Node/Express server →
`client.streamingRecognize()` → transcripts streamed back as JSON.
There's a full walkthrough in the
[SoftwareMill working example](https://blog.softwaremill.com/how-to-use-googles-speech-to-text-in-a-web-application-working-example-a4b64c61f133)
and the classic [Google codelab lab GSP125](https://www.cloudskillsboost.google/focuses/676?parent=catalog&qlcampaign=GDGUoN-2183)
(Java version, same architecture).

### 5.5 Useful Cloud-only features for this game

- **`speechContexts` word boosting** — tell the recognizer "curveball, slider,
  changeup" are likely words, and it biases results toward them. This is the
  professional version of our JSONC word lists.
- **Models** — `latest_long`, `command_and_conversation` (great for short voice
  commands like ours), `video`, `chirp_2`.
- **Timestamps** — `enableWordTimeOffsets` for sync'ing guesses to audio.
- **Streaming limits** — a streaming session dies after ~5 minutes or 10 MB;
  production code restarts it mid-sentence (see Google's "streaming transcription
  restart" sample).

---

## Part 6 — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Nothing happens; console says `SpeechRecognition is undefined` | Firefox/Safari | Use Chrome |
| `not-allowed` error | Mic permission denied | Click the 📌 icon in the address bar → allow microphone → reload |
| Works once, then goes silent | Chrome auto-stopped on silence | Our hook auto-restarts; if it doesn't, press Stop/Start |
| Transcripts work at home, fail in the classroom | Guest/locked-down Chrome policies, or no Wi-Fi | Test the venue beforehand; use a personal hotspot as backup |
| "I said fastball, it heard festival" | Classic recognizer substitution | That's *why* the sound-alike list exists — show the Raw transcript card to the class |
| App works from `npm run dev` but not from a build opened as files | Not a secure context | Serve the build over `http://localhost` (e.g. `npm run preview`) or HTTPS |
| Cloud API returns `PERMISSION_DENIED` | Wrong project / API not enabled / key restricted | Recheck Part 5.1 steps 2–4 |

**Demo insurance:** record a 15-second backup video of the whole flow. Live mic
demos in front of a class are wonderful right up until the venue Wi-Fi isn't.

---

## Part 7 — Tutorials & resources (for presenters and the curious)

**Start here (free, no setup):**

- [Web Speech API demonstration — Chrome](https://www.google.com/intl/en/chrome/demos/speech.html)
  — press a mic icon and talk; 10 seconds to "get it".
- [Speech to text in the browser with the Web Speech API](https://medium.com/google-developer-experts/speech-to-text-in-the-browser-with-the-web-speech-api-9231aa211c67)
  (Phil Nash, Google Developer Expert) — the best short article on our exact approach.

**Hands-on Google labs (free tiers / temporary student accounts):**

- [Speech-to-Text API: Qwik Start (GSP119)](https://www.cloudskillsboost.google/course_templates/740/labs/491253)
  — 30-minute guided lab: create an API key, send an audio request with `curl`.
  Perfect to follow along in class.
- [Speaking with a Webpage — Streaming Speech Transcripts (GSP125)](https://www.cloudskillsboost.google/focuses/676?parent=catalog&qlcampaign=GDGUoN-2183)
  — build the mic → WebSocket → cloud pipeline (the Part 5.4 architecture).
- [Using the Speech-to-Text API with Node.js (Google Codelab)](https://codelabs.developers.google.com/codelabs/cloud-speech-text-node)
  — enable API, service accounts, client library, word timestamps.

**Official documentation:**

- [Set up Speech-to-Text](https://cloud.google.com/speech-to-text/docs/before-you-begin) — enabling the API, billing, data logging.
- [Quickstart: transcribe with the REST API](https://docs.cloud.google.com/speech-to-text/docs/v1/transcribe-api)
- [Client-library quickstart (Node.js)](https://docs.cloud.google.com/speech-to-text/docs/quickstarts/transcribe-client-libraries)
- [In-console tutorials](https://docs.cloud.google.com/speech-to-text/docs/quickstarts/console-tutorials) — transcribe audio *from inside the Cloud Console*, no code.
- [Transcribe streaming audio from a microphone](https://docs.cloud.google.com/speech-to-text/docs/samples/speech-transcribe-streaming-mic)
- [Pricing](https://cloud.google.com/speech-to-text/pricing)

**Video:**

- [Node.js Speech-to-Text Tutorial with Google Cloud API](https://www.youtube.com/watch?v=1LgOPu4reF0) (Coding with Ado, ~16 min) — setup through working code, including the encoding/sample-rate gotchas.

---

## Part 8 — 3-minute presentation script

1. **Hook (30 s):** "Watch this — I'm going to talk to a web app and it knows
   baseball pitches." Demo: say "festival", get "fastball".
2. **Problem (30 s):** Speech recognizers don't know baseball. Show the raw
   transcript card: Google really did write "festival".
3. **Solution (60 s):** The three-layer matcher — exact words we trust, look-alike
   words the recognizer actually produces, and a fuzzy typo-forgiving fallback.
   Run the unit tests on screen.
4. **Cost/config punchline (30 s):** "Zero configuration. No cloud account, no
   API key, no bill. The paid API would have taken an hour to set up and charges
   per 15 seconds of audio." (Flip to the Part 1 comparison table.)
5. **Takeaway (30 s):** Free browser APIs are perfect for prototypes; the cloud
   API is the upgrade path when we need boosting, accuracy, and SLAs.
