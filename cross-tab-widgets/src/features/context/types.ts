export interface BroadcastMessage {
  topic: string;
  value: string;
  sourceTabId: string;
}

export interface WidgetConfig {
  /** Which external topic this widget publishes to (null = don't broadcast) */
  publishTo: string | null;
  /** Which external topic this widget subscribes to (null = don't listen) */
  subscribeTo: string | null;
}

export interface ContextState {
  /** Dynamic bag of topic values — any string key is valid */
  values: Record<string, string>;
  /** Per-widget configuration: widgetId -> { publishTo, subscribeTo } */
  widgets: Record<string, WidgetConfig>;
  tabId: string;
  lastExternalReceive: Record<string, number>;
}
