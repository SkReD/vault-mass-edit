import { Operation } from '../types.h'
import { restoreLastOperation, storeLastOperation, sendOperation } from './operation.js'
import {
  allowSubmit,
  restoreValues,
  validateInput,
  printError,
  hideResult,
  printSuccess,
  collectWriteOperationData,
  registerSubmit,
} from './ui.js'

restoreLastOperation().then((lastOperation) => {
  const { type, data: { pattern = '', secrets = '' } }: Operation = lastOperation

  if (type === 'writeSecret') {
    restoreValues({ pattern, secrets })
  }

  // Позволим отправку только после восстановления данных т.к. можно случайно отправить не то
  allowSubmit()
})

registerSubmit((event) => {
  event.preventDefault()

  const error = validateInput()
  if (error) {
    printError(error)
    return
  }
  hideResult()

  const currentOperation: Operation = {
    type: 'writeSecret',
    data: collectWriteOperationData(),
  }
  storeLastOperation(currentOperation)
  sendOperation(currentOperation)
    .then(({ success, error }) => {
      if (success) {
        printSuccess(success)
        return
      }

      if (error) {
        printError(error)
      }
    })
})
