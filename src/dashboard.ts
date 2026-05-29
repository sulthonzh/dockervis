/**
 * Terminal UI dashboard using blessed
 */
import blessed from 'blessed';
import chalk from 'chalk';
import { DockerClient } from './docker.js';
import { formatBytes, formatPercent, filterContainers, sortContainers } from './utils.js';
import type { ContainerInfo, DashboardConfig, FilterOptions, ExportOptions, StatsSnapshot, SystemInfo, ImageInfo } from './types.js';

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
    content: 'q: Quit | r: Refresh | s: Stop | R: Restart | d: Delete | l: Logs | t: System | i: Images',
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
  let showSystemInfo = false;
  let systemInfo: SystemInfo | null = null;
  let showImages = false;
  let images: ImageInfo[] = [];

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

  async function updateImages(): Promise<void> {
    try {
      images = await client.getImages();

      // Update list
      const items = images.map((img) => {
        const sizeColor = img.size > 100000000 ? '{red-fg}' : img.size > 50000000 ? '{yellow-fg}' : '{green-fg}';
        return `${sizeColor}${img.repository}:{/}${sizeColor === '{red-fg}' ? 'red-fg' : sizeColor === '{yellow-fg}' ? 'yellow-fg' : 'green-fg'}${img.tag}{/${sizeColor === '{red-fg}' ? 'red-fg' : sizeColor === '{yellow-fg}' ? 'yellow-fg' : 'green-fg'}} (${formatBytes(img.size)})`;
      });

      containerList.setItems(items);

      // Update details panel
      if (images.length > 0 && selectedIndex < images.length) {
        const selected = images[selectedIndex];
        const details = [
          `{bold}Repository:{/bold} ${selected.repository}`,
          `{bold}Tag:{/bold} ${selected.tag}`,
          `{bold}ID:{/bold} ${selected.id}`,
          `{bold}Size:{/bold} ${formatBytes(selected.size)}`,
          `{bold}Virtual Size:{/bold} ${formatBytes(selected.virtualSize)}`,
          `{bold}Created:{/bold} ${new Date(selected.created * 1000).toLocaleString()}`,
        ].join('\n');

        detailsPanel.setContent(details);
      } else if (images.length === 0) {
        detailsPanel.setContent('No images found');
      }

      screen.render();
    } catch (error) {
      detailsPanel.setContent(`Error: ${error instanceof Error ? error.message : String(error)}`);
      screen.render();
    }
  }

  // Initial load
  await updateContainers();
  
  async function updateSystemInfo(): Promise<void> {
    try {
      systemInfo = await client.getSystemInfo();
      
      const details = [
        `{bold}System Information{/bold}`,
        ``,
        `{bold}CPU:{/bold}`,
        `  Usage: ${formatPercent(systemInfo.cpu.usage)}`,
        `  Cores: ${systemInfo.cpu.cores}`,
        ``,
        `{bold}Memory:{/bold}`,
        `  Total: ${formatBytes(systemInfo.memory.total)}`,
        `  Used: ${formatBytes(systemInfo.memory.used)} (${formatPercent(systemInfo.memory.percent)})`,
        `  Available: ${formatBytes(systemInfo.memory.available)}`,
        ``,
        `{bold}Network:{/bold}`,
        `  RX: ${formatBytes(systemInfo.network.rx)}`,
        `  TX: ${formatBytes(systemInfo.network.tx)}`,
      ].join('\n');
      
      detailsPanel.setContent(details);
      screen.render();
    } catch (error) {
      detailsPanel.setContent(`Error getting system info: ${error instanceof Error ? error.message : String(error)}`);
      screen.render();
    }
  }

  // Auto-refresh
  const refreshInterval = setInterval(async () => {
    await updateContainers();
    if (showSystemInfo) {
      await updateSystemInfo();
    }
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
    if (showImages && images.length > 0 && selectedIndex < images.length) {
      const selected = images[selectedIndex];
      try {
        await client.removeImage(selected.id);
        selectedIndex = Math.min(selectedIndex, images.length - 2);
        await updateImages();
      } catch (error) {
        detailsPanel.setContent(`Error removing image: ${error instanceof Error ? error.message : String(error)}`);
        screen.render();
      }
    } else if (!showImages && containers.length > 0 && selectedIndex < containers.length) {
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

  screen.key('l', async () => {
    if (containers.length > 0 && selectedIndex < containers.length) {
      const selected = containers[selectedIndex];
      try {
        const logs = await client.getContainerLogs(selected.id, { tail: 50, timestamps: true });
        
        const logContent = logs.map(log => {
          const prefix = log.timestamp ? `[${log.timestamp}] ` : '';
          const color = log.stream === 'stdout' ? '{green-fg}' : '{red-fg}';
          return `${color}${prefix}${log.content}{/${color === '{green-fg}' ? 'green-fg' : 'red-fg'}}`;
        }).join('\n');
        
        detailsPanel.setContent(`{bold}Logs for ${selected.name}:{/bold}\n\n${logContent}`);
        screen.render();
      } catch (error) {
        detailsPanel.setContent(`Error getting logs: ${error instanceof Error ? error.message : String(error)}`);
        screen.render();
      }
    }
  });

  screen.key('t', async () => {
    if (!showImages) {
      try {
        showSystemInfo = !showSystemInfo;
        
        if (showSystemInfo) {
          await updateSystemInfo();
        } else {
          // Show container details again
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
          }
        }
        
        screen.render();
      } catch (error) {
        detailsPanel.setContent(`Error updating system info: ${error instanceof Error ? error.message : String(error)}`);
        screen.render();
      }
    }
  });

  screen.key('i', async () => {
    try {
      showImages = !showImages;
      showSystemInfo = false;
      
      if (showImages) {
        await updateImages();
      } else {
        await updateContainers();
      }
      
      // Update status bar
      statusBar.setContent(showImages ? 'q: Quit | r: Refresh | d: Delete | p: Pull | i: Containers' : 'q: Quit | r: Refresh | s: Stop | R: Restart | d: Delete | l: Logs | t: System | i: Images');
      screen.render();
    } catch (error) {
      detailsPanel.setContent(`Error switching to images view: ${error instanceof Error ? error.message : String(error)}`);
      screen.render();
    }
  });

  screen.key('p', async () => {
    if (showImages && images.length > 0 && selectedIndex < images.length) {
      const selected = images[selectedIndex];
      try {
        await client.pullImage(`${selected.repository}:${selected.tag}`);
        await updateImages();
      } catch (error) {
        detailsPanel.setContent(`Error pulling image: ${error instanceof Error ? error.message : String(error)}`);
        screen.render();
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