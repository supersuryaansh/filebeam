import Filebeam from './index.js'
import path from 'path'

const args = process.argv.slice(2)

if (args[0] === 'send') {
  // Sender
  const beam = new Filebeam()

  console.log('Code:', beam.code)
  console.log('Waiting for receiver...')

  await beam.ready()

  beam.on('connected', () => {
    console.log('Receiver connected, sending files...')
  })

  beam.on('end', () => {
    console.log('Transfer complete')
    beam.destroy()
  })

  beam.on('error', (err) => {
    console.error('Error:', err.message)
    beam.destroy()
  })

  // Send some files
  beam.send([
    { path: path.resolve('./package.json'), name: 'package.json' },
    { path: path.resolve('./index.js'), name: 'index.js' }
  ])
} else if (args[0] === 'receive') {
  // Receiver
  const code = args[1]

  if (!code) {
    console.log('Usage: node example.mjs receive <code>')
    process.exit(1)
  }

  const beam = new Filebeam(code)

  console.log('Connecting to sender...')

  await beam.ready()

  beam.setDownloadLocation('./')

  beam.on('connected', () => {
    console.log('Connected, receiving files...')
  })

  beam.on('data', (chunk) => {
    process.stdout.write('.')
  })

  beam.on('end', () => {
    console.log('\nTransfer complete')
    beam.destroy()
  })

  beam.on('error', (err) => {
    console.error('Error:', err.message)
    beam.destroy()
  })

  beam.startReceive()
} else {
  console.log('Usage:')
  console.log('  node example.mjs send')
  console.log('  node example.mjs receive <code>')
}
