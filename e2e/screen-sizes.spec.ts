import { test, expect, type Page } from "@playwright/test";

/**
 * Every page must fit the screen at common widths: no sideways scrolling,
 * and no button, link or form field pushed off the edge. Width is what
 * matters for layout (CSS pixels), not the screen's resolution, so these
 * cover phones to large desktops.
 */
const SCREENS = [
  { name: "small phone (iPhone SE)", width: 375, height: 667, phone: true },
  { name: "iPhone 15 Pro", width: 393, height: 852, phone: true },
  { name: "large Android", width: 412, height: 915, phone: true },
  { name: "tablet", width: 768, height: 1024, phone: false },
  { name: "laptop", width: 1280, height: 800, phone: false },
  { name: "desktop", width: 1920, height: 1080, phone: false },
];

// The fake users in e2e/fake-supabase.mjs.
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const MEMBER_ID = "00000000-0000-0000-0000-000000000002";

type Who = "logged out" | "member" | "admin";

const PAGES: { who: Who; path: string }[] = [
  { who: "logged out", path: "/" },
  { who: "logged out", path: "/?page=2" },
  { who: "logged out", path: "/login" },
  { who: "member", path: "/" },
  { who: "member", path: "/?page=2" },
  { who: "member", path: "/account/password" },
  { who: "admin", path: "/" },
  { who: "admin", path: "/?edit=b0" }, // the current item
  { who: "admin", path: "/?edit=b5" }, // a finished item
  { who: "admin", path: "/?background=1" },
];

/** Signs the browser in as a fake user, the way @supabase/ssr stores it. */
async function signIn(page: Page, userId: string) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const farFuture = 4102444800; // 2100-01-01
  const jwt = [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({ sub: userId, exp: farFuture, role: "authenticated", aud: "authenticated" }),
    "fake-signature",
  ].join(".");
  const session = {
    access_token: jwt,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: farFuture,
    refresh_token: "fake",
    user: { id: userId },
  };
  await page.context().addCookies([
    {
      name: "sb-localhost-auth-token",
      value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      domain: "localhost",
      path: "/",
    },
  ]);
}

/** What sticks out past the right or left edge of the screen, if anything. */
function findOverflow(page: Page) {
  // The screen's width, not window.innerWidth: a phone browser zooms out
  // to fit a too-wide page, which makes innerWidth grow along with it.
  const screenWidth = page.viewportSize()!.width;
  return page.evaluate((width) => {
    const problems: string[] = [];
    const pageWidth = document.documentElement.scrollWidth;
    if (pageWidth > width) {
      problems.push(`page is ${pageWidth}px wide, screen is ${width}px`);
    }
    const controls = document.querySelectorAll(
      "button, a, input:not([type=hidden]), select, textarea, summary",
    );
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // not shown
      if (getComputedStyle(el).visibility === "hidden") continue;
      if (r.left < -1 || r.right > width + 1) {
        const label = (
          el.textContent?.trim() ||
          el.getAttribute("aria-label") ||
          el.getAttribute("placeholder") ||
          el.getAttribute("name") ||
          ""
        ).slice(0, 40);
        problems.push(
          `<${el.tagName.toLowerCase()}> "${label}" spans ${Math.round(r.left)}–${Math.round(r.right)}px`,
        );
      }
    }
    return problems;
  }, screenWidth);
}

for (const screen of SCREENS) {
  test.describe(`${screen.name}, ${screen.width}px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      isMobile: screen.phone,
      hasTouch: screen.phone,
    });

    for (const { who, path } of PAGES) {
      test(`${who}: ${path}`, async ({ page }) => {
        if (who !== "logged out") {
          await signIn(page, who === "admin" ? ADMIN_ID : MEMBER_ID);
        }
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.ok(), `${path} loaded`).toBe(true);

        // Make sure we are testing what we think we are: signed in as the
        // right user, with the admin form actually open.
        if (path === "/" && who !== "logged out") {
          await expect(page.getByText(/Välkommen/)).toBeVisible();
        }
        if (/[?&](edit|background)=/.test(path)) {
          await expect(page.getByRole("link", { name: "Close" })).toBeVisible();
        }

        expect(await findOverflow(page), "as loaded").toEqual([]);

        // Fold-outs (add a finished item, older reviews…) count too.
        const folded = await page.locator("details:not([open])").count();
        if (folded > 0) {
          await page.evaluate(() =>
            document.querySelectorAll("details").forEach((d) => (d.open = true)),
          );
          expect(await findOverflow(page), "with fold-outs open").toEqual([]);
        }
      });
    }
  });
}
