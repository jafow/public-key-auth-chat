const sodium = require('sodium-native')
const decrypt = require('./../lib/decrypt.js')
const net = require('net')
const alloc = require('buffer-alloc')
const PORT = 3888
const HOST = 'localhost'

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var myPublicKey = alloc(sodium.crypto_box_PUBLICKEYBYTES)
// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var mySecretKey = alloc(sodium.crypto_box_SECRETKEYBYTES)
// make my keys
sodium.crypto_box_keypair(myPublicKey, mySecretKey)

var theirPublicKey = null

// when we write something:
var req = net.createConnection({port: PORT, host: HOST}, () => {
  req.on('data', function (msg) {
    if (!theirPublicKey) {
      // this is our first message and we assume it's their key
      theirPublicKey = Buffer.from(msg)
    } else {
    // we receive a message and decrypt it
      var {decrypted, plainText} = decrypt(msg, theirPublicKey, mySecretKey)
      if (decrypted) {
        console.log('>> ', plainText)
      }
    }
  })

  process.stdin.on('data', writeEncryptedMessage)
})
// send our PK on connection
req.on('connect', (c) => {
  console.log(`connected to ${HOST}:${PORT}`)
  console.log('---------')
  req.write(myPublicKey)
})

req.on('end', () => {
  console.log('Goodbye')
})

function writeEncryptedMessage (msg) {
  var message = Buffer.from(msg)
  var cipher = alloc(message.length + sodium.crypto_box_MACBYTES)
  var nonce = alloc(sodium.crypto_secretbox_NONCEBYTES)
  sodium.randombytes_buf(nonce) // insert random data into nonce

  // encrypt the message and write it
  sodium.crypto_box_easy(cipher, message, nonce, theirPublicKey, mySecretKey)

  req.write(Buffer.from(Buffer.concat([myPublicKey, nonce, cipher])))
}
