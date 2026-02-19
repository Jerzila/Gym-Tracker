# Gym Tracker

Minimal strength tracking app with **progressive overload** (double progression), PR tracking, and progress graphs.

- **Stack:** Next.js (App Router), TypeScript, Supabase, Tailwind, Recharts
- **Features:** Exercise management, workout logging (weight + 3–5 sets), automatic “increase / stay / reduce” suggestions, estimated 1RM (Epley), weight & 1RM charts

## Setup

1. **Clone and install**
   ```bash
   cd gym-app && npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - In **SQL Editor**, run the migration:
     - Copy contents of `supabase/migrations/001_initial.sql` and run it.
   - In **Settings → API**: copy **Project URL** and **service_role** (or anon) key.

3. **Env**
   ```bash
   cp .env.example .env.local
   ```
   Set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL  
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (or use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for anon)

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Pages

- **`/`** — Dashboard: list exercises, add new (name, rep_min, rep_max).
- **`/exercise/[id]`** — Log workout (date, weight, reps for 3–5 sets), see PRs, weight-over-time and estimated-1RM charts, and progression message after each save.

## Progression logic (double progression)

After you save a workout:

- **All sets ≥ rep_max** → “Increase weight next session”
- **Any set < rep_min** → “Weight too heavy or stay at this weight”
- **Else** → “Stay at this weight until you hit the top of the range”

Weight is in **kg** in the UI and DB.
