const sodium = require('sodium-native')
const decrypt = require('./lib/decrypt.js')
const net = require('net')
const PORT = 3888

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var myPublicKey = Buffer.allocUnsafe(sodium.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var mySecretKey = Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES)
sodium.crypto_box_keypair(myPublicKey, mySecretKey)

var theirPublicKey = null

const server = net.createServer((sock) => {
  sock.on('data', (msg) => {
    if (!theirPublicKey) {
      // this is our first message and we assume it's their key
      theirPublicKey = Buffer.from(msg)
      // write our key back to them
      sock.write(myPublicKey)
    } else {
      // we receive a message and decrypt it
      var {decrypted, plainText} = decrypt(msg, theirPublicKey, mySecretKey)
      if (decrypted) {
        console.log('>> ', plainText)
      } else {
        console.error('Invalid message: ', plainText)
        sock.destroy()
      }
    }
  })

  sock.on('end', () => {
    console.log('ended')
  })

  // write messages to them
  process.stdin.on('data', function (msg) {
    // we should already have their public key
    var nonce = Buffer.alloc(sodium.crypto_box_NONCEBYTES)
    sodium.randombytes_buf(nonce)
    var cipher = Buffer.alloc(msg.byteLength + sodium.crypto_box_MACBYTES)
    sodium.crypto_box_easy(cipher, msg, nonce, theirPublicKey, mySecretKey)

    sock.write(Buffer.from(Buffer.concat([nonce, cipher])))
  })
})

server.on('error', (err) => {
  console.error('error: ', err)
})

server.listen(PORT)
