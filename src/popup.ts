const submitButton = document.getElementById('submit')! as HTMLButtonElement
const patternField = document.getElementById('pattern')! as HTMLInputElement
const resultField = document.getElementById('result')! as HTMLDivElement
const dryRunField = document.getElementById('dryRun')! as HTMLInputElement

type Operation = {
  type: 'writeSecret',
  data: {
    pattern?: string,
    value?: string,
    options: {
      dryRun: boolean
    }
  },
}

declare const ace: any

const editor = ace.edit('value-editor')
editor.setTheme('ace/theme/github')
editor.session.setMode('ace/mode/json')

chrome.storage.local.get('lastOperation', function ({ lastOperation = {} }) {
  const { type, data: { pattern = '', value = '' } }: Operation = lastOperation

  if (type === 'writeSecret') {
    patternField.value = pattern
    editor.setValue(value)
  }

  submitButton.disabled = false
})

submitButton.onclick = (event) => {
  event.preventDefault()

  // validation
  if (editor.getSession().getAnnotations().length) {
    return
  }

  const currentOperation: Operation = {
    type: 'writeSecret',
    data: {
      pattern: patternField.value,
      value: editor.getValue(),
      options: {
        dryRun: dryRunField.checked,
      },
    },
  }

  resultField.style.display = 'none'

  chrome.storage.local.set({ lastOperation: currentOperation })

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, currentOperation, ({ success, error }: { success?: any, error?: any } = {}) => {
        resultField.style.display = 'block'

        if (success) {
          resultField.innerHTML = `Operation completed successfully:\n${JSON.stringify(success, null, 2)}`
          return
        }

        if (error) {
          resultField.innerHTML = `Error: ${error}`
          return
        }

        if (chrome.runtime.lastError && chrome.runtime.lastError.message) {
          resultField.innerHTML = chrome.runtime.lastError.message
        }
      })
    }
  })
}
