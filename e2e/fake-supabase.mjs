// A tiny stand-in for Supabase (auth + the PostgREST tables the pages read),
// so the screen-size test can render real pages without a real database.
// Only reads are supported; nothing the test does writes anything.
//
// Run: node e2e/fake-supabase.mjs   (listens on http://localhost:54321)
//
// FAKE_SUPABASE_STATE=between-items: nothing is current, as between
// finishing one book/movie and picking the next (shows "Make next…").
import http from "node:http";

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const MEMBER_ID = "00000000-0000-0000-0000-000000000002";
const OTHER_ID = "00000000-0000-0000-0000-000000000003";

const users = {
  [ADMIN_ID]: { email: "admin@example.com", name: "Simon Fagerstedt" },
  [MEMBER_ID]: {
    email: "a.very.long.email.address@example.com",
    name: "Anna-Karin Långnamnsdotter Bergström",
  },
};

// A grey 2×3 placeholder, so covers have a size without any network.
const COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23888'/%3E%3C/svg%3E";

// Deliberately awkward data: long titles, long names, long descriptions,
// non-Latin original titles, and enough finished items for two pages.
const titles = [
  ["Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", null],
  ["Den allvarsamma leken", "Hjalmar Söderberg", null],
  ["Porträtt av en dam i brand", "Céline Sciamma", "Portrait de la jeune fille en feu"],
  ["Drive My Car", "Ryusuke Hamaguchi", "ドライブ・マイ・カー"],
  ["The Zone of Interest", "Jonathan Glazer", null],
  ["Perfect Days", "Wim Wenders", null],
  ["Hundraåringen som klev ut genom fönstret och försvann", "Jonas Jonasson", null],
  ["Everything Everywhere All at Once", "Daniel Kwan, Daniel Scheinert", null],
  ["Cure", "Kiyoshi Kurosawa", "キュア"],
  ["Tár", "Todd Field", null],
  ["Licorice Pizza", "Paul Thomas Anderson", null],
  ["Anatomy of a Fall", "Justine Triet", "Anatomie d'une chute"],
  ["Fritt fall", "Someone With A Rather Long Name Indeed", null],
  ["Revenge", "Coralie Fargeat", null],
  ["The Substance", "Coralie Fargeat", null],
  ["Aftersun", "Charlotte Wells", null],
];
/** "YYYY-MM-DD", n days from today. */
const daysFromNow = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const BETWEEN_ITEMS = process.env.FAKE_SUPABASE_STATE === "between-items";

const statusOf = (i) =>
  i === 0 ? (BETWEEN_ITEMS ? "suggested" : "current") : i <= 3 ? "suggested" : i === 4 ? "hidden" : "read";

const books = titles.map(([title, author, original], i) => ({
  id: `b${i}`,
  title,
  author,
  status: statusOf(i),
  pitch:
    statusOf(i) === "suggested"
      ? "Because everyone keeps talking about it and I think it would make for a really good discussion."
      : null,
  cover_url: COVER,
  description: "A fairly long description that goes on for a while. ".repeat(6),
  original_title: original,
  published_year: 1990 + i,
  added_by: i % 2 ? MEMBER_ID : ADMIN_ID,
  meet_on: statusOf(i) === "current" ? daysFromNow(10) : null,
  finished_at: statusOf(i) === "read" ? `2025-${String(1 + (i % 12)).padStart(2, "0")}-15T00:00:00Z` : null,
  created_at: `2026-10-${String(1 + i).padStart(2, "0")}T00:00:00Z`,
}));

const reviews = books
  .filter((b) => b.status === "read" || b.status === "current")
  .flatMap((b, i) => [
    {
      id: `r${i}a`,
      book_id: b.id,
      rating: 1 + (i % 5),
      body: "Loved the ending, but the middle dragged a bit for me. Would still recommend it to anyone.",
      member_id: OTHER_ID,
      created_at: "2026-10-20T00:00:00Z",
    },
    {
      id: `r${i}b`,
      book_id: b.id,
      rating: 5,
      body: "Great",
      member_id: MEMBER_ID,
      created_at: "2026-10-21T00:00:00Z",
    },
  ]);

const tables = {
  books,
  members: [
    { id: ADMIN_ID, display_name: users[ADMIN_ID].name, is_admin: true },
    { id: MEMBER_ID, display_name: users[MEMBER_ID].name, is_admin: false },
    { id: OTHER_ID, display_name: "Bo", is_admin: false },
  ],
  reviews,
  suggestion_votes: [
    { book_id: "b1", member_id: MEMBER_ID },
    { book_id: "b1", member_id: OTHER_ID },
    { book_id: "b2", member_id: ADMIN_ID },
  ],
  // A tie between the first two dates, so the admin's "pick a date" menu
  // shows up too.
  meetup_dates: [
    { id: "m1", meet_on: daysFromNow(7), suggested_by: ADMIN_ID },
    { id: "m2", meet_on: daysFromNow(8), suggested_by: MEMBER_ID },
    { id: "m3", meet_on: daysFromNow(200), suggested_by: OTHER_ID },
  ],
  meetup_date_votes: [
    { meetup_date_id: "m1", member_id: ADMIN_ID },
    { meetup_date_id: "m1", member_id: MEMBER_ID },
    { meetup_date_id: "m2", member_id: MEMBER_ID },
    { meetup_date_id: "m2", member_id: OTHER_ID },
    { meetup_date_id: "m3", member_id: OTHER_ID },
  ],
  background_covers: Array.from({ length: 12 }, (_, i) => ({
    id: `c${i}`,
    cover_url: COVER,
    title: `Background cover number ${i + 1}`,
    position: i,
  })),
  background_settings: [
    {
      id: true,
      cols_mobile: 4,
      cols_tablet: 7,
      cols_desktop: 9,
      gap_x_percent: 30,
      gap_y_percent: 30,
      grayscale: false,
    },
  ],
};

function userFromAuthHeader(header) {
  const token = (header ?? "").replace(/^Bearer /, "");
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    const u = users[payload.sub];
    if (!u) return null;
    return {
      id: payload.sub,
      aud: "authenticated",
      role: "authenticated",
      email: u.email,
      user_metadata: {},
      app_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    };
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("content-type", "application/json");

  if (url.pathname === "/health") return res.end("{}");

  if (url.pathname === "/auth/v1/user") {
    const user = userFromAuthHeader(req.headers.authorization);
    if (!user) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ message: "not signed in" }));
    }
    return res.end(JSON.stringify(user));
  }

  const table = url.pathname.match(/^\/rest\/v1\/(\w+)$/)?.[1];
  if (table && req.method === "GET") {
    // Support the simple `column=eq.value` filters; ignore everything else.
    let rows = tables[table] ?? [];
    for (const [key, value] of url.searchParams) {
      if (value.startsWith("eq.")) {
        rows = rows.filter((r) => String(r[key]) === value.slice(3));
      }
    }
    if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
      return res.end(JSON.stringify(rows[0] ?? null));
    }
    return res.end(JSON.stringify(rows));
  }

  res.statusCode = 404;
  res.end("{}");
});

server.listen(54321, () => console.log("fake Supabase on :54321"));
