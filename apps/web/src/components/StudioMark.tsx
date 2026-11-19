import type { ComponentProps } from "react";
import studioMarkUrl from "../../../../assets/studio/mark.svg";

export function StudioMark(props: Omit<ComponentProps<"img">, "src" | "alt">) {
  return <img {...props} src={studioMarkUrl} alt="" />;
}
