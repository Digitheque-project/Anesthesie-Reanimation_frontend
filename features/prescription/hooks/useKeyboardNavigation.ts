"use client";
import { useCallback, useRef, useEffect } from "react";

const FOCUSABLE_SEL = [
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '.rxi:not([tabindex])',
  '.active-rx-item:not([tabindex])',
  '.rc:not([tabindex])',
  '[data-kb-focus]:not([tabindex])',
].join(",");

export function useKeyboardNavigation() {
  const containerRef = useRef<HTMLDivElement>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    const els = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)
    );
    return els.filter((el) => {
      if (el.closest('[data-kb-ignore]')) return false;
      if (el.closest('.delete-confirm-modal')) return false;
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const listItems = containerRef.current.querySelectorAll<HTMLElement>(
      '.rxi:not([tabindex]), .active-rx-item:not([tabindex]), [data-kb-focus]:not([tabindex])'
    );
    listItems.forEach((el) => {
      el.setAttribute("tabindex", "0");
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;

      if (e.key === "Enter") {
        if (tag === "TEXTAREA") {
          e.stopPropagation();
          return;
        }
        if (tag === "INPUT") {
          e.preventDefault();
          const elements = getFocusableElements();
          const idx = elements.indexOf(target);
          if (idx >= 0 && idx < elements.length - 1) {
            elements[idx + 1].focus();
          }
          return;
        }
        if (target.classList.contains("rxi") || target.classList.contains("active-rx-item")) {
          e.preventDefault();
          target.click();
          return;
        }
      }

      if (
        e.key === "ArrowDown" || e.key === "ArrowUp" ||
        e.key === "ArrowRight" || e.key === "ArrowLeft"
      ) {
        const elements = getFocusableElements();
        const idx = elements.indexOf(target);
        if (idx < 0) return;

        if (tag === "TEXTAREA") return;

        e.preventDefault();

        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          if (idx < elements.length - 1) elements[idx + 1].focus();
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          if (idx > 0) elements[idx - 1].focus();
        }
        return;
      }
    },
    [getFocusableElements]
  );

  return { containerRef, handleKeyDown };
}
