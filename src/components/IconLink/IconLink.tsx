import React from "react";
import Link from "next/link";
import styles from "./styles.module.css";

export const IconLink: React.FC<React.ComponentProps<typeof Link>> = ({
  children,
  ...props
}) => (
  <Link {...props} className={styles.link} scroll={false}>
    {children}
  </Link>
);
