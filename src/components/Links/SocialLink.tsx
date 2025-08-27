import React from "react";
import { motion } from "framer-motion";
import styles from "./styles.module.css";

const variants = {
  hidden: {
    y: 50,
    opacity: 0,
    transition: { y: { stiffness: 1000 } }
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      y: {
        stiffness: 1000,
        velocity: -100
      }
    }
  }
};

export const SocialLink: React.FC<{
  readonly url: string;
  readonly children: React.ReactNode;
}> = ({ url, children }) => {
  return (
    <motion.li key={url} className={styles.frame} variants={variants}>
      <a
        className={styles.link}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    </motion.li>
  );
};
