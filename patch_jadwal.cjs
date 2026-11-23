const fs = require('fs');

let content = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

// 1. Insert helper functions
const importsAndInterface = `export const JadwalView: React.FC<JadwalViewProps> = ({`;
const helperFunctions = `  // Helper for gender resolution
  const getGender = (t: Teacher): 'L' | 'P' => {
    if (t.gender) return t.gender;
    const femaleNames = ['Siti', 'Rina', 'Dewi', 'Sri', 'Nurul', 'Fitriani', 'Lilik', 'Maya', 'Anisa', 'Yulia', 'Titin', 'Dwi', 'Neni', 'Ratna', 'Ika', 'Indah'];
    return femaleNames.some(n => t.name.includes(n)) ? 'P' : 'L';
  };

  // Helper for file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

`;

content = content.replace(importsAndInterface, importsAndInterface + '\n' + helperFunctions);

// 2. Replace gender value string
const oldGenderVal = `value={selectedTaskTeacher ? (selectedTaskTeacher.gender === 'L' ? 'Laki - Laki' : 'Perempuan') : '-'}`;
const newGenderVal = `value={selectedTaskTeacher ? (getGender(selectedTaskTeacher) === 'L' ? 'Laki - Laki' : 'Perempuan') : '-'}`;
content = content.replace(oldGenderVal, newGenderVal);

// 3. Replace gender submission string
const oldSubmissionGender = `teacherGender: selectedTaskTeacher.gender === 'L' ? 'Laki - Laki' : 'Perempuan',`;
const newSubmissionGender = `teacherGender: getGender(selectedTaskTeacher) === 'L' ? 'Laki - Laki' : 'Perempuan',`;
content = content.replace(oldSubmissionGender, newSubmissionGender);

// 4. Replace file size format
const oldFileSizeFormat = `{uploadTaskFile ? \`\${(uploadTaskFile.size / 1024 / 1024).toFixed(2)} MB\` : 'PDF, Word, PPT, Excel, atau ZIP (Maks. 25 MB)'}`;
const newFileSizeFormat = `{uploadTaskFile ? formatFileSize(uploadTaskFile.size) : 'PDF, Word, PPT, Excel, atau ZIP (Maks. 25 MB)'}`;
content = content.replace(oldFileSizeFormat, newFileSizeFormat);

fs.writeFileSync('src/components/views/JadwalView.tsx', content, 'utf8');
console.log('Patched JadwalView.tsx');
