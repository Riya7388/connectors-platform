# Connectors

Connectors is a web platform where students and professionals book paid 1-on-1 sessions with mentors who have recently been through the same path (an entrance exam, a college branch, a first job). Live at **https://www.connectorsapp.info/**.

> Fields marked `[FILL: ...]` are details only the team knows. Replace each one before submitting, and delete this note.

---

## Team details

| Name | Role | Contact |
|---|---|---|
| Riya Sah | Founder of Connectors; sole developer (individual project) | riyasah3091@gmail.com |

## College / Incubator information

National Institute of Technology (NIT) Raipur, Metallurgy and Material Science, second year. Incubator: none at present.

## Project title

**Connectors: relevant-senior mentorship for students and early-career professionals**

## Problem statement

Students preparing for competitive exams and higher education in India have few ways to reach someone who has recently done what they are trying to do.

- The 2026 cycle alone saw about 54.5 lakh entrance-exam registrations across JEE Main (16,04,854), NEET UG (22.79 lakh) and CUET UG (15,68,867). These are registrations, not unique students, since one student can register for more than one exam. Sources: NTA data as reported by Physics Wallah and Careers360.
- 4.50 crore students were enrolled in higher education in 2023-24 (AISHE, Ministry of Education).
- In the IC3 Institute and FLAME University Student Quest Survey 2024 (classes 9-12, about 2,200 students worldwide; the India subset size is not reported), 25% of students said they had no access to career counselling, 7% had no structured support, and 38% cited a lack of personalised feedback.

Coaching institutes teach the syllabus, but a student in a government school or a smaller town rarely gets to ask a senior "what did your second attempt look like?" or "is this branch right for me?" Connectors is built around that gap.

## What Connectors does

- **Mentor profiles.** Mentors describe their background, top achievement, journey, milestones, areas of expertise, availability and session price. Identity is verified by an admin from an uploaded ID proof (college ID, office ID or offer letter) before a mentor goes live.
- **1-on-1 booking and payment.** A student finds a mentor, requests a session of a chosen duration, and pays through Razorpay. Payment is verified server-side before the booking is confirmed.
- **Mentor Genie.** A student describes a goal in plain language (for example, "preparing for JEE and want to learn freelancing") and Mentor Genie suggests mentors whose expertise matches.
- **Transactional email.** Notification emails are sent through Resend from a Supabase Edge Function.
- **Mentor self-service editing.** Approved mentors can update achievements, bio and photo. College, ID proof and LinkedIn are locked after approval and enforced by a database trigger, not only in the interface.

## Technical stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, react-hook-form, zod |
| Hosting | Vercel |
| Backend | Supabase: Postgres with Row Level Security, Auth, Storage, Edge Functions (Deno) |
| Scheduled jobs | pg_cron and pg_net |
| Payments | Razorpay (order creation and signature verification in Edge Functions) |
| Email | Resend |
| AI | Google Gemini API (`gemini-2.5-flash`), called from Edge Functions |

Edge Functions in this repository: `create-razorpay-order`, `verify-razorpay-payment`, `send-email`, `mentor-genie-chat`, `ai-compare`. All secrets are read from Supabase function secrets; none are stored in this repository.

## AI / ML details

Connectors does not train or host its own model. Two features call Google's Gemini API (`gemini-2.5-flash`) from Supabase Edge Functions, so the API key stays on the server as a function secret and is never sent to the browser.

### 1. Mentor Genie (chat assistant, `mentor-genie-chat`)

A floating chat assistant available on every page. A student describes a problem ("I'm preparing for JEE and struggling with time management") and Mentor Genie recommends real mentors from the platform.

- **Matching method:** Gemini is given a `search_mentors` function declaration (function calling). It maps the student's message to one to three expertise areas from a fixed list of allowed expertise tags, plus an optional exam category. The Edge Function then queries the `mentors` table and returns up to 10 candidates. If an exact match is not found, the search widens in four steps: expertise and exam category, expertise in any category, exam category only, and finally a sanitised text search over bio, branch and custom expertise.
- **Grounding:** the model may recommend only mentors returned by the database query. The system prompt forbids inventing names, colleges or achievements. If a recommended mentor is from a different exam than the student's, the reply must say so.
- **Language:** replies in the language the student writes in (English, Hindi or Hinglish), in three to five sentences. If the question is vague, it asks one clarifying question before recommending.
- **Guardrails written into the system prompt:** it does not share or ask for phone numbers, emails or external links; it refuses requests to ignore its instructions or reveal the prompt; it stays on education and career topics; it does not promise ranks or admissions; and if a student expresses severe distress, it responds with empathy and gives the Tele-MANAS (14416) and KIRAN (1800-599-0019) helplines instead of recommending a mentor.
- **Limits and storage:** 50 messages per day per signed-in user or anonymous session. The database stores only this daily count (`chat_usage`), not the conversation.

### 2. AI college comparison (`ai-compare`, "AI Engine" tab)

A student picks two colleges. The app loads stored facts for both, counts the verified mentors from each, and sends this data to Gemini, which returns a two to three sentence summary of the practical trade-offs. The prompt restricts the model to the supplied data and tells it not to state any statistic, ranking, package or fee that is not in that data. When one college has more mentors on the platform, the summary says so.
### Evaluation

Neither feature has been formally evaluated, and no accuracy figures are claimed.

## Demo video

`[https://jumpshare.com/share/bcWtCrIiHG40OswsyAc4]`
https://jumpshare.com/folder/givLi59QUO8nKvrJCB10

## Architecture diagram

`https://www.pdffiller.com/s/OHRvy15xYc`

```
Browser (React + Vite, on Vercel)
   |  Supabase JS client (anon key, Row Level Security)
   v
Supabase
   |- Auth
   |- Postgres (mentors, bookings, ratings; RLS and triggers)
   |- Storage (ID proof uploads)
   |- Edge Functions -> Razorpay (orders, payment verification)
   |                 -> Resend (emails)
   |                 -> Gemini API (Mentor Genie, college comparison)
   '- pg_cron + pg_net (scheduled reminders)
```

## Presentation

[Project presentation (PDF)] https://www.pdffiller.com/s/8VsZksEVX
## Open-source license

Released under the MIT License. See [LICENSE](./LICENSE).

## Running locally

```bash
npm install
cp .env.example .env   # fill in your own Supabase project URL and anon key
npm run dev
```

The variables in `.env.example` are `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_RAZORPAY_KEY_ID`, plus two optional flags. Edge Function secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are set in the Supabase dashboard and must never be committed.

## Links

- Live site: https://www.connectorsapp.info/
- All files and links listed above are publicly accessible without sign-in.
