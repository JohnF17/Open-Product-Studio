import { Image } from "expo-image";

import { STUDIO_BRAND_MARK_SOURCE } from "./brandAssets";

export function StudioMark({ size }: { readonly size: number }) {
  return (
    <Image
      source={STUDIO_BRAND_MARK_SOURCE}
      accessible={false}
      accessibilityIgnoresInvertColors
      style={{ width: size, height: size }}
    />
  );
}
