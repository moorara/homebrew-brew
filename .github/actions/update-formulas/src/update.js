const fs = require('fs')

const _ = require('lodash')
const core = require('@actions/core')
const exec = require('@actions/exec')
const github = require('@actions/github')

const config = require('./config')
const color = require('./color')

const tagRegex = /tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)"/
const revRegex = /revision:\s+"([0-9a-f]{40})"/
const urlRegex = /url\s+"(https:\/\/github.com\/([0-9A-Za-z._-]+)\/([0-9A-Za-z._-]+))",\s+tag:\s+"(v?[0-9]+\.[0-9]+\.[0-9]+)",\s+revision:\s+"([0-9a-f]{40})"/g

function isPullRequestOpenedPreviously (pull) {
  return (
    _.get(pull, 'title') === config.pullRequestTitle &&
    _.get(pull, 'user.login') === config.pullRequestUser
  )
}

function getPullRequestBody (updatedItems) {
  let body = `## Description

This pull request is created automatically.

### Updates

`

  for (const item of updatedItems) {
    body += `  - [x] Update formula **${item.formula}** to **${item.tag}**\n`
  }

  return body
}

async function run () {
  try {
    // Get input variables
    const token = core.getInput('github_token')

    // Create a GitHub Octokit client
    const octokit = github.getOctokit(token)

    const updatedItems = []

    // Iterate over all files in the current directory to find *.rb files
    const files = await fs.promises.readdir('.')
    for (const file of files) {
      if (file.endsWith('.rb')) {
        const formula = file.split('.').slice(0, -1).join('.')

        core.info('--------------------------------------------------------------------------------')
        core.info(color.blue(`Formula ${formula} found`))

        let content = await fs.promises.readFile(file, { encoding: 'utf8' })
        const matches = [...content.matchAll(urlRegex)]
        let [, url, owner, repo, tag, revision] = matches[0]

        // Remove .git from repo name if exists
        if (repo.endsWith('.git')) {
          repo = repo.split('.').slice(0, -1).join('.')
        }

        // Debugging informattion
        core.info(color.cyan(`Repository: ${url}`))
        core.info(color.cyan(`  Owner: ${owner}`))
        core.info(color.cyan(`  Repo: ${repo}`))
        core.info(color.cyan(`  Current Tag: ${tag}`))
        core.info(color.cyan(`  Current Revision: ${revision}`))

        // Get the latest release of the repository
        const { data: release } = await octokit.repos.getLatestRelease({ owner, repo })

        // Check if the latest release is newer than the current tag/revision
        if (tag === release.tag_name) {
          core.info(color.green(`The current tag and revision for ${formula} formula are up-to-date.`))
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
        await exec.exec('git', ['add', file])

        core.info(color.yellow(`Formula ${formula} updated to tag ${newTag} and revision ${newRevision}`))
        updatedItems.push({ formula, tag: newTag, revision: newRevision })
      }
    }

    // Check if there is any new changes in working tree
    if (updatedItems.length === 0) {
      core.setOutput('updated', false)
      return
    }

    core.info('--------------------------------------------------------------------------------')

    // Configure author
    await exec.exec('git', ['config', 'user.name', config.gitUserName])
    await exec.exec('git', ['config', 'user.email', config.gitUserEmail])

    // Create a new branch and commit changes
    await exec.exec('git', ['checkout', '-b', config.branchName])
    await exec.exec('git', ['commit', '-m', config.commitMessage])

    // Push the branch to the remote repository
    core.info(color.yellow(`Updating remote ${config.branchName} branch ...`))
    await exec.exec('git', ['push', '-f', '-u', config.remoteName, config.branchName])

    // Get the default branch of the remote repository
    const { data: { default_branch: defaultBranch } } = await octokit.repos.get({
      owner: config.owner,
      repo: config.repo
    })
    core.debug(`The repository default branch is ${defaultBranch}`)

    // Check if there is already a pull request open from previous runs
    // TODO: take pagination into account
    core.debug('Checking open pull requests ...')
    const { data: pulls } = await octokit.pulls.list({
      owner: config.owner,
      repo: config.repo,
      state: 'open',
      // TODO: add the filter for head
      base: defaultBranch
    })

    let pull = pulls.find(isPullRequestOpenedPreviously)
    core.debug(pull ? `Pull request found: ${pull.number}` : 'No open pull request found')

    // Create a new pull request if no pull request is open from previous runs
    if (!pull) {
      core.info(color.yellow('Creating a pull request ...'))
      pull = (await octokit.pulls.create({
        owner: config.owner,
        repo: config.repo,
        title: config.pullRequestTitle,
        head: config.branchName,
        base: defaultBranch,
        body: getPullRequestBody(updatedItems)
      })).data
      core.debug(`Pull request created: ${pull.html_url}`)
    }

    // Set output variables
    core.setOutput('updated', true)
    core.setOutput('pull_number', pull.number)
    core.setOutput('pull_url', pull.html_url)

    core.info(color.green(`Pull request: ${pull.html_url}`))
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run
