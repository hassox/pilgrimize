## Pilgrimize

Pilgrimize allows you to use pilgrim with your own protos bundle.

### Usage

Create a protos.json file

    [
      { "git": "https://github.com/hassox/marvel-protos.git" },
      { "git": "https://github.com/hassox/fender.git" },
      { "git": "https://github.com/hassox/google-protos.git" }
    ]

Install pilgrimize

    $> npm install pilgrimize -g

Run pilgrimize

    $> pilgrimize

Visit pilgrim!

If you just want to compile your protos.json file without setting up a localhost for talking with fender:

    $> pilgrimize --no-localhost
