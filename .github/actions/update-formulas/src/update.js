const fs = require('fs')

const core = require('@actions/core')
const exec = require('@actions/exec')
const github = require('@actions/github')

const tagRegex = /tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)"/
const revRegex = /revision:\s+"([0-9a-f]{40})"/
const urlRegex = /url\s+"(https:\/\/github.com\/(moorara)\/([0-9A-Za-z._-]+))",\s+tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)",\s+revision:\s+"([0-9a-f]{40})"/g

const remoteName = 'origin'
const branchName = 'update-formulas'
const commitMessage = 'Update Formulas'

async function run () {
  try {
    // Get input variables
    const token = core.getInput('github_token')

    // Create a GitHub Octokit client
    const octokit = github.getOctokit(token)

    // Iterate over all files in the current directory to find *.rb files
    const files = await fs.promises.readdir('.')
    for (const file of files) {
      if (file.endsWith('.rb')) {
        const formula = file.split('.').slice(0, -1).join('.')
        core.info(`Formula ${formula} found`)

        let content = (await fs.promises.readFile(file)).toString()
        const matches = [...content.matchAll(urlRegex)]
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

        // Check if the latest release is newer than the current tag/revision
        if (tag === release.tag_name) {
          core.info(`The current tag and revision for ${formula} formula are up-to-date.`)
          continue
        }

        // The latest release is newer than the current tag/revision
        const newTag = release.tag_name

        // Fetch the repository tags and get the latest tag
        const { data: tags } = await octokit.repos.listTags({ owner, repo })
        const { commit: { sha: newRevision } } = tags.find(t => t.name === newTag)

        // Update the content of the formula file and write it back to disk
        content = content.replace(tagRegex, `tag: "${newTag}"`).replace(revRegex, `revision: "${newRevision}"`)
        await fs.promises.writeFile(file, content)
        await exec.exec('git', ['add', 'file'])
      }
    }

    // Create a new commit and push to the remote repository
    await exec.exec('git', ['checkout', '-b', branchName])
    await exec.exec('git', ['commit', '-m', commitMessage])
    await exec.exec('git', ['push', '-u', remoteName, branchName])

    // Set output variables
    // core.setOutput('output', 'value')
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
