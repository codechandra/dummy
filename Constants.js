var fieldMapping = {
    "timeStamp" : "timeStamp",
    "channel": "channel",
    "agentId": "agentId",
    "browser" : "browser",
    "browserVersion" : "browserVersion",
    "Role" : "Role",
    "SSOId" : "SSOId",
    "view" : "view",
    "platform" : "platform"
};

module.exports = {
    "fieldMapping" : fieldMapping,
    "channels" : {
        'Agency':'Agency',
        'Banca' : 'Banca',
        'Axis' : 'Axis',
        'F' : 'IMF',
        'T' : 'IM',
        'K' : 'Sparc',
        'P' : 'Pearless',
        'FOSUser' : 'FOS User'
    },
    S3BucketName : process.env.S3BucketName,
    ApiEndPoint: process.env.ApiEndPoint,
    Host: process.env.Host,
    XApiKey: process.env.XApiKey
};