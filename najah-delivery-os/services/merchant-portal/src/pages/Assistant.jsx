import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assistantAPI } from '../services/api';

function Assistant() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('welcome') + '! ' + t('ask_question'),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await assistantAPI.chat(input);
      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page assistant-page">
      <h2 className="page-title">{t('assistant')}</h2>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-content">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant-message">
              <div className="message-content">{t('loading')}</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ask_question')}
            className="chat-input"
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {t('send')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Assistant;
