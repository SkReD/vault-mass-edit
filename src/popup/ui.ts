import secretsEditor from './secretsEditor.js'

export const restoreValues = ({ pattern, secrets }: { pattern: string, secrets: string }) => {
  const patternField = document.getElementById('pattern')! as HTMLInputElement

  patternField.value = pattern
  secretsEditor.setValue(secrets)
}

export const collectWriteOperationData = () => {
  const patternField = document.getElementById('pattern')! as HTMLInputElement
  const dryRunField = document.getElementById('dryRun')! as HTMLInputElement

  return {
    pattern: patternField.value,
    secrets: secretsEditor.getValue(),
    options: {
      dryRun: dryRunField.checked,
    },
  }
}

export const allowSubmit = () => {
  const submitButton = document.getElementById('submit')! as HTMLButtonElement

  submitButton.disabled = false
}

export const validateInput = () => {
  if (secretsEditor.getSession().getAnnotations().length) {
    return 'Invalid secrets json'
  }

  const patternField = document.getElementById('pattern')! as HTMLInputElement
  if (!patternField.value) {
    return 'Pattern should not be empty'
  }
}

export const hideResult = () => {
  const resultField = document.getElementById('result')! as HTMLDivElement

  resultField.style.display = 'none'
}

export const printError = (error: string) => {
  const resultField = document.getElementById('result')! as HTMLDivElement

  resultField.style.display = 'block'

  resultField.innerHTML = `Error: ${error}`
}

export const printSuccess = (successMessage: any) => {
  const resultField = document.getElementById('result')! as HTMLDivElement

  resultField.style.display = 'block'

  resultField.innerHTML = `Operation completed successfully: ${JSON.stringify(successMessage, null, 2)}`
}

export const registerSubmit = (handler: (event: Event) => any) => {
  const submitButton = document.getElementById('submit')! as HTMLButtonElement

  submitButton.onclick = handler
}
