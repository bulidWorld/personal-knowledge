import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'KnowledgeVault - 个人知识库',
  description: 'Centralized Developer Knowledge Hub',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
