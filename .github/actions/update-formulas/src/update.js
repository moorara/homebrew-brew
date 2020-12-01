const core = require('@actions/core')
const github = require('@actions/github')

async function run () {
  try {
    // Get input variables
    // const input = core.getInput('input')

    // Set output variables
    // core.setOutput('output', 'value')

    // Testing
    core.info(JSON.stringify(github.context, null, 2))
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
