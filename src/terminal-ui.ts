import { DockerManager } from './docker-manager';
import { Config } from './config';
import { startDashboard } from './dashboard';
import { Logger } from './logger';

export class TerminalUI {
  private dockerManager: DockerManager;
  private config: Config;
  private logger: Logger;

  constructor(dockerManager: DockerManager, config: Config) {
    this.dockerManager = dockerManager;
    this.config = config;
    this.logger = new Logger();
  }

  async start(): Promise<void> {
    this.logger.info('Starting terminal UI...');
    
    try {
      await startDashboard(this.dockerManager, {
        refreshInterval: this.config.getRefreshInterval(),
        sortBy: this.config.getSortBy(),
        showGraphs: true,
        compactMode: false,
      });
    } catch (error) {
      this.logger.error('Failed to start terminal UI:', error);
      throw error;
    }
  }
}