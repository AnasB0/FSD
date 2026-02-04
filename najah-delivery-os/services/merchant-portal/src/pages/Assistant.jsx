import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

function Assistant() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages([...messages, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await client.post('/assistant/query', { query });
      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources
      };
      setMessages([...messages, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Failed to get assistant response:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages([...messages, userMessage, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant">
      <h1>{t('assistant')}</h1>
      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              {msg.sources && (
                <div className="message-sources">
                  <strong>Sources:</strong>
                  <ul>
                    {msg.sources.map((source, i) => (
                      <li key={i}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {loading && <div className="message assistant loading">Thinking...</div>}
        </div>
        <form onSubmit={handleSubmit} className="chat-input">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ask_question')}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>{t('send')}</button>
        </form>
      </div>
    </div>
  );
}

export default Assistant;
