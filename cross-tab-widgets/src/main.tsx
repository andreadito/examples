import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { setupBroadcastListener } from "./features/context/broadcastListener";
import App from "./App";
import "./index.css";

// Set up cross-tab listener
const cleanup = setupBroadcastListener(store);

// Clean up on HMR dispose (Vite dev mode)
if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanup());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
