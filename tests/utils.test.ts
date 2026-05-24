import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatBytes, formatPercent, drawProgressBar } from '../src/utils.js';

describe('formatBytes', () => {
  it('formats 0 bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes with 2 decimal places', () => {
    expect(formatBytes(512)).toBe('512.00 B');
  });

  it('formats kilobytes with 2 decimal places', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1536)).toBe('1.50 KB');
  });

  it('formats megabytes with 2 decimal places', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1572864)).toBe('1.50 MB');
  });

  it('formats gigabytes with 2 decimal places', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB');
    expect(formatBytes(1610612736)).toBe('1.50 GB');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatBytes(1234567)).toBe('1.18 MB');
  });
});

describe('formatPercent', () => {
  it('formats 0% with 1 decimal place', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 50% with 1 decimal place', () => {
    expect(formatPercent(50)).toBe('50.0%');
  });

  it('formats 100% with 1 decimal place', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });

  it('handles partial percents with 1 decimal place', () => {
    expect(formatPercent(33)).toBe('33.0%');
    expect(formatPercent(67)).toBe('67.0%');
  });

  it('handles negative values', () => {
    expect(formatPercent(-5)).toBe('-5.0%');
  });

  it('handles values exceeding 100%', () => {
    expect(formatPercent(150)).toBe('150.0%');
  });
});

describe('drawProgressBar', () => {
  it('draws empty bar for 0%', () => {
    const bar = drawProgressBar(0, 10);
    expect(bar).toBe('[░░░░░░░░░░]');
  });

  it('draws full bar for 100%', () => {
    const bar = drawProgressBar(100, 10);
    expect(bar).toBe('[██████████]');
  });

  it('draws partial bar for 50%', () => {
    const bar = drawProgressBar(50, 10);
    expect(bar).toBe('[█████░░░░░]');
  });

  it('handles custom width', () => {
    const bar = drawProgressBar(50, 20);
    expect(bar).toHaveLength(22); // width + 2 for brackets
  });

  it('handles values exceeding 100%', () => {
    const bar = drawProgressBar(150, 10);
    expect(bar).toBe('[██████████]');
  });

  it('handles negative values gracefully', () => {
    const bar = drawProgressBar(-10, 10);
    expect(bar).toBe('[░░░░░░░░░░]');
  });
});