import React from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/react";
import { Layout } from "../components/Layout";
import "../styles/reset.css";

const meta = {
  name: `Crimson Witnesses`,
  title: `Dota 2 Esports Community`
};

const _app: React.FC<AppProps> = ({ Component, pageProps, router }) => (
  <>
    <Head>
      <title>{meta.name}</title>
      <link rel="icon" href="/icon.svg" />
      <link rel="mask-icon" color="white" href="/icon.svg" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="description" content={meta.title} />
      <meta name="image" content="/share-card.png" />
      {/* OpenGraph */}
      <meta property="og:site_name" content={meta.name} />
      <meta property="og:url" content="https://crimsonwitnesses.com" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={meta.name} />
      <meta property="og:description" content={meta.title} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content="/share-card.png" />
      <meta property="og:image:alt" content={meta.title} />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@crimwitnesses" />
      <meta name="twitter:title" content={meta.name} />
      <meta name="twitter:description" content={meta.title} />
      <meta name="twitter:image" content="/share-card.png" />
      {/* iOS */}
      <link rel="apple-touch-icon" href="/app-icon-192.png" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />

      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />

      <meta
        name="viewport"
        content="viewport-fit=cover, width=device-width, height=device-height, initial-scale=1, user-scalable=no"
      />
    </Head>

    <Layout>
      <Component key={router.route} {...pageProps} />
    </Layout>

    <Analytics />
  </>
);

export default _app;
