"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

export const EXA_DEMO_NAV = [
  { href: "/demo/search", label: "search" },
  { href: "/demo/contents", label: "contents" },
  { href: "/demo/similar", label: "similar" },
  { href: "/demo/answer", label: "answer" },
] as const;

type PillGeometry = {
  index: number;
  left: number;
  width: number;
};

export default function TopNav() {
  const pathname = usePathname();
  const [pill, setPill] = useState<PillGeometry | null>(null);
  const [pillVisible, setPillVisible] = useState(false);
  const [slidePill, setSlidePill] = useState(false);
  const pillVisibleRef = useRef(false);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const measureIndex = (index: number): PillGeometry | null => {
    const nav = navRef.current;
    const link = linkRefs.current[index];
    if (!nav || !link) {
      return null;
    }
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    return {
      index,
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    };
  };

  const setHover = (index: number) => {
    const next = measureIndex(index);
    if (!next) {
      return;
    }

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

  useLayoutEffect(() => {
    if (pill === null) {
      return;
    }

    const index = pill.index;

    const handleResize = () => {
      const next = measureIndex(index);
      if (next) {
        setPill(next);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pill?.index]);

  return (
    <div className="top-nav-strip">
      <nav
        ref={navRef}
        className={`footer-nav${slidePill ? " footer-nav--pill-slide" : ""}`}
        aria-label="Exa API demos"
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

        {EXA_DEMO_NAV.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            ref={(element) => {
              linkRefs.current[index] = element;
            }}
            className={`footer-link footer-button${pillVisible && pill?.index === index ? " is-active" : ""}`}
            aria-current={pathname === item.href ? "page" : undefined}
            onPointerEnter={() => setHover(index)}
            onFocus={() => setHover(index)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
