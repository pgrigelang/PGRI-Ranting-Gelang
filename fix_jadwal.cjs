const fs = require('fs');
let content = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const badCode = `export const JadwalView: React.FC<JadwalViewProps> = ({
  // Helper for gender resolution
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

content = content.replace(badCode, `export const JadwalView: React.FC<JadwalViewProps> = ({
`);

const searchStr = `selectedEventForAbsensi
}) => {`;
const insertStr = `selectedEventForAbsensi
}) => {
  // Helper for gender resolution
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

content = content.replace(searchStr, insertStr);
fs.writeFileSync('src/components/views/JadwalView.tsx', content, 'utf8');
