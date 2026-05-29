# dockervis

A modern TypeScript terminal dashboard for Docker containers with real-time monitoring and management.

## Features

- **Real-time monitoring** - Live container stats with CPU, memory, and network usage
- **Interactive filtering** - Filter by state, name, or custom criteria
- **Keyboard shortcuts** - Quick actions for common operations (stop, restart, delete)
- **Resource visualization** - ASCII art graphs and progress bars
- **Export capabilities** - Export metrics to JSON or CSV for analysis
- **Auto-detection** - Automatically detects Docker socket location
- **Lightweight** - Monitoring-focused, unlike feature-heavy alternatives

## Installation

```bash
npm install -g dockervis
```

## Usage

### Basic usage
```bash
dockervis
```

### Filter by container state
```bash
dockervis --filter running
```

### Monitor specific containers
```bash
dockervis --include app,db,web
```

### Exclude specific containers
```bash
dockervis --exclude redis,nginx
```

### Set refresh interval
```bash
dockervis --interval 5000
```

### Auto-detect Docker socket
```bash
dockervis --detect
```

### Export metrics to JSON
```bash
dockervis --export metrics.json
```

### Export metrics to CSV
```bash
dockervis --export metrics.csv --export-format csv
```

### Compact mode
```bash
dockervis --compact
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `q` | Quit |
| `r` | Refresh |
| `↑` / `k` | Move up |
| `↓` / `j` | Move down |
| `s` | Stop selected container |
| `R` | Restart selected container |
| `d` | Delete selected container (exited only) |
| `l` | View container logs |
| `t` | Toggle system information |
| `i` | Toggle containers/images view |
| `p` | Pull selected image (images view only) |

## Configuration

dockervis respects the following environment variables:

```bash
# Docker socket location
DOCKER_HOST=unix:///var/run/docker.sock

# Docker API version
DOCKER_API_VERSION=auto

# Default refresh interval (ms)
REFRESH_INTERVAL=2000
```

## Docker Socket Permissions

Ensure your user has permission to access the Docker socket:

```bash
sudo usermod -aG docker $USER
```

Then log out and back in for the changes to take effect.

## Example Output

```
┌─────────────────────────────────────────────────────────────┐
│ dockervis - Docker Container Dashboard                        │
├─────────────────────────────────────────────────────────────┤
│ Containers                                          Details  │
│                                                            │
│ ● app (running)           Name: app                        │
│ ● db (running)            ID: abc123def456                 │
│ ○ web (exited)            Image: node:18-alpine           │
│ ● redis (running)         State: running                   │
│                           Status: Up 2 days                │
│                           CPU: 1.2%                        │
│                           Memory: 256 MB / 512 MB (50.0%)   │
│                           Network RX: 1.2 GB               │
│                           Network TX: 512 MB               │
│                                                            │
└─────────────────────────────────────────────────────────────┘
q: Quit | r: Refresh | s: Stop | R: Restart | d: Delete
```

## Features

### Core Features
- **Real-time monitoring** - Live container stats with CPU, memory, and network usage
- **Interactive filtering** - Filter by state, name, or custom criteria
- **Keyboard shortcuts** - Quick actions for common operations (stop, restart, delete)
- **Resource visualization** - ASCII art graphs and progress bars
- **Export capabilities** - Export metrics to JSON or CSV for analysis
- **Auto-detection** - Automatically detects Docker socket location
- **Lightweight** - Monitoring-focused, unlike feature-heavy alternatives

### Advanced Features
- **Container logs viewer** - View real-time container logs with timestamps
- **System monitoring** - View overall system resource usage (CPU, memory, network)
- **Image management** - List, pull, and remove Docker images
- **Dual view modes** - Switch between containers and images views

## Comparison with Alternatives

| Tool | Language | Focus | TypeScript |
|------|----------|-------|-----------|
| dockervis | TypeScript | Monitoring + Management | ✅ Yes |
| ctop | Go | Monitoring only | ❌ No |
| lazydocker | Go | Full management | ❌ No |
| docui | Rust | Creation/management | ❌ No |

dockervis provides a focused, monitoring and management alternative that's easier to install and maintain for TypeScript developers.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Sulthon

## Acknowledgments

- [dockerode](https://github.com/apocas/dockerode) - Docker API client for Node.js
- [blessed](https://github.com/chjj/blessed) - Terminal interface library
- [lazydocker](https://github.com/jesseduffield/lazydocker) - Inspiration for the terminal UI approach