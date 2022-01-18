var AWS = require("aws-sdk");
//todo: remove below line
var config = require("./config.json");
//todo: don't use this module
var moment = require("moment");
//var decryptionModule = require("./decryptionModule.js");
var ExcelCreator = require("./ExcelCreator.js");

var Mailer = require("./Mailer.js");

exports.handler = function (event, context, callback) {
    //todo: use it from Env variable
    var TableName = process.env.tableName;
    //todo: remove all logs, and use cloudWatch logs instead, <LOD_TYPE> : AgentTrackingUtil, <date> <details>
    console.log('testing console output');

    var docClient = new AWS.DynamoDB.DocumentClient();
    var today = new Date();
    
    var currentDate = process.env.date ?  moment(process.env.date).format('DD-MM-YYYY') : moment().subtract(1,"day").format('DD-MM-YYYY');
    console.log(currentDate);


    var queryParams = {
        TableName : TableName,
        KeyConditionExpression: "#yr = :yyyy",
        ExpressionAttributeNames:{
            "#yr": "date"
        },
        ExpressionAttributeValues: {
            ":yyyy": currentDate
        }
    };
    console.log("queryParams"+JSON.stringify(queryParams));
    
    var items = [];

    var onQuery = function(err,data){
        
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            Mailer.sendErrorMail(JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded. : ",data.Items.length);
            
            if (typeof data.LastEvaluatedKey != "undefined") {
                queryParams.ExclusiveStartKey = data.LastEvaluatedKey;
                items = items.concat(data.Items);
                docClient.query(queryParams, onQuery);
            }else{
                items = items.concat(data.Items);
              ExcelCreator.createFile(items);
            // data.Items.forEach(function(item) {
            //     console.log(item);
            // });
            }
            
        }
    };
    docClient.query(queryParams, onQuery);
    callback(null, 'execution succesful');
}