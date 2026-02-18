import { useAppDispatch, useAppSelector } from "../store/hooks";
import { publishContext } from "../features/context/contextSlice";
import { TopicSelector } from "./TopicSelector";

const WIDGET_ID = "date-picker";
const LOCAL_TOPIC = "date";

export function DatePickerWidget() {
  const dispatch = useAppDispatch();
  const date = useAppSelector((state) => state.context.values[LOCAL_TOPIC] ?? "");
  const publishTo = useAppSelector(
    (state) => state.context.widgets[WIDGET_ID]?.publishTo
  );

  return (
    <div style={widgetStyle}>
      <h3>
        Date Picker
        {publishTo && <span style={badgeStyle}>BROADCASTING → {publishTo}</span>}
      </h3>
      <input
        type="date"
        value={date}
        onChange={(e) =>
          dispatch(
            publishContext({
              widgetId: WIDGET_ID,
              topic: LOCAL_TOPIC,
              value: e.target.value,
            })
          )
        }
      />
      <div style={{ marginTop: 8 }}>
        <TopicSelector widgetId={WIDGET_ID} direction="publish" />
      </div>
    </div>
  );
}

const widgetStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#2196f3",
  borderRadius: 4,
  padding: "2px 6px",
  marginLeft: 8,
  verticalAlign: "middle",
};
