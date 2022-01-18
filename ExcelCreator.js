var AWS = require("aws-sdk");

var Excel = require("exceljs");

var Stream = require("stream");

var Constants = require("./Constants.js");
var moment = require("moment");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3") 

// takes the file data and sends it into mail
var Mailer = require("./Mailer.js");

var moment = require("moment");

var xlsx = require("xlsx");

var fs = require('fs')

// converts the Array data from dynamoDb to excel File
exports.createFile = function (data) {
    //console.log(JSON.stringify(data));
    var date = new Date();

    var s3 = new AWS.S3();

    //create a new workbook to start

    var fieldMapping = Constants.fieldMapping;
    var channels = Constants.channels;
    //set meta info of the file

    //todo: separate function for date formatting
    var formattedDate = process.env.date ? moment(process.env.date) : moment().subtract(1,"day");
    //create a new sheet in the workbook 
    var workBooks = {};
    console.log(channels);
    var channelsArray = Object.keys(channels);

    
    // the first param is name and second are options as defined at https://www.npmjs.com/package/exceljs#page-setup
    channelsArray.forEach(function(channel,index){
        var wb = new Excel.Workbook();
        
        console.log("chennel "+channels[channel]);
        var channelName = channels[channel];
        wb.creator = 'Monocept Logs Utility';
        wb.created = date;
        var wbReadStream = wb.xlsx.createInputStream();
        var channelData = data.filter(function (row) {
            return (row.channel == channel);
        });

        //push all the data to wb.addRows so all the rows are added to worksheet , i read it all here https://www.npmjs.com/package/exceljs#rows
        // Array.prototype.forEach((val,i,data) => {
        //     console.log("data at index:"+i+"",JSON.stringify(val));
        console.log("Channel : "+channel+"data length:"+channelData.length);
        if (formattedDate.format("DD MMM,YYYY").indexOf("01") != 0) {
            var date = moment(formattedDate.valueOf());
            console.log("date isnt first");
            var key = "logs_" + channel + "_" + date.subtract(1, "day").format("DD MMM,YYYY") + ".xlsx";
            console.log("key"+key);
            var s3params = {
                Bucket: Constants.S3BucketName,
                Key: key,
            };

            // var filePath = s3params.Key;

            // s3.getObject(s3params, function (err, data){
            //     if (err) {
            //         console.log('file download error');
            //         console.log(err);
            //     } 
            //     fs.writeFileSync(filePath, data.Body.toString())
            //     console.log(filePath + ' has been created!')
            // })

            // console.log(s3.getObject(s3params))
            var stream = s3.getObject(s3params).createReadStream();

            var buffers = [];

            // var workbook = new Excel.Workbook();
            // stream.pipe(workbook.xlsx.createInputStream());

            // console.log('streaming done');

            // console.log(workbook);

            stream.on('end', function () {
                console.log('end stream');
                var buffer = Buffer.concat(buffers);
                var workbook = xlsx.read(buffer);
                var sheet_name_list_One = workbook.SheetNames;
                console.log('In Streaming');
                console.log("Sheetname " + sheet_name_list_One[0])
                var data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list_One[0]]);
                var finalWorkbook = new Excel.Workbook();
                var logsSheet = finalWorkbook.addWorksheet(sheet_name_list_One[0]);
                console.log(data.length);
                console.log(data[0]);
                console.log(channelData.length);
                console.log(channelData[0]);

                var column = [];
                for (var key in fieldMapping) {
                    column.push({
                        header: key,
                        key: key
                    });
                }
                
                logsSheet.columns = column;

                for(var value = 0 ; value < data.length ; value ++){
                    var row = [];
                    for(var col=0; col<column.length ; col++){
                        row.push(data[value][column[col].key]);
                    }
                    logsSheet.addRow(row);
                }

                for(var value = 0 ; value < channelData.length ; value ++){
                    var row = [];
                    for(var col=0; col<column.length ; col++){
                        row.push(channelData[value][column[col].key]);
                    }
                    logsSheet.addRow(row);
                }
                
                var stream = new Stream.PassThrough();
               // if (channelData.length) {
                    finalWorkbook.xlsx.write(stream)
                        .then(() => {
                            return s3.upload({
                                Key: "logs_" + channel + "_" + formattedDate.format("DD MMM,YYYY") + ".xlsx",
                                Bucket: Constants.S3BucketName,
                                Body: stream,
                                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            }).promise();
                        })
                        .then((data) => {
                            const channelNameForMail = channelName;
                            console.log("success in promise: ", JSON.stringify(data));
                            // setTimeout(function(){
                                
                                
                                Mailer.sendMail(data, channelNameForMail);    
                                    
                            
                            // },1500*index);
                        }, (err) => {
                            // todo: apply cloudWatch Logs for exception 
                            console.log("error in promise: ", JSON.stringify(err));
                        }).catch((err) => {
                            // todo: apply cloudWatch Logs for exception 
                            console.log("exception in promise", err);
                        });
                //}
            });

            stream.on('data', function (data) {
                buffers.push(data);
            });

            stream.on('error', function (err) {
                console.log("error fetching from s3:", JSON.stringify(err));
            }); 

        } else {
            console.log("date is 01");
            var logsSheet = wb.addWorksheet('logs_' +channel + '_' + formattedDate.format("DD MMM,YYYY"), {
                pageSetup: {
                    paperSize: 9
                }
            });
            var columns = new Array();

            for (let key in fieldMapping) {
                columns.push({
                    header: key,
                    key: key,
                });
            }
            logsSheet.columns = columns;
            //console.log("columns:",JSON.stringify(logsSheet.columns));

            logsSheet.addRows(channelData);
            var stream = new Stream.PassThrough();
            //if (channelData.length) {
                wb.xlsx.write(stream)
                    .then(() => {
                        return s3.upload({
                            Key: "logs_" + channel + "_" + formattedDate.format("DD MMM,YYYY") + ".xlsx",
                            Bucket: Constants.S3BucketName,
                            Body: stream,
                            ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        }).promise();
                    })
                    .then((data) => {
                        console.log("success in promise: ", JSON.stringify(data));
                        setTimeout(function(){
                            let url, error
                                const client = new S3Client()
                                const getObjectParams = {
                                    Bucket: data.Bucket,
                                    Key: data.Key
                                }
                                const command = new GetObjectCommand(getObjectParams);
                                try {
                                    url =  getSignedUrl(client, command, { expiresIn: 60 });
                                    console.log("The URL is",JSON.stringify(url));
                                } catch (err) {
                                    error = err
                                    console.log("err : ", err)
                                }
                                console.log("presigned url: ",JSON.stringify(url));
                            Mailer.sendMail(data, channelName);
                        },1500*index);
                    }, (err) => {
                        // todo: apply cloudWatch Logs for exception 
                        console.log("error in promise: ", JSON.stringify(err));
                    }).catch((err) => {
                        // todo: apply cloudWatch Logs for exception 
                        console.log("exception in promise", err);
                    });
        }
    });
};