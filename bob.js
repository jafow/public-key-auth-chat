const sodium = require('sodium-native')
const net = require('net')
const PORT = 3888

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var publicKey = Buffer.allocUnsafe(sodium.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var secretKey = Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES)
sodium.crypto_box_keypair(publicKey, secretKey)

var nonce = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES)
let theirPublicKey = null

const server = net.createServer(function (socket) {
  socket.on('data', (d) => {
    if (!theirPublicKey) {
      theirPublicKey = d // store their PK
    } else {
      // decrypt!!
      let msg = Buffer.alloc(d.byteLength - sodium.crypto_box_MACBYTES)
      let cipher = Buffer.from(d)
      let isValid = sodium
        .crypto_box_open_easy(msg, cipher, nonce, theirPublicKey, secretKey)
      if (isValid) {
        console.log('>> ', msg.toString())
      } else {
        console.log('invalid')
        socket.destroy()
        socket.end()
      }
    }
  })

  socket.on('close', () => { console.log('closed') }) // socket.on('data', function (d) { //   let cipher = d
})
server.on('connection', (c) => {
  console.log('connected: sending my key')
  c.write(publicKey)
})

server.listen(PORT)
