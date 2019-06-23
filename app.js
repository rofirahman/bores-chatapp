const express = require('express')
const middleware = require('@line/bot-sdk').middleware
const JSONParseError = require('@line/bot-sdk').JSONParseError
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed
const Client = require('@line/bot-sdk').Client
const config = require('config')
const request = require('request')
const fs = require('fs');
const cheerio = require('cheerio');

const app = express()

const token = config.get('channelAccessToken')
const secret = config.get('channelSecret')

const conf = {
    channelAccessToken: token,
    channelSecret: secret
}

const client = new Client(conf);


app.use(middleware(conf))

app.post('/webhook', (req, res, next) => {

    res.json(req.body.events) // req.body will be webhook event object
    // console.log(req.body.events[0].source.userId)
    var event = req.body.events[0]

    var type = event.type
    var tokenReply = event.replyToken
    var user = event.source.userId

    if (type == 'message') {
        var msg_text = event.message.text

        // Message user must to have string "login" on first string
        var msg_match_login = msg_text.match(/login/)
        var msg_match_semester = msg_text.match(/semester/)
        var msg_match_hasil_studi = msg_text.match(/hasil studi/)

        // If message contain "login"
        if (msg_match_login) {
            var userInput = event.message.text.split(" ")
            console.log(userInput)
            var username = userInput[1]
            var password = userInput[2]
            console.log(username)
            console.log(password)

            var headers = {
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
                'Origin': 'http://simpati-mhs.respati.ac.id',
                'Upgrade-Insecure-Requests': '1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9'
            }

            var dataString = 'Username='+username+'&Password='+password;

            var options = {
                url: 'http://simpati-mhs.respati.ac.id/index.php/login/verifikasi_login',
                method: 'POST',
                headers: headers,
                body: dataString
            }

            function callback(error, response, body) {

                if (response.statusCode == 200) {
                    console.log(response.headers['set-cookie'][0])

                    var str = response.headers['set-cookie'][0]
                    // var str="<p>This is some text</p> and then this is some more";
                    var cookie = str.substring(str.lastIndexOf("set-cookie=")+12,str.lastIndexOf("; exp"));
                    console.log('Cookie = '+cookie);
                    // console.log(cookie)


                    fs.readFile('cookies.json', 'utf8', function readFileCallback(err, data){
                        if (err){
                            console.log(err);
                        } else {
                            var jsonObj = JSON.parse(data); //now it an object
                            console.log(data)
                            console.log(jsonObj.cookies.length)

                            function updateCookieUser() {
                                for (var i = 0; i < jsonObj.cookies.length; i++) {
                                    if (event.source.userId == jsonObj.cookies[i].userid) {
                                        jsonObj.cookies.splice(i,1);
                                        jsonObj.cookies.push(
                                            {
                                                userid: event.source.userId, 
                                                cookie: cookie
                                            }) //add some data
                                        json = JSON.stringify(jsonObj); //convert it back to json
                                        fs.writeFile('cookies.json', json, 'utf8', (err) => {
                                            if (err) {
                                                console.error(err);
                                                return
                                            }
                                            console.log("Cookie updated with userid:"+event.source.userId)
                                        }) // write it back 

                                        return true
                                    } 
                                }
                                return false
                            }

                            if (updateCookieUser() == false) {
                                jsonObj.cookies.push(
                                    {
                                        userid: event.source.userId, 
                                        cookie: cookie
                                    }) //add some data
                                json = JSON.stringify(jsonObj); //convert it back to json
                                fs.writeFile('cookies.json', json, 'utf8', (err) => {
                                    if (err) {
                                        console.error(err);
                                        return
                                    }
                                    console.log("Cookie stored with userid:"+event.source.userId)
                                }) // write it back 
                            }
                        }
                    })
                    // console.log(body)
                    var msgToUser = {
                        type: 'text',
                        text: 'Kamu berhasil login 👍'
                    }

                    client.replyMessage(tokenReply, msgToUser)

                } else if(response.statusCode == 303) {
                    console.log(body)
                    var msgToUser = {
                        type: 'text',
                        text: 'Username dan password kamu tidak cocok nih 😢'
                    }

                    client.replyMessage(tokenReply, msgToUser)
                }
            }

            request(options, callback)

        } else if(msg_text == 'transkrip') {

            fs.readFile('cookies.json', 'utf8', function readFileCallback(err, data){
                if (err){
                    console.log(err);
                } else {

                    
                    console.log(event.source.userId)


                    function checkCookieUser(iduser) {
                        jsonObj = JSON.parse(data) //now it an object
                        for (var i = 0; i < jsonObj.cookies.length; i++) {
                            if (iduser == jsonObj.cookies[i].userid) {
                                var c_cookie = jsonObj.cookies[i].cookie
                                var headers = {
                                    'Connection': 'keep-alive',
                                    'Cache-Control': 'max-age=0',
                                    'Upgrade-Insecure-Requests': '1',
                                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                                    'Cookie': '_ga=GA1.3.336982823.1560760977; _gid=GA1.3.1685062545.1561038520; ci_session='+c_cookie,
                                    'Accept-Language': 'en-US,en;q=0.9'
                                }

                                var options = {
                                    url: 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_tns',
                                    headers: headers
                                }

                                request(options, function(error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        if (response.headers.refresh) {
                                            var msgToUser = {
                                                type: 'text',
                                                text: 'Cookie yang kamu punya expired 😢\nLogin lagi yuk'
                                            }

                                            client.replyMessage(tokenReply, msgToUser)
                                            return 0
                                        }
                                        // console.log(response.headers)
                                        var $ = cheerio.load(body);

                                        let find_ipk = $('.table').filter(function() {
                                            return $(this)
                                        }).find('tbody').find('tr:contains("IP Semester:")').first().text()

                                        

                                        console.log(ipk)
                                        // var skor = find_ipk.substring(
                                        //     find_ipk.lastIndexOf(": ") + 1, 
                                        //     find_ipk.lastIndexOf("/")
                                        // );


                                        function sliceIPK(fe, le) {
                                            return find_ipk.substring(find_ipk.lastIndexOf(fe) + 1, find_ipk.lastIndexOf(le))
                                        }

                                        var skor = sliceIPK(': ','/')
                                        var sks_total = sliceIPK('/',' =')
                                        var ipk = sliceIPK(': ','')

                                        console.log('IPK = '+ipk)
                                        console.log('SKS = '+sks_total)

                                        var judul = $('title')
                                        console.log(judul.text())
                                        // console.log(body)
                                        var msgToUser = {
                                            type: 'text',
                                            text: judul.text()+'\n'+'Total Skor : '+skor+'\nTotal SKS : '+sks_total+'\nIPK :'+ipk
                                        }

                                        client.replyMessage(tokenReply, msgToUser)
                                    } else {
                                        // console.log(body)
                                        var msgToUser = {
                                            type: 'text',
                                            text: 'Kamu belum login😢'
                                        }

                                        client.replyMessage(tokenReply, msgToUser)
                                    }
                                })
                                return true
                            }
                        }
                        return false
                    }

                    console.log(checkCookieUser())

                    if (checkCookieUser(user) == false) {
                        // console.log(c_cookie)
                        var msgToUser = {
                            type: 'text',
                            text: 'Kamu belum punya cookie 😢\nLogin dulu yuk'
                        }

                        client.replyMessage(tokenReply, msgToUser)
                    }
                }
            })

        } else if(msg_match_semester) {
            // switch() {
            //     case 1:

            //         break;
            //     case 2:
            // }
            console.log('semester')

        } else if(msg_text == 'hasil studi') {

            fs.readFile('cookies.json', 'utf8', function readFileCallback(err, data){
                if (err){
                    console.log(err);
                } else {

                    
                    // console.log(event.source.userId)


                    function checkCookieUser(iduser) {
                        jsonObj = JSON.parse(data) //now it an object
                        for (var i = 0; i < jsonObj.cookies.length; i++) {
                            if (iduser == jsonObj.cookies[i].userid) {
                                var c_cookie = jsonObj.cookies[i].cookie
                                var headers = {
                                    'Connection': 'keep-alive',
                                    'Cache-Control': 'max-age=0',
                                    'Origin': 'http://simpati-mhs.respati.ac.id',
                                    'Upgrade-Insecure-Requests': '1',
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                                    'Referer': 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_khs',
                                    'Accept-Language': 'en-US,en;q=0.9',
                                    'Cookie': '_ga=GA1.3.336982823.1560760977; _gid=GA1.3.1685062545.1561038520; ci_session='+c_cookie
                                };
                                // console.log(headers)

                                var options = {
                                    url: 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_khs',
                                    headers: headers
                                };

                                request(options, function(error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        if (response.headers.refresh) {
                                            var msgToUser = {
                                                type: 'text',
                                                text: 'Cookie yang kamu punya expired 😢\nLogin lagi yuk'
                                            }

                                            client.replyMessage(tokenReply, msgToUser)
                                            return 0
                                        }
                                        // console.log(response.headers)
                                        var $ = cheerio.load(body);
                                        let filteredEls = $('.table tbody tr').filter(function() {
                                            return $(this)
                                        })

                                        var jsonStudi = {studi: []}
                                        var jsonHasil = JSON.stringify(jsonStudi)

                                        // var jsonStudi = JSON.parse(hasil_studi)

                                        filteredEls.next().find('select[name=thn_tempuh]').find('option').each((i,op) => {
                                            
                                            // getIPS($(op).val(), $(op).text())
                                            var dataString = 'thn_tempuh='+$(op).val()+'&jensm=R';

                                            var param = {
                                                url: 'http://simpati-mhs.respati.ac.id/index.php/mahasiswa/lihat_khs',
                                                method: 'POST',
                                                headers: headers,
                                                body: dataString

                                            }

                                            request(param, function(error, response, body) {
                                                if (!error && response.statusCode == 200) {
                                                    var $ = cheerio.load(body)                                           
                                                    var ips = $('table tbody:last-child').find('tr:nth-child(2) th:nth-child(2)').text()
                                                    
                                                    
                                                    var obj = { 
                                                        "tahun_tempuh" : $(op).val(),
                                                        "semester" : $(op).text(),
                                                        "ip_semester" : ips
                                                    }
                                                    jsonStudi.studi.push(obj)
                                                    jsonHasil = JSON.stringify(jsonStudi)

                                                    console.log("Dari loop")
                                                    console.log()
                                                    console.log('Semester : '+$(op).text())
                                                    console.log('IPS '+ips)

                                                    var msgToUser = {
                                                        type: 'text',
                                                        text: 'Daftar Hasil Studi\n'+$(op).text()+'\nIP Semester '+ips+''
                                                    }

                                                    client.pushMessage(event.source.userId, msgToUser)
                                                    .then((resp) => {
                                                        console.log('success push message to '+event.source.userId)
                                                    })
                                                    .catch((err) => {
                                                        console.log(err)
                                                    })
                                                } else {
                                                    console.log(error)
                                                }
                                            })

                                        })


                                    } else {
                                        // console.log(body)
                                        var msgToUser = {
                                            type: 'text',
                                            text: 'Kamu belum login😢'
                                        }

                                        client.replyMessage(tokenReply, msgToUser)
                                    }
                                })

                                

                                return true
                            }
                        }
                        return false
                    }

                    // console.log(checkCookieUser())

                    if (checkCookieUser(user) == false) {
                        // console.log(c_cookie)
                        var msgToUser = {
                            type: 'text',
                            text: 'Kamu belum punya cookie 😢\nLogin dulu yuk'
                        }

                        client.replyMessage(tokenReply, msgToUser)
                    }

                    
                }
            })

            // console.log('hasil studi')

        } else if(msg_text == 'bantuan' || msg_text == 'help') {
            var msgToUser = {
                type: 'text',
                text: 'Fitur yang dapat digunakan :\n1. Login (ketik: login [username] [password])\n2. Lihat Transkrip Sementara (ketik: transkrip)\n3. Lihat Daftar Hasil Studi (ketik: hasil studi)\n4. soon..\n\nNB: Fitur transkrip masih dalam pengembangan.'
            }

            client.replyMessage(tokenReply, msgToUser)
        } else {
            console.log('Greeting')
            replyMessages(tokenReply, user)

        }
    } else {
        console.log(type)
        replyMessages(tokenReply, user)
    }
})

function replyMessages(replyToken, userId) {
    // console.log(replyToken)

    var message = {
        type: 'text',
        text: 'Halo 😁 \nRiyo adalah Chat Bot Unofficial Kampus UNRIYO.\nKetik: `help` atau `bantuan` untuk melihat perintah yang dapat digunakan.\nRiyo masih dalam tahap pengembangan.'
    };


    client.replyMessage(replyToken, message)
    console.log('Reply message to '+userId+' done')
}


app.post('/push-messages', (req, res) => {
    client.pushMessage(userId, { type: 'text', text: 'hello, world' });
})



app.use((err, req, res, next) => {
    if (err instanceof SignatureValidationFailed) {
        res.status(401).send(err.signature)
        return
    } else if (err instanceof JSONParseError) {
        res.status(400).send(err.raw)
        return
    }
next(err) // will throw default 500
})

app.listen(3000)