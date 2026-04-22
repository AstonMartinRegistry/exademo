"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const EXA_DEMO_NAV = [
  { href: "/test", label: "hub" },
  { href: "/test/search", label: "search" },
  { href: "/test/people", label: "people" },
  { href: "/test/company", label: "company" },
  { href: "/test/contents", label: "contents" },
  { href: "/test/similar", label: "similar" },
  { href: "/test/answer", label: "answer" },
  { href: "/test/2-step", label: "2-step" },
] as const;

/** Home shell — latest = live filings on `/`; about = how it works. */
export const HOME_TOP_NAV = [
  { href: "/", label: "latest" },
  { href: "/about", label: "about" },
] as const;

export type TopNavItem = { href: string; label: string };

type PillGeometry = {
  index: number;
  left: number;
  width: number;
};

type TopNavProps = {
  items?: readonly TopNavItem[];
  ariaLabel?: string;
};

export default function TopNav({
  items = EXA_DEMO_NAV,
  ariaLabel = "Exa API demos",
}: TopNavProps = {}) {
  const pathname = usePathname();
  const [pill, setPill] = useState<PillGeometry | null>(null);
  const [pillVisible, setPillVisible] = useState(false);
  const [slidePill, setSlidePill] = useState(false);
  const pillVisibleRef = useRef(false);
  const navRef = useRef<HTMLElement>(null);

  const measureLink = (link: HTMLAnchorElement | null, index: number): PillGeometry | null => {
    const nav = navRef.current;
    if (!nav || !link) return null;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    return { index, left: linkRect.left - navRect.left, width: linkRect.width };
  };

  const setHoverFromEvent = (
    event: React.PointerEvent<HTMLAnchorElement> | React.FocusEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    const next = measureLink(event.currentTarget, index);
    if (!next) return;
    const wasVisible = pillVisibleRef.current;
    setPill(next);
    pillVisibleRef.current = true;
    setPillVisible(true);
    if (wasVisible) {
      setSlidePill(true);
    } else {
      setSlidePill(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSlidePill(true));
      });
    }
  };

  const clearHover = () => {
    pillVisibleRef.current = false;
    setSlidePill(false);
    setPillVisible(false);
  };

  useEffect(() => {
    clearHover();
  }, [pathname]);

  useLayoutEffect(() => {
    if (pill === null) return;
    const handleResize = () => {
      const nav = navRef.current;
      if (!nav) return;
      const link = nav.querySelectorAll<HTMLAnchorElement>("a.footer-link")[pill.index];
      const next = measureLink(link ?? null, pill.index);
      if (next) setPill(next);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pill?.index]);

  const pathMatches = (href: string) =>
    pathname === href || (href !== "/" && pathname === `${href}/`);

  return (
    <div className="top-nav-strip">
      <nav
        ref={navRef}
        className={`footer-nav${slidePill ? " footer-nav--pill-slide" : ""}`}
        aria-label={ariaLabel}
        onPointerLeave={clearHover}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            clearHover();
          }
        }}
        style={
          {
            "--footer-hover-left": `${pill?.left ?? 0}px`,
            "--footer-hover-width": `${pill?.width ?? 0}px`,
            "--footer-hover-opacity": pillVisible ? 1 : 0,
          } as React.CSSProperties
        }
      >
        <span className="footer-hover-indicator" aria-hidden="true" />

        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`footer-link footer-button${pillVisible && pill?.index === index ? " is-active" : ""}`}
            aria-current={pathMatches(item.href) ? "page" : undefined}
            onPointerEnter={(e) => setHoverFromEvent(e, index)}
            onFocus={(e) => setHoverFromEvent(e, index)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
