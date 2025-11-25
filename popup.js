document.addEventListener('DOMContentLoaded', async function() {
    const sendBtn = document.getElementById('send-btn');
    const randomBtn = document.getElementById('random-btn');
    const promptInput = document.getElementById('prompt-input');
    const statusMsg = document.getElementById('status-msg');
    const responseArea = document.getElementById('response-area');
    const responseText = document.getElementById('response-text');
  
    // List of random prompts for automation
    const randomPrompts = [
      "Explain the theory of relativity to a 5-year-old.",
      "Write a haiku about a brave toaster.",
      "What are three unique benefits of drinking water?",
      "Generate a random sci-fi movie plot involving time travel.",
      "List 5 uncommon ingredients to put on pizza.",
      "Explain how a blockchain works in one paragraph.",
      "Write a short poem about coding errors.",
      "What is the distance between the Earth and the Moon?",
      "Give me a fun fact about octopuses.",
      "Write a JavaScript function to filter even numbers."
    ];
  
    function setStatus(msg, isError = false) {
      statusMsg.textContent = msg;
      statusMsg.style.color = isError ? '#d32f2f' : '#666';
    }

    function setLoading(loading) {
      sendBtn.disabled = loading;
      randomBtn.disabled = loading;
      if (loading) {
        // Only hide response area when starting a new request
        responseArea.style.display = 'none';
        responseArea.classList.remove('show');
      }
    }
  
    // Initialize the ChatGPT API
    let chatGPTAPI;
    try {
      chatGPTAPI = await createChatGPTAPI();
      setStatus("Ready");
    } catch (error) {
      setStatus("Failed to initialize API", true);
      console.error("API initialization error:", error);
    }
  
    /**
     * Execute a prompt using the ChatGPT API
     * @param {string} promptText - The prompt to send
     */
    async function executePrompt(promptText) {
      if (!promptText || !promptText.trim()) {
        setStatus("Please enter a prompt.", true);
        return;
      }

      if (!chatGPTAPI) {
        setStatus("API not initialized", true);
        return;
      }

      // Reset UI
      setStatus("Sending prompt...");
      setLoading(true);

      try {
        // Check if ChatGPT is available
        const isAvailable = await chatGPTAPI.isAvailable();
        if (!isAvailable) {
          setStatus("Error: Open ChatGPT in a browser tab first.", true);
          setLoading(false);
          return;
        }

        // Send prompt and wait for response
        const response = await chatGPTAPI.sendPrompt(promptText, {
          onProgress: (status) => {
            setStatus(status);
          }
        });

        // Display the response
        if (!response || !response.trim()) {
          setStatus("Error: Empty response received", true);
          setLoading(false);
          return;
        }

        setStatus(`Response captured! (${response.length} chars)`);
        
        // Set response text directly
        responseText.textContent = response;
        
        // Show response area - simple and direct
        responseArea.style.display = 'block';
        responseArea.classList.add('show');
        
        setLoading(false);
        
        // Scroll to show response
        setTimeout(() => {
          responseArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
        console.log("Response displayed:", response.substring(0, 50) + "...");

      } catch (error) {
        setStatus(`Error: ${error.message}`, true);
        setLoading(false);
        console.error("Prompt execution error:", error);
      }
    }
  
    // --- Event Listeners ---
  
    // 1. Manual Send
    sendBtn.addEventListener('click', () => {
      executePrompt(promptInput.value);
    });
  
    // 2. Random Auto-Send
    randomBtn.addEventListener('click', () => {
      const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
      promptInput.value = randomPrompt; 
      executePrompt(randomPrompt);
    });
  });