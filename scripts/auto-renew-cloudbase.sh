#!/bin/bash
# CloudBase 云托管默认域名自动续期脚本
# 通过访问服务和查询版本来保持域名活跃

# ============================================
# 配置区域
# ============================================
ENV_ID="cloud1-1gye4cf8a8036d16"
SERVICE_NAME="finance-manager"
SERVICE_URL="https://finance-manager-208019-4-1387287689.sh.run.tcloudbase.com"

# ============================================
# 脚本逻辑
# ============================================
LOG_FILE="$HOME/.cloudbase-renew.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 开始续期 CloudBase 云托管域名..." >> "$LOG_FILE"

# 方法1：访问服务 URL 保持活跃
echo "[$DATE] 访问服务 URL..." >> "$LOG_FILE"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL" 2>/dev/null)
echo "[$DATE] HTTP 响应码: $HTTP_CODE" >> "$LOG_FILE"

# 方法2：查询服务版本列表（触发API调用）
echo "[$DATE] 查询服务版本列表..." >> "$LOG_FILE"
tcb run:deprecated version list --envId "$ENV_ID" --serviceName "$SERVICE_NAME" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$DATE] 续期成功!" >> "$LOG_FILE"
else
    echo "[$DATE] 续期可能失败，请检查日志" >> "$LOG_FILE"
fi

echo "---" >> "$LOG_FILE"
