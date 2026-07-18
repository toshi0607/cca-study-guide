import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import guideShot from "../assets/guide.png";
import practiceShot from "../assets/practice.png";
import quizShot from "../assets/quiz.png";
import scenarioShot from "../assets/scenario.png";
import weakShot from "../assets/weak.png";
import {
  BrowserFrame,
  Eyebrow,
  Headline,
  RiseIn,
  Scene,
  SubText,
  UnofficialBadge,
  Wordmark,
} from "./components";
import { bodyFont, displayFont, monoFont, palette } from "./theme";

export const SCENES = {
  hook: { from: 0, duration: 140 },
  guide: { from: 140, duration: 165 },
  cards: { from: 305, duration: 165 },
  quiz: { from: 470, duration: 165 },
  weak: { from: 635, duration: 135 },
  closing: { from: 770, duration: 130 },
} as const;

export const TOTAL_DURATION = SCENES.closing.from + SCENES.closing.duration;

const FeatureScene: React.FC<{
  duration: number;
  eyebrow: string;
  headline: React.ReactNode;
  headlineSize?: number;
  sub: React.ReactNode;
  extra?: React.ReactNode;
  frame: React.ReactNode;
}> = ({ duration, eyebrow, headline, headlineSize, sub, extra, frame }) => (
  <Scene durationInFrames={duration}>
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 56,
        padding: "0 80px",
      }}
    >
      <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 30 }}>
        <RiseIn>
          <Eyebrow>{eyebrow}</Eyebrow>
        </RiseIn>
        <RiseIn delay={5}>
          <Headline size={headlineSize}>{headline}</Headline>
        </RiseIn>
        <RiseIn delay={10}>
          <SubText>{sub}</SubText>
        </RiseIn>
        {extra ? <RiseIn delay={15}>{extra}</RiseIn> : null}
      </div>
      <RiseIn delay={8}>{frame}</RiseIn>
    </AbsoluteFill>
    <div style={{ position: "absolute", top: 44, right: 80 }}>
      <Wordmark scale={0.62} />
    </div>
    <UnofficialBadge />
  </Scene>
);

const WeightChips: React.FC = () => {
  const weights: Array<[string, string]> = [
    ["D1", "27%"],
    ["D2", "18%"],
    ["D3", "20%"],
    ["D4", "20%"],
    ["D5", "15%"],
  ];
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {weights.map(([domain, weight]) => (
        <div
          key={domain}
          style={{
            border: `2px solid ${palette.cyanDark}`,
            background: palette.surface,
            padding: "8px 14px",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            boxShadow: "5px 5px 0 rgb(8 126 155 / 13%)",
          }}
        >
          <span
            style={{
              fontFamily: monoFont,
              fontWeight: 700,
              fontSize: 20,
              background: palette.ink,
              color: "#fff",
              padding: "2px 7px",
            }}
          >
            {domain}
          </span>
          <span
            style={{
              fontFamily: displayFont,
              fontWeight: 700,
              fontSize: 34,
              color: palette.cyanDark,
            }}
          >
            {weight}
          </span>
        </div>
      ))}
    </div>
  );
};

const Hook: React.FC = () => (
  <Scene durationInFrames={SCENES.hook.duration}>
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 44 }}
    >
      <RiseIn>
        <div
          style={{
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: 54,
            letterSpacing: "0.03em",
            color: palette.cyanDark,
            borderBottom: `4px solid ${palette.cyanDark}`,
            paddingBottom: 10,
          }}
        >
          Claude Certified Architect – Foundations
        </div>
      </RiseIn>
      <RiseIn delay={8}>
        <Headline size={130}>何から対策する？</Headline>
      </RiseIn>
      <RiseIn delay={20}>
        <div
          style={{
            fontFamily: bodyFont,
            fontWeight: 700,
            fontSize: 38,
            color: palette.inkSoft,
          }}
        >
          非公式の学習アプリ、あります。
        </div>
      </RiseIn>
    </AbsoluteFill>
    <UnofficialBadge />
  </Scene>
);

