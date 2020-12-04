function red (text) {
  return `\u001b[31m${text}`
}

function green (text) {
  return `\u001b[32m${text}`
}

function yellow (text) {
  return `\u001b[33m${text}`
}

function blue (text) {
  return `\u001b[34m${text}`
}
function magenta (text) {
  return `\u001b[35m${text}`
}

function cyan (text) {
  return `\u001b[36m${text}`
}

module.exports = { red, green, yellow, blue, magenta, cyan }
