/* eslint-disable standard/no-callback-literal */
import { Operation } from '../types.h'

type Pattern = Operation['data']['pattern']
type Path = string
const pathValidationRegex = /(\/([a-zA-Z-0-9]+?|\*))+$/

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
  req.open(data ? 'POST' : 'GET', path)
  req.setRequestHeader('x-vault-token', getAuthToken())
  req.send(data ? JSON.stringify({ data }) : null)

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
        const response = JSON.parse(req.response)

        if (response.errors) {
          reject(new Error(response.errors.join(', ')))
        } else {
          resolve(response.data)
        }
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

  return executeRequest<Object>(`/v1${[parts[0], parts[1], 'metadata', ...parts.slice(2)].join('/')}`)
}

function getData (path: Pattern) {
  const parts = path.split('/')

  return executeRequest<{ data: { [key: string]: string }}>(`/v1${[parts[0], parts[1], 'data', ...parts.slice(2)].join('/')}`)
    .then(({ data }) => data)
}

function writeData (path: Pattern, data: {[key: string]: string}) {
  const parts = path.split('/')

  return executeRequest<Object>(`/v1${[parts[0], parts[1], 'data', ...parts.slice(2)].join('/')}`, data)
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

  if (solid.length === parts.length) {
    return Promise.resolve([pattern])
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
            .then(() => ([next.replace(/\/$/, '')]))
            .catch(() => ([]))
        }

        throw e
      })))
        .then((pathsList: Path[][]) => {
          return paths.concat(pathsList.reduce((acc, paths) => acc.concat(paths), []))
        })
    })
}

chrome.runtime.onMessage.addListener(function (message: Operation, sender, callback) {
  if (message.type === 'writeSecret') {
    const { pattern, secrets = '', options: { dryRun } = { dryRun: false } } = message.data
    const patternErr = validatePattern(pattern)
    if (patternErr) {
      callback({ error: patternErr.message })
      return
    }

    expandPattern(pattern)
      .then(paths => Promise.all(
        paths.map(p => getData(p).then(
          data => ({ data, path: p }),
        )),
      ))
      .then(dataList => {
        return Promise.all(dataList.map(({ data, path }) => {
          const nextData = { ...data, ...JSON.parse(secrets) }

          if (dryRun) {
            return { path, result: nextData }
          }

          return writeData(path, nextData).then(result => ({ path, result }))
        }))
      })
      .then(success => callback({ success }))
      .catch((error: Error) => callback({ error: error.message }))

    return true
  }
})
