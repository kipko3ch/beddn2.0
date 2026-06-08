"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollUpVisibility(offset = 32) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastY.current;

      if (currentY <= offset) {
        setVisible(true);
      } else if (Math.abs(delta) > 6) {
        setVisible(delta < 0);
      }

      lastY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [offset]);

  return visible;
}
