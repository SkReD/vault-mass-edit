const submitButton = document.getElementById('submit')!
const patternField = document.getElementById('pattern')! as HTMLInputElement
const jsonSecretField = document.getElementById('jsonSecret')! as HTMLTextAreaElement
const resultField = document.getElementById('result')! as HTMLDivElement

submitButton.onclick = (event) => {
  event.preventDefault()
  resultField.style.display = 'none'
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'writeSecret',
        data: {
          pattern: patternField.value,
          value: jsonSecretField.value,
        },
      }, ({ success, error }: { success: any, error: any }) => {
        resultField.style.display = 'block'

        if (success) {
          resultField.innerHTML = `Operation completed successfully:\n${JSON.stringify(success, null, 2)}`
        }

        if (error) {
          resultField.innerHTML = `Error: ${error}`
        }
      })
    }
  })
}
