// Calling playbook — scripts, objection responses, voicemail and email
// templates, rendered inside the super-admin Sales CRM so the caller never
// needs a separate document. Every block has a one-click copy button.

import { ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Script {
  title: string;
  tag?: string;
  body: string;
}

const SCRIPTS: { section: string; items: Script[] }[] = [
  {
    section: "Openers",
    items: [
      {
        title: "Gatekeeper",
        body: `Hi, this is [NAME] with Fairway360. I'm trying to reach the person responsible for club operations and technology. Would that be your general manager or director of golf?

If asked "What's this regarding?":
We work specifically with golf clubs on automating things like inbound calls, tee-time questions, membership inquiries, dining, events and other repetitive operational tasks. I wanted to speak with whoever oversees that side of the club.

Then get: name · position · direct number · email · best time to reach them. Thank them — gatekeepers open doors.`,
      },
      {
        title: "Decision-maker opening",
        body: `Hi [NAME], this is [CALLER] with Fairway360. I'll keep this brief. We built Fairway360 specifically for golf clubs to help automate things like inbound calls, tee-time questions, membership inquiries, dining, events and repetitive front-desk work. I wanted to see how you're currently handling those operations.

— Then STOP TALKING. Let them answer.`,
      },
      {
        title: "Transition to demo",
        body: `That's exactly why I called. Instead of trying to explain everything over the phone, it would probably make more sense to show you what Fairway360 actually does. We can demonstrate how it could work around your club's existing operation.

Would [TIME OPTION A] or [TIME OPTION B] work better for a quick demonstration?

— Always give two options. Never ask "would you maybe want to schedule something sometime?"`,
      },
    ],
  },
  {
    section: "Discovery questions",
    items: [
      {
        title: "The conversation guide",
        body: `Phones: When the club gets busy, who normally handles incoming calls? Do calls ever roll to voicemail during peak periods?
Tee times: How are tee-time questions and changes handled today?
Membership: How are new membership inquiries captured and followed up with?
Dining: Does your club have a restaurant or F&B operation? Can members order digitally or on the course?
Events: Do you host weddings, corporate events or private functions? How are those inquiries followed up with?
Technology: What system are you currently using for your tee sheet or club management?
Staffing: Are there repetitive questions your staff spends a lot of time answering?
Decision process: If you decided to implement something like this, who else would normally be involved?

PAIN SIGNALS to record in their words: "we miss calls" · "short staffed" · "front desk handles everything" · "inquiries get missed" · "still doing that manually" · "restaurant gets overwhelmed" · "trying to increase memberships" · "looking at new technology".`,
      },
    ],
  },
  {
    section: "Objection responses",
    items: [
      {
        title: `"We already have software"`,
        body: `Absolutely. We're not assuming you should rip out everything you're already using. Part of the conversation is identifying where your existing systems stop and where Fairway360 could automate around them. What platform are you currently using?

— Record the platform in the CRM.`,
      },
      {
        title: `"We're not interested in AI"`,
        body: `I understand. The bigger question isn't really AI itself. It's whether reducing missed calls, repetitive staff work and lost membership or event inquiries would be valuable to the club.

Is any of that currently a problem?

— Sell the outcome, not the technology. Never debate AI.`,
      },
      {
        title: `"Send me information"`,
        body: `Absolutely. What's the best email address?

I'll send that over. Rather than letting it disappear into your inbox, when would be reasonable for me to follow up after you've had a chance to look at it?

— "Send info" without a follow-up date is NOT a qualified opportunity. Log the follow-up before the next dial.`,
      },
      {
        title: `"How much does it cost?"`,
        body: `Fairway360 has different configurations depending on what the club actually needs. Rather than quoting you for features you may never use, the demo lets us determine what makes sense for your operation and then show you the appropriate package.

Approved anchors if pressed: plans start at $497/month; most clubs choose the $997/month Pro plan. Never invent pricing beyond this.`,
      },
      {
        title: `"We don't have the budget"`,
        body: `Understood. Before we rule it out based on budget, I'd want to determine whether there's actually enough operational or revenue impact to justify it. If there isn't, we'll tell you that.

Would a short demonstration be unreasonable?`,
      },
      {
        title: `"I need the owner / the board"`,
        body: `That makes sense. Who besides yourself would normally need to evaluate something like this?

Would it make sense to have them join the demonstration so everyone can see the same thing at once?

— Record every stakeholder name in the CRM.`,
      },
      {
        title: `"Call me later"`,
        body: `Absolutely. What day and time would be best?

— Never end with just "okay". Log the callback in the CRM before moving to the next lead.`,
      },
    ],
  },
  {
    section: "Voicemail & email",
    items: [
      {
        title: "Voicemail (keep it short)",
        body: `Hi [NAME], this is [CALLER] with Fairway360. We work specifically with golf clubs to automate inbound calls, tee-time questions, membership inquiries, dining, events and other repetitive operations. I wanted to introduce myself and show you what we've built. You can reach me at [NUMBER]. Again, this is [CALLER] with Fairway360. Thanks.`,
      },
      {
        title: "Follow-up email",
        body: `Subject: Fairway360 for [CLUB NAME]

Hi [NAME],

Thanks for speaking with me.

Fairway360 is built specifically for golf clubs to help streamline operations including inbound calls, tee-time inquiries, membership leads, dining, events and other repetitive member/guest interactions.

Based on our conversation, I thought the most relevant area for [CLUB] was [PAIN POINT].

I'd like to show you what that could look like inside your operation.

Demo: [DATE] at [TIME]

Looking forward to speaking with you.

[CALLER NAME]
Fairway360 — fairway360.io`,
      },
      {
        title: "Live AI demo offer",
        body: `Instead of me trying to explain it over the phone, I can email you a link where you can actually talk to the Fairway360 concierge yourself — ask it to book a tee time, ask about membership, dining, weddings, tournaments. It answers 24/7.

Or call our own AI line right now: +1 (412) 285-1554 — that's the same technology your club would get.`,
      },
    ],
  },
  {
    section: "Rules",
    items: [
      {
        title: "The caller's job (and what NOT to do)",
        body: `A successful call = Qualified Decision Maker + Identified Pain Point + Scheduled Demo. The caller qualifies and books; the closer demos and closes.

NEVER: read robotically · feature-dump · invent pricing · promise integrations (POS/tee-sheet sync is roadmap) · claim in-app payments · argue with prospects · call anyone who asked not to be called · put unqualified meetings on the closer's calendar · leave CRM records incomplete.

Calling windows (caller's local ET): 9–11 East · 11–1 East/Central · 2–4 Central/Mountain · 4–5:30 Mountain/Pacific. Use the Time-zone field on each prospect.`,
      },
    ],
  },
];

export function SalesScripts() {
  const { toast } = useToast();
  const copy = async (s: Script) => {
    await navigator.clipboard.writeText(s.body);
    toast({ title: "Copied", description: s.title });
  };
  return (
    <div className="space-y-6">
      {SCRIPTS.map((sec) => (
        <div key={sec.section}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">{sec.section}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {sec.items.map((s) => (
              <div key={s.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                  <Button size="sm" variant="outline" className="h-7 shrink-0 border-white/15 px-2" onClick={() => void copy(s)}>
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-white/65">{s.body}</pre>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
