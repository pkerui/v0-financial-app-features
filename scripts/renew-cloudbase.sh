#!/bin/bash
# CloudBase 默认域名自动续期脚本
# 需要先安装 tcb cli: npm install -g @cloudbase/cli

# 配置你的环境ID
ENV_ID="your-env-id"

# 登录（首次需要扫码）
tcb login

# 续期静态网站托管
echo "正在续期 CloudBase 默认域名..."
tcb hosting detail -e $ENV_ID

echo "续期完成，请在控制台确认"
echo "控制台地址: https://console.cloud.tencent.com/tcb/hosting/index?envId=$ENV_ID"
