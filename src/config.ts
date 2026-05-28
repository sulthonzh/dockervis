export class Config {
  private refreshInterval = 2000; // 2 seconds
  private sortBy = 'name'; // Default sort by name
  private dockerSocketPath = '/var/run/docker.sock';
  private dockerApiVersion = '1.41';

  getRefreshInterval(): number {
    return this.refreshInterval;
  }

  getSortBy(): string {
    return this.sortBy;
  }

  setRefreshInterval(interval: number): void {
    this.refreshInterval = interval;
  }

  setSortBy(sortBy: string): void {
    this.sortBy = sortBy;
  }

  getDockerSocketPath(): string {
    return this.dockerSocketPath;
  }

  getDockerApiVersion(): string {
    return this.dockerApiVersion;
  }

  setDockerSocketPath(path: string): void {
    this.dockerSocketPath = path;
  }

  setDockerApiVersion(version: string): void {
    this.dockerApiVersion = version;
  }
}