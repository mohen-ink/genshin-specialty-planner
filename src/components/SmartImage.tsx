import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import type { ImageReference } from "../types";

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  image: ImageReference;
}

export function SmartImage({ image, onError, ...props }: SmartImageProps) {
  const sources = useMemo(
    () => {
      const remoteSources = [image.url, ...(image.fallbackUrls ?? [])];
      const localSource =
        import.meta.env.MODE === "tauri"
          ? `${import.meta.env.BASE_URL}native-assets/UI/${encodeURIComponent(image.filename)}.png`
          : undefined;

      return [localSource, ...remoteSources].filter(
        (source): source is string => Boolean(source),
      );
    },
    [image.fallbackUrls, image.filename, image.url],
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
