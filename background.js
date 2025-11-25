// Background script to inject code into page context
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_PROSEMIRROR_SCRIPT") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: injectProseMirrorCode,
      args: [request.promptText]
    }).then(() => {
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          func: () => {
            try {
              return window.__prosemirrorResult || null;
            } catch (e) {
              return null;
            }
          }
        }).then((results) => {
          const result = results && results[0] ? results[0] : null;
          
          if (!result || !result.success) {
            // Check textarea directly if result reading failed
            chrome.scripting.executeScript({
              target: { tabId: sender.tab.id },
              func: () => {
                const textarea = document.querySelector('#prompt-textarea');
                if (textarea) {
                  const content = textarea.textContent || textarea.innerText || '';
                  return { hasContent: content.trim().length > 0 };
                }
                return { hasContent: false };
              }
            }).then((checkResults) => {
              const check = checkResults && checkResults[0] ? checkResults[0] : null;
              if (check && check.hasContent) {
                sendResponse({ success: true, method: 'dom_manipulation' });
              } else {
                sendResponse(result || { success: false, error: "No result found" });
              }
            }).catch(() => {
              sendResponse(result || { success: false, error: "No result found" });
            });
          } else {
            // Clean up
            chrome.scripting.executeScript({
              target: { tabId: sender.tab.id },
              func: () => {
                if (window.__prosemirrorResult) {
                  delete window.__prosemirrorResult;
                }
              }
            }).catch(() => {});
            sendResponse(result);
          }
        }).catch((error) => {
          // Fallback: check textarea directly
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: () => {
              const textarea = document.querySelector('#prompt-textarea');
              if (textarea) {
                const content = textarea.textContent || textarea.innerText || '';
                return { hasContent: content.trim().length > 0 };
              }
              return { hasContent: false };
            }
          }).then((checkResults) => {
            const check = checkResults && checkResults[0] ? checkResults[0] : null;
            if (check && check.hasContent) {
              sendResponse({ success: true, method: 'dom_manipulation' });
            } else {
              sendResponse({ success: false, error: error.message });
            }
          }).catch(() => {
            sendResponse({ success: false, error: error.message });
          });
        });
      }, 500);
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

function injectProseMirrorCode(promptText) {
  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.dispatch && obj.state && obj.state.doc) {
      return obj;
    }
    for (const key in obj) {
      try {
        if (key.includes('view') || key.includes('prosemirror') || key === '__view' || key === 'pmView') {
          const result = checkObject(obj[key]);
          if (result) return result;
        }
      } catch (e) {}
    }
    return null;
  };
  
  const findProseMirrorView = (textarea) => {
    const reactKey = textarea._reactInternalFiber || textarea._reactInternalInstance || 
                     Object.keys(textarea).find(k => k.startsWith('__react'));
    if (reactKey) {
      let fiber = textarea[reactKey];
      let depth = 0;
      while (fiber && depth < 30) {
        for (const prop in fiber) {
          try {
            const result = checkObject(fiber[prop]);
            if (result) return result;
          } catch (e) {}
        }
        
        if (fiber.memoizedState) {
          const result = checkObject(fiber.memoizedState);
          if (result) return result;
        }
        if (fiber.memoizedProps) {
          const result = checkObject(fiber.memoizedProps);
          if (result) return result;
        }
        if (fiber.stateNode) {
          const result = checkObject(fiber.stateNode);
          if (result) return result;
        }
        
        fiber = fiber.return || fiber._return || fiber.owner;
        depth++;
      }
    }
    
    const result = checkObject(textarea) || (textarea.parentElement ? checkObject(textarea.parentElement) : null);
    if (result) return result;
    
    for (const key in window) {
      try {
        if (key.toLowerCase().includes('prosemirror') || key.toLowerCase().includes('editor')) {
          const result = checkObject(window[key]);
          if (result) return result;
        }
      } catch (e) {}
    }
    
    return null;
  };
  
  const setContentViaDOM = (textarea, promptText) => {
    try {
      textarea.innerHTML = '';
      
      const p = document.createElement('p');
      p.textContent = promptText;
      textarea.appendChild(p);
      
      const br = document.createElement('br');
      br.className = 'ProseMirror-trailingBreak';
      p.appendChild(br);
      
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      
      const beforeInput = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: promptText
      });
      textarea.dispatchEvent(beforeInput);
      
      setTimeout(() => {
        const content = textarea.textContent || textarea.innerText || '';
        if (content.trim().length > 0) {
          window.__prosemirrorResult = { success: true, method: 'dom_manipulation' };
        } else {
          setTimeout(() => {
            const content2 = textarea.textContent || textarea.innerText || '';
            if (content2.trim().length > 0) {
              window.__prosemirrorResult = { success: true, method: 'dom_manipulation' };
            } else {
              window.__prosemirrorResult = { error: 'DOM manipulation failed' };
            }
          }, 200);
        }
      }, 300);
    } catch (domError) {
      window.__prosemirrorResult = { error: 'DOM manipulation error: ' + domError.message };
    }
  };
  
  try {
    const textarea = document.querySelector('#prompt-textarea');
    if (!textarea) {
      window.__prosemirrorResult = { error: 'Textarea not found' };
      return;
    }
    
    let pmView = findProseMirrorView(textarea);
    
    if (pmView && pmView.dispatch) {
      const { state } = pmView;
      const { schema } = state;
      const tr = state.tr.replaceWith(0, state.doc.content.size, schema.text(promptText));
      pmView.dispatch(tr);
      window.__prosemirrorResult = { success: true, method: 'direct_api' };
    } else {
      setContentViaDOM(textarea, promptText);
    }
  } catch (e) {
    window.__prosemirrorResult = { error: e.message };
  }
}
