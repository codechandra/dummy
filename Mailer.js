var Mailer = require("nodemailer");
var AWS = require("aws-sdk");
var moment = require("moment");
const { jsPDF } = require("jspdf");
const HummusRecipe = require('hummus-recipe');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3")


var httpRequest = require('./HttpRequest');

var requestPayload = {
    "metadata": {
        "sessionId": Math.random(),
        "module": "email",
        "method": "",
        "agentId": "",
        "branchId": "",
        "view": "",
        "roleName": ""
    },
    "email": {
        "mailIdTo": '',
        "mailIdCc": "",
        "mailIdBcc": "",
        "mailSubject": '',
        "fromName": "MPOWER",
        "fromEmail": "nwstechhelpdesk@maxlifeinsurance.com",
        "mailBody": '',
        "isFileAttached": "false",
        "attachDetails": [],
        "embeddedAttachments": []
    }
};
exports.sendMail = function (s3data, channel) {

    var formattedDate = process.env.date ? process.env.date : moment().subtract(1, "day").format('DD MMMM, YYYY');

    var url, excption

    const run = async () => {

        // const start = new Date()
        console.log("Execution started")

        const client = new S3Client()
        const getObjectParams = {
            Bucket: s3data.Bucket,
            Key: s3data.Key
        }
        const command = new GetObjectCommand(getObjectParams);
        try {
            url = await getSignedUrl(client, command, { expiresIn: 60 * 60 });
            console.log("The URL is", JSON.stringify(url));
            const doc = new jsPDF();
            doc.text(JSON.stringify(url), 10, 10);
            doc.save("URL.pdf");
            const pdfDoc = new HummusRecipe('URL.pdf', 'outputfile.pdf');

            pdfDoc
                .encrypt({
                    userPassword: '123',
                    ownerPassword: '123',
                    userProtectionFlag: 4
                })
                .endPDF();

        } catch (err) {
            excption = err
            console.log("err : ", excption)
        }
        console.log("presigned url: ", JSON.stringify(url));

    }
    run();
    var mailAuth = {
        user: "ankitsharma@monocept.com",
        pass: "combine@123"
    };

    console.log("channel: " + channel + " presignedUrl: " + url);

    var mailFrom = "ankitsharma@monocept.com";
    var mailTo = process.env.mailTo;
    var subject = 'MPOWER MTD ' + formattedDate + '_' + channel;
    if (s3data) {
        console.log("sending File As Email, data: ", JSON.stringify(s3data));

        var S3 = new AWS.S3();

        //todo: use separate date formatting function

        var s3params = {
            Bucket: s3data.Bucket,
            Key: s3data.Key,
        };

        S3.getObject(s3params, function (err, data) {
            if (err) {
                console.log("error fetching from s3:", JSON.stringify(err));
                Mailer.sendErrorMail(JSON.stringify(err, null, 2));
            } else {
                requestPayload.email.mailIdTo = mailTo;
                requestPayload.email.mailSubject = subject;
                // requestPayload.email.mailBody =  'PFA the Logs for AgentTracking for ' + channel + ' channel on' + formattedDate+ '.\n' + "\ 
                // \r\n PresignedUrl: "+url + "\
                // \n\n\nThanks & Regards,\
                // \nTeam MPower\
                // ";

                requestPayload.email.mailBody = `<html>

    <body>

        <p>Hi Team,</p>

        <p>Please find the Logs for AgentTracking for the ${channel} <a href=${url}>here</a></p>

        <p>Thanks</p>

        <p>Team MPower</p>

    </body>

</html>`
                // requestPayload.email.attachDetails[0] = {
                //     "bytes": data.Body.toString('base64'),
                //     "name" : s3data.Key,
                //     "type" : "xlsx"
                // };
                // requestPayload.email.isFileAttached = "true";
                console.log("sending request");
                httpRequest.doApiCall(requestPayload).then(function (data) {
                    console.log(data);
                    if (data.body.data) {
                        if (data.body.data != "") {
                            console.log("sendEmailResponse", data.body.data);
                            if (JSON.parse(data.body.data)) {
                                var response = JSON.parse(data.body.data.trim("\\"));
                                if (response.EmailResponse.responseHeader.generalResponse.code == 200) {
                                    console.log("Email sent successfully  ");
                                }
                            }
                        }
                    }
                    else if (data.body.errorMessage) {
                        var formattedDate = process.env.date ? process.env.date : moment().format('DD MMMM, YYYY');
                        var mailTo = process.env.ErrorMailTo;
                        var subject = 'Error in Agent Tracking logs on ' + formattedDate + ' for Channel ' + channel;

                        requestPayload.email.mailIdTo = mailTo;
                        requestPayload.email.mailSubject = subject;
                        requestPayload.email.mailBody = 'Hi Team,\
                            \n\nError Occured while fetching AgentTracking logs for ' + formattedDate
                            +
                            '\n for the Channel ' + channel +
                            "\
                            \n\n\nThanks & Regards,\
                            \nTeam MPower\
                            ";
                        requestPayload.email.attachDetails = [];
                        httpRequest.doApiCall(requestPayload).then(function (data) {
                            console.log(data);
                            if (data.body.data) {
                                if (data.body.data != "") {
                                    console.log("sendEmailResponse", data.body.data);
                                    if (JSON.parse(data.body.data)) {
                                        var response = JSON.parse(data.body.data.trim("\\"));
                                        if (response.EmailResponse.responseHeader.generalResponse.code == 200) {
                                            console.log("Email sent successfully  ");
                                        }
                                    }
                                }
                            }
                        }, function (err) {
                            console.log("error Occured", err);
                        }).catch(function (err) {
                            console.log("Error Occured", err);
                        });
                    }
                }, function (err) {
                    console.log("error Occured", err);
                }).catch(function (err) {
                    console.log("Error Occured", err);
                });
            }
        });
    } else {
        requestPayload.email.mailIdTo = mailTo;
        requestPayload.email.mailSubject = subject;
        requestPayload.email.mailBody = 'No AgentTracking logs found for Channel_' + channel + ' ' + formattedDate
            + "\
        \n\n\nThanks & Regards,\
        \nTeam MPower\
        ";
        requestPayload.email.attachDetails = [];
        httpRequest.doApiCall(requestPayload).then(function (data) {
            console.log(data);
            if (data.body.data) {
                if (data.body.data != "") {
                    console.log("sendEmailResponse", data.body.data);
                    if (JSON.parse(data.body.data)) {
                        var response = JSON.parse(data.body.data.trim("\\"));
                        if (response.EmailResponse.responseHeader.generalResponse.code == 200) {
                            console.log("Email sent successfully  ");
                        }
                    }
                }
            }
        }, function (err) {
            console.log("error Occured", err);
        }).catch(function (err) {
            console.log("Error Occured", err);
        });
    }
};

