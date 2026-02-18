import { DateDisplayWidget } from "../widgets/DateDisplayWidget";
import { IsinDisplayWidget } from "../widgets/IsinDisplayWidget";

export function PageB() {
  return (
    <div>
      <h2>Page B (Subscribers)</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        These widgets receive context changes from other tabs. Toggle the
        checkbox to enable/disable cross-tab updates per widget.
      </p>
      <DateDisplayWidget />
      <IsinDisplayWidget />
    </div>
  );
}
