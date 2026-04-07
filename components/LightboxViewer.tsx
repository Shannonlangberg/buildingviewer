"use client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export type LightSlide = { src: string; alt?: string };

type Props = {
  open: boolean;
  index: number;
  slides: LightSlide[];
  onClose: () => void;
};

export function LightboxViewer({ open, index, slides, onClose }: Props) {
  if (!slides.length) return null;
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      carousel={{ finite: slides.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      render={{
        buttonPrev: slides.length <= 1 ? () => null : undefined,
        buttonNext: slides.length <= 1 ? () => null : undefined,
      }}
    />
  );
}
