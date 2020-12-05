jest.mock('@actions/core')
jest.mock('@actions/exec')
jest.mock('@actions/github')

const fs = require('fs')
const core = require('@actions/core')
const exec = require('@actions/exec')
const github = require('@actions/github')

const run = require('./update')

describe('run', () => {
  let mockOctokit
  const token = 'github-token'
  const files = ['foo.rb', 'bar.rb']

  const fooContent = `url "https://github.com/octocat/foo.git",
  tag: "v0.1.0",
  revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`

  const barContent = `url "https://github.com/octocat/bar.git",
  tag: "v0.2.0",
  revision: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"`

  const fooNewTag = {
    name: 'v0.1.1',
    commit: {
      sha: 'cccccccccccccccccccccccccccccccccccccccc'
    }
  }

  const barNewTag = {
    name: 'v0.2.1',
    commit: {
      sha: 'dddddddddddddddddddddddddddddddddddddddd'
    }
  }

  const pull = {
    number: 1,
    title: '[AUTOMATED] Update Formulas',
    user: {
      login: 'github-actions[bot]'
    },
    html_url: 'https://github.com/octocat/homebrew-test/pulls/1'
  }

  beforeAll(() => {
    mockOctokit = {
      repos: {
        get: jest.fn(),
        listTags: jest.fn(),
        getLatestRelease: jest.fn()
      },
      pulls: {
        list: jest.fn(),
        create: jest.fn()
      }
    }
  })

  test('no input token', async () => {
    core.getInput.mockReturnValueOnce('')
    github.getOctokit.mockImplementationOnce(() => {
      throw new Error('Parameter token or opts.auth is required')
    })
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('Parameter token or opts.auth is required')
  })

  test('reading directory fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockRejectedValueOnce(new Error('cannot read directory'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot read directory')
  })

  test('reading file fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn().mockRejectedValueOnce(new Error('cannot read file'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot read file')
  })

  test('getting latest release fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn().mockResolvedValueOnce(fooContent)
    mockOctokit.repos.getLatestRelease.mockRejectedValueOnce(new Error('cannot get the latest release'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot get the latest release')
  })

  test('all formulas are up-to-date', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.0' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.0' } })
    await run()
    expect(core.setOutput).toHaveBeenCalledWith('updated', false)
  })

  test('listing tags fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn().mockResolvedValueOnce(fooContent)
    mockOctokit.repos.getLatestRelease.mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
    mockOctokit.repos.listTags.mockRejectedValueOnce(new Error('cannot list tags'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot list tags')
  })

  test('writing file fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn().mockResolvedValueOnce(fooContent)
    mockOctokit.repos.getLatestRelease.mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
    mockOctokit.repos.listTags.mockResolvedValueOnce({ data: [fooNewTag] })
    fs.promises.writeFile = jest.fn().mockRejectedValueOnce(new Error('cannot write file'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot write file')
  })

  test('running git add command fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn().mockResolvedValueOnce(fooContent)
    mockOctokit.repos.getLatestRelease.mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
    mockOctokit.repos.listTags.mockResolvedValueOnce({ data: [fooNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValueOnce()
    exec.exec.mockRejectedValueOnce(new Error('cannot run git add'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot run git add')
  })

  test('running git config user.name command fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockRejectedValueOnce(new Error('cannot run git config'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot run git config')
  })

  test('running git config user.email command fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockRejectedValueOnce(new Error('cannot run git config'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot run git config')
  })

  test('running git checkout command fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockRejectedValueOnce(new Error('cannot run git checkout'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot run git checkout')
  })

  test('running git commit command fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockRejectedValueOnce(new Error('cannot run git commit'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot run git commit')
  })

  test('running git push command fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockResolvedValueOnce() // git commit
      .mockRejectedValueOnce(new Error('cannot run git push'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot run git push')
  })

  test('getting repo fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockResolvedValueOnce() // git commit
      .mockResolvedValueOnce() // git push
    mockOctokit.repos.get.mockRejectedValueOnce(new Error('cannot get repo'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot get repo')
  })

  test('listing pulls fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockResolvedValueOnce() // git commit
      .mockResolvedValueOnce() // git push
    mockOctokit.repos.get.mockResolvedValueOnce({ data: { default_branch: 'main' } })
    mockOctokit.pulls.list.mockRejectedValueOnce(new Error('cannot list pulls'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot list pulls')
  })

  test('there is an open pull request', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockResolvedValueOnce() // git commit
      .mockResolvedValueOnce() // git push
    mockOctokit.repos.get.mockResolvedValueOnce({ data: { default_branch: 'main' } })
    mockOctokit.pulls.list.mockResolvedValueOnce({ data: [pull] })
    await run()
    expect(core.setOutput).toHaveBeenCalledWith('updated', true)
    expect(core.setOutput).toHaveBeenCalledWith('pull_number', 1)
    expect(core.setOutput).toHaveBeenCalledWith('pull_url', 'https://github.com/octocat/homebrew-test/pulls/1')
  })

  test('creating pull fails', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockResolvedValueOnce() // git commit
      .mockResolvedValueOnce() // git push
    mockOctokit.repos.get.mockResolvedValueOnce({ data: { default_branch: 'main' } })
    mockOctokit.pulls.list.mockResolvedValueOnce({ data: [] })
    mockOctokit.pulls.create.mockRejectedValueOnce(new Error('cannot create pull'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('cannot create pull')
  })

  test('open a new pull request succeeds', async () => {
    core.getInput.mockReturnValueOnce(token)
    github.getOctokit.mockReturnValueOnce(mockOctokit)
    fs.promises.readdir = jest.fn().mockResolvedValueOnce(files)
    fs.promises.readFile = jest.fn()
      .mockResolvedValueOnce(fooContent)
      .mockResolvedValueOnce(barContent)
    mockOctokit.repos.getLatestRelease
      .mockResolvedValueOnce({ data: { tag_name: 'v0.1.1' } })
      .mockResolvedValueOnce({ data: { tag_name: 'v0.2.1' } })
    mockOctokit.repos.listTags
      .mockResolvedValueOnce({ data: [fooNewTag] })
      .mockResolvedValueOnce({ data: [barNewTag] })
    fs.promises.writeFile = jest.fn().mockResolvedValue()
    exec.exec
      .mockResolvedValueOnce() // First git add
      .mockResolvedValueOnce() // Second git add
      .mockResolvedValueOnce() // git config user.name
      .mockResolvedValueOnce() // git config user.email
      .mockResolvedValueOnce() // git checkout
      .mockResolvedValueOnce() // git commit
      .mockResolvedValueOnce() // git push
    mockOctokit.repos.get.mockResolvedValueOnce({ data: { default_branch: 'main' } })
    mockOctokit.pulls.list.mockResolvedValueOnce({ data: [] })
    mockOctokit.pulls.create.mockResolvedValueOnce({ data: pull })
    await run()
    expect(core.setOutput).toHaveBeenCalledWith('updated', true)
    expect(core.setOutput).toHaveBeenCalledWith('pull_number', 1)
    expect(core.setOutput).toHaveBeenCalledWith('pull_url', 'https://github.com/octocat/homebrew-test/pulls/1')
  })
})
