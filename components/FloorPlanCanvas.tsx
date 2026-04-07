"use client";

import type { ReactNode, Ref, RefObject } from "react";
import type { Floorplan } from "@/lib/types";
import {
  buildFloorplanViewportTransform,
  DEFAULT_FLOORPLAN_VIEWPORT,
  type FloorplanViewport,
} from "@/lib/floorplan-viewport";

const DEFAULT_BASE_LAYER_OPACITY = 0.82;

type Props = {
  floorplan: Floorplan | null;
  /** Used when `floorplan` has no usable `image_path`. */
  fallbackImageSrc: string;
  svgRef: RefObject<SVGSVGElement | null>;
  children: ReactNode;
  /** How visible the blueprint under coloured zones is (0–1). */
  baseLayerOpacity?: number;
  /** Pan/zoom in SVG viewBox space (omit for default). */
  viewport?: FloorplanViewport;
  /** Click / tap on blueprint only (not on a room zone). */
  onBackdropClick?: () => void;
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
  baseLayerOpacity = DEFAULT_BASE_LAYER_OPACITY,
  viewport = DEFAULT_FLOORPLAN_VIEWPORT,
  onBackdropClick,
}: Props) {
  const opacity = Math.min(1, Math.max(0, baseLayerOpacity));
  const imagePath = floorplan?.image_path?.trim();
  const baseSrc = imagePath || fallbackImageSrc;
  const useInlineSvg =
    Boolean(floorplan?.svg_content?.trim()) && !imagePath;

  const viewportTransform = buildFloorplanViewportTransform(viewport);

  const backdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBackdropClick?.();
  };

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
        <filter id="zoneGlowHover" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="0.45" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform={viewportTransform}>
        <g
          data-floorplan-base="true"
          onClick={onBackdropClick ? backdropClick : undefined}
        >
          {useInlineSvg ? (
            <g
              dangerouslySetInnerHTML={{ __html: floorplan!.svg_content! }}
              style={{ opacity }}
            />
          ) : (
            <image
              href={baseSrc}
              width={100}
              height={100}
              preserveAspectRatio="xMidYMid meet"
              style={{ opacity }}
            />
          )}
        </g>
        {children}
      </g>
    </svg>
  );
}
