# filebeam

P2P file transfer using simple codes. Built on [hyperbeam](https://github.com/mafintosh/hyperbeam).

```
npm install filebeam
```

## Usage

Send files:

```js
import Filebeam from 'filebeam'

const beam = new Filebeam()

console.log('Code:', beam.code) // share this

await beam.ready()

beam.send([
  { path: '/absolute/path/to/file.txt', name: 'file.txt' },
  { path: '/absolute/path/to/photo.jpg', name: 'photo.jpg' }
])

beam.on('connected', () => console.log('connected'))
beam.on('end', () => beam.destroy())
```

Receive files:

```js
import Filebeam from 'filebeam'

const beam = new Filebeam('ABC123XYZ') // code from sender

beam.setDownloadLocation('./downloads') // optional, defaults to ~/Downloads

await beam.ready()

beam.startReceive()

beam.on('connected', () => console.log('connected'))
beam.on('data', (chunk) => console.log('received', chunk.length, 'bytes'))
beam.on('end', () => beam.destroy())
```

## API

#### `const beam = new Filebeam([code])`

Create a new instance. Omit `code` to create a sender (generates code automatically).

#### `beam.code`

The pairing code.

#### `beam.sender`

Boolean. `true` if sender, `false` if receiver.

#### `await beam.ready()`

Wait until connected to DHT.

#### `beam.send(files)`

Send files. `files` is an array of `{ path, name }` objects.

Sender only.

#### `beam.startReceive()`

Start receiving files.

Receiver only.

#### `beam.setDownloadLocation(dir)`

Set download directory. Call before `startReceive()`.

Receiver only.

#### `beam.destroy()`

Close connection.

## Events

#### `beam.on('connected', fn)`

Emitted when peers connect.

#### `beam.on('data', fn)`

Emitted on incoming data chunks.

Receiver only.

#### `beam.on('end', fn)`

Emitted when transfer completes.

#### `beam.on('error', fn)`

Emitted on errors.

## How it works

Sender generates a random code, hashes it to derive a key, and announces on the DHT. Receiver uses the same code to derive the same key and connect. Files are streamed as a tar archive over the encrypted hyperbeam connection.

## License

MIT
