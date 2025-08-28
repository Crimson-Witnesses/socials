import React from "react";
import { SiInstagram, SiX, SiDiscord } from "react-icons/si";
import type { NextPage } from "next";
import { motion } from "framer-motion";
import { HiQrCode } from "react-icons/hi2";
import { SocialLink } from "../components/Links/SocialLink";
import styles from "../components/Links/styles.module.css";
import { Stack, Profile, IconLink } from "../components";

const variants = {
  hidden: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  },
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.2
    }
  }
};

const Glow: React.FC = () => (
  <svg
    width="256"
    height="51"
    viewBox="0 0 256 51"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      style={{ mixBlendMode: `plus-lighter` }}
      filter="url(#filter0_f_4065_106)"
    >
      <path
        d="M127.998 1.53891C210.114 0.650005 255.996 22.0278 255.996 48.1534L129.232 49.5255L0 49.5335C0 23.4079 45.8822 2.42782 127.998 1.53891Z"
        fill="url(#paint0_radial_4065_106)"
        fillOpacity="0.7"
      />
    </g>

    <defs>
      <filter
        id="filter0_f_4065_106"
        x="-8.9"
        y="-7.38779"
        width="273.796"
        height="65.8212"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix" />

        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="BackgroundImageFix"
          result="shape"
        />

        <feGaussianBlur
          stdDeviation="4.45"
          result="effect1_foregroundBlur_4065_106"
        />
      </filter>

      <radialGradient
        id="paint0_radial_4065_106"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(129.526 46.5785) rotate(-90) scale(45.6 189.7)"
      >
        <stop stopColor="#9F21E8" />
        <stop offset="0.844989" stopColor="#9F21E8" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const Home: NextPage = () => {
  return (
    <>
      <Stack style={{ gap: `38px` }}>
        <Profile />

        <motion.ul
          className={styles.links}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={variants}
        >
          <SocialLink url="//discord.gg/qxZqjsYT5U">
            <SiDiscord />
            <span>Discord</span>
            <Glow />
          </SocialLink>

          <SocialLink url="//luma.com/crimsonwitnesses">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="0"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12C17.3742 12 12 6.62579 12 0C12 6.62579 6.6258 12 0 12C6.6258 12 12 17.3742 12 24C12 17.3742 17.3742 12 24 12Z" />
            </svg>

            <span>Events</span>
            <Glow />
          </SocialLink>

          <SocialLink url="//x.com/crimwitnesses">
            <SiX />
            <span>Twitter</span>
            <Glow />
          </SocialLink>

          <SocialLink url="//www.instagram.com/crimson_witnesses">
            <SiInstagram />
            <span>Instagram</span>
            <Glow />
          </SocialLink>
        </motion.ul>
      </Stack>

      <IconLink title="View QR Code" href="/qr">
        <HiQrCode />
      </IconLink>
    </>
  );
};

export default Home;
