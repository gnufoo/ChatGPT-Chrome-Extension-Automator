console.log("ChatGPT Automator Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "PROMPT_CHATGPT") {
    handlePrompt(request.prompt);
    sendResponse({ status: "started" });
  }
  return true;
});

async function handlePrompt(promptText) {
  const textarea = document.querySelector('#prompt-textarea');
  
  if (!textarea) {
    console.error("ChatGPT Automator: Could not find textarea.");
    return;
  }

  textarea.focus();

  const success = await setProseMirrorContent(promptText, textarea);
  
  if (!success) {
    console.error("ChatGPT Automator: Failed to set prompt text.");
    return;
  }

  setTimeout(() => {
    const sendButton = document.querySelector('button[data-testid="send-button"]');
    
    if (sendButton) {
      sendButton.click();
      waitForResponse();
    } else {
      const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 13
      });
      textarea.dispatchEvent(enterEvent);
      waitForResponse();
    }
  }, 300);
}

async function setProseMirrorContent(promptText, textarea) {
  try {
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "INJECT_PROSEMIRROR_SCRIPT",
        promptText: promptText
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: "No response" });
        }
      });
    });
    
    // Always verify content directly in textarea
    await new Promise(resolve => setTimeout(resolve, 300));
    const contentCheck = textarea.textContent || textarea.innerText || '';
    
    if (contentCheck.trim().length > 0) {
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("ChatGPT Automator: Error setting content:", e);
    return false;
  }
}

function waitForResponse() {
  console.log("Waiting for ChatGPT response to complete...");

  let checkCount = 0;
  const maxChecks = 300; // Maximum number of checks (5 minutes at 1 second intervals)
  let streamingDetected = false;
  let lastResponseLength = 0;
  let stableCount = 0;
  const requiredStableChecks = 3; // Response must be stable for 3 seconds
  let observer = null;
  let intervalId = null;
  let isComplete = false;

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const checkCompletion = () => {
    if (isComplete) return;
    
    checkCount++;
    
    // Safety timeout
    if (checkCount > maxChecks) {
      console.error("Timeout waiting for response");
      cleanup();
      chrome.runtime.sendMessage({
        action: "CAPTURED_RESPONSE",
        text: "Response timeout - please check manually"
      });
      return;
    }

    // Try multiple selectors for send button
    let sendButton = document.querySelector('button[data-testid="send-button"]');
    if (!sendButton) {
      sendButton = document.querySelector('button[aria-label*="Send" i], button[aria-label*="send" i]') ||
                   document.querySelector('button[title*="Send" i], button[title*="send" i]') ||
                   document.querySelector('button[type="submit"]');
    }
    
    const stopButton = document.querySelector('button[aria-label*="Stop"], button[aria-label*="stop"], [data-testid="stop-button"]') ||
                       document.querySelector('button[aria-label*="stop generating" i], button[title*="Stop" i]');
    
    // Check if streaming has started
    if (stopButton && !streamingDetected) {
      streamingDetected = true;
      console.log("Streaming detected - waiting for completion...");
    }

    // Check for completion indicators
    const isStreaming = document.querySelector('.result-streaming, [class*="streaming"], [class*="Streaming"]');
    const hasStopButton = stopButton !== null;
    
    // Get the latest response
    let responses = document.querySelectorAll('.markdown, [class*="markdown"], [data-testid="conversation-turn-block"]');
    if (responses.length === 0) {
      responses = document.querySelectorAll('[class*="Message"], [class*="message"], [class*="Response"], [class*="response"]');
    }
    
    let currentResponseLength = 0;
    let lastResponse = null;
    
    if (responses.length > 0) {
      lastResponse = responses[responses.length - 1];
      currentResponseLength = lastResponse.innerText ? lastResponse.innerText.length : 0;
    }

    // Completion conditions:
    // 1. Streaming was detected (we know a response started)
    // 2. No stop button exists (streaming has stopped)
    // 3. No streaming indicators (no streaming class elements)
    // 4. Response content exists
    // 5. Send button check (optional - if found, it should be enabled)
    const completionConditionsMet = streamingDetected && 
                                    !hasStopButton && 
                                    !isStreaming &&
                                    lastResponse &&
                                    currentResponseLength > 0 &&
                                    (!sendButton || !sendButton.disabled);

    if (completionConditionsMet) {
      // Check if response length is stable
      if (currentResponseLength === lastResponseLength) {
        stableCount++;
        
        if (stableCount >= requiredStableChecks) {
          // Response is complete and stable
          isComplete = true;
          cleanup();
          const responseText = lastResponse.innerText || lastResponse.textContent || '';
          
          console.log("Response captured successfully (length:", responseText.length, "chars)");
          
          chrome.runtime.sendMessage({
            action: "CAPTURED_RESPONSE",
            text: responseText
          });
          return;
        }
      } else {
        // Response is still changing, reset stability counter
        stableCount = 0;
        lastResponseLength = currentResponseLength;
      }
    } else {
      // Reset stability counter if conditions not met
      stableCount = 0;
      if (currentResponseLength > 0) {
        lastResponseLength = currentResponseLength;
      }
    }
  };

  // Set up observer to watch for changes
  observer = new MutationObserver(() => {
    checkCompletion();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'disabled', 'aria-label']
  });

  // Also check periodically in case mutations are missed
  intervalId = setInterval(() => {
    checkCompletion();
    if (isComplete) {
      cleanup();
    }
  }, 1000);

  // Start checking immediately
  checkCompletion();
}
