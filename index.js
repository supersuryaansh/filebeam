const Hyperbeam = require('hyperbeam')
const fs = require('fs')
const tar = require('tar-fs')
const path = require('path')
const base32 = require('hi-base32')
const uuid = require('uuid-v4')
const EventEmitter = require('events').EventEmitter
const sodium = require('sodium-universal')
const b4a = require('b4a')
const process = require('process')

class Filebeam extends EventEmitter {
  constructor(code) {
    super()
    this.sender = !code
    this._code = code
    this._downloadDir = null
    this._filesToSend = null
    this._transferDone = false

    if (this.sender) {
      this._code = uuid().split('-').pop().toUpperCase()
    }

    const seed = b4a.alloc(32)
    sodium.crypto_generichash(seed, b4a.from(this._code))
    const key = base32.encode(Buffer.from(seed)).replace(/=/g, '').toLowerCase()

    this.beam = new Hyperbeam(key, this.sender)

    // Promise that resolves when beam is announced/connected on DHT
    this._readyPromise = new Promise((resolve, reject) => {
      this.beam.once('remote-address', () => {
        resolve()
      })
      this.beam.once('error', (err) => {
        reject(err)
      })
    })

    this._listeners()

    // Trigger _open immediately so DHT server/connection starts right away
    this.beam.resume()
  }

  ready() {
    return this._readyPromise
  }

  _listeners() {
    this.beam.on('connected', () => {
      this.emit('connected')
      if (this.sender && this._filesToSend) {
        this._startPiping()
      }
    })

    this.beam.on('end', () => {
      this._transferDone = true
      this.emit('end', 'transfer complete')
    })

    this.beam.on('error', (err) => {
      const msg = (err.message || '').toLowerCase()
      if (this._transferDone && (msg.includes('reset') || msg.includes('destroyed'))) {
        this.emit('end', 'transfer complete')
        return
      }
      this.emit('error', err)
    })

    this.beam.on('close', () => {
      noop()
    })

    if (!this.sender) {
      this.beam.on('data', (chunk) => {
        this.emit('data', chunk)
      })
    }
  }

  // files: array of { path, name } with pre-resolved absolute paths
  send(files) {
    this._filesToSend = files

    if (this.beam.connected) {
      this._startPiping()
    }
  }

  _startPiping() {
    const files = this._filesToSend
    if (!files) return
    this._filesToSend = null

    const pack = tar.pack('/', {
      entries: files.map((f) => f.path),
      map: (header) => {
        const file = files.find((f) => f.path.endsWith(header.name))
        if (file) header.name = file.name
        return header
      }
    })

    pack.on('error', (err) => {
      this.emit('error', err)
    })

    pack.on('end', () => {
      this._transferDone = true
    })

    pack.pipe(this.beam)
  }

  startReceive() {
    if (this.sender) return
    this._receive()
  }

  _receive() {
    const targetDir =
      this._downloadDir ||
      path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', 'Downloads')

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
    const extract = tar.extract(targetDir)
    this.beam.pipe(extract)
  }

  setDownloadLocation(dirPath) {
    this._downloadDir = dirPath
  }

  get code() {
    return this._code
  }

  async destroy() {
    if (this.beam) {
      this.beam.destroy()
    }
    this.beam = null
  }
}

function noop() {}

module.exports = Filebeam
