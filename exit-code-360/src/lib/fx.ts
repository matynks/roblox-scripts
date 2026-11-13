import React from "react";

/** Render-quality switches (profiling / fast previews). */
export type Fx = { blur: number; grain: boolean };
export const FxContext = React.createContext<Fx>({ blur: 1, grain: true });
export const useFx = () => React.useContext(FxContext);
