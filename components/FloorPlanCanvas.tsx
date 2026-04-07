"use client";

import type { ReactNode, Ref, RefObject } from "react";
import type { Floorplan } from "@/lib/types";

/** How visible the blueprint under coloured zones is (0–1). Higher = easier to see walls/lines. */
const BASE_LAYER_OPACITY = 0.82;

type Props = {
  floorplan: Floorplan | null;
  /** Used when `floorplan` has no usable `image_path`. */
  fallbackImageSrc: string;
  svgRef: RefObject<SVGSVGElement | null>;
  children: ReactNode;
};

/**
 * Base layer: prefer `image_path` (file or URL) so uploads sit under room zones.
 * Inline `svg_content` is used only when there is no `image_path` (e.g. DB-only SVG).
 */
export function FloorPlanCanvas({
  floorplan,
  fallbackImageSrc,
  svgRef,
  children,
}: Props) {
  const imagePath = floorplan?.image_path?.trim();
  const baseSrc = imagePath || fallbackImageSrc;
  const useInlineSvg =
    Boolean(floorplan?.svg_content?.trim()) && !imagePath;

  return (
    <svg
      ref={svgRef as unknown as Ref<SVGSVGElement>}
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full touch-none select-none font-sans [text-rendering:geometricPrecision]"
      style={{
        fontFamily:
          "var(--font-body, ui-sans-serif), system-ui, -apple-system, sans-serif",
      }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Floor plan canvas"
    >
      <defs>
        <filter id="zoneGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {useInlineSvg ? (
        <g
          dangerouslySetInnerHTML={{ __html: floorplan!.svg_content! }}
          style={{ opacity: BASE_LAYER_OPACITY }}
        />
      ) : (
        <image
          href={baseSrc}
          width={100}
          height={100}
          preserveAspectRatio="xMidYMid meet"
          style={{ opacity: BASE_LAYER_OPACITY }}
        />
      )}
      {children}
    </svg>
  );
}
