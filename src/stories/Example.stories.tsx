import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta: Meta = {
  title: 'Example/Hello',
};

export default meta;

type Story = StoryObj;

export const Hello: Story = {
  render: () => <div>Hello Storybook</div>,
};
