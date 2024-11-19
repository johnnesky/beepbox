const fs = require('fs');

let template = fs.readFileSync('website/beepbox_offline_template.html', { encoding: 'utf-8' });

const content = fs.readFileSync('website/beepbox_editor.min.js', { encoding: 'utf-8' });
template = template.replace('/* INSERT_BEEPBOX_SOURCE_HERE */', content);

fs.writeFileSync('website/beepbox_offline.html', template, { encoding: 'utf-8' });
