const fs = require('fs')

const core = require('@actions/core')
const github = require('@actions/github')

const regex = /url\s+"(https:\/\/github.com\/(moorara)\/([0-9A-Za-z._-]+))",\s+tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)",\s+revision:\s+"([0-9a-f]{40})"/g

async function run () {
  try {
    // Get input variables
    // const input = core.getInput('input')

    // Set output variables
    // core.setOutput('output', 'value')

    // Get GitHub Octokit client
    core.info(JSON.stringify(github.context, null, 2)) // TODO: remove
    const token = core.getInput('github_token')
    core.info(token) // TODO: remove
    const octokit = github.getOctokit(token)

    // Iterate over all files in the current directory to find *.rb files
    const files = await fs.promises.readdir('.')
    for (const file of files) {
      if (file.endsWith('.rb')) {
        const formula = file.split('.').slice(0, -1).join('.')
        core.info(`Formula ${formula} found`)

        const content = await (await fs.promises.readFile(file)).toString()
        const matches = [...content.matchAll(regex)]
        let [, url, owner, repo, tag, revision] = matches[0]

        // Remove .git from repo name if exists
        if (repo.endsWith('.git')) {
          repo = repo.split('.').slice(0, -1).join('.')
        }

        // Debugging informattion
        core.info(`Repository: ${url}`)
        core.info(`  Owner: ${owner}`)
        core.info(`  Repo: ${repo}`)
        core.info(`  Current Tag: ${tag}`)
        core.info(`  Current Revision: ${revision}`)

        // Get the latest release of the repository
        const { data: release } = await octokit.repos.getLatestRelease({ owner, repo })
        core.info(JSON.stringify(release, null, 2)) // TODO: remove

        // Check if the latest release is newer than the current tag/revision
        if (tag === release.tag_name) {
          core.info(`The current tag and revision for ${formula} formula are up-to-date.`)
          continue
        }

        // The latest release is newer than the current tag/revision
        // Fetch the newer tag
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
