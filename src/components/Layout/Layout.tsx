import React from "react";
import { Asul, Gemunu_Libre } from "next/font/google";
import { AnimatePresence } from "framer-motion";
import styles from "./styles.module.css";
import { PrismaticBurst } from "../PrismaticBurst";
import { Galaxy } from "../Galaxy";

/* eslint-disable @stylistic/quotes */
const asul = Asul({
  weight: ["400", "700"],
  subsets: ["latin"]
});

const gemunuLibre = Gemunu_Libre({
  subsets: ["latin"]
});
/* eslint-enable @stylistic/quotes */

export const Layout: React.FC<{ readonly children: React.ReactNode }> = ({
  children
}) => (
  <>
    <svg
      style={{
        width: 0,
        height: 0,
        position: `absolute`
      }}
      aria-hidden="true"
      focusable="false"
    >
      <linearGradient id="svg-fill-2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#D3B8D7" />
      </linearGradient>
    </svg>

    <PrismaticBurst
      animationType="rotate3d"
      intensity={2.4}
      speed={0.15}
      distort={8.2}
      rayCount={32}
      mixBlendMode="plus-lighter"
      colors={[`#282269`, `#3221e5`, `#9F21E8`, `#DA32F1`, `#D3B8D7`]}
    />

    <Galaxy
      density={1.75}
      glowIntensity={0.3}
      saturation={0.5}
      hueShift={190}
      twinkleIntensity={0.25}
      rotationSpeed={0.01}
      starSpeed={2.5}
      speed={0.025}
      mixBlendMode="plus-lighter"
    />

    <main
      className={[styles.container, asul.className, gemunuLibre.className].join(
        ` `
      )}
    >
      <AnimatePresence
        initial={false}
        mode="wait"
        onExitComplete={(): void => window.scrollTo(0, 0)}
      >
        {children}
      </AnimatePresence>
    </main>
  </>
);
