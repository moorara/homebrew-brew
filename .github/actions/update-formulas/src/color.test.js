const color = require('./color')

describe('color', () => {
  test('red', () => {
    const text = color.red('Hello, World!')
    expect(text).toBe('\u001b[31mHello, World!')
  })

  test('green', () => {
    const text = color.green('Hello, World!')
    expect(text).toBe('\u001b[32mHello, World!')
  })

  test('yellow', () => {
    const text = color.yellow('Hello, World!')
    expect(text).toBe('\u001b[33mHello, World!')
  })

  test('blue', () => {
    const text = color.blue('Hello, World!')
    expect(text).toBe('\u001b[34mHello, World!')
  })

  test('magenta', () => {
    const text = color.magenta('Hello, World!')
    expect(text).toBe('\u001b[35mHello, World!')
  })

  test('cyan', () => {
    const text = color.cyan('Hello, World!')
    expect(text).toBe('\u001b[36mHello, World!')
  })
})
