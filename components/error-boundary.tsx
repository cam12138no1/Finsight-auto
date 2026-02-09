// components/error-boundary.tsx - 全局错误处理UI

'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Error info:', errorInfo)
    
    this.setState({ errorInfo })

    // TODO: Send to error tracking service (Sentry, LogRocket)
    // sendToErrorTracking({ error, errorInfo, userAgent: navigator.userAgent })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">应用程序错误</h1>
            </div>

            <p className="text-gray-600 mb-4">
              抱歉，应用程序遇到了意外错误。我们已记录此问题，团队将尽快修复。
            </p>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="w-full"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                重试
              </Button>
              <Button
                onClick={this.handleReload}
                className="w-full"
              >
                刷新页面
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              如果问题持续存在，请联系技术支持
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
