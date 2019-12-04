import { Operation } from '../types.h'

export const restoreLastOperation = () => {
  return new Promise<Operation>((resolve, reject) => {
    chrome.storage.local.get('lastOperation', function ({ lastOperation } = {}) {
      resolve(lastOperation as Operation)
    })
  })
}

export const storeLastOperation = (lastOperation: Operation) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ lastOperation }, function () {
      resolve()
    })
  })
}

export const sendOperation = (operation: Operation) => {
  return new Promise<{ success: any, error: string }>((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, operation, (data = {}) => {
          if (chrome.runtime.lastError && chrome.runtime.lastError.message) {
            data.error = chrome.runtime.lastError.message
          }

          resolve(data)
        })
      }

      // Ignore this case
    })
  })
}
