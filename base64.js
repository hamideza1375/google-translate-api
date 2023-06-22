//! download models
//!Sox set to envaironment
//! npx node@14.0.0 ./index.js
const DeepSpeech = require('deepspeech');
const fs = require('fs');
const Sox = require('sox-stream');
const MemoryStream = require('memory-stream');
const Duplex = require('stream').Duplex;
const Wav = require('node-wav');
const rootPath = require('app-root-path');
const { execSync } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');
const { translate } = require('@vitalets/google-translate-api');

const path = require('path');
const http = require('http');
const https = require('https');
const urlParse = require('url').parse;
const googleTTS = require('google-tts-api');
const RootPath = require('app-root-path');




let modelPath = './models/deepspeech-0.9.3-models.pbmm';

let model = new DeepSpeech.Model(modelPath);

let desiredSampleRate = model.sampleRate();

let scorerPath = './models/deepspeech-0.9.3-models.scorer';

model.enableExternalScorer(scorerPath);

// let audioFile = 'audio/4507-16021-0012.wav'
let audioFile = transcribeLocalVideo('deepgram.mp4')

if (!fs.existsSync(audioFile)) {
	console.log('file missing:', audioFile);
	process.exit();
}

const buffer = fs.readFileSync(audioFile);
const result = Wav.decode(buffer);

if (result.sampleRate < desiredSampleRate) {
	console.error('Warning: original sample rate (' + result.sampleRate + ') is lower than ' + desiredSampleRate + 'Hz. Up-sampling might produce erratic speech recognition.');
}

function bufferToStream(buffer) {
	let stream = new Duplex();
	stream.push(buffer);
	stream.push(null);
	return stream;
}

let audioStream = new MemoryStream();
bufferToStream(buffer).
	pipe(Sox({
		global: {
			'no-dither': true,
		},
		output: {
			bits: 16,
			rate: desiredSampleRate,
			channels: 1,
			encoding: 'signed-integer',
			endian: 'little',
			compression: 0.0,
			type: 'raw'
		}
	})).
	pipe(audioStream);

audioStream.on('finish', async () => {
	// let audioBuffer = audioStream.toBuffer();
	// const audioLength = (audioBuffer.length / 2) * (1 / desiredSampleRate);
	// let result = model.stt(audioBuffer);
	// const { text } = await translate(result, { to: 'fa' });
	// fs.writeFileSync(`${rootPath}/test.txt`, text);

	googleTTS.getAudioBase64('helo how are you').then((res)=>{
		var b64string = res
		var buf = Buffer.from(b64string, 'base64');
    fs.writeFileSync(`${RootPath}/a.mp3`, buf);


	})
	
});




// transcribeRemoteVideo('https://www.w3schools.com/html/mov_bbb.mp4');
function transcribeLocalVideo(filePath) {
	ffmpeg(`-hide_banner -y -i ${filePath} ${filePath}.wav`);
	return `${filePath}.wav`
}




async function ffmpeg(command) {
	return new Promise((resolve, reject) => {
		execSync(`${ffmpegStatic} ${command}`, (err, stderr, stdout) => {
			if (err) reject(err);
			resolve(stdout);
		});
	});
}




function downloadFile(url, dest) {
	return new Promise((resolve, reject) => {
		const info = urlParse(url);
		const httpClient = info.protocol === 'https:' ? https : http;
		const options = {
			host: info.host,
			path: info.path,
			headers: {
				'user-agent': 'WHAT_EVER',
			},
		};

		httpClient
			.get(options, (res) => {
				// check status code
				if (res.statusCode !== 200) {
					const msg = `request to ${url} failed, status code = ${res.statusCode} (${res.statusMessage})`;
					reject(new Error(msg));
					return;
				}

				const file = fs.createWriteStream(dest);
				file.on('finish', function () {
					// close() is async, call resolve after close completes.
					file.close(resolve);
				});
				file.on('error', function (err) {
					// Delete the file async. (But we don't check the result)
					fs.unlink(dest);
					reject(err);
				});

				res.pipe(file);
			})
			.on('error', reject)
			.end();
	});
}

