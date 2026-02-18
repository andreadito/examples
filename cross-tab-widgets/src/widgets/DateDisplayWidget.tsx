import { useAppSelector } from "../store/hooks";
import { TopicSelector } from "./TopicSelector";
import { useExternalFlash } from "./useExternalFlash";

const WIDGET_ID = "date-display";

export function DateDisplayWidget() {
  const subscribeTo = useAppSelector(
    (state) => state.context.widgets[WIDGET_ID]?.subscribeTo
  );
  const value = useAppSelector((state) =>
    subscribeTo ? state.context.values[subscribeTo] : null
  );
  const flashing = useExternalFlash(subscribeTo);

  return (
    <div style={{ ...widgetStyle, ...(flashing ? flashStyle : {}) }}>
      <h3>
        Date Display
        {subscribeTo && <span style={badgeStyle}>LISTENING ← {subscribeTo}</span>}
      </h3>
      <p style={{ fontSize: 20, fontFamily: "monospace" }}>
        {value ?? "(nothing)"}
      </p>
      <TopicSelector widgetId={WIDGET_ID} direction="subscribe" />
    </div>
  );
}

const widgetStyle: React.CSSProperties = {
  border: "2px solid #ccc",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

const flashStyle: React.CSSProperties = {
  borderColor: "#4caf50",
  boxShadow: "0 0 8px rgba(76, 175, 80, 0.5)",
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#4caf50",
  borderRadius: 4,
  padding: "2px 6px",
  marginLeft: 8,
  verticalAlign: "middle",
};
