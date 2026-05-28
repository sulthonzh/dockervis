import { Config } from './config';
import { DockerClient } from './docker';
import type { ContainerInfo } from './types';

export class DockerManager extends DockerClient {
  private config: Config;
  private containers: ContainerInfo[] = [];

  constructor(config: Config) {
    super({
      socketPath: config.getDockerSocketPath()
    });
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await this.docker.ping();
      this.logger.info('Connected to Docker daemon');
    } catch (error) {
      this.logger.error('Failed to connect to Docker daemon:', error);
      throw new Error('Unable to connect to Docker daemon. Please ensure Docker is running.');
    }
  }

  async getContainers(filters: { status?: string[]; include?: string[] } = {}): Promise<ContainerInfo[]> {
    try {
      const containers = await super.getContainers();
      
      // Apply status filters if specified
      let filteredContainers = containers;
      if (filters.status && filters.status.length > 0) {
        filteredContainers = containers.filter(container => 
          filters.status!.includes(container.state)
        );
      }

      return filteredContainers;
    } catch (error) {
      this.logger.error('Failed to get containers:', error);
      return [];
    }
  }
}