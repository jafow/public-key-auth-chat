const sodium = require('sodium-native')
const net = require('net')
const PORT = 3888
const HOST = 'localhost'

// create a 32 byte length _nearly_ empty buffer that sodium will make into a Public Key
var publicKey = Buffer.allocUnsafe(sodium.crypto_box_PUBLICKEYBYTES)
// create a 32 byte length _nearly_ empty buffer that sodium will make into a Secret Key
var secretKey = Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES)
// make my keys
sodium.crypto_box_keypair(publicKey, secretKey)

var nonce = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES)
sodium.randombytes_buf(nonce) // insert random data into nonce
var theirPublicKey = null

// when we write something:
var req = net.createConnection({port: PORT, host: HOST, allowHalfOpen: false}, () => {
  console.log('writing key')
  req.write(publicKey)

  req.on('data', (d) => {
    if (theirPublicKey === null) {
      // we assume the first time data is written it is their key so we save it
      theirPublicKey = d
    } else {
      // decrypt the message!
      let msg = Buffer.alloc(d.byteLength - sodium.crypto_box_MACBYTES)
      let cipher = Buffer.from(d)
      let isValid = sodium
        .crypto_box_open_easy(msg, cipher, nonce, theirPublicKey, secretKey)
      if (isValid) {
        console.log('>> ', msg.toString())
      }
    }
  })
  req.on('error', (err) => { console.error(err) })
  req.on('end', () => { console.log('goodbye') })

  process.stdin.on('data', writeEncryptedMessage)
})

function writeEncryptedMessage (msg) {
  var message = Buffer.from(msg)
  var cipher = Buffer.allocUnsafe(message.length + sodium.crypto_box_MACBYTES)

  // encrypt the message and write it
  sodium.crypto_box_easy(cipher, message, nonce, theirPublicKey, secretKey)

  req.write(cipher)
}

function exchangeKeys () {
  var client = net.createConnection({port: PORT, host: HOST}, () => {
    console.log('writing p1 key')
    client.write('heres p1 key')
    // })

    client.on('data', (d) => {
      console.log('got their key: ', d.toString())
      theirPublicKey = d
      client.destroy()
      client.end()
    })

    client.on('error', (err) => { console.error(err) })
    client.on('end', () => {
      console.log('key exchange ended: pk is ', theirPublicKey.toString('hex'))
    })
  })
}
