const salt = require('sodium-native')
const http = require('http')
const querystring = require('querystring')

// create a 32 byte length _nearly_ empty buffer that salt will make into a Public Key
var publicKey = Buffer.allocUnsafe(salt.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that salt will make into a Secret Key
var secretKey = Buffer.allocUnsafe(salt.crypto_box_SECRETKEYBYTES) 
salt.crypto_box_keypair(publicKey, secretKey)

const server = http.createServer(function (req, res) {
  if (req.url === '/pk' && req.method == 'GET') {
    res.write(publicKey)
    res.end()
  } else if (req.url == '/msg' && req.method === 'POST') {
    req.on('data', (data) => {
      let cipher = data
      let cipherLen = cipher.length
      let decryptedMsgBytes = Buffer
        .allocUnsafe(cipherLen - salt.crypto_box_SEALBYTES)

      salt.crypto_box_seal_open(
        decryptedMsgBytes,
        Buffer.from(cipher), 
        publicKey,
        secretKey
      )

      let dec = decryptedMsgBytes.toString() 
      console.log(`decrypted: ${dec}`);
      res.end('ok\n')
    })
  } else {
    res.end('try again :-( ')
  }
})

server.listen(3322)
