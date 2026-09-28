"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isSameDocument(url: URL) {
  return url.pathname === window.location.pathname && url.search === window.location.search;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [progress, setProgress] = useState(0);
  const trickleTimer = useRef(0);

  useEffect(() => {
    function begin() {
      setProgress((current) => (current > 0 && current < 100 ? current : 14));
      if (!trickleTimer.current) {
        trickleTimer.current = window.setInterval(() => {
          setProgress((current) => {
            if (current <= 0 || current >= 90) return current;
            const step = current < 40 ? 10 : current < 70 ? 5 : 2;
            return Math.min(90, current + step);
          });
        }, 180);
      }
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || isSameDocument(url)) return;
      begin();
    }

    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);
    history.pushState = (state, unused, url) => {
      if (url) {
        const next = new URL(String(url), window.location.href);
        if (next.origin === window.location.origin && !isSameDocument(next)) begin();
      }
      return pushState(state, unused, url);
    };
    history.replaceState = (state, unused, url) => {
      if (url) {
        const next = new URL(String(url), window.location.href);
        if (next.origin === window.location.origin && !isSameDocument(next)) begin();
      }
      return replaceState(state, unused, url);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", begin);
    return () => {
      window.clearInterval(trickleTimer.current);
      trickleTimer.current = 0;
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", begin);
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, []);

  useEffect(() => {
    setProgress((current) => (current > 0 && current < 100 ? 100 : current));
  }, [routeKey]);

  useEffect(() => {
    if (progress !== 100) return;
    window.clearInterval(trickleTimer.current);
    trickleTimer.current = 0;
    const hideTimer = window.setTimeout(() => setProgress(0), 220);
    return () => window.clearTimeout(hideTimer);
  }, [progress]);

  if (progress <= 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div className="h-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
    </div>
  );
}
