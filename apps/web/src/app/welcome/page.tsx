import { redirect } from "next/navigation";

/**
 * The marketing landing and the guided intro were two versions of the same
 * first-run story, which made the entry into the product feel duplicated.
 * There is now one door: /onboarding. This route stays so existing links,
 * bookmarks and the old sitemap entry keep working.
 */
export default function WelcomeRedirect() {
  redirect("/onboarding");
}
