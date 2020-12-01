const fs = require('fs')

const core = require('@actions/core')

const regex = /url\s+"(https:\/\/github.com\/moorara\/[0-9A-Za-z._-]+)",\s+tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)",\s+revision:\s+"([0-9a-f]{40})"/g

async function run () {
  try {
    // Get input variables
    // const input = core.getInput('input')

    // Set output variables
    // core.setOutput('output', 'value')

    // Iterate over all files in the current directory to find *.rb files
    const files = await fs.promises.readdir('.')
    for (const file of files) {
      if (file.endsWith('.rb')) {
        const [formula] = file.split('.').slice(0, -1).join('.')
        core.info(`Formula ${formula} found`)

        const content = await fs.promises.readFile(file)
        const matches = [...content.matchAll(regex)]
        const [, url, tag, revision] = matches[0]

        core.info(`url: ${url}`)
        core.info(`tag: ${tag}`)
        core.info(`revision: ${revision}`)
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
