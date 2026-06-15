#!/usr/bin/env node

import { DockerManager } from './docker-manager';
import { TerminalUI } from './terminal-ui';
import { Config } from './config';
import { Logger } from './logger';

async function main() {
  const logger = new Logger();
  const config = new Config();
  const dockerManager = new DockerManager(config);
  const terminalUI = new TerminalUI(dockerManager, config);

  try {
    logger.info('Starting dockervis...');
    
    await dockerManager.initialize();
    
    await terminalUI.start();
    
  } catch (error) {
    logger.error('Failed to start dockervis:', error);
    process.exit(1);
  }
}

main();