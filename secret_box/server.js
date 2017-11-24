const sodium = require('sodium-native')
const http = require('http')
const alloc = require('buffer-alloc')
const PORT = 3888

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var publicKey = alloc(sodium.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var secretKey = alloc(sodium.crypto_box_SECRETKEYBYTES)
sodium.crypto_box_keypair(publicKey, secretKey)

const server = http.createServer(function (req, res) {
  if (req.url === '/pk' && req.method === 'GET') {
    res.write(publicKey)
    res.end()
  } else if (req.url === '/msg' && req.method === 'POST') {
    req.on('data', (data) => {
      let cipher = data
      let cipherLen = cipher.length
      let decryptedMsgBytes = Buffer
        .allocUnsafe(cipherLen - sodium.crypto_box_SEALBYTES)

      let isVerified = sodium.crypto_box_seal_open(
        decryptedMsgBytes,
        Buffer.from(cipher),
        publicKey,
        secretKey
      )

      if (isVerified !== false) {
        let dec = decryptedMsgBytes.toString()
        console.log(`decrypted: ${dec}`)
        res.end('ok\n')
      } else {
        res.end('invalid key')
      }
    })
  } else {
    res.end('try again :-( ')
  }
})

server.listen(PORT)
