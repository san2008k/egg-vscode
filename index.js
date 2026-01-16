/**
 * 基础设施启动脚本 (Infrastructure Layer) - v2.1 修正版
 * 融合了 forceBash 功能与旧版稳定的管道启动机制
 */
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// === 基础配置 ===
const CONFIG = {
    tunnelName: process.env.TUNNEL_NAME || 'my-vscode-dev',
    paths: {
        home: '/home/container',
        bin: '/home/container/.bin',
        codespaces: '/home/container/codespaces',
        // 统一数据存储目录，用于存放 Server 数据和 CLI 认证数据
        vscodeData: '/home/container/.vscode-server-data'
    }
};

function log(msg) { 
    // 简单的带时间戳日志
    console.log(`[SYS] [${new Date().toLocaleTimeString()}] ➤ ${msg}`); 
}

// 1. 初始化目录
function init() {
    [CONFIG.paths.bin, CONFIG.paths.codespaces, CONFIG.paths.vscodeData, path.join(CONFIG.paths.codespaces, '.vscode')].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

// 2. 强制使用 Bash (保留你的功能)
function forceBash() {
    const settingsPath = path.join(CONFIG.paths.codespaces, '.vscode', 'settings.json');
    const settings = {
        "terminal.integrated.defaultProfile.linux": "bash",
        "terminal.integrated.profiles.linux": {
            "bash": { "path": "/bin/bash", "icon": "terminal-bash" }
        },
        "files.exclude": { "**/.git": true, "**/.DS_Store": true }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
}

// 3. 注入基础终端美化 (保留你的功能)
function setupBashrc() {
    const bashrcPath = path.join(CONFIG.paths.home, '.bashrc');
    let content = fs.existsSync(bashrcPath) ? fs.readFileSync(bashrcPath, 'utf8') : '';
    
    const promptConfig = `
# --- Base Terminal Config (Managed by index.js) ---
export PS1='\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '
export PATH="$HOME/.bin:$HOME/go/bin:$HOME/.local/bin:$PATH"
# --------------------------------------------------
`;

    if (!content.includes('Base Terminal Config')) {
        fs.appendFileSync(bashrcPath, promptConfig);
        log('Terminal prompt customized.');
    }
}

// 4. 启动隧道 (核心修复：回归 Pipe 模式 + 环境变量注入)
async function startTunnel() {
    const cliPath = path.join(CONFIG.paths.bin, 'code');

    // 下载 CLI
    if (!fs.existsSync(cliPath)) {
        log('Downloading VS Code CLI...');
        try {
            execSync(`curl -L "https://update.code.visualstudio.com/latest/cli-linux-x64/stable" -o vscode_cli.tar.gz`);
            execSync(`tar -xzf vscode_cli.tar.gz -C "${CONFIG.paths.bin}"`);
            fs.unlinkSync('vscode_cli.tar.gz');
        } catch (e) {
            log('Download failed. Please check network.');
            return;
        }
    }

    log(`Starting Tunnel: ${CONFIG.tunnelName}`);
    
    // === 关键修改点 ===
    // 设置 VSCODE_CLI_DATA_DIR 环境变量。
    // 这会让 CLI 把 "登录状态/Token" 也保存在这个持久化目录里，
    // 而不是保存在容器重启后就会丢失的 /root/ 目录下。
    const env = { 
        ...process.env, 
        'VSCODE_CLI_DATA_DIR': CONFIG.paths.vscodeData 
    };

    const child = spawn(cliPath, [
        'tunnel', 
        '--accept-server-license-terms',
        '--name', CONFIG.tunnelName,
        '--server-data-dir', CONFIG.paths.vscodeData
        // 移除了 '--provider'，因为 CLI 报错不支持
    ], { 
        // 使用 pipe 而不是 inherit。
        // 这会告诉 CLI "我现在不是在交互式终端里"，
        // CLI 就不会弹出选择菜单，而是直接打印登录 URL。
        stdio: 'pipe', 
        env: env 
    });

    // 手动处理输出流，把 CLI 的输出转发到翼龙控制台
    child.stdout.on('data', (data) => process.stdout.write(data));
    child.stderr.on('data', (data) => process.stderr.write(data));

    child.on('exit', (code) => {
        log(`Tunnel stopped (Code ${code}). Restarting in 5s...`);
        setTimeout(startTunnel, 5000);
    });
}

// 执行
try {
    init();
    forceBash();
    setupBashrc();
    startTunnel();
} catch (err) {
    console.error(err);
}
