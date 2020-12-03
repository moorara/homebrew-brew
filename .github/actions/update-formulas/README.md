# Update Formulas Action

The Update Formulas action can be used for updating
[Homebrew](https://brew.sh) [Formulas](https://docs.brew.sh/Formula-Cookbook).

For each formula in the [Tap](https://docs.brew.sh/Taps),
it checks if there is a newer version of formula available and if so, it updates the formula.

## Inputs

### `github_token`

The GitHub token provided by `GITHUB_TOKEN` secret.
For _schedule_ event, this token is not available through github context.

## Outputs

### `output`

TBD.

## Example Usages

```yaml
uses: ./.github/actions/update-formulas
with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
```
