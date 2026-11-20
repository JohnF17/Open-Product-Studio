import React from 'react';
import { AbsoluteFill, Composition, Easing, interpolate, registerRoot, useCurrentFrame } from 'remotion';

const steps = [
  { number: '01', title: 'Record', description: 'Capture the workflow.' },
  { number: '02', title: 'Choose', description: 'Mark the useful moment.' },
  { number: '03', title: 'Review', description: 'Check captions and framing.' },
];

function SequenceCard() {
  const frame = useCurrentFrame();
  const active = Math.min(2, Math.floor(frame / 30));
  return (
    <AbsoluteFill style={{ background: '#f7f1e7', color: '#292635', fontFamily: 'system-ui, sans-serif', padding: '60px 64px' }}>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 2.1, textTransform: 'uppercase', color: '#735182' }}>Open Product Studio</div>
      <div style={{ marginTop: 12, fontSize: 55, fontWeight: 720, letterSpacing: -2.8 }}>A shorter cut.</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 48 }}>
        {steps.map(({ number, title, description }, index) => {
          const lift = interpolate(frame, [index * 12, index * 12 + 16], [20, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
          });
          const isActive = index === active;
          return (
            <section key={title} style={{ flex: 1, border: `1px solid ${isActive ? '#4e326c' : '#d7cadb'}`, borderRadius: 13,
              minHeight: 174, background: isActive ? '#4e326c' : '#fffaf4', color: isActive ? '#fffaf4' : '#292635',
              padding: '17px 20px', transform: `translateY(${lift}px)` }}>
              <div style={{ fontSize: 16, fontWeight: 650 }}>{number}</div>
              <div style={{ marginTop: 17, fontSize: 31, fontWeight: 700, letterSpacing: -0.7 }}>{title}</div>
              <div style={{ marginTop: 5, fontSize: 17 }}>{description}</div>
            </section>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Root() {
  return <Composition id="StudioSequence" component={SequenceCard} fps={30} width={960} height={540} durationInFrames={90} />;
}

registerRoot(Root);
