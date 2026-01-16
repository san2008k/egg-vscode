#!/bin/bash
# 应用工具安装脚本 (Application Layer) - v2.2 PEP-668 修复版
# 修复：解决 "externally-managed-environment" 错误，强制允许用户级 pip 安装
# 使用方法：在 VS Code 终端运行 ./init.sh

set -e # 遇到错误立即停止

# === 版本配置 (在此处修改版本) ===
GO_VERSION="1.25.6"      # 当 Go 发布新版时，改这里
PYTHON_ALIAS_VER="3.11"  # 系统自带的 Python 版本

# === 路径 ===
GO_INSTALL_ROOT="$HOME/.go_libs"
GO_TARGET="$GO_INSTALL_ROOT/go${GO_VERSION}"
BASHRC="$HOME/.bashrc"

echo " Starting Environment Initialization..."

# --- 1. Python 配置 ---
echo " Configuring Python..."
if ! grep -q "alias python='python3'" "$BASHRC"; then
    echo "" >> "$BASHRC"
    echo "# Python Configuration" >> "$BASHRC"
    echo "alias python='python3'" >> "$BASHRC"
    echo "alias pip='pip3'" >> "$BASHRC"
    echo "✅ Python aliases added."
else
    echo "⚡ Python aliases already present."
fi

# [新增] 设置环境变量以永久绕过 PEP 668 限制
if ! grep -q "PIP_BREAK_SYSTEM_PACKAGES" "$BASHRC"; then
    echo "export PIP_BREAK_SYSTEM_PACKAGES=1" >> "$BASHRC"
    # 立即在当前 shell 生效以便接下来的命令使用
    export PIP_BREAK_SYSTEM_PACKAGES=1
    echo "✅ Added PIP_BREAK_SYSTEM_PACKAGES to .bashrc (Bypassing PEP 668)"
fi

# 检查并安装 pip
if ! command -v pip3 &> /dev/null; then
    echo " Installing pip..."
    
    # 尝试标准的 ensurepip
    if python3 -m ensurepip --user &> /dev/null; then
        echo "✅ pip installed via ensurepip."
    else
        echo "⚠️  System missing ensurepip. Fallback to get-pip.py..."
        
        # 下载官方安装脚本
        curl -sS https://bootstrap.pypa.io/get-pip.py -o get-pip.py
        
        # [核心修复] 添加 --break-system-packages
        # 这告诉 Python 我们正在向用户目录(~/.local)安装，不会破坏系统
        python3 get-pip.py --user --break-system-packages
        
        # 清理
        rm get-pip.py
        echo "✅ pip installed via get-pip.py."
    fi
else
    echo "⚡ pip is already installed."
fi

# --- 2. Go 安装 (手动模式 - 稳定可靠) ---
echo " Checking Go ${GO_VERSION}..."
if [ -d "$GO_TARGET" ]; then
    echo "⚡ Go ${GO_VERSION} is already installed."
else
    echo "⬇  Downloading Go ${GO_VERSION}..."
    mkdir -p "$GO_INSTALL_ROOT"
    
    # 下载到临时文件
    curl -L "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o go.tar.gz
    
    # 解压
    tar -xzf go.tar.gz -C "$GO_INSTALL_ROOT"
    
    # 重命名 go -> go1.25.6 以支持多版本并存
    mv "$GO_INSTALL_ROOT/go" "$GO_TARGET"
    
    # 清理
    rm go.tar.gz
    echo "✅ Go installed to $GO_TARGET"
fi

# 配置 Go 环境变量
if ! grep -q "export GOROOT=" "$BASHRC"; then
    echo "" >> "$BASHRC"
    echo "# Go Environment" >> "$BASHRC"
    echo "export GOROOT=\"$GO_TARGET\"" >> "$BASHRC"
    echo "export GOPATH=\"$HOME/go\"" >> "$BASHRC"
    echo "export PATH=\"\$GOROOT/bin:\$PATH\"" >> "$BASHRC"
    echo "✅ Go paths added to .bashrc"
fi

# --- 3. 结束 ---
echo "---------------------------------------"
echo " Initialization Complete!"
echo "Please type 'source ~/.bashrc' (or restart terminal) to apply changes."
echo "---------------------------------------"
