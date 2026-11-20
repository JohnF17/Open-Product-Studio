import { createContext, type ReactNode, useContext } from "react";

export const BuilderAssistantSlot = createContext<ReactNode>(null);

export function BuilderSheetHeading({ title, detail }: { title: string; detail: string }) {
  const assistant = useContext(BuilderAssistantSlot);
  return (
    <>
      {/* oxlint-disable-next-line shadcn/no-unknown-classes -- ops-step-head is defined in the Studio workspace's studio.css */}
      <div className="ops-step-head">
        <h2 tabIndex={-1}>{title}</h2>
        <p>{detail}</p>
      </div>
      {assistant}
    </>
  );
}
