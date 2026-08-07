import React, { useState } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';

export default function ChatWindow({ messages, loading, onSendMessage }) {
  const [mcpEnabled, setMcpEnabled] = useState(true);

  const handleQuickStarter = (promptText) => {
    onSendMessage(promptText, mcpEnabled);
  };

  const handleSend = (text) => {
    onSendMessage(text, mcpEnabled);
  };

  return (
    <div className="chat-window">
      <MessageList 
        messages={messages} 
        loading={loading} 
        onQuickStarterSelect={handleQuickStarter} 
      />
      <InputBar 
        onSendMessage={handleSend} 
        loading={loading}
        mcpEnabled={mcpEnabled}
        setMcpEnabled={setMcpEnabled}
      />
    </div>
  );
}
