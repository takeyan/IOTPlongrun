var Client = require("ibmiotf");

// 負荷条件
var interval = 1000 ; 				// 各デバイスの送信間隔[msec]
var repeat = 1000 ; 				// 各デバイスの送信回数[回]
var size = 2000; 				//送信データサイズ（バイト）
var org = "bf8dsi";				//IOTP組織ID
var deviceInfo = require("./dev501.json"); 	// デバイス定義
// var deviceInfo = require("./dev301_310.json"); 	// デバイス定義
// var deviceInfo = require("./demo01_02_03.json"); 	// デバイス定義
// var deviceInfo = [{"typeId":"demo01","deviceId":"dev101","success":true,"authToken":"scy0YozmMoyf0Lf8?5"}]

var payload = Array(size+1).join('@'); 		//送信データ生成

console.log("デバイス数:" + deviceInfo.length + " データサイズ:" + size + "バイト. 送信間隔:" + interval + "msec. 回数:" + repeat + "回.");

var devClient = setDeviceClient(deviceInfo);
var exitStatus = Array();

// デバイス接続
var procStartTime = new Date(); //開始時の時刻取得
for (var i=0 ; i<deviceInfo.length ; i++ ){
	devClient[i].connect();
	}

// デバイス接続が成功したら呼ばれるイベントハンドラの登録
for (var i=0 ; i<deviceInfo.length ; i++ ){
	devClient[i].on("connect",onConnect);
	}

// エラー発生時に呼ばれるイベントハンドラの登録
for (var i=0 ; i<deviceInfo.length ; i++ ){
	devClient[i].on("error", function (err) {
	        console.log("[" + this.deviceId + "] Error : "+err);
		});
	}

// プロセス終了時のイベントハンドラを登録
process.on("beforeExit", exitProc)

// メッセージをを一定間隔で送信するイベントハンドラ関数
function onConnect(){
	var dev = this;
	var count = 0;
//	console.log("deviceId=" + dev.deviceId + " referenced in onConnect");
	var startTime = new Date();  //開始時の時刻取得
	var loop = setInterval(function(){
		count++;
		sendMessage(dev,count);
		if(count===repeat){
			clearInterval(loop);
			var endTime = new Date();  //終了時の時刻取得
			exitStatus.push(gatherExitData(dev.deviceId,count,startTime,endTime));
			dev.disconnect();
			}
		},interval);
}

// メッセージ送信終了時のデータ収集
var gatherExitData = function(di,cnt,st,et){
	var obj = {
		device: null,
		count: null,
		start: null,
		end: null
		};
	obj.device = di;
	obj.count = cnt;
	obj.start = st;
	obj.end = et;
	return obj;
	}



// メッセージを送信する関数
var sendMessage = function(devx,countx){
	devx.publish("status","json",JSON.parse('{"d" : { "deviceId":"' + devx.deviceId + '", "count" :"' +  countx + '", "publishTime" :"' +  Date.now() + '", "payload": "' + payload + '" }}'));
}


// deviceInfoの情報に基づいてデバイスインスタンスを生成する関数
function setDeviceClient(devInfo){
	var device = new Array();
	var devClient = new Array();

	for (var i=0 ; i<devInfo.length ; i++ ){
		device[i] = {
	    		"org" : org,
	    		"id" : devInfo[i].deviceId,
		    		"domain": "internetofthings.ibmcloud.com",
	    		"type" : devInfo[i].typeId,
	    		"auth-method" : "token",
	    		"auth-token" : devInfo[i].authToken
			};
		devClient[i] = new Client.IotfDevice(device[i]);
		}
	return devClient;
	}


// プロセス終了時に呼ばれるイベントハンドラ関数
function exitProc(){
	var startTime = new Date();
	var endTime = procStartTime;
	var totalCount = 0;

	for (var i=0 ; i<exitStatus.length ; i++ ){
		startTime = ( startTime < exitStatus[i].start ) ? startTime : exitStatus[i].start;
		endTime = ( endTime >= exitStatus[i].end ) ? endTime : exitStatus[i].end;
		totalCount = totalCount + exitStatus[i].count;  
		var elapsedTime = exitStatus[i].end - exitStatus[i].start;
		console.log("[" + exitStatus[i].device + "] " + exitStatus[i].count + "件送信完了. 所要時間:" + elapsedTime + "msec.");
		}
	var totalElapsedTime = endTime - startTime; 
	console.log("総所用時間：" + totalElapsedTime + "[msec]. メッセージ数：" + totalCount + "[件]. 送信レート：" + (totalCount / totalElapsedTime * 1000).toFixed(2) + "[件/秒]. スループット：" + (size * totalCount * 1000 / (totalElapsedTime *1024 * 1024)).toFixed(2) + "[MB/秒].");
	}


