//DecryptionModule

    var cryptoJs = require("crypto-js");
    var Crypto = require("crypto");
    var sha1 = require("js-sha1");
    var cryptoDF = Crypto.createDiffieHellman(2048);
    var clearEncoding = 'utf8'; 
    var algorithm = 'aes'; 
    var cipherEncoding = 'base64';

    var getBytes = function(str){
        var bytes = [];
        for (var i = 0; i < str.length; i++){
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }    
    var keygenerate = function(key){
        key =  getBytes(key);
        console.log(key);
        var sha = sha1.digest(key);
        console.log("key sha-1",sha);
        sha.splice(0,16); //
        return sha;
    };
    var hexToBytes = function(hextext){
        return new Buffer(hextext,'hex');
    };
    var decryptText = function(ciphertext, key){
        var decipher = Crypto.createDecipher(algorithm, key);
        var plainChunks = [];  
        for (var i = 0;i < ciphertext.length;i++) {  
         plainChunks.push(decipher.update(ciphertext[i], cipherEncoding, clearEncoding));  
        }  
        plainChunks.push(decipher.final(clearEncoding));  
        var plaintext = plainChunks.join('');  
        
       return (plaintext);
    };
exports.Decrypt = {
    PASSWORD : "monocept-mli-mpower",
    
    decryptHexToText : function(hexText){
        var decodedKey=null;
        var result = null;
        try{
            decodedKey = keygenerate(this.PASSWORD);
        }catch(e){
            console.log(e);
        }
        var originalKey = cryptoDF.computeSecret(this.PASSWORD); // generate secret key 
        console.log("original: ",originalKey);
        var decryptedInput = hexToBytes(hexText);

        var result = decryptText(decryptedInput, originalKey);

        return result;
        //cryptoJs.AES.decrypt()
    }
    
}
