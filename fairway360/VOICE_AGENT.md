# Fairway360 voice agent (Vapi) — setup, prompt, and known failure modes

The inbound sales line **+1 (412) 285-1554** is answered by an AI assistant
("Elliot") running on Vapi. It qualifies callers and books a consultation.
Finished calls POST to `https://fairway360.io/api/vapi/webhook`, which writes a
lead (source `Phone (AI)`) and emails `SALES_NOTIFY_EMAIL`.

---

## 1. Wiring (Vapi dashboard → the phone number)

| Field | Value |
|---|---|
| Server URL | `https://fairway360.io/api/vapi/webhook` |
| Custom header | `x-vapi-secret: <value of VAPI_WEBHOOK_SECRET on the server>` |
| Server timeout | 20s is fine |

The server rejects any webhook whose secret doesn't match. If `VAPI_WEBHOOK_SECRET`
is unset on the server the endpoint accepts everything — so it must be set in
production.

---

## 2. Structured data schema (paste into the Vapi assistant)

Without this, a lead still captures the caller's number, summary and transcript,
but the tidy fields (club, role, need…) will be empty. Vapi → Assistant →
Analysis → Structured Data → schema:

```json
{
  "type": "object",
  "properties": {
    "callerName":      { "type": "string", "description": "Caller's full name." },
    "clubName":        { "type": "string", "description": "Golf course or club name." },
    "role":            { "type": "string", "description": "Their role, e.g. General Manager, Owner, Director of Golf." },
    "isDecisionMaker": { "type": "boolean", "description": "True if they can decide on new software themselves." },
    "currentSoftware": { "type": "string", "description": "Current tee sheet / club management software, or 'none' for a new setup." },
    "primaryNeed":     { "type": "string", "description": "What they want help with: tee sheet, F&B, memberships, or all." },
    "email":           { "type": "string", "description": "Email address, lowercase, no spaces. Only if confirmed letter by letter." },
    "phone":           { "type": "string", "description": "Callback number in E.164 if given, else blank (we capture caller ID anyway)." },
    "booked":          { "type": "boolean", "description": "True ONLY if a consultation was actually booked via the scheduling tool." },
    "bookedTime":      { "type": "string", "description": "ISO 8601 datetime of the booked consultation, blank if not booked." },
    "notes":           { "type": "string", "description": "Anything else worth knowing before the sales call." }
  }
}
```

The webhook reads these keys (and a few aliases) — see
`artifacts/api-server/src/routes/vapi-webhook.ts`.

---

## 3. Known failure modes seen on real calls

### 3.1 CRITICAL — the agent invents dates and fake bookings

Observed on the 22 Jul 2026 call:

> "I have an opening on **Tuesday, July 8th** at 2:30 PM or **Thursday, July 10th** at 11 AM."

Both were in the past. The caller corrected it, and the agent then offered:

> "**Tuesday, July 25th** at 2:30 PM or **Thursday, July 27th** at 11 AM."

July 25 2026 is a **Saturday**. July 27 is a **Monday**. Every date/weekday pair
it produced was wrong — proof it is generating availability from the language
model instead of reading a calendar.

It then told the caller:

> "I've got you down for a Fairway360 consultation... You'll receive a
> confirmation by email."

**Nothing was booked and no email was sent.** A real prospect is expecting a call
at a time nobody has in a calendar.

This is the same failure the Fairway360 kitchen agent had, and the fix is the
same: **the model must never state a time it did not get from a tool, and never
confirm a booking it did not create.** Two options:

- **Preferred:** connect the Cal.com tools in Vapi (availability + booking) so
  real slots are offered and really reserved.
- **Interim (until Cal.com is wired):** the agent must NOT offer specific times
  at all. It takes a day/time preference and says a human will confirm. This is
  a worse experience but an honest one, and it still captures the lead.

The prompt in §4 covers both cases.

### 3.2 Email addresses captured wrong

The caller said "nick at deroot g mail dot com". The agent never confirmed the
spelling, so the address is unusable. Email is the one field where a single
wrong character loses the lead entirely — it must be read back and confirmed.

### 3.3 Repetition when the caller interrupts

The agent asked "are you the one who'd be making the decision" three times
because the caller said "Yeah" while it was still speaking. Fix in Vapi:

- Enable interruptions / barge-in on the assistant
- Raise the end-of-speech / silence timeout slightly (~0.6–1.0s) so a short
  "yeah" mid-sentence isn't treated as a complete turn
