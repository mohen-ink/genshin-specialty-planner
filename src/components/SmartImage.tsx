import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import type { ImageReference } from "../types";

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  image: ImageReference;
}

export function SmartImage({ image, onError, ...props }: SmartImageProps) {
  const sources = useMemo(
    () => [image.url, ...(image.fallbackUrls ?? [])].filter(Boolean),
    [image.fallbackUrls, image.url],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [sources]);

  return (
    <img
      {...props}
      src={sources[sourceIndex]}
      onError={(event) => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((current) => current + 1);
        } else {
          event.currentTarget.classList.add("image-failed");
        }
        onError?.(event);
      }}
    />
  );
}
