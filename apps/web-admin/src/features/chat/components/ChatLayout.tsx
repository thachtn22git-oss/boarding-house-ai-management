import type { ReactNode } from 'react'

import '../chat.css'

type ChatLayoutProps = {
  sidebar: ReactNode
  main: ReactNode
  details: ReactNode
}

function ChatLayout({ sidebar, main, details }: ChatLayoutProps) {
  return (
    <div className="chat-page">
      <div className="chat-layout">
        <aside className="chat-sidebar">{sidebar}</aside>
        <section className="chat-main">{main}</section>
        <aside className="chat-details">{details}</aside>
      </div>
    </div>
  )
}

export default ChatLayout
