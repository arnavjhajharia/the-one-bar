#!/bin/zsh
# Builds the-one-bar.mp4: stepped (12 fps "stop-motion") camera moves over stills, VO + procedural score, end-card supers.
set -e; cd ${0:A:h}
shots=( "01 4.0 1.00 1.08 0.30 0.50" "02 4.0 1.05 1.15 0.55 0.45" "03 7.5 1.15 1.00 0.45 0.30" "04 2.8 1.00 1.06 0.35 0.50"
        "05 4.2 1.06 1.00 0.40 0.50" "06 5.0 1.00 1.10 0.30 0.35" "07 5.5 1.00 1.12 0.35 0.45" "08 5.0 1.10 1.00 0.45 0.45"
        "09 7.0 1.00 1.12 0.68 0.30" "10 13.0 1.00 1.06 0.50 0.40" )
rm -f list.txt
for s in $shots; do
  set -- ${=s}; n=$1; dur=$2; z0=$3; z1=$4; fx=$5; fy=$6; fr=$(printf %.0f $(( dur*12 )))
  shake=0; [[ $n == 07 ]] && shake=1
  ffmpeg -v error -y -loop 1 -i ../img/$n.jpg -vf "scale=3840:-2,zoompan=z='$z0+($z1-$z0)*on/$fr':x='(iw-iw/zoom)*$fx+(random(1)-0.5)*4+$shake*lt(on,22)*sin(on*2.7)*14':y='(ih-ih/zoom)*$fy+(random(2)-0.5)*4':d=${fr}:s=1920x1080:fps=12,fps=24,format=yuv420p" -frames:v $(( fr*2 )) -c:v libx264 -crf 18 -preset fast s$n.mp4
  echo "file 's$n.mp4'" >> list.txt
done
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy body.mp4
node score.mjs score.wav 58
ffmpeg -v error -y -i body.mp4 -loop 1 -t 58 -i card1.png -loop 1 -t 58 -i card2.png -loop 1 -t 58 -i card3.png -i score.wav \
  -i ../vo/1.mp3 -i ../vo/2.mp3 -i ../vo/3.mp3 -i ../vo/4.mp3 -i ../vo/5.mp3 -i ../vo/6.mp3 -filter_complex "
[1:v]format=rgba,fade=t=in:st=46.3:d=0.8:alpha=1[c1];[2:v]format=rgba,fade=t=in:st=49.6:d=0.8:alpha=1[c2];[3:v]format=rgba,fade=t=in:st=52.6:d=0.8:alpha=1[c3];
[0:v][c1]overlay=enable='between(t,46.3,49.7)'[v1];[v1][c2]overlay=enable='between(t,49.6,52.7)'[v2];[v2][c3]overlay=enable='gte(t,52.6)',fade=t=in:st=0:d=0.6,fade=t=out:st=57:d=1[v];
[4:a]volume=1.6[m];
[5:a]adelay=800|800[a1];[6:a]adelay=8500|8500[a2];[7:a]adelay=15800|15800[a3];[8:a]adelay=22900|22900[a4];[9:a]adelay=38800|38800[a5];[10:a]volume=2.2,adelay=46400|46400[a6];
[a1][a2][a3][a4][a5][a6]amix=inputs=6:normalize=0,pan=stereo|c0=c0|c1=c0,volume=1.5,asplit=2[vo][vo2];
[m][vo]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400[mduck];[mduck][vo2]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5[a]" \
  -map "[v]" -map "[a]" -t 58 -c:v libx264 -crf 22 -preset medium -c:a aac -b:a 192k -movflags +faststart ../the-one-bar.mp4
echo built
