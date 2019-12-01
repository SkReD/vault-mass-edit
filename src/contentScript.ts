chrome.runtime.onMessage.addListener(function (message, callback) {
  if (message.type === 'writeSecret') {
    console.log(localStorage['vault-ldap☃1'], message.data)
  }
})
