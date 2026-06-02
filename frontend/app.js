document.addEventListener('DOMContentLoaded', () => {
  const chatLauncher = document.getElementById('chatLauncher');
  const chatContainer = document.getElementById('chatContainer');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  
  const bubbleIcon = chatLauncher.querySelector('.bubble-icon');
  const closeIcon = chatLauncher.querySelector('.close-icon');
  const pulseRing = chatLauncher.querySelector('.pulse-ring');
  
  const chatPopover = document.getElementById('chatPopover');
  const closePopover = document.getElementById('closePopover');

  // Generate a unique session ID for this session
  let sessionId = sessionStorage.getItem('chat_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('chat_session_id', sessionId);
  }

  // Check if popover was previously dismissed
  if (sessionStorage.getItem('chat_popover_dismissed') === 'true') {
    chatPopover.classList.add('hidden');
  }

  // Dismiss popover on close button click
  closePopover.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop event bubbling
    chatPopover.classList.add('hidden');
    sessionStorage.setItem('chat_popover_dismissed', 'true');
  });

  // Toggle Chat Container
  function toggleChat() {
    const isHidden = chatContainer.classList.contains('hidden');
    if (isHidden) {
      chatContainer.classList.remove('hidden');
      bubbleIcon.classList.add('hidden');
      closeIcon.classList.remove('hidden');
      pulseRing.classList.add('hidden'); // Hide the pulsing alert when opened
      
      // Hide and dismiss popover when chat is opened
      chatPopover.classList.add('hidden');
      sessionStorage.setItem('chat_popover_dismissed', 'true');
      
      // Auto focus input on open
      setTimeout(() => userInput.focus(), 100);
      scrollToBottom();
    } else {
      chatContainer.classList.add('hidden');
      bubbleIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
      
      // Keep popover hidden once chat has been opened once
      pulseRing.classList.remove('hidden');
    }
  }

  chatLauncher.addEventListener('click', toggleChat);
  closeChatBtn.addEventListener('click', toggleChat);

  // Scroll to bottom of messages
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Create message element
  function createMessageElement(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // Convert markdown bullet points to HTML if any
    const formattedText = formatMessageText(text);
    contentDiv.innerHTML = formattedText;

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('msg-time');
    const now = new Date();
    timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeSpan);
    
    return messageDiv;
  }

  // Simple formatter to convert markdown bullet points and bold text to HTML
  function formatMessageText(text) {
    if (!text) return '';
    
    // Escape HTML to prevent XSS
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Bold text (**bold**)
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet points starting with * or -
    const lines = escaped.split('\n');
    let inList = false;
    let formattedHtml = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) {
          formattedHtml += '<ul class="chat-list">';
          inList = true;
        }
        formattedHtml += `<li>${trimmed.substring(2)}</li>`;
      } else {
        if (inList) {
          formattedHtml += '</ul>';
          inList = false;
        }
        formattedHtml += `<p>${line}</p>`;
      }
    });

    if (inList) {
      formattedHtml += '</ul>';
    }

    return formattedHtml;
  }

  // Show Typing Indicator
  function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.classList.add('message', 'bot-message', 'typing-msg');
    indicatorDiv.id = 'typingIndicator';

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    indicator.innerHTML = '<span></span><span></span><span></span>';

    contentDiv.appendChild(indicator);
    indicatorDiv.appendChild(contentDiv);
    chatMessages.appendChild(indicatorDiv);
    scrollToBottom();
  }

  // Remove Typing Indicator
  function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Form Submit Handler
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = userInput.value.trim();
    if (!messageText) return;

    // Add user message to UI
    const userMsgEl = createMessageElement(messageText, true);
    chatMessages.appendChild(userMsgEl);
    userInput.value = '';
    scrollToBottom();

    // Disable input while generating response
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Show bot typing
    showTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText, sessionId: sessionId }),
      });

      if (!response.ok) {
        throw new Error('Server error occurred');
      }

      const data = await response.json();
      removeTypingIndicator();

      const botMsgEl = createMessageElement(data.response, false);
      chatMessages.appendChild(botMsgEl);
    } catch (error) {
      console.error('Chat Error:', error);
      removeTypingIndicator();
      
      const errorMsgEl = createMessageElement('Sorry, I encountered an issue connecting to the server. Please try again later.', false);
      chatMessages.appendChild(errorMsgEl);
    } finally {
      // Re-enable input
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
      scrollToBottom();
    }
  });
});
