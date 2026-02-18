import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setWidgetPublishTo,
  setWidgetSubscribeTo,
} from "../features/context/contextSlice";

interface TopicSelectorProps {
  widgetId: string;
  direction: "publish" | "subscribe";
}

export function TopicSelector({ widgetId, direction }: TopicSelectorProps) {
  const dispatch = useAppDispatch();

  const currentTopic = useAppSelector((state) => {
    const cfg = state.context.widgets[widgetId];
    return direction === "publish" ? cfg?.publishTo : cfg?.subscribeTo;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim() || null;
    if (direction === "publish") {
      dispatch(setWidgetPublishTo({ widgetId, topic: value }));
    } else {
      dispatch(setWidgetSubscribeTo({ widgetId, topic: value }));
    }
  };

  const label =
    direction === "publish" ? "Broadcast to:" : "Listen to:";
  const placeholder =
    direction === "publish"
      ? "topic name (empty = off)"
      : "topic name (empty = off)";

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      {label}
      <input
        type="text"
        value={currentTopic ?? ""}
        onChange={handleChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "3px 6px",
  fontSize: 13,
  borderRadius: 4,
  border: "1px solid #ccc",
  width: 140,
};
