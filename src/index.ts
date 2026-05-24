#!/usr/bin/env node

/**
 * Main CLI entry point for dockervis
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { DockerClient } from './docker.js';
import { startDashboard, exportMetrics } from './dashboard.js';
import type { FilterOptions, ExportOptions } from './types.js';

const program = new Command();

program
  .name('dockervis')
  .description('A modern terminal dashboard for Docker containers')
  .version('1.0.0');

program
  .option('--detect', 'Auto-detect Docker socket location')
  .option('--filter <state>', 'Filter containers by state (running, exited, etc.)')
  .option('--include <names>', 'Include only specific containers (comma-separated)')
  .option('--exclude <names>', 'Exclude specific containers (comma-separated)')
  .option('--interval <ms>', 'Refresh interval in milliseconds', '2000')
  .option('--compact', 'Compact mode with minimal output')
  .option('--export <file>', 'Export metrics to file (JSON/CSV)')
  .option('--export-format <format>', 'Export format: json or csv', 'json')
  .action(async (options) => {
    const spinner = ora('Connecting to Docker...').start();

    try {
      const dockerOptions: any = {};

      if (options.detect) {
        // Auto-detect Docker socket
        const possiblePaths = [
          '/var/run/docker.sock',
          '/run/docker.sock',
          process.env.DOCKER_HOST?.replace('unix://', ''),
        ];

        for (const path of possiblePaths) {
          if (path) {
            dockerOptions.socketPath = path;
            break;
          }
        }
      } else if (process.env.DOCKER_HOST) {
        if (process.env.DOCKER_HOST.startsWith('unix://')) {
          dockerOptions.socketPath = process.env.DOCKER_HOST.replace('unix://', '');
        } else {
          dockerOptions.host = process.env.DOCKER_HOST;
        }
      }

      const client = new DockerClient(dockerOptions);
      const connected = await client.testConnection();

      if (!connected) {
        spinner.fail('Failed to connect to Docker daemon');
        process.exit(1);
      }

      spinner.succeed('Connected to Docker daemon');

      const filterOptions: FilterOptions = {
        state: options.filter,
        include: options.include,
        exclude: options.exclude,
      };

      const config = {
        refreshInterval: parseInt(options.interval, 10),
        filterState: options.filter,
        includeContainers: options.include ? options.include.split(',').map((s: string) => s.trim()) : undefined,
        excludeContainers: options.exclude ? options.exclude.split(',').map((s: string) => s.trim()) : undefined,
        showGraphs: !options.compact,
        compactMode: options.compact || false,
      };

      if (options.export) {
        const exportOptions: ExportOptions = {
          format: options.exportFormat as 'json' | 'csv',
          outputFile: options.export,
        };
        await exportMetrics(client, filterOptions, exportOptions);
        console.log(chalk.green(`Metrics exported to ${options.export}`));
      } else {
        await startDashboard(client, config);
      }
    } catch (error) {
      spinner.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);