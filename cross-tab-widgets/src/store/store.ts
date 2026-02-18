import { configureStore } from "@reduxjs/toolkit";
import { contextReducer } from "../features/context/contextSlice";
import { broadcastMiddleware } from "../features/context/broadcastMiddleware";

export const store = configureStore({
  reducer: {
    context: contextReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(broadcastMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
