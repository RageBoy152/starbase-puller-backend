const app = require ('express')();
const cors = require('cors');
const port = process.env.PORT || 3001;


const child_process = require('child_process');


app.use(cors({
  origin: '*'
}));



//  FUNCTION TO RUN COMMAND

function runCmd(cmd, args, callback) {
  child = child_process.spawn(cmd, args, {
    encoding: 'utf8',
    shell: true
  });


  child.on('error', err => {
    console.log(`Error running command | ${err}`);
  });


  child.stdout.setEncoding('utf8');
  child.stdout.on('data', data => {
    if (typeof callback === 'function') { callback(data); }
  });


  child.on('close', (code) => {
    if (code == 0) {
      if (typeof callback === 'function') { callback("FINISHED"); }
      child = null;
    }
    else {
      if (typeof callback === 'function') { callback(`ERROR_CODE_${code}`); }
      child = null;
    }
  });
}





app.get('/screenshot', async (req, res) => {
  const cropBounds = JSON.parse(req.query.cropBounds);
  const videoId = req.query.videoId;
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;
  const length = req.query.length;              // length = 0 means screenshot mode
  const watermark = req.query.watermark;
  const watermarkPos = req.query.watermarkPos;


  console.log({
    cropBounds: cropBounds,
    videoId: videoId,
    startTime: startTime,
    endTime: endTime,
    length: length,
    watermark: watermark,
    watermarkPos: watermarkPos
  });

  let timestamp = Math.floor(Date.now() / 1000);
  let command;


  if (length == '0') {
    command = `yt-dlp "https://www.youtube.com/live/${videoId}" --live-from-start --download-sections "#-8seconds - 0" -o temp/${timestamp}_temp.mp4 && ffmpeg -sseof -1 -i temp/${timestamp}_temp.mp4 -vframes 1 temp/${timestamp}_converted_temp.png && ffmpeg -i temp/${timestamp}_converted_temp.png -filter_complex "[0:v]setpts=(1/60)*PTS, crop=${cropBounds.width}:${cropBounds.height}:${cropBounds.left}:${cropBounds.top}, scale=-1:333:flags=lanczos[v]" -map "[v]" -an temp/${timestamp}_cropped_temp.png && ffmpeg -i temp/${timestamp}_cropped_temp.png -i "watermarks/${watermark}.png" -filter_complex "[1]scale=-1:60[wm]; [0][wm]overlay=10:H-h-10" temp/${timestamp}_marked.png`;
  }
  else {
    let speedValue = ((parseInt(startTime) * -1) - (parseInt(endTime) * -1)) / parseInt(length);
    command = `yt-dlp "https://www.youtube.com/live/${videoId}" --live-from-start --download-sections "#${startTime} - ${endTime}" -o temp/${timestamp}_temp.mp4 && ffmpeg -i temp/${timestamp}_temp.mp4 -filter_complex "[0:v]setpts=(1/${speedValue})*PTS, crop=${cropBounds.width}:${cropBounds.height}:${cropBounds.left}:${cropBounds.top}[v]" -map "[v]" -an temp/${timestamp}_cropped_temp.mp4 && ffmpeg -i temp/${timestamp}_cropped_temp.mp4 -i "watermarks/${watermark}.png" -filter_complex "[1]scale=-1:100[wm];[0][wm]overlay=10:H-h-10" -y temp/${timestamp}_marked_temp.mp4 && ffmpeg -i temp/${timestamp}_marked_temp.mp4 -filter_complex "[0:v]fps=30,scale=-1:333:flags=lanczos,palettegen[p];[0:v]fps=30,scale=-1:333:flags=lanczos[x];[x][p]paletteuse" -y temp/${timestamp}_marked.gif`;
  }




  console.log(command);

  runCmd(command, null, (data) => {
    if (data.includes('ERROR_CODE_')) {
      let code = data.split('ERROR_CODE_')[1];

      console.log(`Exited with error code: ${code}`);
      res.json({ "status": data });
      return;
    }
    else if (data == 'FINISHED') {
      console.log(`Finished running command.`);
      res.json({ "status": "ok" });
    }
    else {
      console.log(data);
    }
  });
});





app.listen(port, () => {
  console.log('Server listening at localhost:3001');
});