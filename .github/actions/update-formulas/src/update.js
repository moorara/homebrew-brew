const fs = require('fs')

const chalk = require('chalk')
const core = require('@actions/core')
const exec = require('@actions/exec')
const github = require('@actions/github')

const tagRegex = /tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)"/
const revRegex = /revision:\s+"([0-9a-f]{40})"/
const urlRegex = /url\s+"(https:\/\/github.com\/(moorara)\/([0-9A-Za-z._-]+))",\s+tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)",\s+revision:\s+"([0-9a-f]{40})"/g

const remoteName = 'origin'
const branchName = 'update-formulas'
const commitMessage = 'Update Formulas'
const pullRequestTitle = 'Update Formulas'
const pullRequestBody = ' - [x] Update Formulas'

async function run () {
  try {
    // Get input variables
    const token = core.getInput('github_token')
    const userEmail = core.getInput('user_email')
    const userName = core.getInput('user_name')

    // Create a GitHub Octokit client
    const octokit = github.getOctokit(token)

    let hasChanges = false

    // Iterate over all files in the current directory to find *.rb files
    const files = await fs.promises.readdir('.')
    for (const file of files) {
      if (file.endsWith('.rb')) {
        const formula = file.split('.').slice(0, -1).join('.')
        core.info(chalk.blue(`Formula ${formula} found`))

        let content = (await fs.promises.readFile(file)).toString()
        const matches = [...content.matchAll(urlRegex)]
        let [, url, owner, repo, tag, revision] = matches[0]

        // Remove .git from repo name if exists
        if (repo.endsWith('.git')) {
          repo = repo.split('.').slice(0, -1).join('.')
        }

        // Debugging informattion
        core.info(chalk.cyan(`Repository: ${url}`))
        core.info(chalk.cyan(`  Owner: ${owner}`))
        core.info(chalk.cyan(`  Repo: ${repo}`))
        core.info(chalk.cyan(`  Current Tag: ${tag}`))
        core.info(chalk.cyan(`  Current Revision: ${revision}`))

        // Get the latest release of the repository
        const { data: release } = await octokit.repos.getLatestRelease({ owner, repo })

        // Check if the latest release is newer than the current tag/revision
        if (tag === release.tag_name) {
          core.info(chalk.green(`The current tag and revision for ${formula} formula are up-to-date.`))
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

        core.info(chalk.yellow(`Formula ${formula} updated to tag ${newTag} and revision ${newRevision}`))
        hasChanges = true
      }
    }

    // Check if there is any new changes in working tree
    if (hasChanges) {
      // Configure author
      await exec.exec('git', ['config', 'user.email', userEmail])
      await exec.exec('git', ['config', 'user.name', userName])

      // Create a new commit
      core.info(chalk.yellow('Creating a new commit ...'))
      await exec.exec('git', ['checkout', '-b', branchName])
      await exec.exec('git', ['commit', '-m', commitMessage])

      // Push the commit to the remote repository
      core.info(chalk.yellow(`Pushing the new commit to ${remoteName} ...`))
      await exec.exec('git', ['push', '-u', remoteName, branchName])

      // Get the default branch for repository
      const [owner, repo] = github.context.repository.split('/')
      const { data: { default_branch: defaultBranch } } = await octokit.pulls.get({ owner, repo })

      // Open a new pull request
      core.info(chalk.yellow('Creating a pull request for updating formulas ...'))
      const { data: pull } = await octokit.pulls.create({
        owner,
        repo,
        title: pullRequestTitle,
        head: branchName,
        base: defaultBranch,
        body: pullRequestBody
      })

      // Set output variables
      core.setOutput('pull_number', pull.number)
      core.setOutput('pull_url', pull.html_url)

      core.info(chalk.green(`Pull request for updating formulas created: ${pull.html_url}`))
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
