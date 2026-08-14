import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActivityHeatmap } from '../ActivityHeatmap';

describe('ActivityHeatmap', () => {
  it('renders without crashing', () => {
    const { container } = render(<ActivityHeatmap data={[]} days={90} />);
    expect(container).toBeDefined();
  });
});
