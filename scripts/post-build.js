/**
 * 后置构建脚本 - 复制 node_modules 到打包后的应用
 * electron-builder 默认会排除 node_modules，所以需要手动复制
 */

const fs = require('fs');
const path = require('path');

const platform = process.platform;
const arch = process.arch;

// 根据平台和架构确定输出目录
let appResourcesPath;
if (platform === 'darwin') {
  // macOS - 检查两个可能的目录
  const arm64Path = path.join(__dirname, '../dist-electron/mac-arm64/财务管理系统.app/Contents/Resources/app');
  const x64Path = path.join(__dirname, '../dist-electron/mac-x64/财务管理系统.app/Contents/Resources/app');
  const universalPath = path.join(__dirname, '../dist-electron/mac/财务管理系统.app/Contents/Resources/app');

  // 按优先级检查
  if (fs.existsSync(arm64Path)) {
    appResourcesPath = arm64Path;
  } else if (fs.existsSync(x64Path)) {
    appResourcesPath = x64Path;
  } else if (fs.existsSync(universalPath)) {
    appResourcesPath = universalPath;
  }
} else if (platform === 'win32') {
  appResourcesPath = path.join(__dirname, '../dist-electron/win-unpacked/resources/app');
} else {
  appResourcesPath = path.join(__dirname, '../dist-electron/linux-unpacked/resources/app');
}

const sourceNodeModules = path.join(__dirname, '../.next/standalone/node_modules');
const targetNodeModules = path.join(appResourcesPath, 'node_modules');

console.log('=== 后置构建脚本 ===');
console.log(`平台: ${platform}`);
console.log(`架构: ${arch}`);
console.log(`源 node_modules: ${sourceNodeModules}`);
console.log(`目标 node_modules: ${targetNodeModules}`);

// 检查源目录是否存在
if (!fs.existsSync(sourceNodeModules)) {
  console.error('❌ 错误: 源 node_modules 目录不存在');
  console.error('请确保已运行 "npm run build" 生成 .next/standalone');
  process.exit(1);
}

// 检查目标目录是否存在
if (!appResourcesPath || !fs.existsSync(appResourcesPath)) {
  console.error('❌ 错误: 目标 app 目录不存在');
  console.error(`检查路径: ${appResourcesPath}`);
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

console.log('');
console.log('正在复制 node_modules...');

try {
  // 删除已存在的目标目录
  if (fs.existsSync(targetNodeModules)) {
    fs.rmSync(targetNodeModules, { recursive: true, force: true });
  }

  copyDir(sourceNodeModules, targetNodeModules);

  // 验证复制结果
  const nextModulePath = path.join(targetNodeModules, 'next');
  if (fs.existsSync(nextModulePath)) {
    console.log('✓ node_modules 复制成功');
    console.log('✓ next 模块已验证');
  } else {
    console.error('❌ 警告: next 模块不存在于复制后的目录');
  }

  // 显示复制的模块数量
  const modules = fs.readdirSync(targetNodeModules);
  console.log(`✓ 共复制 ${modules.length} 个模块`);

} catch (error) {
  console.error('❌ 复制失败:', error.message);
  process.exit(1);
}

console.log('');
console.log('=== 后置构建完成 ===');
