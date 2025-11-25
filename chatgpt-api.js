/**
 * ChatGPT Automation API
 * 
 * A clean, reusable interface for sending prompts to ChatGPT and receiving responses.
 * This API abstracts all the complexity of interacting with ChatGPT's UI and provides
 * a simple Promise-based interface.
 * 
 * @module ChatGPTAPI
 * @version 1.0.0
 */

/**
 * ChatGPT API Class
 * 
 * Provides methods to interact with ChatGPT through the browser extension.
 * 
 * @class ChatGPTAPI
 */
class ChatGPTAPI {
  /**
   * Creates an instance of ChatGPTAPI
   * 
   * @constructor
   */
  constructor() {
    this.isInitialized = false;
    this.responseListeners = new Set();
  }

  /**
   * Initialize the API and set up message listeners
   * Must be called before using other methods
   * 
   * @returns {Promise<void>}
   * @example
   * const api = new ChatGPTAPI();
   * await api.initialize();
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up response listener (only once)
    if (!this.messageListener) {
      this.messageListener = (message, sender, sendResponse) => {
        if (message.action === "CAPTURED_RESPONSE") {
          this._handleResponse(message.text);
        }
        return true;
      };
      chrome.runtime.onMessage.addListener(this.messageListener);
    }

    this.isInitialized = true;
  }

  /**
   * Send a prompt to ChatGPT and wait for the response
   * 
   * @param {string} prompt - The prompt text to send to ChatGPT
   * @param {Object} options - Optional configuration
   * @param {number} options.timeout - Maximum time to wait for response in seconds (default: 300)
   * @param {Function} options.onProgress - Optional callback for progress updates
   * @returns {Promise<string>} The response text from ChatGPT
   * @throws {Error} If ChatGPT tab is not found, prompt fails, or timeout occurs
   * 
   * @example
   * const api = new ChatGPTAPI();
   * await api.initialize();
   * 
   * try {
   *   const response = await api.sendPrompt("Explain quantum computing");
   *   console.log(response);
   * } catch (error) {
   *   console.error("Error:", error.message);
   * }
   * 
   * @example
   * // With progress callback
   * const response = await api.sendPrompt("Write a story", {
   *   onProgress: (status) => {
   *     console.log("Status:", status);
   *   }
   * });
   */
  async sendPrompt(prompt, options = {}) {
    if (!this.isInitialized) {
      throw new Error("API not initialized. Call initialize() first.");
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error("Prompt must be a non-empty string");
    }

    const timeout = options.timeout || 300; // 5 minutes default
    const onProgress = options.onProgress || (() => {});

    return new Promise(async (resolve, reject) => {
      let timeoutId;
      let resolved = false;

      // Set up response handler for this specific request
      const responseHandler = (responseText) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        this.responseListeners.delete(responseHandler);
        resolve(responseText);
      };
      this.responseListeners.add(responseHandler);

      // Set up timeout
      timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        this.responseListeners.delete(responseHandler);
        reject(new Error(`Request timeout after ${timeout} seconds`));
      }, timeout * 1000);

      try {
        // Get the active ChatGPT tab
        const tab = await this._getChatGPTTab();
        if (!tab) {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutId);
          this.responseListeners.delete(responseHandler);
          throw new Error("ChatGPT tab not found. Please open ChatGPT in a browser tab.");
        }

        onProgress("Sending prompt...");

        // Send the prompt to the content script
        chrome.tabs.sendMessage(tab.id, {
          action: "PROMPT_CHATGPT",
          prompt: prompt.trim()
        }, (response) => {
          if (chrome.runtime.lastError) {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            this.responseListeners.delete(responseHandler);
            reject(new Error(`Failed to send prompt: ${chrome.runtime.lastError.message}. Please refresh the ChatGPT page.`));
            return;
          }

          onProgress("Waiting for response...");
        });

      } catch (error) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        this.responseListeners.delete(responseHandler);
        reject(error);
      }
    });
  }

  /**
   * Check if ChatGPT is available (tab is open)
   * 
   * @returns {Promise<boolean>} True if ChatGPT tab is found
   * 
   * @example
   * const api = new ChatGPTAPI();
   * await api.initialize();
   * const isAvailable = await api.isAvailable();
   * if (isAvailable) {
   *   console.log("ChatGPT is ready!");
   * }
   */
  async isAvailable() {
    const tab = await this._getChatGPTTab();
    return tab !== null;
  }

  /**
   * Get the current ChatGPT tab if available
   * 
   * @private
   * @returns {Promise<chrome.tabs.Tab|null>}
   */
  async _getChatGPTTab() {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs.find(tab => 
        tab.url && (
          tab.url.includes("chatgpt.com") || 
          tab.url.includes("chat.openai.com")
        )
      ) || null;
    } catch (error) {
      console.error("Error finding ChatGPT tab:", error);
      return null;
    }
  }

  /**
   * Handle incoming response from content script
   * 
   * @private
   * @param {string} responseText - The response text
   */
  _handleResponse(responseText) {
    // Notify all waiting listeners
    this.responseListeners.forEach(handler => {
      handler(responseText);
    });
  }
}

/**
 * Convenience function to create and initialize the API
 * 
 * @returns {Promise<ChatGPTAPI>} Initialized API instance
 * 
 * @example
 * const api = await createChatGPTAPI();
 * const response = await api.sendPrompt("Hello!");
 */
async function createChatGPTAPI() {
  const api = new ChatGPTAPI();
  await api.initialize();
  return api;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatGPTAPI, createChatGPTAPI };
}

