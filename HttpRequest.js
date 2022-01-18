var request = require("superagent");

var Constants = require("./Constants.js");


exports.doApiCall = function (data) {
    console.log("calling SOA API via Mpower-lambda", JSON.stringify(data, null, 2));
    console.log("apiKey: "+Constants.XApiKey);
    return new Promise(function (resolve, reject) {
        request.post(Constants.ApiEndPoint)
            .set("x-api-key", Constants.XApiKey)
            .set('Host', Constants.Host)
            .send(data)
            .end(function (err, data) {
                if (err) {
                    console.log("API Call rejected:",err);
                    reject(err);
                } else {
                    console.log("Response from SOA to lambda : ",data);
                    resolve(data);
                }
            });
    });
};