#!/bin/bash

# 检查押金分类的脚本
# 需要先登录系统，然后在浏览器中访问

echo "📋 数据库分类检查API"
echo ""
echo "请在浏览器中访问以下URL来查看押金分类状态:"
echo ""
echo "http://localhost:3000/api/debug/categories"
echo ""
echo "或者使用 curl (需要先登录获取 cookie):"
echo ""
echo "curl http://localhost:3000/api/debug/categories | jq"
echo ""
echo "---"
echo ""
echo "如果你已经登录系统，可以直接访问上面的URL"
echo "它会显示："
echo "  - 当前公司的所有分类"
echo "  - 押金相关分类的详细信息"
echo "  - 现金流活动设置 (cash_flow_activity)"
echo "  - 使用该分类的交易数量"
