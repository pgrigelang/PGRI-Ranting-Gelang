const fs = require('fs');
let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const oldCode = `{isAdmin && (
                        <div className="flex items-center gap-1.5 ml-2">`;

const newCode = `<div className="flex items-center gap-1.5 ml-2">`;

code = code.replace(oldCode, newCode);

const oldCodeEnd = `</button>
                        </div>
                      )}`;

const newCodeEnd = `</button>
                        </div>`;

code = code.replace(oldCodeEnd, newCodeEnd);

fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
