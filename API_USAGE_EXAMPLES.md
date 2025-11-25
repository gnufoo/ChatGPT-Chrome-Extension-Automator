# ChatGPT API Usage Examples

This document provides examples of how to use the ChatGPT Automation API in your applications.

## Quick Start

```javascript
// 1. Include the API file in your HTML
<script src="chatgpt-api.js"></script>

// 2. Initialize and use
(async () => {
  const api = await createChatGPTAPI();
  const response = await api.sendPrompt("Hello, ChatGPT!");
  console.log(response);
})();
```

## Basic Usage

### Simple Prompt

```javascript
const api = await createChatGPTAPI();
const response = await api.sendPrompt("Explain quantum computing in simple terms");
console.log(response);
```

### With Error Handling

```javascript
const api = await createChatGPTAPI();

try {
  const response = await api.sendPrompt("Write a haiku about coding");
  console.log("Response:", response);
} catch (error) {
  console.error("Error:", error.message);
  // Handle error (e.g., show user-friendly message)
}
```

### With Progress Updates

```javascript
const api = await createChatGPTAPI();

const response = await api.sendPrompt("Write a long story", {
  onProgress: (status) => {
    console.log("Status:", status);
    // Update UI: "Sending prompt...", "Waiting for response..."
  }
});

console.log(response);
```

### Check Availability First

```javascript
const api = await createChatGPTAPI();

if (await api.isAvailable()) {
  const response = await api.sendPrompt("Hello!");
  console.log(response);
} else {
  console.log("Please open ChatGPT in a browser tab first");
}
```

## Advanced Usage

### Custom Timeout

```javascript
const api = await createChatGPTAPI();

try {
  const response = await api.sendPrompt("Generate a long article", {
    timeout: 600 // 10 minutes instead of default 5 minutes
  });
  console.log(response);
} catch (error) {
  if (error.message.includes("timeout")) {
    console.log("Request took too long");
  }
}
```

### Multiple Sequential Requests

```javascript
const api = await createChatGPTAPI();

const prompts = [
  "What is JavaScript?",
  "What is Python?",
  "Compare JavaScript and Python"
];

for (const prompt of prompts) {
  try {
    const response = await api.sendPrompt(prompt);
    console.log(`Q: ${prompt}`);
    console.log(`A: ${response}\n`);
  } catch (error) {
    console.error(`Failed for "${prompt}":`, error.message);
  }
}
```

### Integration in a Web Application

```javascript
// In your web app
class MyApp {
  constructor() {
    this.chatGPTAPI = null;
  }

  async init() {
    try {
      this.chatGPTAPI = await createChatGPTAPI();
      this.updateUI("ChatGPT API ready");
    } catch (error) {
      this.updateUI("Failed to initialize API", true);
    }
  }

  async askChatGPT(question) {
    if (!this.chatGPTAPI) {
      await this.init();
    }

    this.updateUI("Processing...");
    
    try {
      const response = await this.chatGPTAPI.sendPrompt(question, {
        onProgress: (status) => this.updateUI(status)
      });
      
      this.updateUI("Response received!");
      return response;
    } catch (error) {
      this.updateUI(`Error: ${error.message}`, true);
      throw error;
    }
  }

  updateUI(message, isError = false) {
    // Your UI update logic
    console.log(message);
  }
}

// Usage
const app = new MyApp();
await app.init();
const answer = await app.askChatGPT("What is the meaning of life?");
```

## API Reference

### `createChatGPTAPI()`

Convenience function to create and initialize the API.

**Returns:** `Promise<ChatGPTAPI>`

### `ChatGPTAPI` Class

#### `initialize()`

Initialize the API and set up message listeners. Must be called before using other methods.

**Returns:** `Promise<void>`

#### `sendPrompt(prompt, options)`

Send a prompt to ChatGPT and wait for the response.

**Parameters:**
- `prompt` (string): The prompt text to send to ChatGPT
- `options` (object, optional): Configuration options
  - `timeout` (number): Maximum time to wait in seconds (default: 300)
  - `onProgress` (function): Callback for progress updates

**Returns:** `Promise<string>` - The response text from ChatGPT

**Throws:** `Error` if ChatGPT tab is not found, prompt fails, or timeout occurs

#### `isAvailable()`

Check if ChatGPT is available (tab is open).

**Returns:** `Promise<boolean>`

## Error Handling

The API throws errors in the following cases:

1. **API not initialized**: Call `initialize()` first
2. **Invalid prompt**: Prompt must be a non-empty string
3. **ChatGPT tab not found**: User needs to open ChatGPT in a browser tab
4. **Connection error**: Content script not loaded (refresh ChatGPT page)
5. **Timeout**: Response took longer than the specified timeout

Always wrap API calls in try-catch blocks:

```javascript
try {
  const response = await api.sendPrompt("Your prompt");
} catch (error) {
  // Handle specific error types
  if (error.message.includes("not found")) {
    // Show message: "Please open ChatGPT"
  } else if (error.message.includes("timeout")) {
    // Show message: "Request took too long"
  } else {
    // Show generic error message
  }
}
```

## Best Practices

1. **Always initialize first**: Use `createChatGPTAPI()` or call `initialize()`
2. **Check availability**: Use `isAvailable()` before sending prompts
3. **Handle errors**: Wrap API calls in try-catch blocks
4. **Provide feedback**: Use `onProgress` callback to update UI
5. **Set appropriate timeouts**: Adjust timeout based on expected response length
6. **Clean up**: The API handles cleanup automatically, but you can create new instances for different contexts

## Notes

- The API requires the ChatGPT extension to be installed and active
- ChatGPT must be open in a browser tab for the API to work
- The API automatically detects when responses are complete
- Responses are captured as plain text

