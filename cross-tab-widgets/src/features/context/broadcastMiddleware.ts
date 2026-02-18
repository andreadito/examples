import type { Middleware } from "@reduxjs/toolkit";
import { publishContext } from "./contextSlice";
import type { BroadcastMessage, ContextState } from "./types";

const CHANNEL_NAME = "widget-context";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export const broadcastMiddleware: Middleware =
  (storeApi) => (next) => (action) => {
    const result = next(action);

    if (publishContext.match(action)) {
      const state = storeApi.getState() as { context: ContextState };
      const { widgetId, value } = action.payload;

      // Broadcast using the widget's publishTo topic (not the local topic)
      const widgetCfg = state.context.widgets[widgetId];
      if (widgetCfg?.publishTo) {
        const message: BroadcastMessage = {
          topic: widgetCfg.publishTo,
          value,
          sourceTabId: state.context.tabId,
        };
        getChannel().postMessage(message);
      }
    }

    return result;
  };
