declare const ace: any

const secretsEditor = ace.edit('value-editor')
secretsEditor.setTheme('ace/theme/github')
secretsEditor.session.setMode('ace/mode/json')
secretsEditor.setOption('showLineNumbers', false)
secretsEditor.setOption('showFoldWidgets', false)

export default secretsEditor
