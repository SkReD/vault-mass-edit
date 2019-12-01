const submitButton = document.getElementById('submit')
const patternField = document.getElementById('pattern') as HTMLInputElement
const jsonSecretField = document.getElementById('jsonSecret') as HTMLTextAreaElement

if (submitButton && patternField && jsonSecretField) {
  submitButton.onclick = (event) => {
    event.preventDefault()
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'writeSecret',
          data: {
            pattern: patternField.value,
            value: jsonSecretField.value,
          },
        }, (data) => {
          if (!data && chrome.runtime.lastError) {
            console.error(JSON.stringify(chrome.runtime.lastError))
          }
        })
      }
    })
  }
}
