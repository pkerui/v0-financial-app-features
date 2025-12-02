'use client'

import { useState, useEffect } from 'react'

/**
 * 移动端检测 Hook
 * 用于判断当前设备是否为移动端
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // 检测屏幕宽度
      const isMobileWidth = window.innerWidth < 768

      // 检测 User Agent
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )

      // 检测触控支持
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      setIsMobile(isMobileWidth || (isMobileUA && hasTouch))
      setIsLoaded(true)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return { isMobile, isLoaded }
}

/**
 * 获取移动端安全区域
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const style = getComputedStyle(document.documentElement)
      setSafeArea({
        top: parseInt(style.getPropertyValue('--sat') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
        left: parseInt(style.getPropertyValue('--sal') || '0', 10),
        right: parseInt(style.getPropertyValue('--sar') || '0', 10),
      })
    }

    updateSafeArea()
  }, [])

  return safeArea
}
