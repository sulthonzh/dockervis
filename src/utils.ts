/**
 * Utilities for formatting and filtering
 */
import type { ContainerInfo, FilterOptions } from './types.js';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function filterContainers(containers: ContainerInfo[], options: FilterOptions): ContainerInfo[] {
  let filtered = [...containers];

  if (options.state) {
    const stateLower = options.state.toLowerCase();
    filtered = filtered.filter((c) => c.state.toLowerCase().includes(stateLower));
  }

  if (options.include) {
    const includes = options.include.split(',').map((s) => s.trim().toLowerCase());
    filtered = filtered.filter((c) => includes.some((inc) => c.name.toLowerCase().includes(inc)));
  }

  if (options.exclude) {
    const excludes = options.exclude.split(',').map((s) => s.trim().toLowerCase());
    filtered = filtered.filter((c) => !excludes.some((exc) => c.name.toLowerCase().includes(exc)));
  }

  return filtered;
}

export function sortContainers(containers: ContainerInfo[]): ContainerInfo[] {
  // Sort by state (running first), then by name
  return [...containers].sort((a, b) => {
    const aRunning = a.state === 'running' ? 0 : 1;
    const bRunning = b.state === 'running' ? 0 : 1;

    if (aRunning !== bRunning) return aRunning - bRunning;
    return a.name.localeCompare(b.name);
  });
}

export function drawProgressBar(percent: number, width: number = 20): string {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clampedPercent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

export function formatContainerRow(container: ContainerInfo, index: number): string {
  const statusSymbol = container.state === 'running' ? '●' : container.state === 'exited' ? '○' : '◐';

  return `${index.toString().padStart(2, ' ')} ${statusSymbol} ${container.name.padEnd(20)} ${container.image.substring(0, 20).padEnd(20)} ${container.state.padEnd(10)}`;
}