- Prompt rule: never re-ask a question the caller has already answered

### 3.4 Names and terms garbled

"Nick Premium Golf" → "Nick Premium Gold"; "tee sheet" → "TSheets". Confirm club
names back to the caller, and add a Vapi keyword/vocabulary boost for the terms
this agent hears constantly: *tee sheet, tee time, F&B, clubhouse, pro shop,
member, GM, superintendent, ForeUp, GolfNow, Lightspeed, Club Essentials, Jonas*.

---

## 4. Improved prompt

Changes from the original are marked. The rest of the original prompt (identity,
persona, scenario handling) is unchanged and still good.

### Add at the very top of the system prompt

```
## Today's date
Today is {{"now" | date: "%A, %B %-d, %Y", "America/New_York"}}.
Never state a date, day of the week, or time that you have not read from the
scheduling tool in this call. You do not know what days of the week upcoming
dates fall on — do not guess. If you have not called the availability tool, you
do not know any availability.
```

`{{now}}` is a Vapi dynamic variable. Without this the model has no idea what
today is, which is the root cause of §3.1.

### Replace the Scheduling Process section

```
### Scheduling Process

1. Transition: "I'd like to get you on a call with our team for a proper
   walkthrough. Can I get your full name and the best email for the
   confirmation?"

2. Capture the email carefully — this is the one detail that must be exact:
   - Ask them to say it, then READ IT BACK letter by letter using the phonetic
     alphabet: "Let me read that back — N-I-C-K, like November-India-Charlie-
     Kilo, at D-E-R-O-O-T, then gmail dot com. Did I get that right?"
   - Say "at" for @ and "dot" for . when reading back.
   - If they correct any part, read the whole address back again.
   - Never guess a spelling. "Nick at Deroot" could be deroot, de-root, or
     derooot — ask.
   - Do the same for the phone number if they give one that differs from the
     number they're calling from: read it back in pairs.

3. Offer times — ONLY from the availability tool:
   - Call the availability tool first. Offer at most 2–3 real slots, each with
     the weekday exactly as the tool returned it.
   - If the tool fails or returns nothing: "I'm not able to pull up the live
     calendar right now — let me take your preferred day and time and the team
     will confirm by email within one business day." Then STOP. Do not invent
     times.

4. Book — ONLY via the booking tool:
   - Call the booking tool. Only after it succeeds may you say the consultation
     is booked.
   - If the booking tool fails or was never called, say: "I've got your details
     and your preferred time — the team will confirm by email shortly." Never
     say "you'll receive a confirmation" for a booking that was not created.

### Confirmation and Wrap-up
1. Summarise only what is true: name, club, and either the booked slot (from the
   tool) or the preference you recorded.
2. "This will be about 30 minutes, and our team will walk through how Fairway360
   could fit your course's setup."
3. Close politely.
```

### Add to Response Guidelines

```
- Never re-ask a question the caller has already answered, even if they answered
  while you were still speaking. If you heard a yes or no, take it and move on.
- Confirm the club/course name back once: "Got it — Nick Premium Golf, is that
  right?" Do not silently accept a name you may have misheard.
- If you are unsure whether a tool call succeeded, say the team will confirm.
  Never assert that something was booked, sent, or scheduled unless a tool
  returned success in this call.
```

---

## 5. How to verify it end to end

1. **Webhook half** (no call credits needed) — POST a simulated report:

```bash
curl -s -X POST https://fairway360.io/api/vapi/webhook \
  -H 'Content-Type: application/json' \
  -H 'x-vapi-secret: <secret>' \
  -d '{"message":{"type":"end-of-call-report","endedReason":"customer-ended-call",
       "call":{"id":"verify-001","customer":{"number":"+14125550000"}},
       "analysis":{"summary":"Test","structuredData":{"clubName":"Test Club","callerName":"Test Caller","role":"GM","booked":false}}}}'
```

Then check **Leads** in the supervisor portal and the sales inbox.

2. **Real call** — call the number, answer the questions, hang up. Confirm:
   - a lead appears with source `Phone (AI)`
   - the email arrives with summary + transcript
   - **any date the agent said matches a real Cal.com booking** (this is the §3.1
     check — verify the booking exists, don't take the agent's word)

3. **Vapi dashboard → Logs** for the AI's side of the same call.

Test calls consume Vapi credits.
