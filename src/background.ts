chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { pathPrefix: '/ui/vault' /** todo: Сделать конфигурируемым */ },
      }),
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()],
    }])
  })
})
