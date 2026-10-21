const STORAGE_KEY = "assistente-chat-messages";
const messagesElement = document.querySelector("#messages");
const emptyState = document.querySelector("#empty-state");
const form = document.querySelector("#message-form");
const input = document.querySelector("#message-input");
const clearButton = document.querySelector("#clear-chat");
const pendingReplies = new Set();

let messages = loadMessages();

function isMessage(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    (value.sender === "user" || value.sender === "bot") &&
    typeof value.text === "string" &&
    typeof value.timestamp === "string"
  );
}

function loadMessages() {
  const savedMessages = localStorage.getItem(STORAGE_KEY);

  if (!savedMessages) {
    return [];
  }

  const parsedMessages = JSON.parse(savedMessages);

  if (!Array.isArray(parsedMessages) || !parsedMessages.every(isMessage)) {
    console.error("O histórico salvo do chat está em um formato inválido.");
    return [];
  }

  return parsedMessages;
}

function saveMessages() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function createMessage(sender, text) {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    timestamp: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
  };
}

function renderMessage(message) {
  const article = document.createElement("article");
  const bubble = document.createElement("div");
  const time = document.createElement("time");

  article.className = `message message--${message.sender}`;
  article.dataset.messageId = message.id;
  bubble.className = "message__bubble";
  bubble.textContent = message.text;
  time.className = "message__time";
  time.dateTime = message.timestamp;
  time.textContent = message.timestamp;

  article.append(bubble, time);
  messagesElement.append(article);
  scrollToBottom();
}

function renderMessages() {
  messagesElement.querySelectorAll(".message, .message--typing").forEach((item) => {
    item.remove();
  });

  emptyState.hidden = messages.length > 0;
  messages.forEach(renderMessage);
  clearButton.disabled = messages.length === 0;
  clearButton.setAttribute("aria-disabled", String(messages.length === 0));
}

function scrollToBottom() {
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function showTypingIndicator() {
  const existingIndicator = messagesElement.querySelector(".message--typing");

  if (existingIndicator) {
    messagesElement.append(existingIndicator);
    scrollToBottom();
    return;
  }

  const article = document.createElement("article");
  const bubble = document.createElement("div");
  const dots = document.createElement("span");

  article.className = "message message--bot message--typing";
  article.setAttribute("role", "status");
  article.setAttribute("aria-label", "Assistente digitando");
  bubble.className = "message__bubble";
  dots.className = "typing";
  dots.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 3; index += 1) {
    dots.append(document.createElement("span"));
  }

  bubble.append(dots);
  article.append(bubble);
  messagesElement.append(article);
  scrollToBottom();
}

function sendMessage(text) {
  const message = createMessage("user", text);
  messages.push(message);
  emptyState.hidden = true;
  renderMessage(message);
  saveMessages();
  clearButton.disabled = false;
  clearButton.setAttribute("aria-disabled", "false");
  showTypingIndicator();

  const timeoutId = window.setTimeout(() => {
    pendingReplies.delete(timeoutId);
    const typingIndicator = messagesElement.querySelector(".message--typing");

    if (typingIndicator) {
      typingIndicator.remove();
    }

    const reply = createMessage("bot", `Recebi sua mensagem: '${text}'`);
    messages.push(reply);
    renderMessage(reply);
    saveMessages();

    if (pendingReplies.size > 0) {
      showTypingIndicator();
    }
  }, 1500);

  pendingReplies.add(timeoutId);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  sendMessage(text);
  input.value = "";
  input.style.height = "";
  input.focus();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
});

clearButton.addEventListener("click", () => {
  pendingReplies.forEach((timeoutId) => window.clearTimeout(timeoutId));
  pendingReplies.clear();
  messages = [];
  saveMessages();
  renderMessages();
  input.focus();
});

renderMessages();
input.focus();
