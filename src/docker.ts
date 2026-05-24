/**
 * Docker API wrapper for container operations
 */
import Docker from 'dockerode';
import type { ContainerInfo, DockerOptions } from './types.js';

export class DockerClient {
  private docker: Docker;

  constructor(options: DockerOptions = {}) {
    this.docker = new Docker(options);
  }

  async getContainers(): Promise<ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });

      const containerInfoPromises = containers.map(async (container) => {
        const stats = await this.getStats(container.Id);
        return {
          id: container.Id.substring(0, 12),
          name: container.Names[0]?.replace(/^\//, '') || 'unknown',
          image: container.Image,
          state: container.State,
          status: container.Status,
          created: container.Created,
          ...stats,
        };
      });

      return await Promise.all(containerInfoPromises);
    } catch (error) {
      throw new Error(`Failed to get containers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getStats(containerId: string): Promise<{
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    networkRx: number;
    networkTx: number;
  }> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

      // Calculate memory usage
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      // Calculate network stats
      let networkRx = 0;
      let networkTx = 0;

      if (stats.networks) {
        Object.values(stats.networks).forEach((network: any) => {
          networkRx += network.rx_bytes || 0;
          networkTx += network.tx_bytes || 0;
        });
      }

      return {
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsage,
        memoryLimit,
        memoryPercent: Math.round(memoryPercent * 100) / 100,
        networkRx,
        networkTx,
      };
    } catch (error) {
      // Return default stats if we can't get them
      return {
        cpuPercent: 0,
        memoryUsage: 0,
        memoryLimit: 0,
        memoryPercent: 0,
        networkRx: 0,
        networkTx: 0,
      };
    }
  }

  async inspectContainer(containerId: string): Promise<any> {
    try {
      const container = this.docker.getContainer(containerId);
      return await container.inspect();
    } catch (error) {
      throw new Error(`Failed to inspect container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
      return logs.toString('utf-8');
    } catch (error) {
      throw new Error(`Failed to get logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
    } catch (error) {
      throw new Error(`Failed to stop container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async restartContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.restart();
    } catch (error) {
      throw new Error(`Failed to restart container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force, v: true });
    } catch (error) {
      throw new Error(`Failed to remove container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }
}