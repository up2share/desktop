# up2share-desktop

An Electron application with Vue

[https://up2sha.re](https://up2sha.re)

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Deploy new version

For this we simply need to create a new tag and push it to the repository. Github Actions will take care of the rest.

```bash
$ git tag -a v1.0.0 -m "First release"
$ git push origin v1.0.0
```

If you want to remove the tag locally:

```bash
$ git tag -d v1.0.0
```
