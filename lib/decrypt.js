const sodium = require('sodium-native')
const alloc = require('buffer-alloc')

module.exports = function decryptMsg (cipherBuffer, theirPublicKey, mySecretKey) {
  // we assume they send the nonce as the first N bytes
  var theirNonce = cipherBuffer.slice(0, sodium.crypto_box_NONCEBYTES)
  var cipher = cipherBuffer.slice(sodium.crypto_box_NONCEBYTES)
  var message = alloc(cipher.byteLength - sodium.crypto_box_MACBYTES)

  var isValid = sodium.crypto_box_open_easy(message, cipher, theirNonce, theirPublicKey, mySecretKey)

  if (!isValid) {
    return { decrypted: isValid, plainText: 'Invalid message :-(' }
  } else {
    return { decrypted: isValid, plainText: message.toString() }
  }
}
