import { DatePickerWidget } from "../widgets/DatePickerWidget";
import { IsinInputWidget } from "../widgets/IsinInputWidget";

export function PageA() {
  return (
    <div>
      <h2>Page A (Publishers)</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        These widgets publish context changes to other tabs via BroadcastChannel.
      </p>
      <DatePickerWidget />
      <IsinInputWidget />
    </div>
  );
}
