import type { EnhancedStore } from "@reduxjs/toolkit";
import { receiveExternalContext } from "./contextSlice";
import type { BroadcastMessage } from "./types";

const CHANNEL_NAME = "widget-context";

export function setupBroadcastListener(store: EnhancedStore): () => void {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  const handler = (event: MessageEvent<BroadcastMessage>) => {
    const { topic, value, sourceTabId } = event.data;

    // Basic validation — topic is now any non-empty string
    if (typeof topic !== "string" || topic === "") return;
    if (typeof value !== "string") return;
    if (typeof sourceTabId !== "string") return;

    store.dispatch(receiveExternalContext({ topic, value, sourceTabId }));
  };

  channel.addEventListener("message", handler);

  return () => {
    channel.removeEventListener("message", handler);
    channel.close();
  };
}