const Closing: React.FC = () => (
  <Scene durationInFrames={SCENES.closing.duration}>
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 40 }}
    >
      <RiseIn>
        <Wordmark scale={1.5} />
      </RiseIn>
      <RiseIn delay={6}>
        <div
          style={{
            display: "flex",
            gap: 18,
            fontFamily: bodyFont,
            fontWeight: 700,
            fontSize: 40,
            color: palette.ink,
            alignItems: "center",
          }}
        >
          <span>無料</span>
          <span style={{ color: palette.gridStrong }}>/</span>
          <span>登録不要</span>
          <span style={{ color: palette.gridStrong }}>/</span>
          <span>進捗はブラウザ内保存</span>
        </div>
      </RiseIn>
      <RiseIn delay={12}>
        <div
          style={{
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: 96,
            color: palette.cyanDark,
            border: `4px solid ${palette.ink}`,
            background: palette.surface,
            padding: "14px 44px",
            boxShadow: "14px 14px 0 rgb(8 126 155 / 14%)",
            letterSpacing: "0.02em",
          }}
        >
          cca.toshi0607.com
        </div>
      </RiseIn>
      <RiseIn delay={18}>
        <div
          style={{
            fontFamily: bodyFont,
            fontWeight: 400,
            fontSize: 30,
            color: palette.inkSoft,
          }}
        >
          Anthropic非公式・非提携の学習アプリです
        </div>
      </RiseIn>
    </AbsoluteFill>
  </Scene>
);

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: palette.paper }}>
    <Sequence durationInFrames={SCENES.hook.duration}>
      <Hook />
    </Sequence>

    <Sequence from={SCENES.guide.from} durationInFrames={SCENES.guide.duration}>
      <FeatureScene
        duration={SCENES.guide.duration}
        eyebrow="Guide / 5 domains · 30 tasks"
        headline={
          <>
            出題範囲を、
            <br />
            日本語で。
          </>
        }
        sub="公式Exam Guideの5領域・30タスクを独自の短い要約で整理"
        extra={<WeightChips />}
        frame={
          <BrowserFrame src={guideShot} width={1090} height={700} pan={[0, 42]} />
        }
      />
    </Sequence>

    <Sequence from={SCENES.cards.from} durationInFrames={SCENES.cards.duration}>
      <FeatureScene
        duration={SCENES.cards.duration}
        eyebrow="Recall cards / 51"
        headlineSize={72}
        headline={
          <>
            思い出してから、
            <br />
            開く。
          </>
        }
        sub="想起カード51枚。考えてから開示し、3段階の自己評価で復習間隔が決まる"
        frame={
          <BrowserFrame src={practiceShot} width={1090} height={700} pan={[6, 58]} />
        }
      />
    </Sequence>

    <Sequence from={SCENES.quiz.from} durationInFrames={SCENES.quiz.duration}>
      <FeatureScene
        duration={SCENES.quiz.duration}
        eyebrow="Choice practice + scenarios"
        headline={
          <>
            本番形式で、
            <br />
            腕試し。
          </>
        }
        sub="単一・複数選択の演習と、ケース記述を読んで答えるシナリオ演習"
        frame={
          <BrowserFrame
            src={quizShot}
            width={1090}
            height={700}
            pan={[6, 42]}
            overlaySrc={scenarioShot}
            overlayAt={82}
          />
        }
      />
    </Sequence>

    <Sequence from={SCENES.weak.from} durationInFrames={SCENES.weak.duration}>
      <FeatureScene
        duration={SCENES.weak.duration}
        eyebrow="Weak areas"
        headline={
          <>
            苦手を、
            <br />
            見える化。
          </>
        }
        sub="「もう一度」「難しい」と評価したカードを領域別に集計して復習へ"
        frame={
          <BrowserFrame src={weakShot} width={1090} height={700} pan={[24, 66]} />
        }
      />
    </Sequence>

    <Sequence from={SCENES.closing.from} durationInFrames={SCENES.closing.duration}>
      <Closing />
    </Sequence>
  </AbsoluteFill>
);
