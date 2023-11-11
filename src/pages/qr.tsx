import React from "react";
import type { NextPage } from "next";
import { HiXMark } from "react-icons/hi2";
import { Stack, QRCode, IconLink } from "../components";

const Page: NextPage = () => (
  <>
    <Stack
      style={{
        marginBlock: `auto`
      }}
    >
      <QRCode />
    </Stack>
    <IconLink title="Back to Home" href="/">
      <HiXMark />
    </IconLink>
  </>
);

export default Page;
