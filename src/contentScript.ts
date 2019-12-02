/* eslint-disable standard/no-callback-literal */

type Pattern = string
type Path = string
const pathValidationRegex = /\/(([a-zA-Z-0-9]+?|\*)\/)+$/

function validatePattern (path: Pattern) {
  if (!path) {
    return new Error('Path to secrets should be defined')
  }

  if (!pathValidationRegex.test(path)) {
    return new Error(`Path should match ${pathValidationRegex}`)
  }
}

function getAuthToken () {
  // right now only ldap
  const storedVaultValue = localStorage['vault-ldap☃1']
  let parsed
  if (storedVaultValue) {
    try {
      parsed = JSON.parse(storedVaultValue)
    } catch (e) {
      parsed = {}
    }
  }

  return parsed?.token
}

function executeRequest<ResponseType> (path: Path, data?: Object) {
  const token = getAuthToken()
  if (!token) {
    return Promise.reject(new Error('Unathorized'))
  }

  const req = new XMLHttpRequest()
  req.open('GET', path)
  req.setRequestHeader('x-vault-token', getAuthToken())
  req.send(data ? JSON.stringify(data) : null)

  return new Promise<ResponseType>((resolve, reject) => {
    req.onloadend = function () {
      if (req.status === 404) {
        const err = new Error(`Resource not found: ${path}`)
        Object.assign(err, { errCode: 404, xhr: req })
        reject(err)
      }
    }

    req.onload = function () {
      if (req.status !== 404) {
        resolve(JSON.parse(req.response).data)
      }
    }
    req.onerror = function () {
      const err = new Error(req.response)
      Object.assign(err, { xhr: req })
      reject(err)
    }
  })
}

function listSecrets (path: Pattern) {
  const parts = path.split('/')

  return executeRequest<{ keys: string[] }>(`/v1${[parts[0], parts[1], 'metadata', ...parts.slice(2)].join('/')}?list=true`)
    .then(data => data ? data.keys : [])
}

function getMetadata (path: Pattern) {
  const parts = path.split('/')

  return executeRequest<{ keys: string[] }>(`/v1${[parts[0], parts[1], 'metadata', ...parts.slice(2)].join('/')}`)
    .then(data => data ? data.keys : [])
}

function expandPattern (pattern: Pattern, paths: string[] = []): Promise<Path[]> {
  let i = 0
  const parts = pattern.split('/')
  let part = parts[i]
  const solid = []
  while (part !== undefined && (part === '' || part.indexOf('*') === -1)) {
    solid.push(part)
    part = parts[++i]
  }

  const solidPath = solid.join('/')
  return listSecrets(solidPath)
    .then(subPaths => {
      // достигли конца паттерна
      if (i === parts.length) {
        return paths.concat(subPaths.map(s => `${solidPath}${s}`))
      }

      const subPathPattern = parts[i]
      const nextSubPaths = subPaths
        .filter(s => s.endsWith('/')) // пути без слеша на конце не содержат вложенные папки
        .filter(s => { // отсеиваем лишнее при помощи примитивного wildcard'а
          const parts = subPathPattern.split('*')
          if (parts[0] === '') {
            return true
          }

          return s.startsWith(parts[0])
        })
      const nextPatterns = nextSubPaths.map(s => parts.slice(0, i).concat(s.replace(/\//g, '')).concat(parts.slice(i + 1)).join('/'))

      return Promise.all(nextPatterns.map(next => expandPattern(next).catch(e => {
        if (e.errCode === 404) {
          // проверям, что по такому пути есть секрет
          return getMetadata(next)
            .then(() => ([next]))
            .catch(() => ([]))
        }

        throw e
      })))
        .then((pathsList: Path[][]) => {
          return paths.concat(pathsList.reduce((acc, paths) => acc.concat(paths), []))
        })
    })
}

chrome.runtime.onMessage.addListener(function (message, sender, callback) {
  if (message.type === 'writeSecret') {
    const { pattern, value } = message.data
    const patternErr = validatePattern(pattern)
    if (patternErr) {
      callback({ error: patternErr.message })
      return
    }

    expandPattern(pattern)
      .then(success => callback({ success }))
      .catch((error: Error) => callback({ error: error.message }))

    return true
  }
})
