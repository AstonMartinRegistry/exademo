"use client";

import { useLayoutEffect, useRef, useState } from "react";

const navItems = ["about", "manifesto", "contact"] as const;

type PillGeometry = {
  index: number;
  left: number;
  width: number;
};

export default function FooterNav() {
  const [pill, setPill] = useState<PillGeometry | null>(null);
  const [pillVisible, setPillVisible] = useState(false);
  const [slidePill, setSlidePill] = useState(false);
  const pillVisibleRef = useRef(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const measureIndex = (index: number): PillGeometry | null => {
    const nav = navRef.current;
    const button = buttonRefs.current[index];
    if (!nav || !button) {
      return null;
    }
    const navRect = nav.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      index,
      left: buttonRect.left - navRect.left,
      width: buttonRect.width,
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
    <div className="footer-strip">
      <nav
        ref={navRef}
        className={`footer-nav${slidePill ? " footer-nav--pill-slide" : ""}`}
        aria-label="Site links"
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

        {navItems.map((item, index) => (
          <button
            key={item}
            type="button"
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            className={`footer-link footer-button${pillVisible && pill?.index === index ? " is-active" : ""}`}
            onPointerEnter={() => setHover(index)}
            onFocus={() => setHover(index)}
          >
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}
