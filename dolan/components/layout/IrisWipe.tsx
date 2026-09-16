"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./iris-wipe.module.css";

export function requestIrisCover() {
  window.dispatchEvent(new Event("dolan-iris-cover"));
}

export function IrisWipe() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"off" | "in" | "out">("off");

  useEffect(() => {
    const cover = () => setPhase("in");
    window.addEventListener("dolan-iris-cover", cover);
    return () => window.removeEventListener("dolan-iris-cover", cover);
  }, []);

  useEffect(() => {
    if (phase !== "in" || !pathname.startsWith("/provinsi/")) return;
    const timer = window.setTimeout(() => setPhase("out"), 80);
    return () => window.clearTimeout(timer);
  }, [pathname, phase]);

  if (phase === "off") return null;

  return (
    <div
      className={`${styles.iris} ${styles[phase]}`}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (phase === "out") setPhase("off");
      }}
    />
  );
}
