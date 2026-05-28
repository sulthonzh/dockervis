/**
 * Terminal UI dashboard using blessed
 */
import blessed from 'blessed';
import chalk from 'chalk';
import { DockerClient } from './docker.js';
import { formatBytes, formatPercent, filterContainers, sortContainers } from './utils.js';
import type { ContainerInfo, DashboardConfig, FilterOptions, ExportOptions, StatsSnapshot } from './types.js';

export async function startDashboard(client: DockerClient, config: DashboardConfig): Promise<void> {
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
  });

  // Header
  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: `{bold}{cyan-fg}dockervis{/cyan-fg}{/bold} - Docker Container Dashboard`,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Container list
  const containerList = blessed.list({
    top: 3,
    left: 0,
    width: '60%',
    height: '100%-3',
    label: 'Containers',
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: 'blue' },
      selected: { bg: 'blue', fg: 'white' },
    },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
  });

  // Details panel
  const detailsPanel = blessed.box({
    top: 3,
    left: '60%',
    width: '40%',
    height: '100%-3',
    label: 'Container Details',
    border: { type: 'line' },
    content: 'Select a container to view details',
    tags: true,
    scrollable: true,
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: 'blue' },
    },
  });

  // Status bar
  const statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: 'q: Quit | r: Refresh | s: Stop | R: Restart | d: Delete',
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
    },
  });

  screen.append(header);
  screen.append(containerList);
  screen.append(detailsPanel);
  screen.append(statusBar);

  let containers: ContainerInfo[] = [];
  let selectedIndex = 0;

  async function updateContainers(): Promise<void> {
    try {
      const allContainers = await client.getContainers();

      // Apply filters
      containers = sortContainers(
        filterContainers(allContainers, {
          state: config.filterState,
          include: config.includeContainers?.join(','),
          exclude: config.excludeContainers?.join(','),
        })
      );

      // Update list
      const items = containers.map((c) => {
        const statusColor = c.state === 'running' ? '{green-fg}' : c.state === 'exited' ? '{red-fg}' : '{yellow-fg}';
        return `${statusColor}${c.name}{/${statusColor === '{green-fg}' ? 'green-fg' : statusColor === '{red-fg}' ? 'red-fg' : 'yellow-fg'}} (${c.state})`;
      });

      containerList.setItems(items);

      // Update details panel
      if (containers.length > 0 && selectedIndex < containers.length) {
        const selected = containers[selectedIndex];
        const details = [
          `{bold}Name:{/bold} ${selected.name}`,
          `{bold}ID:{/bold} ${selected.id}`,
          `{bold}Image:{/bold} ${selected.image}`,
          `{bold}State:{/bold} ${selected.state}`,
          `{bold}Status:{/bold} ${selected.status}`,
          ``,
          `{bold}CPU:{/bold} ${selected.cpuPercent.toFixed(1)}%`,
          `{bold}Memory:{/bold} ${formatBytes(selected.memoryUsage)} / ${formatBytes(selected.memoryLimit)} (${formatPercent(selected.memoryPercent)})`,
          `{bold}Network RX:{/bold} ${formatBytes(selected.networkRx)}`,
          `{bold}Network TX:{/bold} ${formatBytes(selected.networkTx)}`,
        ].join('\n');

        detailsPanel.setContent(details);
      } else if (containers.length === 0) {
        detailsPanel.setContent('No containers found');
      }

      screen.render();
    } catch (error) {
      detailsPanel.setContent(`Error: ${error instanceof Error ? error.message : String(error)}`);
      screen.render();
    }
  }

  // Initial load
  await updateContainers();

  // Auto-refresh
  const refreshInterval = setInterval(() => {
    updateContainers().catch(() => {});
  }, config.refreshInterval);

  // Key bindings
  screen.key(['q', 'C-c'], () => {
    clearInterval(refreshInterval);
    process.exit(0);
  });

  screen.key('r', () => {
    updateContainers();
  });

  screen.key(['up', 'k'], () => {
    if (selectedIndex > 0) {
      selectedIndex--;
      containerList.select(selectedIndex);
      updateContainers();
    }
  });

  screen.key(['down', 'j'], () => {
    if (selectedIndex < containers.length - 1) {
      selectedIndex++;
      containerList.select(selectedIndex);
      updateContainers();
    }
  });

  screen.key('s', async () => {
    if (containers.length > 0 && selectedIndex < containers.length) {
      const selected = containers[selectedIndex];
      if (selected.state === 'running') {
        try {
          await client.stopContainer(selected.id);
          await updateContainers();
        } catch (error) {
          detailsPanel.setContent(`Error stopping container: ${error instanceof Error ? error.message : String(error)}`);
          screen.render();
        }
      }
    }
  });

  screen.key('R', async () => {
    if (containers.length > 0 && selectedIndex < containers.length) {
      const selected = containers[selectedIndex];
      try {
        await client.restartContainer(selected.id);
        await updateContainers();
      } catch (error) {
        detailsPanel.setContent(`Error restarting container: ${error instanceof Error ? error.message : String(error)}`);
        screen.render();
      }
    }
  });

  screen.key('d', async () => {
    if (containers.length > 0 && selectedIndex < containers.length) {
      const selected = containers[selectedIndex];
      if (selected.state === 'exited') {
        try {
          await client.removeContainer(selected.id, true);
          selectedIndex = Math.min(selectedIndex, containers.length - 2);
          await updateContainers();
        } catch (error) {
          detailsPanel.setContent(`Error removing container: ${error instanceof Error ? error.message : String(error)}`);
          screen.render();
        }
      }
    }
  });

  // Container list selection
  containerList.on('select', (item: blessed.Widgets.ListElement) => {
    // Find which item was selected by comparing with our container list
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      const itemText = `${c.name} ${c.state === 'running' ? chalk.green('●') : chalk.gray('○')} ${c.image}`;
      if (item.getText && item.getText() === itemText) {
        selectedIndex = i;
        updateContainers();
        break;
      }
    }
  });

  screen.render();
}

export async function exportMetrics(
  client: DockerClient,
  filterOptions: FilterOptions,
  exportOptions: ExportOptions
): Promise<void> {
  const containers = await client.getContainers();
  const filtered = filterContainers(containers, filterOptions);

  const snapshot: StatsSnapshot = {
    timestamp: Date.now(),
    containers: filtered,
  };

  if (exportOptions.format === 'json') {
    const fs = await import('fs/promises');
    await fs.writeFile(exportOptions.outputFile, JSON.stringify(snapshot, null, 2));
  } else if (exportOptions.format === 'csv') {
    const fs = await import('fs/promises');
    const headers = 'name,id,image,state,status,cpuPercent,memoryUsage,memoryLimit,memoryPercent,networkRx,networkTx\n';
    const rows = filtered
      .map(
        (c) =>
          `${c.name},${c.id},${c.image},${c.state},${c.status},${c.cpuPercent},${c.memoryUsage},${c.memoryLimit},${c.memoryPercent},${c.networkRx},${c.networkTx}`
      )
      .join('\n');
    await fs.writeFile(exportOptions.outputFile, headers + rows);
  }
}