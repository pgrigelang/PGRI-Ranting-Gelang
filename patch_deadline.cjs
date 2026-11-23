const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const oldLogic = `if (evt.uploadDeadline && new Date() > new Date(evt.uploadDeadline)) {
                            alert("Batas upload tugas sudah berakhir.");
                            return;
                          }`;

const newLogic = `if (evt.uploadDeadline) {
                            const todayStr = new Date().toISOString().split('T')[0];
                            if (todayStr > evt.uploadDeadline) {
                              alert("Batas upload tugas sudah berakhir.");
                              return;
                            }
                          }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
