import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ContextState, BroadcastMessage, WidgetConfig } from "./types";

const initialState: ContextState = {
  values: {},
  widgets: {
    // Pre-configured defaults — the topic strings are free-form
    "date-picker": { publishTo: "date", subscribeTo: null },
    "isin-input": { publishTo: "isin", subscribeTo: null },
    "date-display": { publishTo: null, subscribeTo: "date" },
    "isin-display": { publishTo: null, subscribeTo: "isin" },
  },
  tabId: crypto.randomUUID(),
  lastExternalReceive: {},
};

const contextSlice = createSlice({
  name: "context",
  initialState,
  reducers: {
    /**
     * A widget publishes a value locally (always updates the store).
     * The middleware decides whether to broadcast based on the widget's publishTo config.
     */
    publishContext(
      state,
      action: PayloadAction<{ widgetId: string; topic: string; value: string }>
    ) {
      state.values[action.payload.topic] = action.payload.value;
    },

    /**
     * Incoming cross-tab message. Updates the store value for the topic
     * only if at least one widget is subscribed to that topic.
     */
    receiveExternalContext(state, action: PayloadAction<BroadcastMessage>) {
      const { topic, value, sourceTabId } = action.payload;

      if (sourceTabId === state.tabId) return;

      const hasSubscriber = Object.values(state.widgets).some(
        (w) => w.subscribeTo === topic
      );

      if (hasSubscriber) {
        state.values[topic] = value;
        state.lastExternalReceive[topic] = Date.now();
      }
    },

    /**
     * Change which external topic a widget publishes to (null or "" to stop).
     */
    setWidgetPublishTo(
      state,
      action: PayloadAction<{ widgetId: string; topic: string | null }>
    ) {
      const cfg = state.widgets[action.payload.widgetId];
      if (cfg) {
        cfg.publishTo = action.payload.topic || null;
      }
    },

    /**
     * Change which external topic a widget subscribes to (null or "" to stop).
     */
    setWidgetSubscribeTo(
      state,
      action: PayloadAction<{ widgetId: string; topic: string | null }>
    ) {
      const cfg = state.widgets[action.payload.widgetId];
      if (cfg) {
        cfg.subscribeTo = action.payload.topic || null;
      }
    },
  },
});

export const {
  publishContext,
  receiveExternalContext,
  setWidgetPublishTo,
  setWidgetSubscribeTo,
} = contextSlice.actions;

export const contextReducer = contextSlice.reducer;

/** Helper selector: get a widget's config */
export const selectWidgetConfig = (
  state: { context: ContextState },
  widgetId: string
): WidgetConfig | undefined => state.context.widgets[widgetId];
