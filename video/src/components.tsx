import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { bodyFont, displayFont, gridBackground, monoFont, palette } from "./theme";

export const Scene: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ ...gridBackground, opacity }}>{children}</AbsoluteFill>
  );
};

export const RiseIn: React.FC<{
  delay?: number;
  children: React.ReactNode;
}> = ({ delay = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120 },
    durationInFrames: 30,
  });
  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 46}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: monoFont,
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: "0.18em",
      color: palette.cyanDark,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{
  size?: number;
  children: React.ReactNode;
}> = ({ size = 88, children }) => (
  <div
    style={{
      fontFamily: bodyFont,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.18,
      color: palette.ink,
      letterSpacing: "0.01em",
    }}
  >
    {children}
  </div>
);

export const SubText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: bodyFont,
      fontWeight: 400,
      fontSize: 34,
      lineHeight: 1.7,
      color: palette.inkSoft,
    }}
  >
    {children}
  </div>
);

export const Wordmark: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14 * scale,
      background: palette.ink,
      color: "#eef8fb",
      padding: `${10 * scale}px ${20 * scale}px`,
      border: `2px solid ${palette.ink}`,
    }}
  >
    <span
      style={{
        fontFamily: displayFont,
        fontWeight: 700,
        fontSize: 44 * scale,
        letterSpacing: "0.02em",
      }}
    >
      CCA
    </span>
    <span
      style={{
        fontFamily: monoFont,
        fontSize: 15 * scale,
        lineHeight: 1.3,
        letterSpacing: "0.14em",
      }}
    >
      FIELD
      <br />
      NOTES
    </span>
  </div>
);

export const UnofficialBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 80,
      bottom: 48,
      fontFamily: monoFont,
      fontSize: 22,
      letterSpacing: "0.06em",
      color: palette.inkSoft,
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}
  >
    <span
      style={{
        border: `2px solid ${palette.inkSoft}`,
        padding: "3px 10px",
        fontWeight: 700,
      }}
    >
      非公式
    </span>
    Anthropic非公式・非提携の学習アプリです
  </div>
);

export const BrowserFrame: React.FC<{
  src: string;
  width: number;
  height: number;
  pan?: [number, number];
  zoom?: [number, number];
  overlaySrc?: string;
  overlayAt?: number;
}> = ({ src, width, height, pan = [0, 40], zoom = [1, 1.05], overlaySrc, overlayAt = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const position = interpolate(frame, [0, durationInFrames], pan);
  const scale = interpolate(frame, [0, durationInFrames], zoom);
  const overlayOpacity = overlaySrc
    ? interpolate(frame, [overlayAt, overlayAt + 14], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const screenshot = (imageSrc: string): React.ReactNode => (
    <Img
      src={imageSrc}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: `50% ${position}%`,
        transform: `scale(${scale})`,
        transformOrigin: "50% 40%",
      }}
    />
  );
  return (
    <div
      style={{
        width,
        background: palette.surface,
        border: `3px solid ${palette.ink}`,
        boxShadow: "16px 16px 0 rgb(8 126 155 / 14%)",
      }}
    >
      <div
        style={{
          height: 54,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 22px",
          borderBottom: `2px solid ${palette.ink}`,
          background: palette.cyanPale,
        }}
      >
        {[palette.danger, palette.amber, palette.green].map((color) => (
          <span
            key={color}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: color,
              opacity: 0.75,
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 16,
            fontFamily: monoFont,
            fontSize: 20,
            color: palette.inkSoft,
            letterSpacing: "0.04em",
          }}
        >
          cca.toshi0607.com
        </span>
      </div>
      <div style={{ position: "relative", height, overflow: "hidden" }}>
        {screenshot(src)}
        {overlaySrc ? (
          <div style={{ position: "absolute", inset: 0, opacity: overlayOpacity }}>
            {screenshot(overlaySrc)}
          </div>
        ) : null}
      </div>
    </div>
  );
};
