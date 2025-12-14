/**
 * 后置构建脚本 - 复制 node_modules 到打包后的应用
 * electron-builder 默认会排除 node_modules，所以需要手动复制
 */

const fs = require('fs');
const path = require('path');

const platform = process.platform;
const arch = process.arch;

console.log('=== 后置构建脚本 ===');
console.log(`平台: ${platform}`);
console.log(`架构: ${arch}`);

const sourceNodeModules = path.join(__dirname, '../.next/standalone/node_modules');

// 检查源目录是否存在
if (!fs.existsSync(sourceNodeModules)) {
  console.error('❌ 错误: 源 node_modules 目录不存在');
  console.error('请确保已运行 "npm run build" 生成 .next/standalone');
  process.exit(1);
}

// 递归复制目录
function copyDir(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      // 处理符号链接
      const linkTarget = fs.readlinkSync(srcPath);
      try {
        fs.symlinkSync(linkTarget, destPath);
      } catch (e) {
        // 如果符号链接已存在，跳过
        if (e.code !== 'EEXIST') {
          throw e;
        }
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制到指定目录
function copyToTarget(targetPath, archName) {
  if (!fs.existsSync(targetPath)) {
    console.log(`⏭ 跳过 ${archName}: 目录不存在`);
    return false;
  }

  const targetNodeModules = path.join(targetPath, 'node_modules');
  console.log(`\n正在复制到 ${archName}...`);
  console.log(`目标: ${targetNodeModules}`);

  try {
    // 删除已存在的目标目录
    if (fs.existsSync(targetNodeModules)) {
      fs.rmSync(targetNodeModules, { recursive: true, force: true });
    }

    copyDir(sourceNodeModules, targetNodeModules);

    // 验证复制结果
    const nextModulePath = path.join(targetNodeModules, 'next');
    if (fs.existsSync(nextModulePath)) {
      const modules = fs.readdirSync(targetNodeModules);
      console.log(`✓ ${archName} 复制成功 (${modules.length} 个模块)`);
      return true;
    } else {
      console.error(`❌ ${archName}: next 模块不存在于复制后的目录`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${archName} 复制失败:`, error.message);
    return false;
  }
}

// 定义所有可能的目标路径
const targets = [];

if (platform === 'darwin') {
  targets.push({
    path: path.join(__dirname, '../dist-electron/mac-arm64/财务管理系统.app/Contents/Resources/app'),
    name: 'macOS ARM64'
  });
  targets.push({
    path: path.join(__dirname, '../dist-electron/mac/财务管理系统.app/Contents/Resources/app'),
    name: 'macOS x64'
  });
  targets.push({
    path: path.join(__dirname, '../dist-electron/mac-x64/财务管理系统.app/Contents/Resources/app'),
    name: 'macOS x64 (alt)'
  });
} else if (platform === 'win32') {
  targets.push({
    path: path.join(__dirname, '../dist-electron/win-unpacked/resources/app'),
    name: 'Windows'
  });
} else {
  targets.push({
    path: path.join(__dirname, '../dist-electron/linux-unpacked/resources/app'),
    name: 'Linux'
  });
}

console.log(`\n源 node_modules: ${sourceNodeModules}`);

let successCount = 0;
for (const target of targets) {
  if (copyToTarget(target.path, target.name)) {
    successCount++;
  }
}

console.log('');
if (successCount > 0) {
  console.log(`=== 后置构建完成 (${successCount} 个架构) ===`);
} else {
  console.error('=== 后置构建失败: 没有成功复制到任何目标 ===');
  process.exit(1);
}
