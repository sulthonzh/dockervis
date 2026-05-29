/**
 * Docker API wrapper for container operations
 */
import Docker from 'dockerode';
import { Logger } from './logger';
import type { ContainerInfo, DockerOptions, SystemInfo, ImageInfo, LogEntry } from './types.js';

export class DockerClient {
  protected docker: Docker;
  protected logger: Logger;

  constructor(options: DockerOptions = {}) {
    this.logger = new Logger();
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
        Object.values(stats.networks).forEach((network: { rx_bytes: number; tx_bytes: number }) => {
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
      this.logger.error('Failed to get container stats:', error);
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

  async inspectContainer(containerId: string): Promise<{ State: { Status: string }; Name: string; Image: string; Id: string }> {
    try {
      const container = this.docker.getContainer(containerId);
      return await container.inspect();
    } catch (error) {
      throw new Error(`Failed to inspect container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getContainerLogs(containerId: string, options: { tail?: number; timestamps?: boolean; since?: number; until?: number; follow?: boolean } = {}): Promise<LogEntry[]> {
    try {
      const container = this.docker.getContainer(containerId);
      const logsOptions: {
        stdout: boolean;
        stderr: boolean;
        tail?: number;
        timestamps?: boolean;
        since?: number;
        until?: number;
      } = {
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: options.timestamps || false,
      };
      
      if (options.since) logsOptions.since = options.since;
      if (options.until) logsOptions.until = options.until;
      
      // For follow mode, we can't get logs this way, so return empty array
      if (options.follow) {
        return [];
      }
      
      const logs = await container.logs(logsOptions);
      
      // For non-follow mode, logs should be a Buffer
      const logText = Buffer.isBuffer(logs) ? logs.toString('utf-8') : '';
      const lines = logText.split('\n').filter((line: string) => line.trim() !== '');
      
      return lines.map((line: string) => {
        if (options.timestamps && line.includes(' ')) {
          const spaceIndex = line.indexOf(' ');
          const timestamp = line.substring(0, spaceIndex);
          const content = line.substring(spaceIndex + 1);
          return {
            timestamp,
            stream: content.startsWith('\x1b[32m') ? 'stdout' : 'stderr',
            content: content.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
          };
        } else {
          return {
            stream: line.startsWith('\x1b[32m') ? 'stdout' : 'stderr',
            content: line.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
          };
        }
      });
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

  async getImages(): Promise<ImageInfo[]> {
    try {
      const images = await this.docker.listImages();
      
      return images.map(image => ({
        id: image.Id.substring(0, 12),
        repository: image.RepoTags?.[0]?.split(':')[0] || '<none>',
        tag: image.RepoTags?.[0]?.split(':')[1] || '<none>',
        size: image.Size,
        created: image.Created,
        virtualSize: image.VirtualSize
      }));
    } catch (error) {
      this.logger.error('Failed to get images:', error);
      throw new Error(`Failed to get images: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async removeImage(imageId: string): Promise<void> {
    try {
      await this.docker.getImage(imageId).remove();
    } catch (error) {
      throw new Error(`Failed to remove image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async pullImage(imageName: string): Promise<void> {
    try {
      const stream = await this.docker.pull(imageName);
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    } catch (error) {
      throw new Error(`Failed to pull image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      // Get container stats to calculate system resource usage
      const containers = await this.docker.listContainers({ all: true });
      
      // Initialize totals
      let totalCpuUsage = 0;
      let networkRx = 0;
      let networkTx = 0;
      
      // Get stats for each container
      for (const container of containers) {
        try {
          const containerObj = this.docker.getContainer(container.Id);
          const stats = await containerObj.stats({ stream: false });
          
          // Calculate CPU usage
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
          const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
          const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;
          totalCpuUsage += cpuPercent;
          
          // Calculate memory usage (not used in current implementation)
          
          // Calculate network stats
          if (stats.networks) {
            Object.values(stats.networks).forEach((network: { rx_bytes: number; tx_bytes: number }) => {
              networkRx += network.rx_bytes || 0;
              networkTx += network.tx_bytes || 0;
            });
          }
        } catch (error) {
          // Skip containers that can't be accessed
          this.logger.debug(`Failed to get stats for container ${container.Id}:`, error);
        }
      }
      
      // Get system info from OS
      const os = await import('os');
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      return {
        cpu: {
          usage: Math.round(totalCpuUsage),
          cores: os.cpus().length
        },
        memory: {
          total: totalMemory,
          used: usedMemory,
          available: freeMemory,
          percent: Math.round((usedMemory / totalMemory) * 100)
        },
        network: {
          rx: networkRx || 0,
          tx: networkTx || 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to get system info:', error);
      throw new Error(`Failed to get system info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}