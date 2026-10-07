import Link from "next/link";

/**
 * Site footer. Mirrors Airbnb's three-column link area above a legal bar. All
 * links are inert placeholders — this is a visual clone, not real navigation.
 */
export function Footer() {
  const columns = [
    {
      heading: "Support",
      links: ["Help Centre", "AirCover", "Anti-discrimination", "Disability support", "Cancellation options"],
    },
    {
      heading: "Hosting",
      links: ["Airbnb your home", "AirCover for Hosts", "Hosting resources", "Community forum", "Hosting responsibly"],
    },
    {
      heading: "Airbnb",
      links: ["Newsroom", "New features", "Careers", "Investors", "Gift cards"],
    },
  ];

  return (
    <footer className="mt-16 border-t border-hairline-soft bg-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-3">
        {columns.map((column) => (
          <div key={column.heading}>
            <h3 className="mb-4 text-sm font-semibold">{column.heading}</h3>
            <ul className="space-y-3">
              {column.links.map((link) => (
                <li key={link}>
                  <Link
                    href="/"
                    className="text-sm text-muted transition-colors hover:text-ink hover:underline"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-hairline-soft">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Airbnb Clone, Inc. · Built for an SDE assignment.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Sitemap</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
