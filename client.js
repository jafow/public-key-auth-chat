const salt = require('sodium-native')
const http = require('http')

// create a 32 byte length _nearly_ empty buffer that salt will make into a Public Key
var publicKey = Buffer.allocUnsafe(salt.crypto_box_PUBLICKEYBYTES)

// create a 32 byte length _nearly_ empty buffer that salt will make into a Secret Key
var secretKey = Buffer.allocUnsafe(salt.crypto_box_SECRETKEYBYTES)
var message = 'doing the crypto is fun and cool'
var mLen = message.length
var cipher = Buffer.allocUnsafe(salt.crypto_box_SEALBYTES + mLen)

// make the keys
salt.crypto_box_keypair(publicKey, secretKey)

// get the recipients PK:
var opts = {hostname: 'localhost', port: 3322, method: 'GET', path: '/pk'}
var req = http.request(opts, (res) => {
  res.on('data', (d) => {
    let rk = d
    // encrypt the ciphertext with recipient's pk that we got from their server
    salt.crypto_box_seal(cipher, Buffer.from(message, 'utf8'), rk)

    // post the message back to them
    var req1 = http.request({hostname: 'localhost', port: 3322, method: 'POST', path: '/msg'}, (_res) => {
      _res.on('end', () => { console.log('ended') })
      _res.on('data', (data) => { console.log('got data: ', data.toString()) })
    })
    req1.write(cipher)
    req1.end()
  })
})

req.on('err', (e) => { console.error('error: ', e) })
req.end()
