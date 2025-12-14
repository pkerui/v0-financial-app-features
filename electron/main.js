/**
 * Electron 主进程
 * LeanCloud 云端模式 - 简化版 Electron 包装器
 */

const { app, BrowserWindow, shell, session } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 禁用 GPU 硬件加速以修复白屏问题
app.disableHardwareAcceleration()

// 禁用 GPU 沙箱（解决某些 macOS 上的兼容性问题）
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')

let mainWindow = null
let nextServer = null
const PORT = 3000

/**
 * 启动 Next.js 服务器（生产模式）
 */
function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // 开发模式下假设 Next.js 服务器已经在运行
      resolve()
      return
    }

    const nextPath = path.join(process.resourcesPath, 'app')
    const serverPath = path.join(nextPath, 'server.js')

    // 使用 Electron 内置的 Node.js 运行时，而非系统的 node 命令
    // ELECTRON_RUN_AS_NODE=1 让 Electron 以纯 Node.js 模式运行
    nextServer = spawn(process.execPath, [serverPath], {
      cwd: nextPath,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: PORT.toString(),
        NODE_ENV: 'production',
        // 强制桌面版使用 LeanCloud 后端
        NEXT_PUBLIC_BACKEND: 'leancloud',
        // LeanCloud 凭据（如果环境变量未设置，使用默认值）
        NEXT_PUBLIC_LEANCLOUD_APP_ID: process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID || 'vJ1HlM4FiTSnu3K9skXu8vOf-gzGzoHsz',
        NEXT_PUBLIC_LEANCLOUD_APP_KEY: process.env.NEXT_PUBLIC_LEANCLOUD_APP_KEY || '9rkhfgrEqADpzLotXEqMPeBg',
        NEXT_PUBLIC_LEANCLOUD_SERVER_URL: process.env.NEXT_PUBLIC_LEANCLOUD_SERVER_URL || 'https://vj1hlm4f.lc-cn-n1-shared.com',
        // Master Key 用于服务端管理操作（批量获取用户等）
        LEANCLOUD_MASTER_KEY: process.env.LEANCLOUD_MASTER_KEY || 'Yf5lVnEMqKwxFiLRQTuoZvTo',
        // 腾讯云语音识别 API 密钥
        TENCENT_SECRET_ID: process.env.TENCENT_SECRET_ID || 'AKIDOdhYDfx4xe9TaZKWWJyQep09IUdbOzMW',
        TENCENT_SECRET_KEY: process.env.TENCENT_SECRET_KEY || '0mKhrpZ6PUM0QcaKqAG8nHeomW5QYTAT',
        // DeepSeek API 密钥（AI 分类等功能）
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || 'sk-12b6c9e47de440c2a69f21aa46918f11',
      },
    })

    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`)
      if (data.toString().includes('Ready')) {
        resolve()
      }
    })

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`)
    })

    nextServer.on('close', (code) => {
      console.log(`Next.js server exited with code ${code}`)
    })

    // 给服务器一些启动时间
    setTimeout(resolve, 3000)
  })
}

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: '财务管理系统',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    // macOS 特定设置
    titleBarStyle: 'default',
    show: false,
    // 设置背景色避免白屏闪烁
    backgroundColor: '#09090b', // 与应用主题一致的深色背景
  })

  // 窗口准备好后再显示，增加延迟确保内容渲染完成
  mainWindow.once('ready-to-show', () => {
    // 延迟显示，确保内容完全加载
    setTimeout(() => {
      mainWindow.show()
      mainWindow.focus()
    }, 500)
  })

  // 页面加载完成后的备用显示机制
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow.isVisible()) {
      setTimeout(() => {
        mainWindow.show()
        mainWindow.focus()
      }, 300)
    }
  })

  // 加载应用
  const url = `http://localhost:${PORT}`
  console.log('Loading URL:', url)

  // 添加加载错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription)
  })

  // 添加控制台消息输出
  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('Renderer:', message)
  })

  mainWindow.loadURL(url)

  // 开发模式下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // 生产模式下也可以用快捷键打开开发者工具调试
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools()
    }
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用启动
app.whenReady().then(async () => {
  try {
    // 设置权限处理器，自动允许麦克风访问
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      console.log('权限请求:', permission)
      // 允许麦克风权限用于语音识别
      if (permission === 'media' || permission === 'microphone') {
        callback(true)
        return
      }
      // 其他权限默认允许
      callback(true)
    })

    // 设置权限检查处理器
    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      // 允许麦克风权限
      if (permission === 'media' || permission === 'microphone') {
        return true
      }
      return true
    })

    await startNextServer()
    createWindow()
  } catch (error) {
    console.error('Failed to start application:', error)
    app.quit()
  }
})

// macOS: 点击 dock 图标时重新创建窗口
app.on('activate', async () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) {
    await startNextServer()
    createWindow()
  }
})

// 所有窗口关闭时退出应用 (Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill()
  }
})
