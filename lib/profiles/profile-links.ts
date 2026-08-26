export type ProfileLink = {
  link: string;
  title?: string;
};

function isProfileLink(value: unknown): value is ProfileLink {
  if (!value || typeof value !== "object") return false;
  const link = (value as ProfileLink).link;
  return typeof link === "string" && link.trim() !== "";
}

export function parseProfileLinks(value: unknown): ProfileLink[] {
  if (Array.isArray(value)) {
    return value.filter(isProfileLink).map((entry) => ({
      link: entry.link.trim(),
      title:
        typeof entry.title === "string" && entry.title.trim()
          ? entry.title.trim()
          : undefined,
    }));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([title, link]) =>
      typeof link === "string" && link.trim()
        ? [{ title, link: link.trim() }]
        : [],
    );
  }

  return [];
}

export function toHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function siteNameFromUrl(url: string) {
  try {
    const hostname = new URL(toHref(url)).hostname.replace(/^www\./i, "");
    const [name] = hostname.split(".");
    return name || hostname;
  } catch {
    return url;
  }
}

export function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(toHref(url));
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}