exports.sendErrorMail = function (errorDescription) {

    var formattedDate = process.env.date ? process.env.date : moment().format('DD MMMM, YYYY');
    var mailFrom = "ankitsharma@monocept.com";
    var mailTo = process.env.ErrorMailTo;
    var subject = 'Error in Agent Tracking logs on ' + formattedDate;

    requestPayload.email.mailIdTo = mailTo;
    requestPayload.email.mailSubject = subject;
    requestPayload.email.mailBody = 'Hi Team,\
        \n\nError Occured while fetching AgentTracking logs for ' + formattedDate
        +
        '\n here are the details ' + JSON.stringify(errorDescription) +
        "\
        \n\n\nThanks & Regards,\
        \nTeam MPower\
        ";
    requestPayload.email.attachDetails = [];
    httpRequest.doApiCall(requestPayload).then(function (data) {
        console.log(data);
        if (data.body.data) {
            if (data.body.data != "") {
                console.log("sendEmailResponse", data.body.data);
                if (JSON.parse(data.body.data)) {
                    var response = JSON.parse(data.body.data.trim("\\"));
                    if (response.EmailResponse.responseHeader.generalResponse.code == 200) {
                        console.log("Email sent successfully  ");
                    }
                }
            }
        }
    }, function (err) {
        console.log("error Occured", err);
    }).catch(function (err) {
        console.log("Error Occured", err);
    });

}