const sodium = require('sodium-native')
const decrypt = require('./../lib/decrypt.js')
const net = require('net')
const alloc = require('buffer-alloc')
const PORT = 3888

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var myPublicKey = alloc(sodium.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var mySecretKey = alloc(sodium.crypto_box_SECRETKEYBYTES)
sodium.crypto_box_keypair(myPublicKey, mySecretKey)

var store = {}
var inStore = storage(store, formatShortKey)
var toStore = writeToStore(store, formatShortKey)
var connectionCount = 0

const server = net.createServer((sock) => {
  sock.on('data', (msg) => {
    var theirPublicKey = pluckKeyFrom(msg)
    if (inStore(theirPublicKey)) {
      // this is our first message; save their key & write ours back to them
      toStore(msg)
      sock.write(myPublicKey)
    } else {
      // we receive a message and decrypt it
      var msgParts = msg.slice(sodium.crypto_box_PUBLICKEYBYTES)
      var pk = store[formatShortKey(theirPublicKey)]
      var {decrypted, plainText} = decrypt(msgParts, pk, mySecretKey)
      if (decrypted) {
        console.log('>> ' + formatShortKey(theirPublicKey) + ': ' + plainText)
      } else {
        console.error('Invalid message: ', plainText)
      }
    }
  })

  sock.on('end', () => {
    console.log('client disconnected')
    connectionCount -= 1
    if (connectionCount === 0) {
      console.log('Goodbye')
      sock.destroy()
      process.exit()
    }
  })

  // write messages to them
  process.stdin.on('data', function (msg) {
    if (msg.toString().trim() === 'store') {
      // adds a command that gives us the short keys of clients connected
      showStore()
      showConnections()
    } else {
      var respondersPublicKey = getByKey(sliceShortName(msg), store)
      var nonce = alloc(sodium.crypto_box_NONCEBYTES)
      sodium.randombytes_buf(nonce)

      var cipher = alloc(msg.byteLength + sodium.crypto_box_MACBYTES)
      sodium.crypto_box_easy(cipher, msg, nonce, respondersPublicKey, mySecretKey)

      sock.write(Buffer.from(Buffer.concat([nonce, cipher])))
    }
  })
})

server.on('error', (err) => {
  console.error('error: ', err)
})

server.on('connection', () => connectionCount++)

server.listen(PORT)

function pluckKeyFrom (msgBytes) {
  if (!msgBytes.byteLength) return 0
  var key = msgBytes.slice(0, sodium.crypto_box_PUBLICKEYBYTES)
  return key.byteLength < sodium.crypto_box_PUBLICKEYBYTES
    ? 0
    : key
}

function storage (store, keyFormatter) {
  return function inStore (key) {
    if (key === 0 || !key) return false

    var shortKey = keyFormatter(key)
    return typeof store[shortKey] === 'undefined'
  }
}

function writeToStore (store, keyFormatter) {
  return function _toStore (key) {
    store[keyFormatter(key)] = key
    return store
  }
}

function sliceShortName (msg) {
  // slice the @ name from the message
  var msgStr = msg.toString()
  var atSignIndex = msgStr.indexOf('@') + 1
  return msgStr.slice(atSignIndex, atSignIndex + 6)
}

function getByKey (key, store) {
  if (!store[key]) {
    console.error('Key not found in store')
  }
  return store[key]
}

function formatShortKey (key) {
  var _key = key.toString('hex')
  return _key.slice(0, 6)
}

function showStore () {
  console.log('\tKeys in store')
  console.log('-'.repeat(32))
  console.log(Object.keys(store))
}

function showConnections () {
  console.log('-'.repeat(32) + '\n')
  console.log('Connections: ', connectionCount)
  console.log('-'.repeat(32) + '\n')
}
