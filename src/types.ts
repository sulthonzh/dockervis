/**
 * Core type definitions for dockervis
 */
export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: number;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
}

export interface DockerOptions {
  socketPath?: string;
  host?: string;
  port?: number;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface DashboardConfig {
  refreshInterval: number;
  sortBy?: string;
  filterState?: string;
  includeContainers?: string[];
  excludeContainers?: string[];
  showGraphs: boolean;
  compactMode: boolean;
}

export interface FilterOptions {
  state?: string;
  include?: string;
  exclude?: string;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  outputFile: string;
}

export interface StatsSnapshot {
  timestamp: number;
  containers: ContainerInfo[];
}

export interface LogOptions {
  tail?: number;
  timestamps?: boolean;
  since?: number;
  until?: number;
  follow?: boolean;
}

export interface LogEntry {
  timestamp?: string;
  stream: 'stdout' | 'stderr';
  content: string;
}

export interface SystemInfo {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

export interface ImageInfo {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: number;
  virtualSize: number;
}