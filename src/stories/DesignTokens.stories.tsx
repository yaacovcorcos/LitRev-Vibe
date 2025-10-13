import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { tokens } from '@/lib/design-system/tokens';

const meta: Meta = {
  title: 'Design/Tokens',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

const ColorSwatch: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <div
      style={{
        width: '3rem',
        height: '3rem',
        borderRadius: '0.5rem',
        backgroundColor: value,
        border: '1px solid #e5e7eb',
      }}
    />
    <div>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <code>{value}</code>
    </div>
  </div>
);

export const Palette: Story = {
  render: () => (
    <div
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '1.5rem',
        background: '#f9fafb',
      }}
    >
      <section>
        <h2>Brand · Indigo</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {Object.entries(tokens.colors.brand.indigo).map(([shade, value]) => (
            <ColorSwatch key={shade} label={`Indigo ${shade}`} value={value} />
          ))}
        </div>
      </section>
      <section>
        <h2>Brand · Teal</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {Object.entries(tokens.colors.brand.teal).map(([shade, value]) => (
            <ColorSwatch key={shade} label={`Teal ${shade}`} value={value} />
          ))}
        </div>
      </section>
      <section>
        <h2>Neutrals</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {Object.entries(tokens.colors.neutral).map(([shade, value]) => (
            <ColorSwatch key={shade} label={`Neutral ${shade}`} value={value} />
          ))}
        </div>
      </section>
    </div>
  ),
};

export const TypographyScale: Story = {
  render: () => (
    <div style={{ padding: '2rem', display: 'grid', gap: '1rem' }}>
      <h1 style={{ fontSize: tokens.typography.fontSize.h1, lineHeight: tokens.typography.lineHeight.tight }}>
        Heading 1 ({tokens.typography.fontSize.h1})
      </h1>
      <h2 style={{ fontSize: tokens.typography.fontSize.h2, lineHeight: tokens.typography.lineHeight.tight }}>
        Heading 2 ({tokens.typography.fontSize.h2})
      </h2>
      <h3 style={{ fontSize: tokens.typography.fontSize.h3, lineHeight: tokens.typography.lineHeight.normal }}>
        Heading 3 ({tokens.typography.fontSize.h3})
      </h3>
      <p style={{ fontSize: tokens.typography.fontSize.body, lineHeight: tokens.typography.lineHeight.relaxed }}>
        Body text ({tokens.typography.fontSize.body}) · Line height {tokens.typography.lineHeight.relaxed}
      </p>
      <p style={{ fontSize: tokens.typography.fontSize.small }}>
        Small text ({tokens.typography.fontSize.small})
      </p>
      <p style={{ fontSize: tokens.typography.fontSize.tiny }}>
        Tiny text ({tokens.typography.fontSize.tiny})
      </p>
    </div>
  ),
};
