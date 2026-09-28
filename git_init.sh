#!/bin/bash

echo "# music_center" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/develslack/music_center.git
git push -u origin main
