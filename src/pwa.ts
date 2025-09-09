// eslint-disable-next-line import-x/no-unresolved
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl) {
    console.log(`SW registered: `, swScriptUrl);
  },
  onOfflineReady() {
    console.log(`PWA application ready to work offline`);
  }
});
