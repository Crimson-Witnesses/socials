import {
  SiInstagram,
  SiTwitter,
  SiDiscord
} from "react-icons/si";
import { MdPermContactCalendar, MdGamepad } from "react-icons/md";
import type { SiteConfig } from "./types";

export const config: SiteConfig = {
  name: `Crimson Witnesses`,
  title: `Dota 2 Esports Community`,
  links: [
    { Icon: SiDiscord, url: `//discord.gg/crimsonwitnesses`, label: `Discord` },
    { Icon: SiTwitter, url: `//twitter.com/crimwitnesses`, label: `Twitter` },
    {
      Icon: SiInstagram,
      url: `//www.instagram.com/crimsonwitnesses`,
      label: `Instagram`
    }
  ]
};
