# ChatGPT Automation API

A clean, reusable JavaScript API for automating ChatGPT interactions through a browser extension.

## Overview

The ChatGPT Automation API provides a simple Promise-based interface for sending prompts to ChatGPT and receiving responses. It abstracts all the complexity of interacting with ChatGPT's UI, making it easy to integrate ChatGPT automation into any application.

## Features

- ✅ **Simple API**: Clean, Promise-based interface
- ✅ **Easy Integration**: Works in any JavaScript context (popup, content script, web page)
- ✅ **Progress Tracking**: Optional callbacks for status updates
- ✅ **Error Handling**: Comprehensive error messages
- ✅ **Auto-detection**: Automatically detects when ChatGPT responses are complete
- ✅ **Well Documented**: Full JSDoc documentation

## Installation

1. Include the `chatgpt-api.js` file in your project
2. Make sure the ChatGPT extension is installed and active
3. Open ChatGPT in a browser tab

## Quick Start

```javascript
// 1. Initialize the API
const api = await createChatGPTAPI();

// 2. Send a prompt
const response = await api.sendPrompt("Hello, ChatGPT!");
console.log(response);
```

## API Reference

### `createChatGPTAPI()`

Convenience function that creates and initializes a new `ChatGPTAPI` instance.

**Returns:** `Promise<ChatGPTAPI>`

**Example:**
```javascript
const api = await createChatGPTAPI();
```

### `ChatGPTAPI` Class

#### Constructor

```javascript
const api = new ChatGPTAPI();
```

#### Methods

##### `initialize()`

Initialize the API and set up message listeners. Must be called before using other methods.

**Returns:** `Promise<void>`

**Example:**
```javascript
const api = new ChatGPTAPI();
await api.initialize();
```

##### `sendPrompt(prompt, options)`

Send a prompt to ChatGPT and wait for the response.

**Parameters:**
- `prompt` (string, required): The prompt text to send to ChatGPT
- `options` (object, optional): Configuration options
  - `timeout` (number): Maximum time to wait in seconds (default: 300)
  - `onProgress` (function): Callback function for progress updates

**Returns:** `Promise<string>` - The response text from ChatGPT

**Throws:** `Error` in the following cases:
- API not initialized
- Invalid prompt (empty or not a string)
- ChatGPT tab not found
- Connection error
- Timeout exceeded

**Example:**
```javascript
// Simple usage
const response = await api.sendPrompt("Explain quantum computing");

// With options
const response = await api.sendPrompt("Write a story", {
  timeout: 600, // 10 minutes
  onProgress: (status) => {
    console.log("Status:", status);
  }
});
```

##### `isAvailable()`

Check if ChatGPT is available (tab is open and accessible).

**Returns:** `Promise<boolean>`

**Example:**
```javascript
const isAvailable = await api.isAvailable();
if (isAvailable) {
  // ChatGPT is ready
}
```

## Usage Examples

### Basic Usage

```javascript
const api = await createChatGPTAPI();

try {
  const response = await api.sendPrompt("What is JavaScript?");
  console.log(response);
} catch (error) {
  console.error("Error:", error.message);
}
```

### With Progress Updates

```javascript
const api = await createChatGPTAPI();

const response = await api.sendPrompt("Generate a long article", {
  onProgress: (status) => {
    // Update UI with status
    document.getElementById("status").textContent = status;
  }
});
```

### Check Availability First

```javascript
const api = await createChatGPTAPI();

if (await api.isAvailable()) {
  const response = await api.sendPrompt("Hello!");
} else {
  alert("Please open ChatGPT in a browser tab first");
}
```

### Error Handling

```javascript
const api = await createChatGPTAPI();

try {
  const response = await api.sendPrompt("Your prompt");
} catch (error) {
  if (error.message.includes("not found")) {
    // Handle: ChatGPT tab not found
  } else if (error.message.includes("timeout")) {
    // Handle: Request timeout
  } else {
    // Handle: Other errors
  }
}
```

## Integration Guide

### In a Browser Extension Popup

```html
<script src="chatgpt-api.js"></script>
<script>
  (async () => {
    const api = await createChatGPTAPI();
    
    document.getElementById("sendBtn").onclick = async () => {
      const prompt = document.getElementById("prompt").value;
      try {
        const response = await api.sendPrompt(prompt);
        document.getElementById("response").textContent = response;
      } catch (error) {
        alert(error.message);
      }
    };
  })();
</script>
```

### In a Web Application

```html
<script src="chatgpt-api.js"></script>
<script>
  class MyApp {
    constructor() {
      this.api = null;
    }

    async init() {
      this.api = await createChatGPTAPI();
    }

    async askChatGPT(question) {
      return await this.api.sendPrompt(question, {
        onProgress: (status) => this.updateUI(status)
      });
    }

    updateUI(status) {
      // Update your UI
    }
  }

  const app = new MyApp();
  await app.init();
</script>
```

## Error Messages

The API provides clear error messages:

- `"API not initialized. Call initialize() first."` - API not initialized
- `"Prompt must be a non-empty string"` - Invalid prompt
- `"ChatGPT tab not found. Please open ChatGPT in a browser tab."` - ChatGPT not open
- `"Failed to send prompt: [error]. Please refresh the ChatGPT page."` - Connection error
- `"Request timeout after [X] seconds"` - Timeout exceeded

## Best Practices

1. **Always initialize**: Use `createChatGPTAPI()` or call `initialize()` before use
2. **Check availability**: Use `isAvailable()` before sending prompts
3. **Handle errors**: Wrap API calls in try-catch blocks
4. **Provide feedback**: Use `onProgress` callback to update UI
5. **Set timeouts**: Adjust timeout based on expected response length
6. **One instance**: Create one API instance and reuse it

## Requirements

- Chrome/Edge browser extension environment
- ChatGPT extension installed and active
- ChatGPT open in a browser tab
- Content script loaded (automatic when extension is active)

## File Structure

```
chatgpt-api.js          # Main API file
API_USAGE_EXAMPLES.md   # Detailed usage examples
example-usage.html      # Working example page
README_API.md          # This file
```

## License

This API is part of the ChatGPT Automator extension project.

## Support

For issues or questions, please refer to the main project documentation or create an issue in the project repository.

